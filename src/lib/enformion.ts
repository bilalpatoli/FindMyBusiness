// Server-side EnformionGo API client.
// IMPORTANT: only import this from server code (API routes / server components).
// It reads credentials from env vars that must NEVER ship to the browser.

const BASE_URL = process.env.ENFORMION_BASE_URL ?? "https://devapi.enformion.com";
const AP_NAME = process.env.ENFORMION_AP_NAME ?? "";
const AP_PASSWORD = process.env.ENFORMION_AP_PASSWORD ?? "";

function assertCreds() {
  if (!AP_NAME || !AP_PASSWORD) {
    throw new Error(
      "EnformionGo credentials missing. Set ENFORMION_AP_NAME and ENFORMION_AP_PASSWORD in .env.local",
    );
  }
}

type GalaxyHeaders = {
  "Content-Type": string;
  "galaxy-ap-name": string;
  "galaxy-ap-password": string;
  "galaxy-search-type": string;
};

function buildHeaders(searchType: string): GalaxyHeaders {
  return {
    "Content-Type": "application/json",
    "galaxy-ap-name": AP_NAME,
    "galaxy-ap-password": AP_PASSWORD,
    "galaxy-search-type": searchType,
  };
}

async function postJson<T>(path: string, body: unknown, searchType: string): Promise<T> {
  assertCreds();
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(searchType),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`EnformionGo ${path} ${res.status}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`EnformionGo ${path} returned non-JSON: ${text.slice(0, 200)}`);
  }
}

// Endpoint paths and search-type headers — verify against EnformionGo docs
// when you have a chance. These match the conventional Galaxy/EnformionGo
// dispatch pattern: path + matching galaxy-search-type header.
const PATHS = {
  businessSearchV2: "/BusinessV2Search",
  contactEnrich: "/Contact/Enrich",
} as const;

const SEARCH_TYPES = {
  businessSearchV2: "BusinessV2",
  contactEnrich: "DevAPIContactEnrich",
} as const;

export type BusinessSearchInput = {
  businessName: string;
  state?: string; // 2-letter or full name — Enformion accepts either
  page?: number;
  resultsPerPage?: number;
};

export async function searchBusinessesV2(input: BusinessSearchInput) {
  const body = {
    BusinessName: input.businessName,
    AddressLine2: input.state ?? "",
    Page: input.page ?? 1,
    ResultsPerPage: input.resultsPerPage ?? 10,
  };
  return postJson<unknown>(PATHS.businessSearchV2, body, SEARCH_TYPES.businessSearchV2);
}

export type ContactEnrichInput = {
  firstName: string;
  lastName: string;
  middleName?: string;
  addressLine1?: string;
  addressLine2?: string;
};

export async function enrichContact(input: ContactEnrichInput) {
  const body: Record<string, unknown> = {
    FirstName: input.firstName,
    LastName: input.lastName,
  };
  if (input.middleName) body.MiddleName = input.middleName;
  if (input.addressLine1 || input.addressLine2) {
    // EnformionGo Contact Enrich takes a single Address object with lowercase keys.
    body.Address = {
      addressLine1: input.addressLine1 ?? "",
      addressLine2: input.addressLine2 ?? "",
    };
  }
  return postJson<unknown>(PATHS.contactEnrich, body, SEARCH_TYPES.contactEnrich);
}
