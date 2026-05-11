"use client";

import type { FlattenedOfficer, EnrichResponse } from "@/lib/types";

export type EnrichState = {
  loading: boolean;
  error?: string;
  result?: EnrichResponse;
};

type Props = {
  officer: FlattenedOfficer;
  state: EnrichState | undefined;
  onEnrich: (officer: FlattenedOfficer) => void;
};

function formatHistoricalAddress(a: NonNullable<NonNullable<EnrichResponse["person"]>["addresses"]>[number]) {
  const parts = [
    [a?.street, a?.unit].filter(Boolean).join(" "),
    [a?.city, a?.state, a?.zip].filter(Boolean).join(", "),
  ].filter(Boolean);
  return parts.join(", ");
}

export function OfficerRow({ officer, state, onEnrich }: Props) {
  const s = state ?? { loading: false };
  const person = s.result?.person;
  const noMatch = s.result && !person;

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-md p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {officer.fullName}
          </div>
          {officer.title && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {officer.title}
            </div>
          )}
          {officer.address?.fullAddress && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {officer.address.fullAddress}
            </div>
          )}
        </div>
        <button
          onClick={() => onEnrich(officer)}
          disabled={s.loading}
          className="shrink-0 inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:bg-zinc-400 disabled:cursor-not-allowed"
        >
          {s.loading ? "Enriching…" : s.result ? "Re-enrich" : "Enrich"}
        </button>
      </div>

      {s.error && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">{s.error}</div>
      )}

      {noMatch && (
        <div className="mt-2 text-xs text-zinc-500">
          No strong match found. Try a different officer or address.
        </div>
      )}

      {person && (
        <div className="mt-3 border-t border-zinc-200 dark:border-zinc-800 pt-3 space-y-3 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            {person.age !== undefined && (
              <span>
                Age: <span className="text-zinc-900 dark:text-zinc-100 font-medium">{person.age}</span>
              </span>
            )}
            {s.result?.identityScore !== undefined && (
              <span>
                Match score:{" "}
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">{s.result.identityScore}</span>
              </span>
            )}
            {person.name && (person.name.firstName || person.name.lastName) && (
              <span>
                Confirmed name:{" "}
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                  {[person.name.firstName, person.name.middleName, person.name.lastName]
                    .filter(Boolean)
                    .join(" ")}
                </span>
              </span>
            )}
          </div>

          {person.phones && person.phones.length > 0 && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">
                Phones
              </div>
              <ul className="space-y-1">
                {person.phones.map((p, i) => (
                  <li key={p.number + i} className="flex items-baseline gap-2 flex-wrap">
                    <a href={`tel:${p.number}`} className="text-blue-600 hover:underline font-medium">
                      {p.number}
                    </a>
                    {p.type && (
                      <span className="text-[10px] uppercase tracking-wide text-zinc-500">{p.type}</span>
                    )}
                    {p.isConnected === false && (
                      <span className="text-[10px] uppercase tracking-wide text-red-500">disconnected</span>
                    )}
                    {p.lastReportedDate && (
                      <span className="text-[10px] text-zinc-400">last seen {p.lastReportedDate}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {person.emails && person.emails.length > 0 && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">
                Emails
              </div>
              <ul className="space-y-1">
                {person.emails.map((e, i) => (
                  <li key={e.email + i} className="flex items-baseline gap-2 flex-wrap">
                    <a href={`mailto:${e.email}`} className="text-blue-600 hover:underline break-all">
                      {e.email}
                    </a>
                    {e.isValidated && (
                      <span className="text-[10px] uppercase tracking-wide text-emerald-600">validated</span>
                    )}
                    {e.isBusiness && (
                      <span className="text-[10px] uppercase tracking-wide text-zinc-500">business</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {person.addresses && person.addresses.length > 0 && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">
                Recent addresses
              </div>
              <ul className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                {person.addresses.map((a, i) => (
                  <li key={i}>
                    {formatHistoricalAddress(a)}
                    {a.lastReportedDate && (
                      <span className="text-zinc-400 ml-2">(last seen {a.lastReportedDate})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details>
            <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700">
              View raw response
            </summary>
            <pre className="mt-1 text-[10px] bg-zinc-100 dark:bg-zinc-900 p-2 rounded overflow-auto max-h-64">
              {JSON.stringify(s.result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
