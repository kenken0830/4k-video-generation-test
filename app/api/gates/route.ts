import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GateResult, GateStage } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assetId, date, stage, result, failCode, severity, hint, gateVersion } = body;
    if (!assetId || !date || !stage || !result) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    await prisma.qualityGateLog.create({
      data: {
        id: crypto.randomUUID(),
        assetId,
        date: new Date(date),
        stage: stage as GateStage,
        result: result as GateResult,
        failCode,
        severity,
        hint,
        gateVersion,
      },
    });
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
