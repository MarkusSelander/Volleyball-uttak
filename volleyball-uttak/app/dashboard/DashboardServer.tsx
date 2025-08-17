// app/dashboard/DashboardServer.tsx
import { google } from "googleapis";
import DashboardClient from "./DashboardClient";

// ISR - revalidate data every 2 minutes (120 seconds) for better user experience
// Frequent updates to ensure new players appear quickly
export const revalidate = 120;

interface PlayerData {
  name: string;
  email?: string;
  phone?: number;
  gender?: string;
  birthDate?: string;
  year?: string;
  previousPositions?: string;
  desiredPositions?: string;
  desiredLevel?: string;
  experience?: string;
  previousTeam?: string;
  isStudent?: string;
  level?: string;
  attendance?: string;
  availability?: string;
  registrationNumber?: string;
  rowNumber?: number;
  selectedForTeam?: string;
}

// Fallback data for development/demo
const fallbackPlayers: PlayerData[] = [
  {
    name: "Anna Johansen",
    gender: "kvinne / female",
    isStudent: "ja",
    desiredPositions: "libero",
    desiredLevel: "2",
    rowNumber: 1,
  },
  {
    name: "Bjørn Olsen",
    gender: "mann / male",
    isStudent: "nei",
    desiredPositions: "midt",
    desiredLevel: "1",
    rowNumber: 2,
  },
  {
    name: "Cecilie Hansen",
    gender: "kvinne / female",
    isStudent: "ja",
    desiredPositions: "kant",
    desiredLevel: "3",
    rowNumber: 3,
  },
  {
    name: "David Berg",
    gender: "mann / male",
    isStudent: "ja",
    desiredPositions: "legger",
    desiredLevel: "2",
    rowNumber: 4,
  },
  {
    name: "Eva Nilsen",
    gender: "kvinne / female",
    isStudent: "nei",
    desiredPositions: "dia",
    desiredLevel: "1",
    rowNumber: 5,
  },
  {
    name: "Fredrik Svendsen",
    gender: "mann / male",
    isStudent: "ja",
    desiredPositions: "midt",
    desiredLevel: "2",
    rowNumber: 6,
  },
  {
    name: "Greta Andersen",
    gender: "kvinne / female",
    isStudent: "ja",
    desiredPositions: "libero",
    desiredLevel: "3",
    rowNumber: 7,
  },
  {
    name: "Henrik Pedersen",
    gender: "mann / male",
    isStudent: "nei",
    desiredPositions: "kant",
    desiredLevel: "1",
    rowNumber: 8,
  },
  {
    name: "Ingrid Larsen",
    gender: "kvinne / female",
    isStudent: "ja",
    desiredPositions: "dia",
    desiredLevel: "2",
    rowNumber: 9,
  },
  {
    name: "Johan Kristiansen",
    gender: "mann / male",
    isStudent: "ja",
    desiredPositions: "legger",
    desiredLevel: "1",
    rowNumber: 10,
  },
];

async function getPlayersData(): Promise<{
  players: PlayerData[];
  totalRegistrations: number;
  source: string;
  fetchedAt: string;
}> {
  try {
    const EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const RAW_KEY = process.env.GOOGLE_PRIVATE_KEY;
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const RANGE = process.env.GOOGLE_SHEET_RANGE || "'Skjemasvar 1'!A:T";

    if (!EMAIL || !RAW_KEY || !SHEET_ID) {
      console.warn("[DashboardServer] Missing ENV vars, using fallback data");
      return {
        players: fallbackPlayers,
        totalRegistrations: fallbackPlayers.length,
        source: "fallback",
        fetchedAt: new Date().toISOString(),
      };
    }

    const KEY = RAW_KEY.includes("\\n")
      ? RAW_KEY.replace(/\\n/g, "\n")
      : RAW_KEY;

    const auth = new google.auth.JWT({
      email: EMAIL,
      key: KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
      majorDimension: "ROWS",
    });

    const rows: string[][] = (response.data.values as string[][]) ?? [];
    if (rows.length === 0) {
      console.warn("[DashboardServer] No rows found, using fallback");
      return {
        players: fallbackPlayers,
        totalRegistrations: fallbackPlayers.length,
        source: "fallback",
        fetchedAt: new Date().toISOString(),
      };
    }

    const [, ...dataRows] = rows;

    const get = (row: string[], idx: number) =>
      (row?.[idx] ?? "").toString().trim();

    const players: PlayerData[] = dataRows
      .filter((row) => get(row, 2) !== "")
      .map((row, i) => ({
        name: get(row, 2), // C - Navn
        birthDate: get(row, 3), // D - Fødselsdato
        year: get(row, 3)?.split("/")[2] || get(row, 3)?.split("-")[0] || "", // Extract year from birthDate
        gender: get(row, 4), // E - Kjønn
        phone: parseInt(get(row, 5)) || undefined, // F - Telefon
        email: get(row, 15), // P - E-post
        previousTeam: get(row, 7), // H - Forrige lag
        isStudent: get(row, 8), // I - Student ved NTNU?
        previousPositions: get(row, 9), // J - Tidligere posisjoner
        desiredPositions: get(row, 10), // K - Ønskede posisjoner
        desiredLevel: get(row, 11), // L - Ønsket nivå
        experience: get(row, 12), // M - Erfaring
        availability: get(row, 13), // N - Tilgjengelighet
        selectedForTeam: get(row, 18), // S - Tatt ut på
        registrationNumber: get(row, 19), // T - Registreringsnummer
        rowNumber: i + 2, // +1 for header, +1 for 1-based row index
      }));

    return {
      players,
      totalRegistrations: players.length,
      source: "google-sheets",
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[DashboardServer] Error fetching data:", error);
    return {
      players: fallbackPlayers,
      totalRegistrations: fallbackPlayers.length,
      source: "fallback-error",
      fetchedAt: new Date().toISOString(),
    };
  }
}

export default async function DashboardServer() {
  const data = await getPlayersData();

  return <DashboardClient initialData={data} />;
}
