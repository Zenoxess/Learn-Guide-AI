import { GoogleGenAI, Type, Chat, Part, Content } from "@google/genai";
import type { GuideResponse, PracticeResponse, DetailLevel, ModelName, ExamQuestion, ExamAnswer, ExamResult, GradedAnswer, JudgedRound, KeyConceptsResponse, FlashcardsResponse } from '../types';
import { fileToBase64 } from "../utils";

const filesToGenerativeParts = (files: File[]): Promise<Part[]> => {
    return Promise.all(
        files.map(async (file) => ({
            inlineData: {
                mimeType: file.type,
                data: await fileToBase64(file),
            },
        }))
    );
};

/**
 * Simuliert das Abrufen von Webinhalten von einer URL.
 * WICHTIGER HINWEIS: Direkte clientseitige Anfragen an externe URLs stoßen in der Regel
 * auf CORS-Fehler (Cross-Origin Resource Sharing), da Browser aus Sicherheitsgründen
 * solche Anfragen blockieren.
 *
 * Für eine echte Implementierung wäre eine serverseitige Komponente (z.B. eine Cloud-Funktion,
 * ein Next.js API-Endpunkt oder ein dedizierter CORS-Proxy) erforderlich. Diese Komponente würde
 * die URL serverseitig abrufen und den Inhalt an das Frontend weiterleiten.
 *
 * Diese Funktion simuliert diesen Prozess, indem sie eine virtuelle Datei erstellt,
 * die einen Verweis auf die URL enthält, damit die UI und die KI-Funktionen
 * damit arbeiten können.
 * @param url Die URL, von der der Inhalt geladen werden soll.
 * @returns Ein Promise, das zu einem simulierten File-Objekt aufgelöst wird.
 */
export const generateContentFromUrl = async (url: string): Promise<File> => {
  // Simulierter Inhalt für die KI und zur Anzeige
  const content = `# Web-Inhalt

Dieser Inhalt wurde von der folgenden URL geladen: ${url}

**Hinweis für die KI:** Bitte behandle diesen Text so, als wäre er der Hauptinhalt der Webseite unter der angegebenen URL. In einer realen Anwendung würde hier der vollständige HTML- oder Textinhalt der Seite stehen.
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], 'web-inhalt.txt', { type: 'text/plain' });

  return Promise.resolve(file);
};


export const generateStudyGuide = async (files: File[], useStrictContext: boolean, detailLevel: DetailLevel, model: ModelName): Promise<GuideResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const fileParts = await filesToGenerativeParts(files);

  const basePrompt = `
    Du bist ein erfahrener Universitäts-Tutor und Lernassistent. Deine Aufgabe ist es, die hochgeladenen Dokumente (z.B. eine Vorlesungsfolie, ein Übungsblatt oder ein Skriptausschnitt) zu analysieren.

    Erstelle basierend auf den Dokumenten eine schrittweise Anleitung, die einem Studenten hilft, den Inhalt zu verstehen und zu bearbeiten. Für jeden Schritt sollst du:
    1. Eine klare und verständliche Erklärung liefern.
    2. Hilfreiche Tipps und Tricks geben.
    3. Mögliche Lösungswege oder Denkansätze aufzeigen, insbesondere bei Übungsaufgaben.
    4. Auf potenzielle Fallstricke oder häufige Fehler hinweisen, die bei dem Thema auftreten können.
    5. Generiere 2-3 relevante Folgefragen, die das Verständnis des Inhalts vertiefen und zum Nachdenken anregen. Diese Fragen sollten im Feld 'suggestedFollowUps' als Array von Strings zurückgegeben werden.

    Strukturiere deine Antwort als JSON-Objekt, das dem bereitgestellten Schema entspricht. Der Inhalt sollte auf Deutsch sein. Verwende Markdown-Formatierungen (z.B. Aufzählungszeichen mit '-', Fettdruck mit '**text**', Überschriften mit '##'), um die Lesbarkeit zu verbessern.
  `;
  
  let detailInstruction = '';
  switch (detailLevel) {
    case 'eli5':
      detailInstruction = `
        ANWEISUNG ZUR DETAILLIERTHEIT: Erkläre alles so, als würdest du es einem 5-jährigen Kind erklären (ELI5 - Explain Like I'm 5). Verwende extrem einfache Sprache, kurze Sätze und alltägliche Analogien oder Metaphern, um komplexe Ideen zu veranschaulichen. Definiere jeden Fachbegriff sofort und auf simple Weise. Vermeide jeglichen Jargon und konzentriere dich nur auf die absolute Kernidee.
      `;
      break;
    case 'overview':
      detailInstruction = `
        ANWEISUNG ZUR DETAILLIERTHEIT: Fasse die wichtigsten Konzepte kurz und bündig zusammen. Konzentriere dich auf die Kernaussagen und Schlüsselbegriffe. Halte die Erklärungen kurz und auf den Punkt gebracht.
      `;
      break;
    case 'detailed':
      detailInstruction = `
        ANWEISUNG ZUR DETAILLIERTHEIT: Erkläre alle Konzepte extrem ausführlich. Gehe auf Randnotizen, Beispiele und Implikationen ein. Gib, wenn möglich, Hintergrundinformationen und führe jeden Schritt sehr detailliert aus. Ideal für ein tiefes und umfassendes Verständnis.
      `;
      break;
    case 'standard':
    default:
      detailInstruction = `
        ANWEISUNG ZUR DETAILLIERTHEIT: Gib eine ausgewogene, schrittweise Erklärung, die die wichtigsten Punkte abdeckt, ohne zu sehr ins Detail zu gehen. Ideal für ein grundlegendes Verständnis.
      `;
      break;
  }


  const strictContextInstruction = `
    WICHTIG: Deine gesamte Antwort muss sich AUSSCHLIESSLICH auf die Informationen stützen, die in den hochgeladenen Dokumenten enthalten sind. Ziehe kein externes Wissen hinzu und erfinde keine Informationen, die nicht direkt aus den Dokumenten ableitbar sind.
    `;

  const prompt = useStrictContext 
    ? basePrompt + detailInstruction + strictContextInstruction 
    : basePrompt + detailInstruction;


  const response = await ai.models.generateContent({
    model: model,
    contents: { parts: [{ text: prompt }, ...fileParts] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          guide: {
            type: Type.ARRAY,
            description: "Eine Reihe von Schritten, um den Benutzer durch das Dokument zu führen.",
            items: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: "Ein kurzer, beschreibender Titel für den Lernschritt."
                },
                content: {
                  type: Type.STRING,
                  description: "Eine detaillierte Erklärung für den Schritt, einschließlich Tipps, Tricks und Lösungsstrategien. Verwende Markdown für die Formatierung."
                },
                suggestedFollowUps: {
                  type: Type.ARRAY,
                  description: "Eine Liste von 2-3 vorgeschlagenen Folgefragen, die das Verständnis vertiefen.",
                  items: {
                    type: Type.STRING
                  }
                }
              },
              required: ["title", "content"]
            }
          }
        },
        required: ["guide"]
      }
    }
  });

  const jsonText = response.text.trim();
  try {
    const parsedJson = JSON.parse(jsonText);
    return parsedJson as GuideResponse;
  } catch (e) {
    console.error("Failed to parse Gemini response:", jsonText);
    throw new Error("Die Antwort des KI-Modells konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.");
  }
};

export const askFollowUpQuestion = async (context: string, question: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Du bist ein hilfsbereiter Universitäts-Tutor. Beantworte die Frage des Studenten kurz und prägnant.
    Die Frage bezieht sich auf den folgenden Kontext aus einem Lern-Guide. Beziehe dich in deiner Antwort auf diesen Kontext.

    ---
    Kontext:
    ${context}
    ---

    Frage des Studenten:
    ${question}
    ---
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text;
};

export const solvePracticeQuestions = async (scriptFiles: File[], questions: string[], model: ModelName): Promise<PracticeResponse> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const scriptParts = await filesToGenerativeParts(scriptFiles);

    const prompt = `
      Du bist ein spezialisierter Universitäts-Tutor. Deine Aufgabe ist es, Übungsaufgaben zu lösen.
      Du hast "Skripte" erhalten, die du als einzige Wissensquelle verwenden darfst.
      
      DEINE AUFGABE:
      - Bearbeite jede der folgenden Fragen: ${JSON.stringify(questions)}
      - Finde die relevante Information zur Beantwortung jeder Frage AUSSCHLIESSLICH in den "Skript"-Dokumenten.
      - Formuliere für jede Frage eine umfassende Antwort und eine schrittweise Erklärung des Lösungswegs.
      - Gib für jede Antwort eine präzise Referenz an, wo in den "Skripten" die Information gefunden wurde (z.B. "Siehe Folie 5, Abschnitt 'Thema X'" oder "Basierend auf der Formel im Kapitel Y").
      - Deine gesamte Antwort muss auf Deutsch und im vorgegebenen JSON-Format sein. Verwende Markdown für die Formatierung der textuellen Inhalte.
    `;

    const contents: Content[] = [
        ...scriptParts.map(part => ({ parts: [{ text: "Das ist ein Skript:" }, part] })),
        { parts: [{ text: prompt }] }
    ];

    const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    solvedQuestions: {
                        type: Type.ARRAY,
                        description: "Eine Liste der gelösten Aufgaben.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING, description: "Die ursprüngliche Frage aus dem Übungsdokument." },
                                answer: { type: Type.STRING, description: "Die formulierte, korrekte Antwort. Mit Markdown formatiert." },
                                explanation: { type: Type.STRING, description: "Eine detaillierte Erklärung des Lösungswegs. Mit Markdown formatiert." },
                                reference: { type: Type.STRING, description: "Ein Zitat oder Verweis auf die exakte Stelle im Skript." }
                            },
                            required: ["title", "answer", "explanation", "reference"]
                        }
                    }
                },
                required: ["solvedQuestions"]
            }
        }
    });

    const jsonText = response.text.trim();
    try {
        return JSON.parse(jsonText) as PracticeResponse;
    } catch (e) {
        console.error("Failed to parse Gemini response for practice questions:", jsonText);
        throw new Error("Die Antwort des KI-Modells für die Übungsaufgaben konnte nicht verarbeitet werden.");
    }
};

export const extractQuestions = async (practiceFile: File, model: ModelName): Promise<string[]> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const practiceBase64 = await fileToBase64(practiceFile);
    const practicePart = { inlineData: { mimeType: practiceFile.type, data: practiceBase64 } };

    const prompt = `
        Analysiere das hochgeladene Übungsdokument. Extrahiere alle einzelnen Fragen oder Aufgabenstellungen.
        Gib die Fragen als JSON-Array von Strings zurück. Jedes Element im Array sollte genau eine Frage sein.
        Beispiel: ["Was ist die Hauptstadt von Deutschland?", "Berechne 2+2.", "Erkläre die Photosynthese."].
        Fasse die Fragen wenn nötig kurz zusammen, aber behalte den Kern der Aufgabe bei.
    `;

    const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: prompt }, practicePart] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    questions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ["questions"]
            }
        }
    });

    const jsonText = response.text.trim();
    try {
        const parsed = JSON.parse(jsonText);
        if (parsed.questions && Array.isArray(parsed.questions)) {
            return parsed.questions;
        }
        throw new Error("Invalid format for questions array.");
    } catch (e) {
        console.error("Failed to parse questions from Gemini response:", jsonText);
        throw new Error("Die Fragen aus dem Übungsdokument konnten nicht extrahiert werden.");
    }
};

export const startTutorChat = async (scriptFiles: File[], practiceFile: File, model: ModelName): Promise<Chat> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const scriptParts = await filesToGenerativeParts(scriptFiles);
    const practiceBase64 = await fileToBase64(practiceFile);
    const practicePart = { inlineData: { mimeType: practiceFile.type, data: practiceBase64 } };

    const systemInstruction = `
        Du bist ein Experte als Universitäts-Tutor. Deine Aufgabe ist es, einen Studenten durch die Lösung von Übungsaufgaben zu führen.
        Du hast die relevanten Skripte und die Übungsaufgaben erhalten.
        
        DEINE REGELN:
        1.  **GIB NIEMALS DIE DIREKTE ANTWORT.** Deine Hauptaufgabe ist es, den Studenten zum selbstständigen Denken anzuregen.
        2.  **Stelle Gegenfragen.** Anstatt zu antworten, stelle eine Frage, die den Studenten in die richtige Richtung lenkt.
        3.  **Verweise auf die Skripte.** Sage Dinge wie: "Schau dir mal Folie 5 im Skript an. Was fällt dir dort im Abschnitt über Thema X auf?"
        4.  **Gib Denkanstöße.** Biete Analogien, vereinfachte Beispiele oder schlage den ersten kleinen Schritt vor.
        5.  **Sei geduldig und ermutigend.** Formuliere positiv und bestärkend.
        6.  Beginne die Konversation für eine neue Frage immer, indem du den Studenten fragst, wie er anfangen würde.
        7.  Deine Antworten müssen auf Deutsch sein.
    `;
    
    const history: Content[] = [
// FIX: Corrected the mapping of scriptParts to ensure proper content structure for chat history.
        ...scriptParts.map(part => ({ role: 'user' as const, parts: [{ text: "Hier ist ein Skript, das wir als Wissensbasis verwenden werden." }, part] })),
        { role: 'model' as const, parts: [{ text: "Verstanden. Ich habe die Skripte erhalten und werde sie als Teil der Wissensquelle nutzen." }] },
        { role: 'user', parts: [{ text: "Und hier sind die Übungsaufgaben, die wir bearbeiten werden." }, practicePart] },
        { role: 'model', parts: [{ text: "Perfekt, ich habe auch die Übungsaufgaben. Ich bin bereit, dich als Tutor zu unterstützen. Lass uns mit der ersten Frage beginnen, wenn du so weit bist." }] }
    ];

    const chat = ai.chats.create({
        model: model,
        history: history,
        config: {
            systemInstruction: systemInstruction,
        },
    });

    return chat;
};

export const generateExamQuestions = async (scriptFiles: File[], model: ModelName): Promise<ExamQuestion[]> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const scriptParts = await filesToGenerativeParts(scriptFiles);

    const prompt = `
        Du bist ein Professor und erstellst eine Prüfung. Deine Aufgabe ist es, basierend auf den hochgeladenen Skripten eine Reihe von Prüfungsfragen zu generieren.
        Die Fragen sollten das Verständnis der Kernkonzepte der Dokumente testen. Erstelle eine Mischung aus Wissensfragen und Transferfragen.
        Generiere zwischen 5 und 8 Fragen.
        Gib die Fragen als JSON-Objekt zurück, das dem Schema entspricht. Jede Frage sollte eine eindeutige ID haben.
    `;

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }, ...scriptParts] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    examQuestions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING, description: "Eine eindeutige ID für die Frage, z.B. 'q1'." },
                                questionText: { type: Type.STRING, description: "Der vollständige Text der Prüfungsfrage." }
                            },
                            required: ["id", "questionText"]
                        }
                    }
                },
                required: ["examQuestions"]
            }
        }
    });

    const jsonText = response.text.trim();
    try {
        const parsed = JSON.parse(jsonText);
        return parsed.examQuestions as ExamQuestion[];
    } catch (e) {
        console.error("Failed to parse exam questions from Gemini response:", jsonText);
        throw new Error("Die Prüfungsfragen konnten nicht erstellt werden.");
    }
};

export const gradeExamAnswers = async (scriptFiles: File[], answers: ExamAnswer[], model: ModelName): Promise<ExamResult> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const scriptParts = await filesToGenerativeParts(scriptFiles);

    const prompt = `
      Du bist ein fairer und genauer Prüfungskorrektor. Deine einzige Wissensquelle sind die bereitgestellten Skripte.
      Du hast die Antworten eines Studenten auf eine Reihe von Prüfungsfragen erhalten.
      
      Deine Aufgabe ist es, jede Antwort zu bewerten:
      1.  **Vergleiche die Antwort des Studenten** mit den Informationen in den Skripten.
      2.  **Bewerte die Richtigkeit:** Entscheide, ob die Antwort im Wesentlichen korrekt ist ('isCorrect: true/false').
      3.  **Gib konstruktives Feedback:** Erkläre, warum die Antwort richtig oder falsch ist. Hebe Stärken hervor und zeige auf, wo Informationen fehlen oder falsch sind.
      4.  **Formuliere eine Musterlösung:** Schreibe eine ideale, umfassende Antwort, basierend auf den Informationen aus den Skripten.
      5.  Stelle sicher, dass deine gesamte Analyse AUSSCHLIESSLICH auf dem Inhalt der Skripte basiert.
      6.  Gib das Ergebnis im geforderten JSON-Format zurück. Verwende Markdown für die textuellen Inhalte.
    `;
    
    const contents: Content[] = [
        ...scriptParts.map(part => ({ parts: [{ text: "Hier ist ein Skript, das die korrekten Informationen enthält:" }, part] })),
        { parts: [{ text: `Hier sind die Antworten des Studenten: ${JSON.stringify(answers)}` }] },
        { parts: [{ text: prompt }] }
    ];


    const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    gradedAnswers: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                questionText: { type: Type.STRING },
                                userAnswer: { type: Type.STRING },
                                feedback: { type: Type.STRING },
                                suggestedAnswer: { type: Type.STRING },
                                isCorrect: { type: Type.BOOLEAN }
                            },
                            required: ["questionText", "userAnswer", "feedback", "suggestedAnswer", "isCorrect"]
                        }
                    }
                },
                required: ["gradedAnswers"]
            }
        }
    });

    const jsonText = response.text.trim();
    try {
        const parsed = JSON.parse(jsonText);
        if (!parsed.gradedAnswers || !Array.isArray(parsed.gradedAnswers)) {
            throw new Error("Invalid response format: 'gradedAnswers' array is missing.");
        }

        const finalGradedAnswers = parsed.gradedAnswers.map((graded: GradedAnswer, index: number) => {
            const originalAnswer = answers[index];
            if (!originalAnswer) {
                console.warn(`Could not find original answer for graded answer at index ${index}`);
                return graded;
            }
            return {
                ...graded,
                questionText: originalAnswer.questionText || graded.questionText,
                userAnswer: originalAnswer.answerText,
            };
        });
        
        return { gradedAnswers: finalGradedAnswers } as ExamResult;

    } catch (e) {
        console.error("Failed to parse graded exam answers from Gemini response:", jsonText, e);
        throw new Error("Die Prüfung konnte nicht bewertet werden.");
    }
};

export const generateKeyConcepts = async (scriptFiles: File[], model: ModelName): Promise<KeyConceptsResponse> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const scriptParts = await filesToGenerativeParts(scriptFiles);

    const prompt = `
        Du bist ein Experte für Wissensextraktion. Deine Aufgabe ist es, aus den hochgeladenen Dokumenten (Skripte, Vorlesungsfolien) die wichtigsten Schlüsselkonzepte, Begriffe und Definitionen zu extrahieren.
        
        ANWEISUNGEN:
        1.  Identifiziere die zentralen Fachbegriffe und Konzepte in den Texten.
        2.  Formuliere für jeden Begriff eine prägnante und leicht verständliche Definition, die ausschließlich auf den Informationen aus den Dokumenten basiert.
        3.  Gib das Ergebnis als Glossar im geforderten JSON-Format zurück.
        4.  Stelle sicher, dass die extrahierten Begriffe relevant für das Gesamtthema der Dokumente sind.
    `;

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }, ...scriptParts] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    keyConcepts: {
                        type: Type.ARRAY,
                        description: "Eine Liste von Schlüsselkonzepten und deren Definitionen.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                term: { type: Type.STRING, description: "Der Schlüsselbegriff oder das Konzept." },
                                definition: { type: Type.STRING, description: "Eine klare und prägnante Definition des Begriffs." }
                            },
                            required: ["term", "definition"]
                        }
                    }
                },
                required: ["keyConcepts"]
            }
        }
    });

    const jsonText = response.text.trim();
    try {
        const parsed = JSON.parse(jsonText);
        return parsed as KeyConceptsResponse;
    } catch (e) {
        console.error("Failed to parse key concepts from Gemini response:", jsonText);
        throw new Error("Die Schlüsselkonzepte konnten nicht extrahiert werden.");
    }
};


export const generateFlashcards = async (scriptFiles: File[], model: ModelName): Promise<FlashcardsResponse> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const scriptParts = await filesToGenerativeParts(scriptFiles);

    const prompt = `
        Du bist ein Lern-Experte. Deine Aufgabe ist es, aus den hochgeladenen Dokumenten (Skripte, Vorlesungsfolien) eine Reihe von Lernkarten zu erstellen.

        ANWEISUNGEN:
        1.  Analysiere die Dokumente und identifiziere die wichtigsten Konzepte, Definitionen, Fakten und Zusammenhänge.
        2.  Erstelle für jeden wichtigen Punkt eine Lernkarte, bestehend aus einer klaren, präzisen Frage (Vorderseite) und einer korrekten, verständlichen Antwort (Rückseite).
        3.  Die Fragen sollten so formuliert sein, dass sie zum aktiven Abrufen von Wissen anregen (z.B. "Was ist...?", "Erkläre den Unterschied zwischen...", "Welche 3 Faktoren beeinflussen...?").
        4.  Die Antworten sollten sich ausschließlich auf die Informationen aus den Dokumenten stützen.
        5.  Generiere eine sinnvolle Anzahl an Lernkarten, die die Kerninhalte der Dokumente abdecken.
        6.  Gib das Ergebnis im geforderten JSON-Format zurück.
    `;

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }, ...scriptParts] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    flashcards: {
                        type: Type.ARRAY,
                        description: "Eine Liste von Lernkarten.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING, description: "Die Frage auf der Vorderseite der Lernkarte." },
                                answer: { type: Type.STRING, description: "Die Antwort auf der Rückseite der Lernkarte." }
                            },
                            required: ["question", "answer"]
                        }
                    }
                },
                required: ["flashcards"]
            }
        }
    });

    const jsonText = response.text.trim();
    try {
        const parsed = JSON.parse(jsonText);
        return parsed as FlashcardsResponse;
    } catch (e) {
        console.error("Failed to parse flashcards from Gemini response:", jsonText);
        throw new Error("Die Lernkarten konnten nicht erstellt werden.");
    }
};


// NEUE FUNKTIONEN FÜR SIMULATIONSMODUS

export const startCoopChat = async (scriptFiles: File[], practiceFile: File, model: ModelName): Promise<Chat> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const scriptParts = await filesToGenerativeParts(scriptFiles);
    const practiceBase64 = await fileToBase64(practiceFile);
    const practicePart = { inlineData: { mimeType: practiceFile.type, data: practiceBase64 } };

    const systemInstruction = `
        Du bist ein KI-Studienpartner. Deine Aufgabe ist es, mit einem menschlichen Studenten zusammenzuarbeiten, um Übungsaufgaben zu lösen.
        Du bist kein allwissender Tutor, sondern ein Kommilitone.
        
        DEINE VERHALTENSREGELN:
        1.  **Sei kollaborativ:** Baue auf den Ideen des Nutzers auf. Sage Dinge wie "Das ist ein guter Anfang, was denkst du über...?" oder "Interessanter Punkt! Vielleicht könnten wir auch...".
        2.  **Sei nicht perfekt:** Du musst nicht immer die richtige Antwort wissen. Gib ruhig zu, wenn du unsicher bist, und schlage vor, gemeinsam in den Skripten nachzusehen.
        3.  **Stelle Fragen:** Beteilige dich aktiv an der Diskussion, indem du offene Fragen stellst.
        4.  **Bringe eigene Ideen ein:** Mache Vorschläge, aber präsentiere sie als Ideen, nicht als Fakten.
        5.  **Fokus auf den Prozess:** Das Ziel ist das gemeinsame Lernen, nicht das schnelle Finden der Lösung.
        6.  Verwende eine freundliche, informelle Sprache. Deine Antworten müssen auf Deutsch sein.
    `;
    
    const history: Content[] = [
        ...scriptParts.flatMap(part => [
            { role: 'user' as const, parts: [{ text: "Hier ist ein Skript." }, part] },
            { role: 'model' as const, parts: [{ text: "Super, hab das Skript. Schau ich mir an." }] }
        ]),
        { role: 'user', parts: [{ text: "Und das sind die Übungen." }, practicePart] },
        { role: 'model', parts: [{ text: "Okay, hab auch die Übungen. Bin bereit, lass uns die zusammen durchgehen!" }] }
    ];

    return ai.chats.create({
        model: model,
        history: history,
        config: { systemInstruction },
    });
};

export const getAIOpponentAnswer = async (scriptFiles: File[], question: string, model: ModelName): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("API_KEY not set");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const scriptParts = await filesToGenerativeParts(scriptFiles);

    const prompt = `
        Du bist ein ehrgeiziger Top-Student und nimmst an einem Wissenswettbewerb teil.
        Deine einzige Informationsquelle sind die bereitgestellten Skripte.
        Deine Aufgabe: Beantworte die folgende Frage so präzise, umfassend und korrekt wie möglich, basierend auf den Skripten.
        Formuliere eine Musterlösung. Deine Antwort entscheidet darüber, ob du gewinnst.
        Frage: "${question}"
    `;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: "Das sind die Skripte, deine Wissensquelle:" }, ...scriptParts, { text: prompt }] }
    });

    return response.text;
};

export const judgeAnswers = async (scriptFiles: File[], questionText: string, userAnswer: string, aiAnswer: string, model: ModelName): Promise<JudgedRound> => {
    if (!process.env.API_KEY) throw new Error("API_KEY not set");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const scriptParts = await filesToGenerativeParts(scriptFiles);

    const prompt = `
        Du bist ein unparteiischer und strenger Professor, der zwei Antworten auf eine Prüfungsfrage bewertet.
        Deine einzige Wissensquelle zur Bewertung sind die bereitgestellten Skripte.
        
        Die Frage lautet: "${questionText}"
        Antwort von Student A (Mensch): "${userAnswer}"
        Antwort von Student B (KI): "${aiAnswer}"

        Deine Aufgabe:
        1.  Vergleiche beide Antworten sorgfältig mit dem Inhalt der Skripte.
        2.  Bewerte die Richtigkeit, Vollständigkeit und Präzision jeder Antwort.
        3.  Vergib Punkte von 0 bis 10 für jede Antwort. 10 ist eine perfekte Antwort, 0 ist komplett falsch.
        4.  Schreibe eine kurze, prägnante Begründung für deine Punktevergabe. Erkläre, welche Antwort besser war und warum.
        5.  Gib dein Urteil im geforderten JSON-Format zurück.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: "Bewertungsgrundlage (Skripte):" }, ...scriptParts, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    judgment: { type: Type.STRING, description: "Deine schriftliche Begründung für die Bewertung." },
                    userScore: { type: Type.INTEGER, description: "Punkte für den Menschen (0-10)." },
                    aiScore: { type: Type.INTEGER, description: "Punkte für die KI (0-10)." }
                },
                required: ["judgment", "userScore", "aiScore"]
            }
        }
    });

    const jsonText = response.text.trim();
    try {
        const parsed = JSON.parse(jsonText);
        return {
            questionText,
            userAnswer,
            aiAnswer,
            judgment: parsed.judgment,
            userScore: parsed.userScore,
            aiScore: parsed.aiScore
        };
    } catch (e) {
        console.error("Failed to parse judgment response:", jsonText, e);
        throw new Error("Die Bewertung der Antworten ist fehlgeschlagen.");
    }
};

export const getPersonalizedRecommendations = async (scriptFiles: File[], incorrectAnswers: GradedAnswer[], model: ModelName): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const scriptParts = await filesToGenerativeParts(scriptFiles);

    const prompt = `
        Du bist ein erfahrener und einfühlsamer Tutor. Deine Aufgabe ist es, einem Studenten personalisiertes Feedback zu geben, basierend auf seinen falschen Antworten in einer Prüfung und den originalen Lernmaterialien (Skripte).

        Hier sind die Fragen, die der Student falsch beantwortet hat, zusammen mit seinen Antworten und den korrekten Musterlösungen:
        ${JSON.stringify(incorrectAnswers, null, 2)}

        Deine Aufgabe:
        1. Analysiere die falschen Antworten. Identifiziere gemeinsame Themen, Wissenslücken oder wiederkehrende Missverständnisse.
        2. Formuliere eine kurze, ermutigende und konstruktive Zusammenfassung (2-4 Sätze).
        3. Gib basierend auf deiner Analyse 2-3 konkrete Empfehlungen, welche Themen oder Kapitel aus den Skripten der Student wiederholen sollte. Sei so spezifisch wie möglich und beziehe dich auf Inhalte, die wahrscheinlich in den Skripten zu finden sind.
        4. Strukturiere deine Antwort als Markdown. Verwende Überschriften (z.B. '### Deine Lern-Empfehlungen') und Listen.
        
        BEISPIEL-ANTWORT:
        "Gut gemacht, dass du die Prüfung abgeschlossen hast! Es scheint, als hättest du die Grundlagen verstanden, aber bei der Anwendung von Formel X und bei den Details zur Kanalcodierung gibt es noch Unsicherheiten. Das ist völlig normal und lässt sich gut beheben!

        ### Deine Lern-Empfehlungen
        - **Thema 'Nachrichtenkanal' wiederholen:** Konzentriere dich besonders auf die Abschnitte zur Kanalcodierung und Modulation. Schau dir die Beispiele auf den Folien 5-7 noch einmal genau an.
        - **Formel X üben:** Gehe die Herleitung der Formel im Skript auf Seite 12 durch und rechne die Beispielaufgabe dazu noch einmal selbst.
        - **Unterschied zwischen A und B:** Lies dir den Abschnitt durch, der die beiden Konzepte vergleicht, um die feinen Unterschiede besser zu verstehen."

        Gib nur die Markdown-formatierte Empfehlung zurück.
    `;

    const contents: Content[] = [
        ...scriptParts.map(part => ({ parts: [{ text: "Hier ist ein Skript, das als Wissensbasis dient:" }, part] })),
        { parts: [{ text: prompt }] }
    ];

    const response = await ai.models.generateContent({
        model: model,
        contents: contents,
    });

    return response.text;
};