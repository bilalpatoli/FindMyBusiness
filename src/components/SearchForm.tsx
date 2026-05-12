"use client";

import { useState, FormEvent } from "react";
import { US_STATES } from "@/lib/states";

const STATE_OPTIONS: ReadonlyArray<readonly [string, string]> = [["", "All states"], ...US_STATES];

type Props = {
  onSearch: (input: { businessName: string; state: string }) => void;
  loading: boolean;
};

export function SearchForm({ onSearch, loading }: Props) {
  const [businessName, setBusinessName] = useState("");
  const [state, setState] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!businessName.trim()) return;
    onSearch({ businessName: businessName.trim(), state });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="businessName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Business name
        </label>
        <input
          id="businessName"
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. El Gato Painting"
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      <div className="sm:w-48">
        <label htmlFor="state" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          State
        </label>
        <select
          id="state"
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATE_OPTIONS.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed"
      >
        {loading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
