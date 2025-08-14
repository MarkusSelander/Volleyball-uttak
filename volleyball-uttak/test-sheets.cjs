// test-sheets.cjs
const fs = require("fs");
const path = require("path");

// Last .env.local hvis den finnes, ellers .env
const envPathLocal = path.resolve(".env.local");
const envPath = fs.existsSync(envPathLocal)
  ? envPathLocal
  : path.resolve(".env");
require("dotenv").config({ path: envPath });

const { google } = require("googleapis");

(async function main() {
  console.log("cwd:", process.cwd());
  console.log("env file used:", envPath);
  // Log kun om variabler finnes (ikke verdiene)
  console.log("ENV present:", {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
    GOOGLE_SHEET_ID: !!process.env.GOOGLE_SHEET_ID,
    GOOGLE_SHEET_RANGE: !!process.env.GOOGLE_SHEET_RANGE,
  });

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || "";
  const key = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
  const id = process.env.GOOGLE_SHEET_ID;
  const range = process.env.GOOGLE_SHEET_RANGE || "Sheet1!A:T"; // Test med samme range som API

  if (!email || !key || !id) {
    throw new Error(
      "Mangler ENV. Sjekk at .env/.env.local ligger i denne mappen og at variablene er riktig navngitt."
    );
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range,
  });
  console.log({
    rows: resp.data.values?.length ?? 0,
    headerColumns: resp.data.values?.[0]?.length ?? 0,
    firstRowColumns: resp.data.values?.[1]?.length ?? 0,
    emailTest: resp.data.values?.slice(1, 3)?.map((row, i) => ({
      row: i + 2,
      name: row[2],
      emailColumnB: row[1], // Kolonne B
      emailColumnP: row[15], // Kolonne P (den riktige)
      totalColumns: row.length,
    })),
    sample: resp.data.values?.slice(0, 3),
  });
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
