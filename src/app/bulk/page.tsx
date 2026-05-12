"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { BulkUploader } from "@/components/BulkUploader";
import { BulkResultsTable } from "@/components/BulkResultsTable";
import {
  runBulk,
  resultsToCsvRows,
  type BulkInput,
  type BulkResult,
} from "@/lib/bulkRunner";
import {
  downloadCsv,
  entriesFromBulk,
  phoneCsvFilename,
  toPhoneRows,
} from "@/lib/exportPhones";
import { US_STATES } from "@/lib/states";

type Phase = "idle" | "ready" | "running" | "done";

export default function BulkPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [inputs, setInputs] = useState<BulkInput[]>([]);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  // "" means "use whatever's in the CSV state column" (the original behavior).
  // Any value here overrides the CSV state for every row.
  const [stateOverride, setStateOverride] = useState<string>("");
  // Keep a mirror of results in a ref so the per-row update callback can mutate
  // in place without stale-closure issues from the running loop.
  const resultsRef = useRef<BulkResult[]>([]);

  const stats = useMemo(() => {
    const counts = { success: 0, no_match: 0, error: 0 };
    for (const r of results) {
      if (r.status === "success") counts.success++;
      else if (r.status === "error") counts.error++;
      else if (
        r.status === "no_business_match" ||
        r.status === "no_officer" ||
        r.status === "no_enrich_match"
      )
        counts.no_match++;
    }
    return counts;
  }, [results]);

  function handleRowsParsed(rows: BulkInput[]) {
    setInputs(rows);
    const initial: BulkResult[] = rows.map((input, i) => ({
      index: i,
      input,
      status: "pending",
    }));
    resultsRef.current = initial;
    setResults(initial);
    setProgress({ done: 0, total: rows.length });
    setPhase("ready");
  }

  async function handleStart() {
    setPhase("running");
    const effectiveInputs: BulkInput[] = stateOverride
      ? inputs.map((i) => ({ ...i, state: stateOverride }))
      : inputs;
    await runBulk(
      effectiveInputs,
      (r) => {
        resultsRef.current = resultsRef.current.map((existing) =>
          existing.index === r.index ? r : existing,
        );
        setResults([...resultsRef.current]);
      },
      (done, total) => setProgress({ done, total }),
    );
    setPhase("done");
  }

  function handleReset() {
    setInputs([]);
    setResults([]);
    resultsRef.current = [];
    setProgress({ done: 0, total: 0 });
    setPhase("idle");
  }

  function handleDownloadCsv() {
    const csv = Papa.unparse(resultsToCsvRows(results));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    link.download = `findmybusiness-bulk-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const phoneRows = useMemo(() => toPhoneRows(entriesFromBulk(results)), [results]);

  function handleDownloadPhones() {
    if (phoneRows.length === 0) return;
    downloadCsv(
      phoneRows as unknown as Record<string, string>[],
      phoneCsvFilename("findmybusiness-bulk"),
    );
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-6 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Bulk lookup
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Upload a CSV of businesses. Each row gets searched and the top officer auto-enriched. Up to 200 rows.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline shrink-0"
          >
            ← Single search
          </Link>
        </header>

        {phase === "idle" && (
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <BulkUploader disabled={false} onRowsParsed={handleRowsParsed} />
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                CSV format example
              </summary>
              <pre className="mt-2 rounded bg-zinc-100 dark:bg-zinc-800 p-3 text-xs overflow-x-auto">
{`businessName,state
El Gato Painting,CA
Acme Plumbing,TX
Smith Roofing LLC,FL`}
              </pre>
            </details>
          </section>
        )}

        {phase === "ready" && (
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
              <div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  Ready to process {inputs.length} {inputs.length === 1 ? "row" : "rows"}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Each row uses 1 business search + 1 contact enrichment match. Estimated time: ~
                  {Math.ceil(inputs.length * 1.5)}s.
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3 shrink-0">
                <div>
                  <label
                    htmlFor="state-override"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    State for all rows
                  </label>
                  <select
                    id="state-override"
                    value={stateOverride}
                    onChange={(e) => setStateOverride(e.target.value)}
                    className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Use state column from CSV</option>
                    {US_STATES.map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStart}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Start processing
                  </button>
                </div>
              </div>
            </div>
            {stateOverride && (
              <div className="mb-3 text-xs text-blue-700 dark:text-blue-300">
                All rows will be searched in <span className="font-medium">{stateOverride}</span>, overriding the CSV state column.
              </div>
            )}
            <BulkResultsTable results={results} />
          </section>
        )}

        {(phase === "running" || phase === "done") && (
          <section className="space-y-4">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {phase === "running"
                      ? `Processing ${progress.done} of ${progress.total}`
                      : `Done — ${progress.total} ${progress.total === 1 ? "row" : "rows"} processed`}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {stats.success} success • {stats.no_match} no match • {stats.error} error
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {phase === "done" && (
                    <>
                      <button
                        onClick={handleReset}
                        className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        New upload
                      </button>
                      <button
                        onClick={handleDownloadPhones}
                        disabled={phoneRows.length === 0}
                        title={
                          phoneRows.length === 0
                            ? "No enriched phones available"
                            : `${phoneRows.length} phones across ${results.filter((r) => r.enriched?.person?.phones?.length).length} officers`
                        }
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-zinc-400 disabled:cursor-not-allowed"
                      >
                        Export phones ({phoneRows.length})
                      </button>
                      <button
                        onClick={handleDownloadCsv}
                        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                      >
                        Download CSV
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full bg-blue-600 transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <BulkResultsTable results={results} />
          </section>
        )}
      </div>
    </div>
  );
}
