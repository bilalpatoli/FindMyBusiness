"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { BULK_ROW_LIMIT, type BulkInput } from "@/lib/bulkRunner";

type Props = {
  disabled: boolean;
  onRowsParsed: (rows: BulkInput[]) => void;
};

type ParseError = { message: string };

type DetectMethod = "claude" | "synonyms";

type ColumnMapping = {
  businessNameColumn: string | null;
  stateColumn: string | null;
  method: DetectMethod;
};

function normalizeKey(k: string) {
  return k.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Fallback used when the Anthropic key isn't set or Claude detection fails.
function detectViaSynonyms(headers: string[]): ColumnMapping {
  const synonymMap = new Map<string, string>();
  for (const h of headers) {
    synonymMap.set(normalizeKey(h), h);
  }
  const businessNameKeys = ["businessname", "name", "company", "title"];
  const stateKeys = ["state", "st"];
  return {
    businessNameColumn:
      businessNameKeys.map((k) => synonymMap.get(k)).find((v) => v !== undefined) ?? null,
    stateColumn:
      stateKeys.map((k) => synonymMap.get(k)).find((v) => v !== undefined) ?? null,
    method: "synonyms",
  };
}

async function detectColumns(
  headers: string[],
  sampleRows: Record<string, string>[],
): Promise<ColumnMapping> {
  try {
    const res = await fetch("/api/detect-columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headers, sampleRows }),
    });
    if (!res.ok) return detectViaSynonyms(headers);
    const data = (await res.json()) as { businessNameColumn: string | null; stateColumn: string | null };
    if (!data.businessNameColumn) return detectViaSynonyms(headers);
    return { ...data, method: "claude" };
  } catch {
    return detectViaSynonyms(headers);
  }
}

export function BulkUploader({ disabled, onRowsParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [lastDetection, setLastDetection] = useState<ColumnMapping | null>(null);

  function handleFile(file: File) {
    setError(null);
    setLastDetection(null);
    setFilename(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const errs: ParseError[] = res.errors.filter((e) => e.code !== "TooFewFields");
        if (errs.length > 0) {
          setError(`CSV parse error: ${errs[0].message}`);
          return;
        }

        const headers = res.meta.fields ?? [];
        if (headers.length === 0) {
          setError("CSV has no header row.");
          return;
        }

        setDetecting(true);
        const mapping = await detectColumns(headers, res.data.slice(0, 3));
        setDetecting(false);
        setLastDetection(mapping);

        if (!mapping.businessNameColumn) {
          setError(
            "Couldn't find a business-name column. Expected a header like 'businessName', 'company', 'name', or 'title'.",
          );
          return;
        }

        const rows: BulkInput[] = [];
        for (const raw of res.data) {
          const businessName = (raw[mapping.businessNameColumn] ?? "").trim();
          const state = mapping.stateColumn ? (raw[mapping.stateColumn] ?? "").trim() : "";
          if (!businessName) continue;
          rows.push({ businessName, state });
        }

        if (rows.length === 0) {
          setError(
            `No valid rows: every row had an empty '${mapping.businessNameColumn}' value.`,
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
        onClick={() => !disabled && !detecting && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          disabled || detecting
            ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 cursor-not-allowed opacity-60"
            : dragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950 cursor-pointer"
              : "border-zinc-300 dark:border-zinc-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer"
        }`}
      >
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {detecting ? "Detecting columns with Claude…" : filename ? filename : "Drop CSV here or click to choose"}
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          Column names auto-detected. Up to {BULK_ROW_LIMIT} rows.
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
      {lastDetection?.businessNameColumn && (
        <div className="mt-3 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 p-3 text-xs text-emerald-700 dark:text-emerald-300">
          <span className="font-medium">
            {lastDetection.method === "claude" ? "Claude detected:" : "Matched by header name:"}
          </span>{" "}
          business = <code className="font-mono">{lastDetection.businessNameColumn}</code>
          {lastDetection.stateColumn && (
            <>
              {" "}• state = <code className="font-mono">{lastDetection.stateColumn}</code>
            </>
          )}
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
