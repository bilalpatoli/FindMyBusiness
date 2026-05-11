"use client";

import { useState } from "react";
import { SearchForm } from "@/components/SearchForm";
import { BusinessCard } from "@/components/BusinessCard";
import { flattenResponse, type FlattenedBusiness } from "@/lib/flatten";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FlattenedBusiness[] | null>(null);
  const [searched, setSearched] = useState<string | null>(null);

  async function handleSearch(input: { businessName: string; state: string }) {
    setLoading(true);
    setError(null);
    setResults(null);
    setSearched(`${input.businessName}${input.state ? ` • ${input.state}` : ""}`);
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Find My Business
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Search a business name + state, see registered owners and officers, click <span className="font-medium">Enrich</span> to pull contact info.
          </p>
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
          <div className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            {results.length === 0
              ? `No matches for ${searched}`
              : `${results.length} ${results.length === 1 ? "match" : "matches"} for ${searched}`}
          </div>
        )}

        <div className="space-y-4">
          {results?.map((b) => <BusinessCard key={b.id} business={b} />)}
        </div>
      </div>
    </div>
  );
}
