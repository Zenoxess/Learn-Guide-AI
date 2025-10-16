import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { GuideResponse, PracticeResponse, DetailLevel, ModelName, ExamQuestion, ExamAnswer, ExamResult, GradedAnswer, JudgedRound } from '../types';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const generateStudyGuide = async (file: File, useStrictContext: boolean, detailLevel: DetailLevel, model: ModelName): Promise<GuideResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = await fileToBase64(file);

  const filePart = {
    inlineData: {
      mimeType: file.type,
      data: base64Data,
    },
  };

  const basePrompt = `
    Du bist ein erfahrener Universitäts-Tutor und Lernassistent. Deine Aufgabe ist es, das hochgeladene Dokument (z.B. eine Vorlesungsfolie, ein Übungsblatt oder ein Skriptausschnitt) zu analysieren.

    Erstelle basierend auf dem Dokument eine schrittweise Anleitung, die einem Studenten hilft, den Inhalt zu verstehen und zu bearbeiten. Für jeden Schritt sollst du:
    1. Eine klare und verständliche Erklärung liefern.
    2. Hilfreiche Tipps und Tricks geben.
    3. Mögliche Lösungswege oder Denkansätze aufzeigen, insbesondere bei Übungsaufgaben.
    4. Auf potenzielle Fallstricke oder häufige Fehler hinweisen, die bei dem Thema auftreten können.

    Strukturiere deine Antwort als JSON-Objekt, das dem bereitgestellten Schema entspricht. Der Inhalt sollte auf Deutsch sein. Verwende Markdown-Formatierungen (z.B. Aufzählungszeichen mit '-', Fettdruck mit '**text**', Überschriften mit '##'), um die Lesbarkeit zu verbessern.
  `;
  
  let detailInstruction = '';
  switch (detailLevel) {
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
    WICHTIG: Deine gesamte Antwort muss sich AUSSCHLIESSLICH auf die Informationen stützen, die im hochgeladenen Dokument enthalten sind. Ziehe kein externes Wissen hinzu und erfinde keine Informationen, die nicht direkt aus dem Dokument ableitbar sind.
    `;

  const prompt = useStrictContext 
    ? basePrompt + detailInstruction + strictContextInstruction 
    : basePrompt + detailInstruction;


  const response = await ai.models.generateContent({
    model: model,
    contents: { parts: [{ text: prompt }, filePart] },
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

export const solvePracticeQuestions = async (scriptFile: File, practiceFile: File, model: ModelName): Promise<PracticeResponse> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const [scriptBase64, practiceBase64] = await Promise.all([
        fileToBase64(scriptFile),
        fileToBase64(practiceFile)
    ]);

    const scriptPart = { inlineData: { mimeType: scriptFile.type, data: scriptBase64 } };
    const practicePart = { inlineData: { mimeType: practiceFile.type, data: practiceBase64 } };

    const prompt = `
      Du bist ein spezialisierter Universitäts-Tutor. Deine Aufgabe ist es, Übungsaufgaben zu lösen.
      Du hast zwei Dokumente erhalten:
      1. Das "Skript": Dies ist die einzige Wissensquelle, die du verwenden darfst.
      2. Die "Übungsaufgaben": Dieses Dokument enthält die Fragen, die du beantworten sollst.

      DEINE AUFGABE:
      - Analysiere jede Frage aus dem "Übungsaufgaben"-Dokument.
      - Finde die relevante Information zur Beantwortung der Frage AUSSCHLIESSLICH im "Skript"-Dokument.
      - Formuliere für jede Frage eine umfassende Antwort und eine schrittweise Erklärung des Lösungswegs.
      - Gib für jede Antwort eine präzise Referenz an, wo im "Skript" die Information gefunden wurde (z.B. "Siehe Folie 5, Abschnitt 'Thema X'" oder "Basierend auf der Formel im Kapitel Y").
      - Deine gesamte Antwort muss auf Deutsch und im vorgegebenen JSON-Format sein. Verwende Markdown für die Formatierung der textuellen Inhalte.
    `;

    const response = await ai.models.generateContent({
        model: model,
        contents: [
            { parts: [{ text: "Das ist das Skript:" }, scriptPart] },
            { parts: [{ text: "Das sind die Übungsaufgaben:" }, practicePart] },
            { parts: [{ text: prompt }] }
        ],
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

export const startTutorChat = async (scriptFile: File, practiceFile: File, model: ModelName): Promise<Chat> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const [scriptBase64, practiceBase64] = await Promise.all([
        fileToBase64(scriptFile),
        fileToBase64(practiceFile)
    ]);

    const scriptPart = { inlineData: { mimeType: scriptFile.type, data: scriptBase64 } };
    const practicePart = { inlineData: { mimeType: practiceFile.type, data: practiceBase64 } };

    const systemInstruction = `
        Du bist ein Experte als Universitäts-Tutor. Deine Aufgabe ist es, einen Studenten durch die Lösung von Übungsaufgaben zu führen.
        Du hast das relevante Skript und die Übungsaufgaben erhalten.
        
        DEINE REGELN:
        1.  **GIB NIEMALS DIE DIREKTE ANTWORT.** Deine Hauptaufgabe ist es, den Studenten zum selbstständigen Denken anzuregen.
        2.  **Stelle Gegenfragen.** Anstatt zu antworten, stelle eine Frage, die den Studenten in die richtige Richtung lenkt.
        3.  **Verweise auf das Skript.** Sage Dinge wie: "Schau dir mal Folie 5 im Skript an. Was fällt dir dort im Abschnitt über Thema X auf?"
        4.  **Gib Denkanstöße.** Biete Analogien, vereinfachte Beispiele oder schlage den ersten kleinen Schritt vor.
        5.  **Sei geduldig und ermutigend.** Formuliere positiv und bestärkend.
        6.  Beginne die Konversation für eine neue Frage immer, indem du den Studenten fragst, wie er anfangen würde.
        7.  Deine Antworten müssen auf Deutsch sein.
    `;

    const chat = ai.chats.create({
        model: model,
        history: [
            { role: 'user', parts: [{ text: "Hier ist das Skript, das wir als Wissensbasis verwenden werden." }, scriptPart] },
            { role: 'model', parts: [{ text: "Verstanden. Ich habe das Skript erhalten und werde es als einzige Wissensquelle nutzen." }] },
            { role: 'user', parts: [{ text: "Und hier sind die Übungsaufgaben, die wir bearbeiten werden." }, practicePart] },
            { role: 'model', parts: [{ text: "Perfekt, ich habe auch die Übungsaufgaben. Ich bin bereit, dich als Tutor zu unterstützen. Lass uns mit der ersten Frage beginnen, wenn du so weit bist." }] }
        ],
        config: {
            systemInstruction: systemInstruction,
        },
    });

    return chat;
};

export const generateExamQuestions = async (scriptFile: File, model: ModelName): Promise<ExamQuestion[]> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const scriptBase64 = await fileToBase64(scriptFile);
    const scriptPart = { inlineData: { mimeType: scriptFile.type, data: scriptBase64 } };

    const prompt = `
        Du bist ein Professor und erstellst eine Prüfung. Deine Aufgabe ist es, basierend auf dem hochgeladenen Skript eine Reihe von Prüfungsfragen zu generieren.
        Die Fragen sollten das Verständnis der Kernkonzepte des Dokuments testen. Erstelle eine Mischung aus Wissensfragen und Transferfragen.
        Generiere zwischen 5 und 8 Fragen.
        Gib die Fragen als JSON-Objekt zurück, das dem Schema entspricht. Jede Frage sollte eine eindeutige ID haben.
    `;

    const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: prompt }, scriptPart] }],
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

export const gradeExamAnswers = async (scriptFile: File, answers: ExamAnswer[], model: ModelName): Promise<ExamResult> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const scriptBase64 = await fileToBase64(scriptFile);
    const scriptPart = { inlineData: { mimeType: scriptFile.type, data: scriptBase64 } };

    const prompt = `
      Du bist ein fairer und genauer Prüfungskorrektor. Deine einzige Wissensquelle ist das bereitgestellte Skript.
      Du hast die Antworten eines Studenten auf eine Reihe von Prüfungsfragen erhalten.
      
      Deine Aufgabe ist es, jede Antwort zu bewerten:
      1.  **Vergleiche die Antwort des Studenten** mit den Informationen im Skript.
      2.  **Bewerte die Richtigkeit:** Entscheide, ob die Antwort im Wesentlichen korrekt ist ('isCorrect: true/false').
      3.  **Gib konstruktives Feedback:** Erkläre, warum die Antwort richtig oder falsch ist. Hebe Stärken hervor und zeige auf, wo Informationen fehlen oder falsch sind.
      4.  **Formuliere eine Musterlösung:** Schreibe eine ideale, umfassende Antwort, basierend auf den Informationen aus dem Skript.
      5.  Stelle sicher, dass deine gesamte Analyse AUSSCHLIESSLICH auf dem Inhalt des Skripts basiert.
      6.  Gib das Ergebnis im geforderten JSON-Format zurück. Verwende Markdown für die textuellen Inhalte.
    `;

    const response = await ai.models.generateContent({
        model: model,
        contents: [
            { parts: [{ text: "Hier ist das Skript, das die korrekten Informationen enthält:" }, scriptPart] },
            { parts: [{ text: `Hier sind die Antworten des Studenten: ${JSON.stringify(answers)}` }] },
            { parts: [{ text: prompt }] }
        ],
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

// NEUE FUNKTIONEN FÜR SIMULATIONSMODUS

export const startCoopChat = async (scriptFile: File, practiceFile: File, model: ModelName): Promise<Chat> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const [scriptBase64, practiceBase64] = await Promise.all([fileToBase64(scriptFile), fileToBase64(practiceFile)]);
    const scriptPart = { inlineData: { mimeType: scriptFile.type, data: scriptBase64 } };
    const practicePart = { inlineData: { mimeType: practiceFile.type, data: practiceBase64 } };

    const systemInstruction = `
        Du bist ein KI-Studienpartner. Deine Aufgabe ist es, mit einem menschlichen Studenten zusammenzuarbeiten, um Übungsaufgaben zu lösen.
        Du bist kein allwissender Tutor, sondern ein Kommilitone.
        
        DEINE VERHALTENSREGELN:
        1.  **Sei kollaborativ:** Baue auf den Ideen des Nutzers auf. Sage Dinge wie "Das ist ein guter Anfang, was denkst du über...?" oder "Interessanter Punkt! Vielleicht könnten wir auch...".
        2.  **Sei nicht perfekt:** Du musst nicht immer die richtige Antwort wissen. Gib ruhig zu, wenn du unsicher bist, und schlage vor, gemeinsam im Skript nachzusehen.
        3.  **Stelle Fragen:** Beteilige dich aktiv an der Diskussion, indem du offene Fragen stellst.
        4.  **Bringe eigene Ideen ein:** Mache Vorschläge, aber präsentiere sie als Ideen, nicht als Fakten.
        5.  **Fokus auf den Prozess:** Das Ziel ist das gemeinsame Lernen, nicht das schnelle Finden der Lösung.
        6.  Verwende eine freundliche, informelle Sprache. Deine Antworten müssen auf Deutsch sein.
    `;

    return ai.chats.create({
        model: model,
        history: [
            { role: 'user', parts: [{ text: "Hier ist das Skript." }, scriptPart] },
            { role: 'model', parts: [{ text: "Super, hab das Skript. Schau ich mir an." }] },
            { role: 'user', parts: [{ text: "Und das sind die Übungen." }, practicePart] },
            { role: 'model', parts: [{ text: "Okay, hab auch die Übungen. Bin bereit, lass uns die zusammen durchgehen!" }] }
        ],
        config: { systemInstruction },
    });
};

export const getAIOpponentAnswer = async (scriptFile: File, question: string, model: ModelName): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("API_KEY not set");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const scriptBase64 = await fileToBase64(scriptFile);
    const scriptPart = { inlineData: { mimeType: scriptFile.type, data: scriptBase64 } };

    const prompt = `
        Du bist ein ehrgeiziger Top-Student und nimmst an einem Wissenswettbewerb teil.
        Deine einzige Informationsquelle ist das bereitgestellte Skript.
        Deine Aufgabe: Beantworte die folgende Frage so präzise, umfassend und korrekt wie möglich, basierend auf dem Skript.
        Formuliere eine Musterlösung. Deine Antwort entscheidet darüber, ob du gewinnst.
        Frage: "${question}"
    `;

    const response = await ai.models.generateContent({
        model,
        contents: [
            { parts: [{ text: "Das ist das Skript, deine Wissensquelle:" }, scriptPart] },
            { parts: [{ text: prompt }] },
        ],
    });

    return response.text;
};

export const judgeAnswers = async (scriptFile: File, questionText: string, userAnswer: string, aiAnswer: string, model: ModelName): Promise<JudgedRound> => {
    if (!process.env.API_KEY) throw new Error("API_KEY not set");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const scriptBase64 = await fileToBase64(scriptFile);
    const scriptPart = { inlineData: { mimeType: scriptFile.type, data: scriptBase64 } };

    const prompt = `
        Du bist ein unparteiischer und strenger Professor, der zwei Antworten auf eine Prüfungsfrage bewertet.
        Deine einzige Wissensquelle zur Bewertung ist das bereitgestellte Skript.
        
        Die Frage lautet: "${questionText}"
        Antwort von Student A (Mensch): "${userAnswer}"
        Antwort von Student B (KI): "${aiAnswer}"

        Deine Aufgabe:
        1.  Vergleiche beide Antworten sorgfältig mit dem Inhalt des Skripts.
        2.  Bewerte die Richtigkeit, Vollständigkeit und Präzision jeder Antwort.
        3.  Vergib Punkte von 0 bis 10 für jede Antwort. 10 ist eine perfekte Antwort, 0 ist komplett falsch.
        4.  Schreibe eine kurze, prägnante Begründung für deine Punktevergabe. Erkläre, welche Antwort besser war und warum.
        5.  Gib dein Urteil im geforderten JSON-Format zurück.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: [
            { parts: [{ text: "Bewertungsgrundlage (Skript):" }, scriptPart] },
            { parts: [{ text: prompt }] }
        ],
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
