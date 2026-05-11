import type {
  BusinessRecord,
  BusinessSearchResponse,
  EnformionAddress,
  EnformionPhone,
  FlattenedOfficer,
} from "./types";

export type FlattenedBusiness = {
  id: string;
  companies: string[]; // a single poseidonId record can carry both a license filing AND a corp filing — surface all names
  addresses: EnformionAddress[];
  phones: string[];
  officers: FlattenedOfficer[];
  raw: BusinessRecord;
};

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function officerIdFor(name: { firstName?: string; lastName?: string }, addr?: EnformionAddress | null) {
  return [name.firstName, name.lastName, addr?.addressLine1, addr?.zip].filter(Boolean).join("|");
}

function dedupePhones(phones: EnformionPhone[] | null | undefined): string[] {
  const set = new Set<string>();
  for (const p of phones ?? []) {
    if (p?.phoneNumber) set.add(p.phoneNumber);
  }
  return [...set];
}

function dedupeAddresses(addrs: EnformionAddress[] | undefined): EnformionAddress[] {
  const seen = new Set<string>();
  const out: EnformionAddress[] = [];
  for (const a of addrs ?? []) {
    const key = a.fullAddress ?? `${a.addressLine1}|${a.zip}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(a);
    }
  }
  return out;
}

export function flattenBusiness(record: BusinessRecord): FlattenedBusiness {
  const companies = new Set<string>();
  const addresses: EnformionAddress[] = [];
  const phones: EnformionPhone[] = [];
  const officers: FlattenedOfficer[] = [];

  for (const nbf of record.newBusinessFilings ?? []) {
    if (nbf.company) companies.add(nbf.company);
    if (nbf.addresses) addresses.push(...nbf.addresses);
    if (nbf.phones) phones.push(...nbf.phones);

    for (const c of nbf.contacts ?? []) {
      const firstName = safeStr(c.name?.firstName);
      const lastName = safeStr(c.name?.lastName);
      if (!firstName && !lastName) continue;
      // Skip contacts that are actually the company itself listed as an officer
      if (c.name?.fullName && nbf.company && c.name.fullName.toUpperCase() === nbf.company.toUpperCase()) continue;
      const addr = nbf.addresses?.[0] ?? null;
      officers.push({
        id: officerIdFor({ firstName, lastName }, addr),
        firstName,
        lastName,
        middleName: safeStr(c.name?.middleInit) || undefined,
        fullName: safeStr(c.name?.fullName) || `${firstName} ${lastName}`.trim(),
        title: c.officerTitleDesc ?? c.contactTypeDesc,
        source: "newBusiness",
        company: nbf.company ?? "",
        tahoeId: c.tahoeId ?? null,
        address: addr,
      });
    }
  }

  for (const corp of record.usCorpFilings ?? []) {
    if (corp.name) companies.add(corp.name);
    if (corp.corpMainAddresses) addresses.push(...corp.corpMainAddresses);
    if (corp.phones) phones.push(...corp.phones);

    for (const o of corp.officers ?? []) {
      const firstName = safeStr(o.name?.nameFirst ?? o.name?.firstName);
      const lastName = safeStr(o.name?.nameLast ?? o.name?.lastName);
      if (!firstName && !lastName) continue;
      // Filter out obvious junk where Enformion parsed a status string as a name
      if (lastName.toLowerCase().includes("resigned")) continue;
      officers.push({
        id: officerIdFor({ firstName, lastName }, o.address),
        firstName,
        lastName,
        middleName: safeStr(o.name?.nameMiddle) || undefined,
        fullName: safeStr(o.name?.nameRaw) || `${firstName} ${lastName}`.trim(),
        title: o.title ?? undefined,
        source: "usCorp",
        company: corp.name ?? "",
        tahoeId: typeof o.name?.tahoeId === "string" ? o.name.tahoeId : null,
        address: o.address,
      });
    }
  }

  // Dedupe officers by id, preferring entries that carry a tahoeId
  const byId = new Map<string, FlattenedOfficer>();
  for (const o of officers) {
    const existing = byId.get(o.id);
    if (!existing || (!existing.tahoeId && o.tahoeId)) byId.set(o.id, o);
  }

  return {
    id: String(record.poseidonId),
    companies: [...companies],
    addresses: dedupeAddresses(addresses),
    phones: dedupePhones(phones),
    officers: [...byId.values()],
    raw: record,
  };
}

export function flattenResponse(resp: BusinessSearchResponse | unknown): FlattenedBusiness[] {
  const records = (resp as BusinessSearchResponse)?.businessV2Records ?? [];
  return records.map(flattenBusiness).filter((b) => b.companies.length > 0);
}
