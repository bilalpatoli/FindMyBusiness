import { flattenResponse, type FlattenedBusiness } from "./flatten";
import { latestPhone, toE164 } from "./exportPhones";
import type { EnrichResponse, FlattenedOfficer } from "./types";

export const BULK_ROW_LIMIT = 300;

export type BulkInput = {
  businessName: string;
  state: string;
};

export type BulkStatus =
  | "pending"
  | "searching"
  | "enriching"
  | "success"
  | "no_business_match"
  | "no_officer"
  | "no_enrich_match"
  | "error";

export type BulkResult = {
  index: number;
  input: BulkInput;
  status: BulkStatus;
  error?: string;
  matchedCompany?: string;
  matchedAddress?: string;
  officer?: FlattenedOfficer;
  enriched?: EnrichResponse;
};

function pickTopBusinessWithOfficer(matches: FlattenedBusiness[]): FlattenedBusiness | undefined {
  return matches.find((b) => b.officers.some((o) => o.firstName && o.lastName)) ?? matches[0];
}

function pickTopOfficer(business: FlattenedBusiness): FlattenedOfficer | undefined {
  // Prefer officers from usCorp filings (they tend to have real titles like CEO),
  // then anyone with a tahoeId (Enformion's person identifier).
  const officers = [...business.officers];
  officers.sort((a, b) => {
    const aScore = (a.source === "usCorp" ? 2 : 0) + (a.tahoeId ? 1 : 0);
    const bScore = (b.source === "usCorp" ? 2 : 0) + (b.tahoeId ? 1 : 0);
    return bScore - aScore;
  });
  return officers.find((o) => o.firstName && o.lastName);
}

export async function processBulkRow(
  index: number,
  input: BulkInput,
  onUpdate: (r: BulkResult) => void,
): Promise<BulkResult> {
  const update = (partial: Partial<BulkResult>) => {
    const r: BulkResult = { index, input, status: "pending", ...partial };
    onUpdate(r);
    return r;
  };

  update({ status: "searching" });

  let searchData: unknown;
  try {
    const res = await fetch("/api/business-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName: input.businessName, state: input.state }),
    });
    searchData = await res.json();
    if (!res.ok) {
      const err = (searchData as { error?: string })?.error ?? `HTTP ${res.status}`;
      return update({ status: "error", error: `search: ${err}` });
    }
  } catch (e) {
    return update({ status: "error", error: e instanceof Error ? e.message : "search failed" });
  }

  const businesses = flattenResponse(searchData);
  if (businesses.length === 0) return update({ status: "no_business_match" });

  const topBusiness = pickTopBusinessWithOfficer(businesses);
  if (!topBusiness) return update({ status: "no_business_match" });

  const matchedCompany = topBusiness.companies[0];
  const matchedAddress = topBusiness.addresses[0]?.fullAddress;

  const officer = pickTopOfficer(topBusiness);
  if (!officer) {
    return update({ status: "no_officer", matchedCompany, matchedAddress });
  }

  update({ status: "enriching", matchedCompany, matchedAddress, officer });

  let enrichData: EnrichResponse & { error?: string };
  try {
    const res = await fetch("/api/enrich-contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: officer.firstName,
        lastName: officer.lastName,
        middleName: officer.middleName,
        addressLine1: officer.address?.addressLine1,
        addressLine2: officer.address?.addressLine2,
      }),
    });
    enrichData = await res.json();
    if (!res.ok) {
      return update({
        status: "error",
        error: `enrich: ${enrichData.error ?? `HTTP ${res.status}`}`,
        matchedCompany,
        matchedAddress,
        officer,
      });
    }
  } catch (e) {
    return update({
      status: "error",
      error: e instanceof Error ? e.message : "enrich failed",
      matchedCompany,
      matchedAddress,
      officer,
    });
  }

  if (!enrichData.person) {
    return update({
      status: "no_enrich_match",
      matchedCompany,
      matchedAddress,
      officer,
      enriched: enrichData,
    });
  }

  return update({
    status: "success",
    matchedCompany,
    matchedAddress,
    officer,
    enriched: enrichData,
  });
}

export async function runBulk(
  inputs: BulkInput[],
  onUpdate: (r: BulkResult) => void,
  onProgress?: (done: number, total: number) => void,
): Promise<BulkResult[]> {
  // Process serially. EnformionGo caps at 120 queries/min; each row makes 2
  // queries, so ~1 row/sec is the safe ceiling. Serial keeps us under that
  // without needing a backoff/retry layer for this MVP.
  const results: BulkResult[] = [];
  for (let i = 0; i < inputs.length; i++) {
    const r = await processBulkRow(i, inputs[i], onUpdate);
    results.push(r);
    onProgress?.(i + 1, inputs.length);
  }
  return results;
}

export function resultsToCsvRows(results: BulkResult[]): Record<string, string>[] {
  return results.map((r) => {
    const phone = latestPhone(r.enriched?.person?.phones);
    return {
      input_business_name: r.input.businessName,
      input_state: r.input.state,
      status: r.status,
      error: r.error ?? "",
      matched_company: r.matchedCompany ?? "",
      matched_address: r.matchedAddress ?? "",
      officer_name: r.officer?.fullName ?? "",
      officer_title: r.officer?.title ?? "",
      officer_age: r.enriched?.person?.age ? String(r.enriched.person.age) : "",
      officer_phone: toE164(phone?.number),
      officer_phone_type: phone?.type ?? "",
      officer_phone_last_seen: phone?.lastReportedDate ?? "",
      officer_emails: (r.enriched?.person?.emails ?? []).map((e) => e.email).join("; "),
      officer_recent_address: (() => {
        const a = r.enriched?.person?.addresses?.[0];
        if (!a) return "";
        return [
          [a.street, a.unit].filter(Boolean).join(" "),
          [a.city, a.state, a.zip].filter(Boolean).join(", "),
        ]
          .filter(Boolean)
          .join(", ");
      })(),
      identity_score:
        r.enriched?.identityScore !== undefined ? String(r.enriched.identityScore) : "",
    };
  });
}
