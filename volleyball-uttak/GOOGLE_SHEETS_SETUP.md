# Google Sheets Oppsett Guide - NTNUI Volleyball

For å få dine egne spillere fra NTNUI Volleyball påmelding til å vises i applikasjonen, følg denne guiden:

## 1. Opprett Google Cloud Project

1. Gå til [Google Cloud Console](https://console.cloud.google.com/)
2. Opprett et nytt prosjekt eller velg et eksisterende
3. Aktiver Google Sheets API:
   - Gå til "APIs & Services" > "Library"
   - Søk etter "Google Sheets API"
   - Klikk på den og aktiver den

## 2. Opprett Service Account

1. Gå til "APIs & Services" > "Credentials"
2. Klikk "Create Credentials" > "Service Account"
3. Fyll ut navn og beskrivelse
4. Klikk "Create and Continue"
5. Gå til "Keys" fanen
6. Klikk "Add Key" > "Create new key"
7. Velg "JSON" format
8. Last ned filen

## 3. Konfigurer Google Sheets

1. Åpne ditt NTNUI Volleyball påmeldings spreadsheet
2. Klikk "Share" (delt) knappen
3. Legg til din service account email (fra JSON-filen)
4. Gi "Editor" tilgang

## 4. Opprett .env.local fil

Opprett en fil kalt `.env.local` i prosjektroten med følgende innhold:

```env
# Google Service Account email (fra JSON-filen)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com

# Google Service Account private key (fra JSON-filen)
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"

# Google Sheets ID (fra URL-en til ditt spreadsheet)
GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms

# Valgfritt: Område i arket (standard: Sheet1!A:O for alle kolonner)
GOOGLE_SHEET_RANGE=Sheet1!A:O
```

## 5. NTNUI Volleyball Format

Applikasjonen er konfigurert for NTNUI Volleyball påmeldingsformat med følgende kolonner:

| Kolonne | Innhold                                        | Eksempel                            |
| ------- | ---------------------------------------------- | ----------------------------------- |
| A       | Tidsmerke                                      | 09.07.2025 kl. 23.39.30             |
| B       | E-postadresse                                  |                                     |
| **C**   | **Navn / Name**                                | **Frida Skjelvik Aune**             |
| D       | Fødselsdato / Date of birth                    | 06.07.2001                          |
| E       | Kjønn / Gender                                 | Kvinne / Female                     |
| F       | Telefonnummer / Phone number                   | 47684829                            |
| G       | Spilte du forrige sesong?                      | Ja / Yes                            |
| H       | Hvilket lag spilte du på?                      | D2A                                 |
| I       | Er du student ved NTNU?                        | Ja / Yes                            |
| **J**   | **Hvilke posisjoner har du spilt tidligere?**  | **Kant / Outside hitter, Libero**   |
| **K**   | **Hvilke(n) posisjon(er) ønsker du å spille?** | **Kant / Outside hitter, Libero**   |
| **L**   | **Hvilket nivå ønsker du å spille på?**        | **1. divisjon / 1. division**       |
| M       | Tidligere erfaring                             | Har rundet 2. div i NTNUI i 4 år... |
| **N**   | **Epost / email**                              | **frida.aune@live.no**              |
| **O**   | **Høyeste nivå påmeldt**                       | **Elite/1.divisjon**                |
| P       | Oppmøte                                        |                                     |

**Viktig:**

- Kolonne C (Navn) brukes som hovedidentifikator
- Kolonne K (Ønskede posisjoner) brukes for å foreslå posisjoner
- Kolonne L og O (Nivå) vises i spillerinformasjonen
- Applikasjonen mapper automatisk NTNUI posisjoner til våre posisjoner

## 6. Posisjonsmapping

Applikasjonen mapper automatisk følgende posisjoner:

| NTNUI Posisjon                   | Vår Posisjon |
| -------------------------------- | ------------ |
| Midt / Middle                    | 🏐 Midt      |
| Dia / Diagnoal / Opposite hitter | ⚡ Dia       |
| Legger / Setter                  | 🎯 Legger    |
| Libero                           | 🛡️ Libero    |
| Kant / Outside hitter            | 🔥 Kant      |

## 7. Test konfigurasjonen

1. Start utviklingsserveren: `npm run dev`
2. Gå til dashboard
3. Du skal nå se:
   - En blå boks som sier "NTNUI Påmelding"
   - Antall påmeldinger
   - Spillere med deres ønskede posisjoner og nivå

## 8. Funksjoner

### Automatisk posisjonsforslag

- Spillere viser deres ønskede posisjoner som fargede badges
- Du kan velge en annen posisjon enn ønsket hvis nødvendig

### Nivåinformasjon

- Spillernes ønskede nivå vises ved siden av navnet
- Hjelper med å gjøre informerte uttak

### Detaljert informasjon

- Alle påmeldingsdata er tilgjengelige i API-responsen
- Kan utvides for å vise mer informasjon i fremtiden

## Feilsøking

### "Google Sheets ikke konfigurert"

- Sjekk at `.env.local` filen eksisterer
- Sjekk at alle miljøvariabler er riktig satt
- Restart utviklingsserveren etter endringer

### "Ingen data i spreadsheet"

- Sjekk at service account har tilgang til spreadsheet
- Sjekk at `GOOGLE_SHEET_RANGE` er riktig (bør være `Sheet1!A:O`)
- Sjekk at det er data i kolonne C (Navn)

### "Feil ved henting fra Google Sheets"

- Sjekk at Google Sheets API er aktivert
- Sjekk at service account credentials er riktige
- Sjekk at spreadsheet ID er riktig

### "Posisjoner vises ikke"

- Sjekk at kolonne K (Ønskede posisjoner) inneholder gyldige posisjoner
- Posisjoner må være skrevet som i NTNUI formatet

## Sikkerhet

⚠️ **Viktig:** Ikke del din `.env.local` fil eller service account credentials. De inneholder sensitive opplysninger.

- Legg til `.env.local` i `.gitignore`
- Ikke commit credentials til versjonskontroll
- Bruk forskjellige service accounts for utvikling og produksjon
- Vær oppmerksom på at påmeldingsdata kan inneholde personlig informasjon
