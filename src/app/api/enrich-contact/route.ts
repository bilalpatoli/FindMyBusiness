import { NextResponse } from "next/server";
import { enrichContact } from "@/lib/enformion";

export const runtime = "nodejs";

type Body = {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  addressLine1?: string;
  addressLine2?: string;
};

export async function POST(req: Request) {
  let payload: Body;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const firstName = (payload.firstName ?? "").trim();
  const lastName = (payload.lastName ?? "").trim();
  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "firstName and lastName are required" },
      { status: 400 },
    );
  }

  try {
    const data = await enrichContact({
      firstName,
      lastName,
      middleName: payload.middleName?.trim() || undefined,
      addressLine1: payload.addressLine1?.trim() || undefined,
      addressLine2: payload.addressLine2?.trim() || undefined,
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
