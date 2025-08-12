// app/api/players-firestore/route.ts
import { NextResponse } from "next/server";

// This endpoint is not currently used but exists to prevent build errors
export async function GET() {
  return NextResponse.json(
    {
      message: "This endpoint is not currently implemented",
      status: "placeholder",
    },
    { status: 200 }
  );
}
