import { google } from "googleapis";
import { NextResponse } from "next/server";

// Fallback data hvis Google Sheets ikke fungerer
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
  level?: string;
  attendance?: string;
}

export async function GET() {
  try {
    // Sjekk om miljøvariabler er satt
    if (!process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      console.log("Google Sheets konfigurasjon mangler, bruker fallback data");
      return NextResponse.json({
        players: fallbackPlayers,
        source: "fallback",
        message: "Google Sheets ikke konfigurert, viser eksempel-data",
      });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email:
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
          "markus.alexander.selander@gmail.com",
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    // Hent alle kolonner for å få full informasjon
    const range = process.env.GOOGLE_SHEET_RANGE || "Sheet1!A:O";

    console.log("Henter data fra Google Sheets:", { spreadsheetId, range });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = res.data.values || [];
    console.log("Mottok", rows.length, "rader fra Google Sheets");

    if (rows.length === 0) {
      console.log("Ingen data funnet i spreadsheet, bruker fallback");
      return NextResponse.json({
        players: fallbackPlayers,
        source: "fallback",
        message: "Ingen data i spreadsheet, viser eksempel-data",
      });
    }

    // Hopp over header-raden og prosesser data
    const dataRows = rows.slice(1); // Hopp over første rad (headers)

    const players: PlayerData[] = dataRows
      .filter((row) => row[2] && row[2].trim() !== "") // Filtrer tomme rader basert på navn-kolonnen (C)
      .map((row) => {
        const player: PlayerData = {
          name: row[2]?.trim() || "", // Navn / Name (kolonne C)
          email: row[13]?.trim() || "", // Epost / email (kolonne N)
          phone: row[5]?.trim() || "", // Telefonnummer / Phone number (kolonne F)
          gender: row[4]?.trim() || "", // Kjønn / Gender (kolonne E)
          birthDate: row[3]?.trim() || "", // Fødselsdato / Date of birth (kolonne D)
          previousPositions: row[9]?.trim() || "", // Hvilke posisjoner har du spilt tidligere? (kolonne J)
          desiredPositions: row[10]?.trim() || "", // Hvilke(n) posisjon(er) ønsker du å spille? (kolonne K)
          desiredLevel: row[11]?.trim() || "", // Hvilket nivå ønsker du å spille på? (kolonne L)
          experience: row[12]?.trim() || "", // Tidligere erfaring / previous experience (kolonne M)
          previousTeam: row[7]?.trim() || "", // Hvis "Ja" på forrige spørsmål, hvilket lag spilte du på forrige sesong? (kolonne H)
          isStudent: row[8]?.trim() || "", // Er du student ved NTNU høsten 2025? (kolonne I)
          level: row[14]?.trim() || "", // Høyeste nivå påmeldt (kolonne O)
          attendance: row[15]?.trim() || "", // Oppmøte (kolonne P)
        };
        return player;
      });

    console.log("Returnerer", players.length, "spillere fra Google Sheets");

    // Konverter til enkel format for kompatibilitet
    const simplePlayers = players.map((player) => ({ name: player.name }));

    return NextResponse.json({
      players: simplePlayers,
      detailedPlayers: players, // Inkluder detaljert data for fremtidig bruk
      source: "google-sheets",
      message: "Data hentet fra NTNUI Volleyball påmelding",
      totalRegistrations: players.length,
    });
  } catch (err) {
    console.error("Feil ved henting av spillere fra Google Sheets:", err);

    // Returner fallback data i stedet for feil
    return NextResponse.json({
      players: fallbackPlayers,
      source: "fallback",
      message: "Feil ved henting fra Google Sheets, viser eksempel-data",
      error: err instanceof Error ? err.message : "Ukjent feil",
    });
  }
}
