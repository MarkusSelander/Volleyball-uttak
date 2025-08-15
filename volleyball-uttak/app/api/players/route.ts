// app/api/players/route.ts
import { google } from "googleapis";
import { NextResponse } from "next/server";

// Kjør på Node-runtime (ikke Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Eksempeldata ved feil / manglende oppsett
const fallbackPlayers = [
  { name: "Anna Johansen" },
  { name: "Bjørn Olsen" },
  { name: "Cecilie Hansen" },
  { name: "David Berg" },
  { name: "Eva Nilsen" },
  { name: "Fredrik Svendsen" },
  { name: "Greta Andersen" },
  { name: "Henrik Pedersen" },
  { name: "Ingrid Larsen" },
  { name: "Johan Kristiansen" },
  { name: "Kari Solberg" },
  { name: "Lars Eriksen" },
  { name: "Mia Dahl" },
  { name: "Nils Jensen" },
  { name: "Oda Bakke" },
];

interface PlayerData {
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  previousPositions?: string;
  desiredPositions?: string;
  desiredLevel?: string;
  experience?: string;
  previousTeam?: string;
  isStudent?: string;
  attendance?: string;
  registrationNumber?: string; // Kolonne T - Registreringsnummer
  selectedForTeam?: string; // Kolonne S - Tatt ut på
  rowNumber?: number; // Radnummer i arket (1-basert)
}

export async function GET() {
  try {
    // ---- ENV-validering ----
    const EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const RAW_KEY = process.env.GOOGLE_PRIVATE_KEY;
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const RANGE = process.env.GOOGLE_SHEET_RANGE || "'Skjemasvar 1'!A:T"; // Leser til T for å få alle kolonner

    if (!EMAIL || !RAW_KEY || !SHEET_ID) {
      console.warn("[/api/players] Mangler ENV, bruker fallback.");
      return NextResponse.json({
        players: fallbackPlayers,
        source: "fallback",
        message:
          "Google Sheets ikke konfigurert (mangler ENV-variabler). Viser eksempeldata.",
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
    if (rows.length === 0) {
      console.warn("[/api/players] Ingen rader, bruker fallback.");
      return NextResponse.json({
        players: fallbackPlayers,
        source: "fallback",
        message: "Ingen data i spreadsheet, viser eksempeldata.",
      });
    }

    // Første rad antas å være header
    const [, ...dataRows] = rows;

    // Hjelper for trygg henting + trimming
    const get = (row: string[], idx: number) =>
      (row?.[idx] ?? "").toString().trim();

    // Filtrer på at kolonne C (index 2) – navn – ikke er tom
    const players: PlayerData[] = dataRows
      .filter((row) => get(row, 2) !== "")
      .map((row, i) => ({
        // Kolonne-mapping basert på beskrivelsen din:
        // A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12, N=13, O=14, P=15, Q=16, R=17, S=18, T=19
        name: get(row, 2), // C - Navn
        birthDate: get(row, 3), // D - Fødselsdato
        gender: get(row, 4), // E - Kjønn
        phone: get(row, 5), // F - Telefon
        previousTeam: get(row, 7), // H - Forrige lag (dersom Ja på G)
        isStudent: get(row, 8), // I - Student ved NTNU?
        previousPositions: get(row, 9), // J - Tidligere posisjoner
        desiredPositions: get(row, 10), // K - Ønskede posisjoner
        desiredLevel: get(row, 11), // L - Ønsket nivå
        experience: get(row, 12), // M - Erfaring
        email: get(row, 15), // P - E-post
        selectedForTeam: get(row, 18), // S - Tatt ut på
        registrationNumber: get(row, 19), // T - Registreringsnummer
        rowNumber: i + 2, // +1 for header, +1 for 1-basert radindeks
      }));

    // Enkel kompatibel liste (kun navn)
    const simplePlayers = players.map((p) => ({ name: p.name }));

    return NextResponse.json(
      {
        players: simplePlayers,
        detailedPlayers: players,
        totalRegistrations: players.length,
        source: "google-sheets",
        fetchedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[/api/players] Feil:", error.message, error.stack);
    return NextResponse.json(
      {
        players: fallbackPlayers,
        source: "fallback",
        message: "Feil ved henting fra Google Sheets – viser eksempeldata.",
        error: error.message ?? "Ukjent feil",
      },
      { status: 200 }
    );
  }
}
