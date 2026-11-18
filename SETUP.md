# Einrichtung für Christian

Die App funktioniert ohne diese Schritte bereits lesend, mit dem Snapshot im Repository. Anmeldung und Zurückschreiben brauchen ein Google-Cloud-Projekt und eine Repository-Variable. Das Sheet selbst bleibt privat.

## 1. GitHub Pages einschalten

1. Im Repository **Settings → Pages** öffnen.
2. Unter **Build and deployment** als **Source** `GitHub Actions` wählen.
3. Den Workflow `.github/workflows/pages.yml` auf `main` laufen lassen (er startet bei jedem Push).
4. Die Seite ist danach unter `https://cdkvlka.github.io/cmpc/` erreichbar.

## 2. Google-Cloud-Projekt

1. [Google Cloud Console](https://console.cloud.google.com/) öffnen und ein Projekt anlegen, zum Beispiel `cmpc`.
2. **APIs & Services → Library**, nach **Google Sheets API** suchen und **Enable** wählen.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - App-Name: `Chris' Mega Pint Collection`
   - Support-E-Mail: die eigene Adresse
   - **Publishing status: Testing** lassen. Nicht veröffentlichen.
   - Unter **Test users** das eigene Google-Konto eintragen, das das Sheet lesen und bearbeiten darf.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `CMPC Web`
   - **Authorized JavaScript origins**:
     - `https://cdkvlka.github.io`
     - für lokale Entwicklung zusätzlich `http://localhost:5173`
   - Keinen Redirect-URI eintragen. Die App nutzt den Token-Flow von Google Identity Services, nicht einen Authorization-Code mit Redirect.
5. Die **Client ID** kopieren. Sie sieht aus wie `1234567890-abc.apps.googleusercontent.com`. Sie ist öffentlich und kein Geheimnis. Den Client-Secret nicht irgendwo eintragen; die App benutzt ihn nicht.

Der Bereich (Scope) ist fest `https://www.googleapis.com/auth/spreadsheets`. Damit kann das angemeldete Konto nur Sheets lesen und schreiben, auf die es ohnehin Zugriff hat.

## 3. Client-ID in die Actions-Variable legen

1. Im Repository **Settings → Secrets and variables → Actions → Variables** öffnen.
2. **New repository variable**
3. Name: `VITE_GOOGLE_CLIENT_ID`
4. Wert: die Client-ID aus Schritt 2.
5. Den Workflow erneut starten (**Actions → Seiten veröffentlichen → Run workflow**), damit der Build die ID einbettet.

Lokal legt man dieselbe Zeile in eine Datei `.env` (Vorlage: `.env.example`) und startet `npm run dev` neu.

Ohne diese Variable blendet die App den Anmelden-Knopf aus und zeigt „Nur lesen“.

## 4. Sheet nicht öffentlich machen

Die Sheet-ID steht im Code, der Inhalt nicht. **Teilen → Allgemeiner Zugriff** bleibt auf „Eingeschränkt“. Wer die App ohne Anmeldung öffnet, sieht nur den Snapshot. Wer sich anmeldet, sieht das Sheet nur, wenn das Google-Konto darauf berechtigt ist. Testnutzer im OAuth-Bildschirm und die Freigabe des Sheets sind zwei verschiedene Listen; für Christian selbst müssen beide passen.

Die App findet jede Spalte über den Namen in der Kopfzeile, nie über den Buchstaben. Neue Spalten wie `Release-Datum` oder `Kurzbeschreibung` verschieben die Buchstaben, die App bleibt davon unberührt.

In der `Gesamtliste` schreibt die App nur `Status`, `Eigene Bewertung` und `Eigene Notizen`. Die Zeile sucht sie über die Spalte `ID`. Favoriten und eigene Mixtapes liegen im Tab `Mixtapes`: Zeile 3 ist die Kopfzeile (`Mixtape`, `Spiel-ID`, `Titel`, `System`, `Reihenfolge`, `Hinzugefügt`), die Daten beginnen in Zeile 4. Die Liste `Favoriten` sind alle Zeilen mit Mixtape = Favoriten. Die App hängt Zeilen an, löscht Zeilen und ändert die Reihenfolge. Vor dem Schreiben liest sie den aktuellen Wert. Hat er sich seit dem Laden geändert, fragt sie, ob der Sheet-Wert oder der App-Wert bleiben soll. Offline landen diese Änderungen in derselben Warteschlange wie die anderen Bearbeitungen.

Kuratierte Mixtapes (Cyberpunk, Fan-Übersetzungen, Lost Media, S-Tier, Hidden Gems) rechnet die App selbst aus. Sie stehen nicht im Sheet und sind für alle sichtbar. Der Tab `Mixtapes` kommt nicht in den öffentlichen Snapshot, genau wie `Eigene Notizen`.

## 5. Auf dem iPhone installieren

In Safari die Seite öffnen, **Teilen → Zum Home-Bildschirm**. Die App startet dann ohne Browser-Leiste. iOS wirft den Google-Token gelegentlich weg; dann einfach erneut anmelden. Lesen aus dem gespeicherten Stand funktioniert auch offline.

## 6. Snapshot nach Änderungen an der Liste

Neue Titel, Cover oder Übersetzungen kommen erst in die öffentliche App, wenn ein frischer Snapshot committed wird:

```bash
npm run snapshot -- pfad/zum/export.xlsx
```

`Eigene Notizen` werden dabei entfernt. Status und Bewertung bleiben drin. Die live angemeldete Ansicht braucht diesen Schritt nicht.
