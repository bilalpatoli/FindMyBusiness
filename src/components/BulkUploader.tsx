"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { BULK_ROW_LIMIT, type BulkInput } from "@/lib/bulkRunner";

type Props = {
  disabled: boolean;
  onRowsParsed: (rows: BulkInput[]) => void;
};

type ParseError = { message: string };

function normalizeKey(k: string) {
  return k.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function BulkUploader({ disabled, onRowsParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    setFilename(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const errs: ParseError[] = res.errors.filter((e) => e.code !== "TooFewFields");
        if (errs.length > 0) {
          setError(`CSV parse error: ${errs[0].message}`);
          return;
        }

        const rows: BulkInput[] = [];
        for (const raw of res.data) {
          const normalized: Record<string, string> = {};
          for (const [k, v] of Object.entries(raw)) {
            normalized[normalizeKey(k)] = (v ?? "").trim();
          }
          const businessName =
            normalized.businessname ??
            normalized.name ??
            normalized.company ??
            normalized.title ??
            "";
          const state = normalized.state ?? normalized.st ?? "";
          if (!businessName) continue;
          rows.push({ businessName, state });
        }

        if (rows.length === 0) {
          setError(
            "No valid rows found. CSV needs a 'businessName' column (and optional 'state' column).",
          );
          return;
        }

        if (rows.length > BULK_ROW_LIMIT) {
          setError(`CSV has ${rows.length} rows, but the limit is ${BULK_ROW_LIMIT}.`);
          return;
        }

        onRowsParsed(rows);
      },
      error: (err) => setError(`CSV parse failed: ${err.message}`),
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          disabled
            ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 cursor-not-allowed opacity-60"
            : dragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950 cursor-pointer"
              : "border-zinc-300 dark:border-zinc-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer"
        }`}
      >
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {filename ? filename : "Drop CSV here or click to choose"}
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          Required column: <code className="font-mono">businessName</code>. Optional:{" "}
          <code className="font-mono">state</code>. Up to {BULK_ROW_LIMIT} rows.
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      {error && (
        <div className="mt-3 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
