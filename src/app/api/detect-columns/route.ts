import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

type Body = {
  headers?: string[];
  sampleRows?: Record<string, string>[];
};

type DetectResult = {
  businessNameColumn: string | null;
  stateColumn: string | null;
};

const SCHEMA = {
  type: "object",
  properties: {
    businessNameColumn: {
      type: ["string", "null"],
      description:
        "The exact header (case-sensitive) for the column containing the business / company / organization name. Null if no such column exists.",
    },
    stateColumn: {
      type: ["string", "null"],
      description:
        "The exact header (case-sensitive) for the column containing the US state (2-letter code or full name). Null if no such column exists.",
    },
  },
  required: ["businessNameColumn", "stateColumn"],
  additionalProperties: false,
} as const;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not set — using fallback synonyms" },
      { status: 503 },
    );
  }

  let payload: Body;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const headers = payload.headers ?? [];
  const sampleRows = (payload.sampleRows ?? []).slice(0, 3);
  if (headers.length === 0) {
    return NextResponse.json({ error: "headers is required" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 512,
      thinking: { type: "disabled" },
      output_config: {
        format: { type: "json_schema", schema: SCHEMA },
      },
      system:
        "You classify CSV column headers for a business-owner lookup tool. " +
        "Given headers and a few sample rows, identify which column contains " +
        "the business/company name and which contains the US state. " +
        "Return the exact header strings, case-sensitive. If a column is " +
        "missing, return null for it.",
      messages: [
        {
          role: "user",
          content:
            `Headers: ${JSON.stringify(headers)}\n\n` +
            `Sample rows (up to 3):\n${JSON.stringify(sampleRows, null, 2)}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No text in Claude response" }, { status: 502 });
    }

    const parsed = JSON.parse(textBlock.text) as DetectResult;

    // Sanity-check Claude's output against the real header set —
    // protects against hallucinated header names.
    const headerSet = new Set(headers);
    const result: DetectResult = {
      businessNameColumn:
        parsed.businessNameColumn && headerSet.has(parsed.businessNameColumn)
          ? parsed.businessNameColumn
          : null,
      stateColumn:
        parsed.stateColumn && headerSet.has(parsed.stateColumn) ? parsed.stateColumn : null,
    };
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Anthropic API error ${err.status}: ${err.message}` },
        { status: 502 },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
