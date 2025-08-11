# 🏐 NTNUI Volleyball Uttak - Applikasjon

Dette er hovedapplikasjonen for NTNUI Volleyball laguttak systemet. En Next.js applikasjon som tilbyr et komplett dashboard for lagadministrasjon med real-time synkronisering og Google Sheets integrasjon.

## 🚀 Rask Start

```bash
# Installer avhengigheter
npm install

# Kopier environment template
cp .env.example .env.local

# Konfigurer environment variabler (se under)
# Rediger .env.local med dine verdier

# Start utviklingsserver
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000) i nettleseren.

## ⚙️ Environment Konfigurering

### Firebase Setup

1. Opprett et Firebase prosjekt på [Firebase Console](https://console.firebase.google.com)
2. Aktiver Authentication med Google sign-in
3. Opprett en Firestore database
4. Kopier konfigurasjonen til `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=din_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ditt-prosjekt.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ditt-prosjekt-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ditt-prosjekt.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABCDEF1234
```

### Google Sheets Setup

For å koble til NTNUI påmeldingsskjema:

1. Opprett service account i [Google Cloud Console](https://console.cloud.google.com)
2. Aktiver Google Sheets API
3. Last ned service account nøkkel (JSON format)
4. Del Google Sheet med service account email
5. Konfigurer i `.env.local`:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@prosjekt.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=1abc...xyz
GOOGLE_SHEET_RANGE='Skjemasvar 1'!A:T
```

Se [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) for detaljerte instruksjoner.

## 🏗️ Prosjektstruktur

```
app/                      # Next.js 13+ App Router
├── dashboard/           # Hovedapplikasjon
│   └── page.tsx        # Dashboard med drag-and-drop
├── components/         # Gjenbrukbare komponenter
│   ├── NavHeader.tsx   # Navigasjon (mobile/desktop)
│   ├── PlayerCard.tsx  # Spillerkort med drag-funksjonalitet
│   ├── PositionSection.tsx # Posisjonsseksjoner
│   ├── LoadingSpinner.tsx
│   ├── Notification.tsx
│   └── StatsCard.tsx
├── api/               # API routes
│   └── players/       # Google Sheets data endpoint
├── login/            # Autentisering
├── spiller-info/     # Spillerinformasjon
├── uttak/           # Laguttak visning
├── globals.css      # Global styling
└── layout.tsx       # Root layout

lib/
└── firebase.ts      # Firebase konfigurering og auth

public/              # Statiske assets
├── ntnui-logo.png
└── various-icons/
```

## 🎯 Hovedfunksjoner

### Dashboard (`/dashboard`)

- **Drag & Drop Interface** - Flytt spillere mellom posisjoner og lister
- **Real-time Sync** - Automatisk synkronisering mellom enheter
- **Advanced Filtering** - Filtrer på kjønn, studentstatus, erfaring, ønsket divisjon
- **Search Functionality** - Søk på navn eller registreringsnummer
- **Statistics Overview** - Live statistikk over spillere
- **Position Analysis** - Se spillere gruppert etter ønskede posisjoner

### Spillerinformasjon (`/spiller-info`)

- Detaljert visning av alle påmeldte spillere
- Sortérbart og filtrerbart spilleroversikt
- Eksport av spillerdata

### Laguttak (`/uttak`)

- Oversikt over nåværende laguttak
- Posisjonsoversikt med spillernavn
- Print-vennlig format

## 📱 Mobile Optimalisering

Applikasjonen er fullstendig optimalisert for mobile enheter:

- **Touch Sensors** - Forbedret drag-and-drop for touch-enheter
- **Responsive Design** - Tilpasser seg alle skjermstørrelser
- **Mobile Navigation** - Sidebar navigasjon på små skjermer
- **Touch Targets** - Store touch-områder for bedre brukeropplevelse

## 🔄 Real-time Funksjonalitet

Implementert med Firebase Firestore:

- **Live Updates** - Endringer vises umiddelbart på alle tilkoblede enheter
- **Conflict Resolution** - Automatisk håndtering av samtidige endringer
- **Offline Support** - Fungerer også uten internettforbindelse
- **Data Persistence** - Lagrer endringer permanent i skyen

## 🔧 Utvikling

### Tilgjengelige Scripts

```bash
# Utvikling
npm run dev          # Start dev server med hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Kjør ESLint

# Testing
npm run test         # Kjør tester (hvis implementert)
```

### Code Style

Prosjektet bruker:

- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting (anbefalt)
- **Tailwind CSS** for styling

### Debugging

Aktivér debug logging ved å legge til i `.env.local`:

```bash
DEBUG=true
```

## 🚢 Deployment

### Vercel (Anbefalt)

1. Koble GitHub repo til Vercel
2. Sett environment variabler i Vercel dashboard
3. Deploy automatisk på hver push til main

### Manuell Deploy

```bash
npm run build
npm run start
```

Se [VERCEL_ENV_GUIDE.md](VERCEL_ENV_GUIDE.md) for deployment instruksjoner.

## 🔐 Sikkerhet og Privacy

- **Environment Variables** - Sensitive data lagres sikkert i `.env.local`
- **Firebase Auth** - Kun autoriserte brukere har tilgang
- **Firestore Rules** - Database beskyttet med security rules
- **API Rate Limiting** - Beskyttelse mot misbruk av Google Sheets API

## 🐛 Feilsøking

### Vanlige Problemer

**Firebase Connection Error**

- Sjekk at alle Firebase environment variabler er satt
- Verifiser at Firebase prosjekt er konfigurert riktig

**Google Sheets API Error**

- Kontroller at service account har tilgang til sheet
- Verifiser at Sheets API er aktivert
- Sjekk at GOOGLE_SHEET_ID er riktig

**Build Errors**

- Kjør `npm ci` for å reinstallere dependencies
- Sjekk at alle TypeScript feil er løst

### Performance

Applikasjonen er optimalisert for ytelse:

- **Memoization** - React komponenter er memoized der det er hensiktsmessig
- **Virtual Scrolling** - Effektiv rendering av store spillerlister
- **Code Splitting** - Automatisk splitting av JavaScript bundles
- **Image Optimization** - Next.js optimaliserer bilder automatisk

## 📊 Caching og API

- **Google Sheets Data** - Caches i 60 sekunder for bedre ytelse
- **Player Data** - Optimistiske updates for øyeblikkelig responsivitet
- **Firebase Data** - Real-time listeners for live synkronisering

## 🤝 Bidrag

For å bidra til prosjektet:

1. Fork repositoryet
2. Lag en feature branch
3. Følg TypeScript og ESLint regler
4. Test grundig på både desktop og mobile
5. Opprett Pull Request med beskrivelse

## � Versioning

Prosjektet følger [Semantic Versioning](https://semver.org/).

---

Utviklet med ❤️ for NTNUI Volleyball
