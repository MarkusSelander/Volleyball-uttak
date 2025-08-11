# 🔑 Miljøvariabler for Vercel Deployment

## Firebase-konfigurasjonen er allerede funnet! 🎉

Alle Firebase-verdiene er hentet fra din eksisterende konfigurasjon og lagt til i `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDjr446XPjcDNoslcMAl6swH81A0SDNoOo
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=volleyball-d2c.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=volleyball-d2c
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=volleyball-d2c.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=880881760876
NEXT_PUBLIC_FIREBASE_APP_ID=1:880881760876:web:e00922adf7eb5347b63649
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-FPS2B2X91T
```

## Hvor finner du disse verdiene? 📍

### Firebase Console:

1. Gå til [Firebase Console](https://console.firebase.google.com/)
2. Velg prosjektet ditt: **volleyball-d2c**
3. Klikk på ⚙️ → **Project settings**
4. Scroll ned til **Your apps** seksjonen
5. Velg din web-app
6. Du vil se **Firebase SDK snippet** med alle verdiene

### Alternativ måte:

Verdiene er også synlige i din `lib/firebase.ts` fil (som jeg nettopp oppdaterte til å bruke miljøvariabler).

## Google Sheets-konfigurasjonen er også klar! ✅

Du har allerede:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=markus-selander@volleyball-468600.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[DIN PRIVATE KEY]\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=13GCftT9uxxEjrtAASEcrqMlZXILeucHyfVNw5xehJJM
GOOGLE_SHEET_RANGE='Skjemasvar 1'!A1:Q500
```

## 🚀 For Vercel Deployment:

### Kopier disse miljøvariablene til Vercel:

1. Gå til ditt Vercel-prosjekt
2. Klikk **Settings** → **Environment Variables**
3. Legg til alle variablene fra `.env.local`

**Viktig:** Når du setter `GOOGLE_PRIVATE_KEY` i Vercel, sørg for at du inkluderer anførselstegnene og `\n` for linjeskift.

## ✅ Alt er klart for deployment!

Appen din bygger uten feil og alle miljøvariabler er konfigurert. Du kan nå deploye til Vercel! 🎯
