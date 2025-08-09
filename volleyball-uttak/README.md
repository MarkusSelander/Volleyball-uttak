# Volleyball uttak

Nettside for å velge spillere fra et Google-regneark og lagre uttaket i Firebase.

## Konfigurasjon

Lag en fil `.env.local` i prosjektroten med følgende variabler:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=
# Valgfritt: område i arket med spillernavn
GOOGLE_SHEET_RANGE=Sheet1!A2:A
```

## Utvikling

Installer avhengigheter og start utviklingsserveren:

```bash
npm install
npm run dev
```

Logg inn med Google, hent spillere fra arket og plasser dem på posisjonene Midt, Dia, Legger, Libero og Kant. Uttaket lagres i Firestore og vises på dashboardet.
