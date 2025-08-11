# 🏐 NTNUI Volleyball Uttak

En moderne web-applikasjon for administrering av laguttak for NTNUI Volleyball. Appen lar trenerteamet enkelt organisere spillere i ulike posisjoner med drag-and-drop funksjonalitet, real-time synkronisering og automatisk datafangst fra Google Sheets.

## ✨ Funksjoner

### 🎯 Hovedfunksjoner

- **Laguttak Dashboard** - Intuitivt grensesnitt for å organisere spillere
- **Drag & Drop** - Enkelt å flytte spillere mellom posisjoner og lister
- **Real-time Sync** - Endringer synkroniseres automatisk mellom enheter
- **Google Sheets Integrasjon** - Automatisk import av påmeldingsdata
- **Avansert Filtrering** - Filtrer spillere etter kjønn, studentstatus, erfaring, ønsket nivå
- **Responsive Design** - Fungerer perfekt på mobil, tablet og desktop

### 📱 Brukeropplevelse

- **Touch-optimalisert** - Smidig drag-and-drop på mobile enheter
- **Søkefunksjon** - Rask søk etter spillernavn eller registreringsnummer
- **Statistikkvisning** - Oversikt over totalt påmeldte, valgte, tilgjengelige spillere
- **Posisjonsanalyse** - Se spillere gruppert etter ønskede posisjoner
- **Notifikasjoner** - Real-time feedback på alle handlinger

### 🛠️ Teknisk Stack

- **Next.js 15** - React framework med server-side rendering
- **TypeScript** - Type-sikker utvikling
- **Tailwind CSS** - Moderne styling og responsivt design
- **Firebase** - Authentication og real-time database
- **Google Sheets API** - Datafangst fra påmeldingsskjema
- **Vercel** - Deployment og hosting
- **dnd-kit** - Avansert drag-and-drop funksjonalitet

## 🚀 Kom i gang

### Forutsetninger

- Node.js 18+
- npm eller yarn
- Firebase prosjekt
- Google Cloud prosjekt med Sheets API tilgang

### Installasjon

```bash
# Klon repositoryet
git clone https://github.com/MarkusSelander/Volleyball-uttak.git
cd Volleyball-uttak/volleyball-uttak

# Installer avhengigheter
npm install

# Kopier miljøvariabler
cp .env.example .env.local

# Start utviklingsserver
npm run dev
```

### Konfigurering

1. **Firebase Setup** - Konfigurer Firebase prosjekt og autentisering
2. **Google Sheets** - Sett opp service account og API tilgang
3. **Environment Variables** - Fyll inn alle nødvendige miljøvariabler

Se detaljerte instruksjoner i `/volleyball-uttak/README.md`.

## 📁 Prosjektstruktur

```
volleyball-uttak/          # Main Next.js applikasjon
├── app/                   # App router (Next.js 13+)
│   ├── dashboard/         # Hovedapplikasjon for laguttak
│   ├── components/        # Gjenbrukbare React komponenter
│   ├── api/              # API routes
│   └── login/            # Autentisering
├── lib/                  # Utility funksjoner og konfigurering
├── public/              # Statiske filer
└── docs/               # Dokumentasjon og guider
```

## 🔐 Sikkerhet

- Environment variabler er sikret i `.env.local` (ikke commitet)
- Firebase autentisering med Google OAuth
- Firestore security rules for databeskyttelse
- Service account credentials holdes lokalt

## 🚢 Deployment

Applikasjonen er optimalisert for deployment på Vercel:

```bash
# Deploy til Vercel
vercel deploy

# Eller via GitHub integration
git push origin main
```

Husk å sette environment variabler i Vercel dashboard.

## 🤝 Bidrag

Bidrag er velkommen! Vennligst:

1. Fork repositoryet
2. Lag en feature branch (`git checkout -b feature/ny-funksjon`)
3. Commit endringene (`git commit -am 'Legg til ny funksjon'`)
4. Push til branch (`git push origin feature/ny-funksjon`)
5. Opprett en Pull Request

## 📝 Lisens

Dette prosjektet er lisensiert under MIT License - se [LICENSE](LICENSE) filen for detaljer.

## 👥 Team

Utviklet for NTNUI Volleyball med ❤️

- **Utvikling**: Markus Selander
- **Design**: Moderne, intuitivt brukergrensesnitt
- **Testing**: Omfattende testing på mobile og desktop enheter

## 📞 Support

For spørsmål eller support, kontakt utviklingsteamet eller opprett en issue i GitHub repositoryet.

---

**NTNUI Volleyball Uttak** - Forenkler laguttak med moderne teknologi 🏐⚡
Nettside for å navigere hvem som blir tatt ut på et volleyball lag.
