"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { BusinessCard } from "@/components/BusinessCard";
import type { EnrichState } from "@/components/OfficerRow";
import { flattenResponse, type FlattenedBusiness } from "@/lib/flatten";
import type { EnrichResponse, FlattenedOfficer } from "@/lib/types";
import {
  downloadCsv,
  entriesFromSearch,
  phoneCsvFilename,
  toPhoneRows,
} from "@/lib/exportPhones";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FlattenedBusiness[] | null>(null);
  const [searched, setSearched] = useState<string | null>(null);
  const [enrichedById, setEnrichedById] = useState<Map<string, EnrichState>>(new Map());
  const [enrichAllProgress, setEnrichAllProgress] = useState<{ done: number; total: number } | null>(null);
  // Mirror in a ref so the serial loop can read the latest map without stale closures.
  const enrichedRef = useRef<Map<string, EnrichState>>(new Map());

  function updateEnrich(officerId: string, patch: Partial<EnrichState>) {
    const next = new Map(enrichedRef.current);
    const prev = next.get(officerId) ?? { loading: false };
    const merged: EnrichState = { ...prev, ...patch };
    next.set(officerId, merged);
    enrichedRef.current = next;
    setEnrichedById(next);
  }

  async function enrichOfficer(officer: FlattenedOfficer): Promise<EnrichResponse | null> {
    updateEnrich(officer.id, { loading: true, error: undefined });
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
      const data: EnrichResponse & { error?: string } = await res.json();
      if (!res.ok) {
        updateEnrich(officer.id, { loading: false, error: data.error ?? `HTTP ${res.status}` });
        return null;
      }
      updateEnrich(officer.id, { loading: false, result: data });
      return data;
    } catch (err) {
      updateEnrich(officer.id, {
        loading: false,
        error: err instanceof Error ? err.message : "Network error",
      });
      return null;
    }
  }

  async function handleSearch(input: { businessName: string; state: string }) {
    setLoading(true);
    setError(null);
    setResults(null);
    setSearched(`${input.businessName}${input.state ? ` • ${input.state}` : ""}`);
    enrichedRef.current = new Map();
    setEnrichedById(new Map());
    setEnrichAllProgress(null);
    try {
      const res = await fetch("/api/business-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setResults(flattenResponse(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  const allOfficers = useMemo(() => {
    if (!results) return [];
    return results.flatMap((b) => b.officers);
  }, [results]);

  const unenrichedCount = useMemo(() => {
    return allOfficers.filter((o) => {
      const s = enrichedById.get(o.id);
      return !s?.result;
    }).length;
  }, [allOfficers, enrichedById]);

  const phoneRows = useMemo(() => {
    if (!results) return [];
    return toPhoneRows(
      entriesFromSearch(
        results,
        new Map(
          [...enrichedById.entries()]
            .filter(([, s]) => s.result !== undefined)
            .map(([id, s]) => [id, s.result as EnrichResponse]),
        ),
      ),
    );
  }, [results, enrichedById]);

  async function handleEnrichAll() {
    const toEnrich = allOfficers.filter((o) => !enrichedRef.current.get(o.id)?.result);
    if (toEnrich.length === 0) return;
    setEnrichAllProgress({ done: 0, total: toEnrich.length });
    for (let i = 0; i < toEnrich.length; i++) {
      await enrichOfficer(toEnrich[i]);
      setEnrichAllProgress({ done: i + 1, total: toEnrich.length });
    }
    setEnrichAllProgress(null);
  }

  function handleExportPhones() {
    if (phoneRows.length === 0) return;
    downloadCsv(
      phoneRows as unknown as Record<string, string>[],
      phoneCsvFilename("findmybusiness-search"),
    );
  }

  const enrichAllRunning = enrichAllProgress !== null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Find My Business
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Search a business name + state, see registered owners and officers, click <span className="font-medium">Enrich</span> to pull contact info.
            </p>
          </div>
          <Link href="/bulk" className="text-sm text-blue-600 hover:underline shrink-0">
            Bulk upload →
          </Link>
        </header>

        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm mb-8">
          <SearchForm onSearch={handleSearch} loading={loading} />
        </section>

        {error && (
          <div className="mb-6 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4 text-sm text-red-700 dark:text-red-300">
            <div className="font-medium mb-1">Search failed</div>
            <div>{error}</div>
          </div>
        )}

        {searched && !loading && !error && results && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {results.length === 0
                ? `No matches for ${searched}`
                : `${results.length} ${results.length === 1 ? "match" : "matches"} for ${searched} • ${allOfficers.length} officers`}
              {enrichAllRunning && enrichAllProgress && (
                <span className="ml-2 text-blue-600">
                  · Enriching {enrichAllProgress.done} / {enrichAllProgress.total}
                </span>
              )}
            </div>
            {allOfficers.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleEnrichAll}
                  disabled={enrichAllRunning || unenrichedCount === 0}
                  title={
                    unenrichedCount === 0
                      ? "All officers already enriched"
                      : `Run contact enrichment on ${unenrichedCount} officer${unenrichedCount === 1 ? "" : "s"}`
                  }
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:bg-zinc-400 disabled:cursor-not-allowed"
                >
                  {enrichAllRunning
                    ? `Enriching… ${enrichAllProgress?.done}/${enrichAllProgress?.total}`
                    : `Enrich all (${unenrichedCount})`}
                </button>
                <button
                  onClick={handleExportPhones}
                  disabled={phoneRows.length === 0}
                  title={
                    phoneRows.length === 0
                      ? "Enrich at least one officer to export phones"
                      : `${phoneRows.length} phones available`
                  }
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:bg-zinc-400 disabled:cursor-not-allowed"
                >
                  Export phones ({phoneRows.length})
                </button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {results?.map((b) => (
            <BusinessCard
              key={b.id}
              business={b}
              enrichedById={enrichedById}
              onEnrich={enrichOfficer}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
