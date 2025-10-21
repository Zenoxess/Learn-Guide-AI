# Lern-Guide AI 🧠✨

Ein intelligenter Lernassistent, der Vorlesungs- und Übungsdokumente in interaktive, personalisierte Lernmaterialien umwandelt. Angetrieben von der Google Gemini API.

Diese Anwendung ermöglicht es Studierenden, ihre Lernmaterialien (PDFs, Bilder, Webinhalte) hochzuladen und von der KI eine Vielzahl an aufbereiteten Inhalten generieren zu lassen – von schrittweisen Anleitungen über Prüfungssimulationen bis hin zu kollaborativen Lernsitzungen.

---

## 🚀 Hauptfunktionen

- **📚 Dynamische Lernpfade:** Nutzer können zwischen zwei Hauptpfaden wählen:
    1.  **Inhalte lernen:** Um die Theorie aus Skripten und Vorlesungen zu verinnerlichen.
    2.  **Übungen lösen:** Um konkrete Aufgabenstellungen zu bearbeiten.

- **🤖 KI-gestützte Inhaltsgenerierung:**
    - **Lern-Guide:** Erstellt eine detaillierte, schrittweise Anleitung durch die hochgeladenen Dokumente mit Erklärungen, Tipps und Denkanstößen.
    - **Schlüsselkonzepte & Glossar:** Extrahiert die wichtigsten Fachbegriffe und Definitionen und stellt sie übersichtlich dar.
    - **Interaktive Lernkarten:** Generiert automatisch Frage-Antwort-Karten, um Wissen aktiv abzufragen.
    - **Prüfungssimulation:** Erstellt einen Test basierend auf den Lerninhalten, bewertet die Antworten des Nutzers und gibt detailliertes Feedback sowie personalisierte Lernempfehlungen.

- **💬 Interaktive Lösungsmodi:**
    - **Geführte Lösungsfindung:** Ein KI-Tutor, der **niemals die direkte Antwort verrät**, sondern den Nutzer durch gezielte Fragen, Denkanstöße und Verweise auf die Skripte zur eigenständigen Lösung führt.
    - **Kollaborative Simulationen:**
        - **Co-op Modus (Studienpartner):** Die KI agiert als gleichgestellter Lernpartner, um gemeinsam Lösungen zu erarbeiten.
        - **VS-Modus (Herausforderer):** Die KI tritt als ehrgeiziger Kommilitone an. Beide beantworten die gleiche Frage, und ein virtueller "Professor" bewertet beide Antworten und vergibt Punkte.

- **🎨 UI & UX Features:**
    - **Zentrales Dashboard:** Alle generierten Inhalte werden in einem übersichtlichen Dashboard mit Tabs gesammelt.
    - **Einheitliches Komponentensystem:** Eine wiederverwendbare `Button`-Komponente sorgt für UI-Konsistenz.
    - **Dark Mode & Theming:** Anpassbares Erscheinungsbild mit verschiedenen Farbthemen.
    - **PDF-Export:** Exportiert Lern-Guides und Lösungen als saubere PDF-Dateien. (work in progress)
    - **Sitzungsverwaltung:** Speichert den Fortschritt im Local Storage und ermöglicht das Fortsetzen einer früheren Sitzung.
    - **Import/Export von Sitzungen:** Ermöglicht das Speichern der gesamten Lernsitzung als JSON-Datei und das spätere Importieren, um nahtlos weiterzuarbeiten oder Sitzungen zu teilen.
    - **Responsives Design:** Optimiert für verschiedene Bildschirmgrößen.

## 🛠️ Verwendete Technologien

- **Frontend:** [React](https://reactjs.org/) (mit Hooks), [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) für ein Utility-First-CSS-Framework.
- **KI-Modell:** [Google Gemini API](https://ai.google.dev/docs) (`@google/genai`) für alle Inhaltsgenerierungs- und Chat-Funktionen.
- **PDF-Export:** [jsPDF](https://github.com/parallax/jsPDF) & [html2canvas](https://html2canvas.hertzen.com/) zur clientseitigen Erstellung von PDF-Dokumenten.
- **Markdown-Rendering:** [react-markdown](https://github.com/remarkjs/react-markdown) mit `remark-gfm` (für Tabellen), `remark-math`/`rehype-katex` (für LaTeX-Formeln), `rehype-raw` und `react-syntax-highlighter` für die Darstellung formatierter Inhalte, inklusive Code-Blöcken.

## ⚙️ Lokales Setup & Ausführung

Um das Projekt lokal auszuführen, folgen Sie diesen Schritten:

### Voraussetzungen

- Ein moderner Webbrowser.
- Ein **Google Gemini API Key**. Sie können einen [hier](https://aistudio.google.com/app/apikey) erhalten.

### Installation

1.  **Repository klonen:**
    ```bash
    git clone https://github.com/IHR-BENUTZERNAME/lern-guide-ai.git
    cd lern-guide-ai
    ```

2.  **API Key einrichten:**
    Die Anwendung lädt den API-Schlüssel aus den Umgebungsvariablen. Erstellen Sie eine Datei namens `.env` im Stammverzeichnis des Projekts und fügen Sie Ihren Schlüssel hinzu:

    ```
    API_KEY=DEIN_PERSÖNLICHER_GEMINI_API_KEY
    ```

    *Hinweis: Diese Methode ist für die lokale Entwicklung gedacht. In einer Produktionsumgebung sollte der API-Schlüssel sicher auf einem Server verwaltet werden.*

3.  **Abhängigkeiten installieren und starten:**
    Dieses Projekt ist für eine `es-module`-kompatible Umgebung konzipiert. In einem Standard-Setup würden Sie folgende Befehle ausführen:
    ```bash
    npm install
    npm run dev
    ```

## 📂 Projektstruktur

Die Codebasis ist modular und komponentenorientiert aufgebaut, um eine gute Wartbarkeit und Erweiterbarkeit zu gewährleisten.

```
/
├── public/
├── src/
│   ├── components/         # Wiederverwendbare React-Komponenten (UI-Elemente)
│   │   ├── App.tsx             # Hauptkomponente, die den Anwendungszustand verwaltet
│   │   ├── Button.tsx          # Generische Button-Komponente
│   │   ├── ResultsDashboard.tsx# Zentrale Ansicht für alle generierten Inhalte
│   │   ├── SetupWizard.tsx     # Schritt-für-Schritt-Konfiguration der Lernsitzung
│   │   └── ...                 # Weitere UI-Komponenten
│   │
│   ├── contexts/             # React Contexts (z.B. für Theming)
│   │   └── ThemeContext.tsx
│   │
│   ├── services/             # Services für die Kommunikation mit externen APIs
│   │   └── geminiService.ts    # Kapselt alle Aufrufe an die Google Gemini API
│   │
│   ├── types.ts              # Zentrale TypeScript-Typdefinitionen und Interfaces
│   └── utils.ts              # Hilfsfunktionen (z.B. Dateikonvertierung)
│
├── index.html                # Einstiegspunkt der Anwendung
└── README.md                 # Diese Datei
```

## 🔮 Mögliche zukünftige Erweiterungen

- **Erweiterte Dateitypen:** Unterstützung für `.docx`, `.pptx` und weitere Formate.
- **Cloud-Speicherung:** Speichern und Teilen von Lernsitzungen über ein Backend und eine Datenbank.
- **Echtzeit-Kollaboration:** Gemeinsames Arbeiten im Co-op-Modus für mehrere Benutzer.
- **Verbesserter PDF-Export:** Mehr Layout-Optionen und eine präzisere Formatierung.
- **Internationalisierung (i18n):** Unterstützung für weitere Sprachen.
