"use client";

import type { FlattenedBusiness } from "@/lib/flatten";
import type { FlattenedOfficer } from "@/lib/types";
import { OfficerRow, type EnrichState } from "./OfficerRow";

type Props = {
  business: FlattenedBusiness;
  enrichedById: Map<string, EnrichState>;
  onEnrich: (officer: FlattenedOfficer) => void;
};

export function BusinessCard({ business, enrichedById, onEnrich }: Props) {
  return (
    <article className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {business.companies[0]}
        </h2>
        {business.companies.length > 1 && (
          <div className="text-xs text-zinc-500 mt-1">
            Also: {business.companies.slice(1).join(" • ")}
          </div>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        {business.addresses.length > 0 && (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">
              Addresses
            </div>
            <ul className="text-sm space-y-1">
              {business.addresses.slice(0, 4).map((a, i) => (
                <li key={i} className="text-zinc-700 dark:text-zinc-300">
                  {a.addressTypeDesc && (
                    <span className="text-xs text-zinc-500 mr-1">[{a.addressTypeDesc}]</span>
                  )}
                  {a.fullAddress}
                </li>
              ))}
            </ul>
          </div>
        )}

        {business.phones.length > 0 && (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">
              Business phones
            </div>
            <ul className="text-sm space-y-1">
              {business.phones.map((p) => (
                <li key={p}>
                  <a href={`tel:${p}`} className="text-blue-600 hover:underline">
                    {p}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-2">
          {business.officers.length > 0
            ? `Officers / contacts (${business.officers.length})`
            : "No officers listed"}
        </div>
        <div className="space-y-2">
          {business.officers.map((o) => (
            <OfficerRow
              key={o.id}
              officer={o}
              state={enrichedById.get(o.id)}
              onEnrich={onEnrich}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
