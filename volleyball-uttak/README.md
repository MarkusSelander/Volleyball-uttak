# Volleyball uttak

Nettside for å velge spillere fra et Google-regneark og lagre uttaket i Firebase.

## Konfigurasjon

Lag en fil `.env.local` i prosjektroten med følgende variabler:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=servicekonto@prosjektet.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=
# Valgfritt: område i arket med spillernavn
GOOGLE_SHEET_RANGE=Sheet1!A2:A
```

Tjenestekontoen må ha tilgang til regnearket – del arket med e‑postadressen som står i `GOOGLE_SERVICE_ACCOUNT_EMAIL`.

## Utvikling

Installer avhengigheter og start utviklingsserveren:

```bash
npm install
npm run dev
```

Logg inn med Google, hent spillere fra arket og plasser dem på posisjonene Midt, Dia, Legger, Libero og Kant. Uttaket lagres i Firestore og vises på dashboardet.
