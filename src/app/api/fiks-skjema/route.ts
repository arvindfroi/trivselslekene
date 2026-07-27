import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gjesteDeltaker" BOOLEAN NOT NULL DEFAULT false`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Turnering" ADD COLUMN IF NOT EXISTS "girPoeng" BOOLEAN NOT NULL DEFAULT true`
    );
    return NextResponse.json({ ok: true, message: "Kolonner lagt til" });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
