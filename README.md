# Chris' Mega Pint Collection (CMPC)

Statische PWA zum Stöbern in Christians Retro-Spielesammlung. Die Oberfläche ist auf Deutsch, lässt sich auf Englisch umschalten und läuft im Browser auf dem Mac, dem iPhone, dem iPad und dem Anbernic RG477V.

Die Sammlung selbst bleibt in einem privaten Google Sheet. Die veröffentlichte App liest einen Snapshot ohne die Spalte `Eigene Notizen`. Nach der Anmeldung mit Google lädt CMPC die Gesamtliste live, inklusive Notizen, und schreibt nur `Status`, `Eigene Bewertung` und `Eigene Notizen` zurück.

## Lokal starten

```bash
npm install
npm run dev
```

Die Entwicklungsserver-Adresse ist [http://localhost:5173/cmpc/](http://localhost:5173/cmpc/). Ohne `VITE_GOOGLE_CLIENT_ID` bleibt die Anmeldung ausgeblendet und die App ist vollständig lesbar.

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run preview
```

Die Vorschau des Builds liegt unter [http://localhost:4173/cmpc/](http://localhost:4173/cmpc/).

## Snapshot erneuern

Der Snapshot ist die öffentliche Datenquelle. Er wird aus einem Export der Arbeitsmappe erzeugt und enthält keine eigenen Notizen.

```bash
npm run snapshot -- pfad/zur/datei.xlsx
```

Die Datei `public/snapshot.json` danach committen. Gelöscht wird nur `Eigene Notizen`; Status und eigene Bewertung bleiben enthalten.

## Veröffentlichung

GitHub Pages baut aus diesem Repository über GitHub Actions. Die Seite hängt unter `https://cdkvlka.github.io/cmpc/`. Die Einrichtung von Pages, der OAuth-Client-ID und der Repository-Variable steht in [SETUP.md](SETUP.md).

## Bedienung auf dem Handheld

Pfeiltasten oder Steuerkreuz bewegen den Fokus, Enter bzw. A öffnet, Escape bzw. B geht zurück, L1/R1 wechselt das System, Y öffnet die Suche. Der Fokusring ist gelb.
