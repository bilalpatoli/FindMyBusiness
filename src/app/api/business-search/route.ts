import { NextResponse } from "next/server";
import { searchBusinessesV2 } from "@/lib/enformion";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let payload: { businessName?: string; state?: string; page?: number; resultsPerPage?: number };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const businessName = (payload.businessName ?? "").trim();
  if (!businessName) {
    return NextResponse.json({ error: "businessName is required" }, { status: 400 });
  }

  try {
    const data = await searchBusinessesV2({
      businessName,
      state: payload.state?.trim() || undefined,
      page: payload.page,
      resultsPerPage: payload.resultsPerPage,
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
