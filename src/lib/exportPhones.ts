import Papa from "papaparse";
import type { EnrichPhone, EnrichResponse, FlattenedOfficer } from "./types";
import type { FlattenedBusiness } from "./flatten";
import type { BulkResult } from "./bulkRunner";

// EnformionGo's lastReportedDate comes as US-format "M/D/YYYY".
function parseLastReported(date?: string): number {
  if (!date) return 0;
  const parts = date.split("/");
  if (parts.length !== 3) return 0;
  const [m, d, y] = parts.map(Number);
  if (!y || !m || !d) return 0;
  return new Date(y, m - 1, d).getTime();
}

export function latestPhone(phones: EnrichPhone[] | undefined): EnrichPhone | undefined {
  if (!phones || phones.length === 0) return undefined;
  return phones.reduce((best, p) =>
    parseLastReported(p.lastReportedDate) > parseLastReported(best.lastReportedDate) ? p : best,
  );
}

// Normalize EnformionGo's "(408) 222-3212" format to E.164. EnformionGo data
// is US-only, so anything that comes out as 10 digits gets +1 prepended.
export function toE164(phone: string | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone;
}

export type PhoneExportRow = {
  phone_number: string;
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
    const p = latestPhone(e.enriched.person?.phones);
    if (!p) continue;
    const primaryEmail = e.enriched.person?.emails?.[0]?.email ?? "";
    rows.push({
      phone_number: toE164(p.number),
      type: p.type ?? "",
      connected: p.isConnected === undefined ? "" : String(p.isConnected),
      business_name: e.businessName,
      officer_name: e.officer.fullName,
      officer_title: e.officer.title ?? "",
      primary_email: primaryEmail,
    });
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
