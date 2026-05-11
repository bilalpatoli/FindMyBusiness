import Papa from "papaparse";
import type { EnrichResponse, FlattenedOfficer } from "./types";
import type { FlattenedBusiness } from "./flatten";
import type { BulkResult } from "./bulkRunner";

export type PhoneExportRow = {
  phone: string;
  type: string;
  connected: string;
  business_name: string;
  officer_name: string;
  officer_title: string;
  primary_email: string;
};

export type EnrichedOfficerEntry = {
  businessName: string;
  officer: FlattenedOfficer;
  enriched: EnrichResponse;
};

export function toPhoneRows(entries: EnrichedOfficerEntry[]): PhoneExportRow[] {
  const rows: PhoneExportRow[] = [];
  for (const e of entries) {
    const phones = e.enriched.person?.phones ?? [];
    const primaryEmail = e.enriched.person?.emails?.[0]?.email ?? "";
    for (const p of phones) {
      rows.push({
        phone: p.number,
        type: p.type ?? "",
        connected: p.isConnected === undefined ? "" : String(p.isConnected),
        business_name: e.businessName,
        officer_name: e.officer.fullName,
        officer_title: e.officer.title ?? "",
        primary_email: primaryEmail,
      });
    }
  }
  return rows;
}

export function downloadCsv(rows: Record<string, string>[], filename: string) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function entriesFromBulk(results: BulkResult[]): EnrichedOfficerEntry[] {
  const out: EnrichedOfficerEntry[] = [];
  for (const r of results) {
    if (!r.officer || !r.enriched?.person?.phones?.length) continue;
    out.push({
      businessName: r.matchedCompany ?? r.input.businessName,
      officer: r.officer,
      enriched: r.enriched,
    });
  }
  return out;
}

export function entriesFromSearch(
  businesses: FlattenedBusiness[],
  enrichedById: Map<string, EnrichResponse>,
): EnrichedOfficerEntry[] {
  const out: EnrichedOfficerEntry[] = [];
  for (const biz of businesses) {
    for (const officer of biz.officers) {
      const enriched = enrichedById.get(officer.id);
      if (!enriched?.person?.phones?.length) continue;
      out.push({
        businessName: biz.companies[0] ?? "",
        officer,
        enriched,
      });
    }
  }
  return out;
}

export function phoneCsvFilename(prefix: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-phones-${stamp}.csv`;
}
