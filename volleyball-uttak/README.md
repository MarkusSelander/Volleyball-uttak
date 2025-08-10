# Volleyball Uttak - Lagadministrasjon

En moderne og dynamisk webapplikasjon for å administrere volleyball lag og spillere. Bygget med Next.js, TypeScript, Tailwind CSS og Firebase.

## 🚀 Funksjoner

### ✨ Nye forbedringer

- **Moderne design** med gradient bakgrunner og glassmorfisme effekter
- **Animasjoner** og smooth transitions for bedre brukeropplevelse
- **Responsivt design** som fungerer på alle enheter
- **Loading states** og feedback til brukeren
- **Notification system** for å vise meldinger
- **Modulær arkitektur** med gjenbrukbare komponenter
- **Google Sheets integrasjon** for spillerdata
- **Fallback data** hvis Google Sheets ikke er konfigurert

### 🏐 Kjernefunksjoner

- **Spilleradministrasjon** - Hold oversikt over alle spillere
- **Laguttak** - Gjør smarte uttak basert på posisjoner
- **Posisjonshåndtering** - Midt, Dia, Legger, Libero, Kant
- **Real-time oppdateringer** - Endringer lagres automatisk
- **Google Authentication** - Sikker innlogging
- **Google Sheets sync** - Hent spillere direkte fra spreadsheet

## 🛠️ Teknisk Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4 med custom animasjoner
- **Backend**: Firebase (Authentication, Firestore)
- **Data**: Google Sheets API for spillerdata
- **Deployment**: Vercel-ready

## 🎨 Design Features

### Animasjoner

- Fade-in effekter for smooth loading
- Hover animations på kort og knapper
- Loading spinners med custom styling
- Staggered animations for lister

### Farger og Gradients

- Primary gradient: Blå-lilla (hovedside)
- Secondary gradient: Rosa-rød (innlogging)
- Accent gradient: Blå-cyan (dashboard)
- Glassmorfisme effekter

### Responsivt Design

- Mobile-first approach
- Grid layouts som tilpasser seg skjermstørrelse
- Touch-friendly knapper og interaksjoner

## 📱 Komponenter

### Gjenbrukbare Komponenter

- `StatsCard` - Viser statistikk med ikoner
- `PlayerCard` - Spiller-kort med posisjonsvalg
- `PositionSection` - Posisjon-seksjoner i laguttak
- `LoadingSpinner` - Custom loading spinner
- `Notification` - Toast notifications

### Sidekomponenter

- **Hovedsiden** - Landing page med funksjoner
- **Innlogging** - Google OAuth med loading states
- **Dashboard** - Hovedadministrasjonsside

## 🚀 Kom i gang

### 1. Installer avhengigheter

```bash
npm install
```

### 2. Konfigurer Firebase

- Opprett et Firebase prosjekt
- Legg til Authentication (Google)
- Opprett Firestore database
- Kopier config til `lib/firebase.ts`

### 3. Konfigurer Google Sheets (valgfritt)

Se [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md) for detaljert guide.

**Hurtig oppsett:**

1. Opprett `.env.local` fil i prosjektroten
2. Legg til dine Google Sheets credentials
3. Applikasjonen vil automatisk bruke eksempel-data hvis Google Sheets ikke er konfigurert

### 4. Start utviklingsserver

```bash
npm run dev
```

### 5. Bygg for produksjon

```bash
npm run build
npm start
```

## 📊 Brukergrensesnitt

### Hovedsiden

- Hero section med gradient bakgrunn
- Funksjoner-kort med glassmorfisme
- Call-to-action knapp
- Animerte bakgrunnselementer

### Dashboard

- Statistikk-kort øverst
- Datakilde informasjon (Google Sheets eller eksempel-data)
- To-kolonne layout (tilgjengelige spillere + laguttak)
- Fargekodet posisjoner med ikoner
- Real-time oppdateringer

### Innlogging

- Glassmorfisme login-kort
- Google OAuth integrasjon
- Loading states og error handling
- Responsivt design

## 🎯 Posisjoner

- **Midt** 🏐 - Midtspillere
- **Dia** ⚡ - Diagonaler
- **Legger** 🎯 - Leggere
- **Libero** 🛡️ - Liberoer
- **Kant** 🔥 - Kantspillere

## 🔧 Utvikling

### Mappestruktur

```
app/
├── components/          # Gjenbrukbare komponenter
├── dashboard/          # Dashboard side
├── login/             # Innloggingsside
├── api/               # API routes
│   └── players/       # Google Sheets API
├── globals.css        # Global styling
├── layout.tsx         # Root layout
└── page.tsx           # Hovedsiden
lib/
├── firebase.ts        # Firebase konfigurasjon
GOOGLE_SHEETS_SETUP.md # Google Sheets oppsett guide
```

### Styling

- Custom CSS variabler for farger
- Tailwind CSS med custom utilities
- Animasjoner definert i globals.css
- Responsive breakpoints

### API Endepunkter

- `GET /api/players` - Henter spillere fra Google Sheets eller fallback data

## 📈 Fremtidige Forbedringer

- [ ] Dark mode toggle
- [ ] Spillerstatistikk og historikk
- [ ] Eksport av laguttak
- [ ] Team management
- [ ] Push notifications
- [ ] Offline support
- [ ] Automatisk sync med Google Sheets
- [ ] Spillerfoto og profilinformasjon

## 🤝 Bidrag

1. Fork prosjektet
2. Opprett feature branch
3. Commit endringer
4. Push til branch
5. Opprett Pull Request

## 📄 Lisens

Dette prosjektet er lisensiert under MIT License.
