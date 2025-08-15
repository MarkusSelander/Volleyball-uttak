// app/api/debug-players/route.ts
import { google } from "googleapis";
import { NextResponse } from "next/server";

// Kjør på Node-runtime (ikke Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ---- ENV-validering ----
    const EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const RAW_KEY = process.env.GOOGLE_PRIVATE_KEY;
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const RANGE = process.env.GOOGLE_SHEET_RANGE || "'Skjemasvar 1'!A:T";

    console.log("DEBUG - Environment check:", {
      hasEmail: !!EMAIL,
      hasKey: !!RAW_KEY,
      hasSheetId: !!SHEET_ID,
      range: RANGE,
    });

    if (!EMAIL || !RAW_KEY || !SHEET_ID) {
      return NextResponse.json({
        error: "Missing environment variables",
        env: {
          hasEmail: !!EMAIL,
          hasKey: !!RAW_KEY,
          hasSheetId: !!SHEET_ID,
          range: RANGE,
        },
      });
    }

    // Håndter \n i private key
    const KEY = RAW_KEY.includes("\\n")
      ? RAW_KEY.replace(/\\n/g, "\n")
      : RAW_KEY;

    // ---- Auth + klient ----
    const auth = new google.auth.JWT({
      email: EMAIL,
      key: KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // ---- Hent data ----
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
      majorDimension: "ROWS",
    });

    const rows: string[][] = (resp.data.values as string[][]) ?? [];
    console.log("DEBUG - Raw data:", {
      totalRows: rows.length,
      firstRowLength: rows[0]?.length,
      headerRow: rows[0],
      sampleDataRow: rows[1],
      lastColumnIndex: 19,
      registrationNumberSample: rows.slice(1, 4).map((row, i) => ({
        rowIndex: i + 1,
        name: row[2],
        registrationNumber: row[19],
        totalColumns: row.length,
      })),
    });

    // Hjelper for trygg henting + trimming
    const get = (row: string[], idx: number) =>
      (row?.[idx] ?? "").toString().trim();

    // Filtrer på at kolonne C (index 2) – navn – ikke er tom
    const players = rows
      .slice(1) // Skip header
      .filter((row) => get(row, 2) !== "")
      .slice(0, 3) // Just first 3 for debugging
      .map((row, i) => ({
        name: get(row, 2), // C - Navn
        email: get(row, 15), // P - E-post
        registrationNumber: get(row, 19), // T - Registreringsnummer
        rawRegistrationNumber: row[19], // Raw value
        rowLength: row.length,
        rowNumber: i + 2,
      }));

    return NextResponse.json({
      debug: true,
      env: {
        hasEmail: !!EMAIL,
        hasKey: !!RAW_KEY,
        hasSheetId: !!SHEET_ID,
        range: RANGE,
      },
      rawData: {
        totalRows: rows.length,
        firstRowLength: rows[0]?.length,
        headerRow: rows[0],
      },
      players,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[/api/debug-players] Feil:", error.message, error.stack);
    return NextResponse.json(
      {
        error: error.message ?? "Ukjent feil",
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
