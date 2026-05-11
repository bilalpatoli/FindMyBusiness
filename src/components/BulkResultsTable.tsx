"use client";

import type { BulkResult, BulkStatus } from "@/lib/bulkRunner";

const STATUS_LABELS: Record<BulkStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" },
  searching: { label: "Searching", className: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300" },
  enriching: { label: "Enriching", className: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300" },
  success: { label: "Success", className: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" },
  no_business_match: { label: "No business", className: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" },
  no_officer: { label: "No officer", className: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" },
  no_enrich_match: { label: "No enrich match", className: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300" },
  error: { label: "Error", className: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300" },
};

function topPhone(r: BulkResult): string {
  return r.enriched?.person?.phones?.[0]?.number ?? "";
}

function topEmail(r: BulkResult): string {
  return r.enriched?.person?.emails?.[0]?.email ?? "";
}

export function BulkResultsTable({ results }: { results: BulkResult[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Input</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Matched company</th>
            <th className="px-3 py-2 text-left">Top officer</th>
            <th className="px-3 py-2 text-left">Phone</th>
            <th className="px-3 py-2 text-left">Email</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {results.map((r) => {
            const status = STATUS_LABELS[r.status];
            return (
              <tr key={r.index} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="px-3 py-2 text-zinc-500 align-top">{r.index + 1}</td>
                <td className="px-3 py-2 align-top">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {r.input.businessName}
                  </div>
                  {r.input.state && (
                    <div className="text-xs text-zinc-500">{r.input.state}</div>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                  {r.error && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400 max-w-xs truncate" title={r.error}>
                      {r.error}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 align-top text-zinc-700 dark:text-zinc-300">
                  {r.matchedCompany ?? <span className="text-zinc-400">—</span>}
                </td>
                <td className="px-3 py-2 align-top text-zinc-700 dark:text-zinc-300">
                  {r.officer?.fullName ?? <span className="text-zinc-400">—</span>}
                  {r.officer?.title && (
                    <div className="text-xs text-zinc-500 truncate max-w-xs" title={r.officer.title}>
                      {r.officer.title}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  {topPhone(r) ? (
                    <a href={`tel:${topPhone(r)}`} className="text-blue-600 hover:underline">
                      {topPhone(r)}
                    </a>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  {topEmail(r) ? (
                    <a href={`mailto:${topEmail(r)}`} className="text-blue-600 hover:underline break-all">
                      {topEmail(r)}
                    </a>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
