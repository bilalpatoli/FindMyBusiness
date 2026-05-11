// Types for EnformionGo API responses.
// These cover the fields we actually use in the UI — not every field returned.

export type EnformionAddress = {
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  houseNumber?: string;
  streetName?: string;
  streetPreDirection?: string;
  streetPostDirection?: string;
  unit?: string;
  unitType?: string;
  addressLine1?: string;
  addressLine2?: string;
  fullAddress?: string;
  addressTypeDesc?: string;
};

export type EnformionPhone = {
  phoneNumber?: string;
  phoneTypeDesc?: string | null;
  wirelessFlag?: boolean | null;
  dncFlag?: boolean | null;
};

export type EnformionName = {
  firstName?: string;
  lastName?: string;
  middleInit?: string;
  middleName?: string;
  suffix?: string;
  fullName?: string;
  nameFirst?: string;
  nameLast?: string;
  nameMiddle?: string;
  nameRaw?: string;
  tahoeId?: string | null;
};

export type Officer = {
  name: EnformionName;
  title?: string | null;
  startDate?: string | null;
  address?: EnformionAddress | null;
  email?: string | null;
};

export type Contact = {
  contactTypeDesc?: string;
  officerTitleDesc?: string;
  name: EnformionName;
  tahoeId?: string | null;
};

export type NewBusinessFiling = {
  poseidonId?: number;
  company?: string;
  description?: string | null;
  addresses?: EnformionAddress[];
  phones?: EnformionPhone[];
  contacts?: Contact[];
  emails?: unknown[];
  licenseTypeDesc?: string | null;
};

export type UsCorpFiling = {
  poseidonId?: number;
  name?: string;
  rawName?: string;
  corpFileKey?: string;
  corpStatus?: string;
  corpStatusDate?: string;
  corpType?: string;
  filingDate?: string;
  officers?: Officer[];
  corpMainAddresses?: EnformionAddress[];
  phones?: EnformionPhone[] | null;
};

export type BusinessRecord = {
  poseidonId: number;
  uccFilings?: unknown[];
  newBusinessFilings?: NewBusinessFiling[];
  usCorpFilings?: UsCorpFiling[];
};

export type BusinessSearchResponse = {
  businessV2Records?: BusinessRecord[];
  // EnformionGo may return additional metadata fields — we ignore them.
};

// Flattened officer that we send to the client UI — pulls together the bits
// the front-end actually needs without making it crawl the nested shape.
export type FlattenedOfficer = {
  id: string; // stable key built from name + address
  firstName: string;
  lastName: string;
  middleName?: string;
  fullName: string;
  title?: string;
  source: "usCorp" | "newBusiness";
  company: string;
  tahoeId?: string | null;
  address?: EnformionAddress | null;
};

// Contact Enrich actual response shape (DevAPIContactEnrich).
export type EnrichPhone = {
  number: string;
  type?: "mobile" | "landline" | string;
  isConnected?: boolean;
  firstReportedDate?: string;
  lastReportedDate?: string;
};

export type EnrichEmail = {
  email: string;
  isValidated?: boolean;
  isBusiness?: boolean;
};

export type EnrichHistoricalAddress = {
  street?: string;
  unit?: string;
  city?: string;
  state?: string;
  zip?: string;
  firstReportedDate?: string;
  lastReportedDate?: string;
};

export type EnrichPerson = {
  name?: { firstName?: string; middleName?: string; lastName?: string };
  age?: string | number;
  phones?: EnrichPhone[];
  emails?: EnrichEmail[];
  addresses?: EnrichHistoricalAddress[];
};

export type EnrichResponse = {
  person?: EnrichPerson;
  message?: string;
  identityScore?: number;
  isError?: boolean;
};
