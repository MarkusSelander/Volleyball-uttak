# 🏐 NTNUI Volleyball Uttak - Applikasjon

Dette er hovedapplikasjonen for NTNUI Volleyball laguttak systemet. En Next.js applikasjon som tilbyr et komplett dashboard for lagadministrasjon med real-time synkronisering og Google Sheets integrasjon.

## 🚀 Rask Start

```bash
# Installer avhengigheter (inkluderer Firebase SDK)
npm install

# Kopier environment template (opprett .env.local basert på .env.example)
cp .env.example .env.local

# Konfigurer environment variabler (se under)
# Rediger .env.local med dine Firebase og Google Sheets verdier

# Start utviklingsserver
npm run dev
```

**Note**: Firebase SDK er allerede inkludert i avhengighetene.

Åpne [http://localhost:3000](http://localhost:3000) i nettleseren.

## ⚙️ Environment Konfigurering

### Firebase Setup

1. **Opprett Firebase Prosjekt**

   - Gå til [Firebase Console](https://console.firebase.google.com)
   - Opprett nytt prosjekt

2. **Aktiver Realtime Database**

   - Gå til Database → Realtime Database → Create database
   - Velg lokasjon (anbefalt: europe-west1)

3. **Aktiver Authentication**

   - Gå til Authentication → Get started → Sign-in method
   - Aktiver "Anonymous" sign-in

4. **Sett Realtime Database Regler**

   ```json
   {
     "rules": {
       "dashboards": {
         "$room": {
           ".read": "auth != null",
           ".write": "auth != null"
         }
       }
     }
   }
   ```

5. **Kopier konfigurasjonen til `.env.local`**:

   ```bash
   # Firebase Realtime Database Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.region.firebasedatabase.app/
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:your_app_id_here
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-YOUR_MEASUREMENT_ID  # valgfri
   ```

   **VIKTIG**: `NEXT_PUBLIC_FIREBASE_DATABASE_URL` er nødvendig for realtime database!

### Google Sheets Setup

For å koble til påmeldingsskjema:

1. Opprett service account i [Google Cloud Console](https://console.cloud.google.com)
2. Aktiver Google Sheets API
3. Last ned service account nøkkel (JSON format)
4. Del Google Sheet med service account email
5. Konfigurer i `.env.local`:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_sheet_id_from_url
GOOGLE_SHEET_RANGE='Sheet1'!A:Z  # Tilpass til ditt ark
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
├── types.ts         # Felles type-definisjoner
├── firebaseClient.ts # Firebase Realtime Database klient
├── useRealtimeSelection.ts # React hook for live sync
└── firebase.ts      # Firebase auth (legacy)

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

Implementert med Firebase Realtime Database:

- **Live Sync** - Endringer synkroniseres i real-time mellom alle tilkoblede enheter
- **Optimistic UI** - Umiddelbar oppdatering av UI, fulgt av database sync
- **Offline Cache** - localStorage fungerer som fallback når Firebase ikke er tilgjengelig
- **Anonymous Auth** - Automatisk anonym innlogging for tilgang til database
- **Room-based Storage** - Data organisert i "rom" for bedre skalerbarhet

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
- **Firebase Auth** - Anonymous authentication for sikker database-tilgang
- **Realtime Database Rules** - Database beskyttet med Firebase security rules
- **API Rate Limiting** - Beskyttelse mot misbruk av Google Sheets API
- **Client-side Caching** - localStorage brukes kun som cache, ikke for sensitive data

## 🐛 Feilsøking

### Vanlige Problemer

**Firebase Connection Error**

- Sjekk at alle Firebase environment variabler er satt korrekt
- Verifiser at Firebase Realtime Database er aktivert
- Kontroller at Anonymous Authentication er på

**Google Sheets API Error**

- Kontroller at service account har tilgang til sheet
- Verifiser at Sheets API er aktivert i Google Cloud Console
- Sjekk at GOOGLE_SHEET_ID matcher din sheet URL

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
