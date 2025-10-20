import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import type { GuideStep, DetailLevel, ModelName, SolutionMode, ExamQuestion, ExamAnswer, GradedAnswer, SimulationModeType, ScriptAction, GeneratedContent, NotificationType } from './types';
import { generateStudyGuide, askFollowUpQuestion, solvePracticeQuestions, extractQuestions, generateExamQuestions, gradeExamAnswers, generateKeyConcepts, generateFlashcards, generateContentFromUrl, askFollowUpOnSolution } from './services/geminiService';
import { LoadingSpinner } from './components/LoadingSpinner';
import { PdfPreview } from './components/PdfPreview';
import { SessionPrompt } from './components/SessionPrompt';
import { Notification } from './components/Notification';
import { Button } from './components/Button';
import { SparklesIcon, DocumentArrowDownIcon, ArrowPathIcon } from './components/icons';
import { useTheme } from './contexts/ThemeContext';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { fileToBase64, base64ToFile } from './utils';

// Lazy-loaded components
// FIX: Updated lazy imports to correctly handle named exports. React.lazy expects a module with a default export.
const ResultsDashboard = lazy(() => import('./components/ResultsDashboard').then(module => ({ default: module.ResultsDashboard })));
const SetupWizard = lazy(() => import('./components/SetupWizard').then(module => ({ default: module.SetupWizard })));
const GuidedSolution = lazy(() => import('./components/GuidedSolution').then(module => ({ default: module.GuidedSolution })));
const SimulationMode = lazy(() => import('./components/SimulationMode').then(module => ({ default: module.SimulationMode })));
const ExamMode = lazy(() => import('./components/ExamMode').then(module => ({ default: module.ExamMode })));


// TypeScript declarations for global libraries loaded via CDN
declare const jspdf: any;
declare const html2canvas: any;

type AppState = 'initial' | 'loading' | 'resultsDashboard' | 'error' | 'guided' | 'exam' | 'simulation';

const SESSION_STORAGE_KEY = 'lernGuideSession';

interface SerializableFile {
    name: string;
    type: string;
    lastModified: number;
    data: string; // base64
}

interface AppNotification {
  message: string;
  type: NotificationType;
}

interface SavedSession {
    appState: AppState;
    scriptFiles: SerializableFile[];
    practiceFile: SerializableFile | null;
    generatedContent: GeneratedContent;
    openStepIndex: number | null;
    useStrictContext: boolean;
    detailLevel: DetailLevel;
    model: ModelName;
    selectedScriptAction: ScriptAction;
}

export default function App() {
  const { theme } = useTheme();
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>({});
  const [practiceQuestions, setPracticeQuestions] = useState<ExamQuestion[]>([]);
  const [allPracticeQuestions, setAllPracticeQuestions] = useState<ExamQuestion[]>([]);
  const [isSolvingNextBatch, setIsSolvingNextBatch] = useState(false);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('initial');
  const [scriptFiles, setScriptFiles] = useState<File[]>([]);
  const [practiceFile, setPracticeFile] = useState<File | null>(null);
  const [openStepIndex, setOpenStepIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>(undefined);
  const [useStrictContext, setUseStrictContext] = useState(true);
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('standard');
  const [model, setModel] = useState<ModelName>('gemini-2.5-flash');
  const [activeMode, setActiveMode] = useState<'solution' | 'simulation'>('solution');
  const [solutionMode, setSolutionMode] = useState<SolutionMode>('direct');
  const [simulationMode, setSimulationMode] = useState<SimulationModeType>('coop');
  const [selectedScriptAction, setSelectedScriptAction] = useState<ScriptAction>('guide');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [savedSessionData, setSavedSessionData] = useState<SavedSession | null>(null);
  const [showSessionPrompt, setShowSessionPrompt] = useState(false);
  const [notification, setNotification] = useState<AppNotification | null>(null);

  // Load session from localStorage on initial app load
  useEffect(() => {
    try {
      const savedStateJSON = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedStateJSON) {
        const savedState: SavedSession = JSON.parse(savedStateJSON);
        if (savedState.appState !== 'initial') {
            setSavedSessionData(savedState);
            setShowSessionPrompt(true);
        }
      }
    } catch (err) {
      console.error("Failed to load or parse session from localStorage", err);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);
  
  // Save session to localStorage whenever the state changes
  useEffect(() => {
    const saveSession = async () => {
        // Don't save initial or loading states to avoid overwriting a valid session on reload.
        if (appState === 'initial' || appState === 'loading' || showSessionPrompt) return;

        try {
            const serializableScriptFiles = await Promise.all(
                scriptFiles.map(async file => ({
                    name: file.name,
                    type: file.type,
                    lastModified: file.lastModified,
                    data: await fileToBase64(file),
                }))
            );

            let serializablePracticeFile: SerializableFile | null = null;
            if (practiceFile) {
                serializablePracticeFile = {
                    name: practiceFile.name,
                    type: practiceFile.type,
                    lastModified: practiceFile.lastModified,
                    data: await fileToBase64(practiceFile),
                };
            }

            const sessionToSave: SavedSession = {
                appState, scriptFiles: serializableScriptFiles, practiceFile: serializablePracticeFile,
                generatedContent, openStepIndex, useStrictContext, detailLevel, model, selectedScriptAction,
            };

            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionToSave));
            if (notification?.type === 'warning') setNotification(null); // Clear previous error if save is now successful

        } catch (err) {
            if (err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22)) {
                setNotification({ message: "Warnung: Ihre Sitzung ist zu groß, um sie zu speichern. Ihr Fortschritt wird bei einem Neuladen nicht wiederhergestellt.", type: 'warning' });
            } else {
                console.error("Failed to save session to localStorage", err);
            }
        }
    };
    saveSession();
  }, [
    appState, scriptFiles, practiceFile, generatedContent, openStepIndex, useStrictContext, 
    detailLevel, model, selectedScriptAction, showSessionPrompt
  ]);

  const handleReturnToConfig = useCallback(() => {
    setGeneratedContent({});
    setPracticeQuestions([]);
    setExamQuestions([]);
    setAllPracticeQuestions([]);
    setError(null);
    setOpenStepIndex(null);
    setAppState('initial');
    setProgress(0);
  }, []);

  const handleReset = useCallback(() => {
    handleReturnToConfig();
    setScriptFiles([]);
    setPracticeFile(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, [handleReturnToConfig]);

  const handleStartNewSession = useCallback(() => {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setShowSessionPrompt(false);
      setSavedSessionData(null);
      // Optional: reset state if needed, though App's default state should suffice
      handleReset();
  }, [handleReset]);
  
  const restoreSessionState = useCallback((sessionData: SavedSession) => {
    try {
      const restoredScriptFiles = sessionData.scriptFiles.map(f => base64ToFile(f.data, f.name, f.type));
      const restoredPracticeFile = sessionData.practiceFile ? base64ToFile(sessionData.practiceFile.data, sessionData.practiceFile.name, sessionData.practiceFile.type) : null;
      
      setScriptFiles(restoredScriptFiles);
      setPracticeFile(restoredPracticeFile);
      setGeneratedContent(sessionData.generatedContent);
      setOpenStepIndex(sessionData.openStepIndex);
      setUseStrictContext(sessionData.useStrictContext);
      setDetailLevel(sessionData.detailLevel);
      setModel(sessionData.model);
      setSelectedScriptAction(sessionData.selectedScriptAction);
      setAppState(sessionData.appState);
      return true;
    } catch (error) {
        console.error("Error restoring session:", error);
        setNotification({ message: "Die Sitzungsdatei konnte nicht wiederhergestellt werden.", type: 'warning' });
        handleStartNewSession();
        return false;
    }
  }, [handleStartNewSession]);


  const handleRestoreSession = useCallback(() => {
    if (!savedSessionData) return;
    restoreSessionState(savedSessionData);
    setShowSessionPrompt(false);
    setSavedSessionData(null);
  }, [savedSessionData, restoreSessionState]);

  const handleImportSession = useCallback(async (file: File) => {
    if (!file || file.type !== 'application/json') {
        setNotification({ message: "Bitte wählen Sie eine gültige .json Sitzungsdatei aus.", type: 'warning' });
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const result = event.target?.result;
            if (typeof result !== 'string') {
                throw new Error("Konnte Datei nicht als Text lesen.");
            }
            const sessionData: SavedSession = JSON.parse(result);
            // Basic validation
            if (sessionData.appState && sessionData.scriptFiles) {
                if (restoreSessionState(sessionData)) {
                    setNotification({ message: "Sitzung erfolgreich importiert!", type: 'success' });
                }
            } else {
                throw new Error("Ungültiges Sitzungsdateiformat.");
            }
        } catch (err) {
            console.error("Fehler beim Importieren der Sitzung:", err);
            setNotification({ message: "Die ausgewählte Datei ist keine gültige Sitzungsdatei.", type: 'warning' });
        }
    };
    reader.readAsText(file);
  }, [restoreSessionState]);

  const handleExportSession = async () => {
    try {
        const serializableScriptFiles = await Promise.all(
            scriptFiles.map(async file => ({
                name: file.name, type: file.type, lastModified: file.lastModified, data: await fileToBase64(file)
            }))
        );
        const serializablePracticeFile = practiceFile ? {
            name: practiceFile.name, type: practiceFile.type, lastModified: practiceFile.lastModified, data: await fileToBase64(practiceFile)
        } : null;

        const sessionToSave: SavedSession = {
            appState, scriptFiles: serializableScriptFiles, practiceFile: serializablePracticeFile,
            generatedContent, openStepIndex, useStrictContext, detailLevel, model, selectedScriptAction,
        };
        
        const sessionJson = JSON.stringify(sessionToSave, null, 2);
        const blob = new Blob([sessionJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        a.download = `lern-guide-session-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setNotification({ message: "Sitzung erfolgreich exportiert.", type: 'success' });
    } catch (err) {
        console.error("Fehler beim Exportieren der Sitzung:", err);
        setNotification({ message: "Sitzung konnte nicht exportiert werden.", type: 'warning' });
    }
  };


  useEffect(() => {
    if (!isExportingPdf) return;

    const exportPdf = async () => {
      try {
        if (typeof jspdf === 'undefined' || typeof html2canvas === 'undefined') {
          throw new Error("PDF-Export-Bibliotheken (jsPDF, html2canvas) konnten nicht geladen werden.");
        }
        
        const elementToPrint = document.getElementById('pdf-content');
        if (!elementToPrint) {
          throw new Error("PDF-Vorschau-Element konnte nicht gefunden werden.");
        }

        const { jsPDF } = jspdf;
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const mainTitle = generatedContent.guide ? 'Dein persönlicher Lern-Guide' : 'Gelöste Übungsaufgaben';
        const filename = `${mainTitle.toLowerCase().replace(/\s/g, '-')}.pdf`;
        
        await doc.html(elementToPrint, {
          callback: (doc) => {
            doc.save(filename);
            setNotification({ message: "PDF erfolgreich heruntergeladen.", type: 'success' });
          },
          margin: 15, // Set margin to 15mm on all sides
          width: 210, // A4 width in mm
          windowWidth: elementToPrint.scrollWidth,
          autoPaging: 'slice' // Use 'slice' to prevent element splitting
        });

      } catch (err) {
        console.error("PDF export failed", err);
        setError("Der PDF-Export ist fehlgeschlagen. Bitte versuchen Sie es erneut.");
      } finally {
        // Cleanup in all cases
        setIsExportingPdf(false);
      }
    };

    // Timeout to ensure the DOM is fully updated before we try to access it
    const timer = setTimeout(exportPdf, 100);

    return () => clearTimeout(timer);
  }, [isExportingPdf, generatedContent]);

  const startLoadingProcess = (message?: string) => {
    setAppState('loading');
    setProgress(0);
    setError(null);
    setLoadingMessage(message);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        const increment = prev < 40 ? Math.random() * 8 + 2 : Math.random() * 2 + 0.5;
        return Math.min(prev + increment, 95);
      });
    }, 400);
    return interval;
  };

  const finishLoadingProcess = (interval: NodeJS.Timeout, callback: () => void) => {
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        setLoadingMessage(undefined);
        callback();
      }, 500);
  };

  const handleLoadingError = (interval: NodeJS.Timeout, err: any) => {
      clearInterval(interval);
      setProgress(0);
      setError(err.message || "Ein unerwarteter Fehler ist aufgetreten.");
      setAppState('error');
      setLoadingMessage(undefined);
  }
  
  const handleAddScriptFiles = useCallback((newFiles: File[]) => {
      setScriptFiles(prevFiles => {
          const uniqueNewFiles = newFiles.filter(nf => !prevFiles.some(pf => pf.name === nf.name && pf.size === pf.size && pf.lastModified === pf.lastModified));
          return [...prevFiles, ...uniqueNewFiles];
      });
  }, []);

  const handleRemoveScriptFile = useCallback((indexToRemove: number) => {
      setScriptFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  }, []);

  const handleLoadFromUrl = useCallback(async () => {
    if (!urlInput.trim()) return;
    setIsUrlLoading(true);
    setError(null);
    try {
        const fileFromUrl = await generateContentFromUrl(urlInput);
        handleAddScriptFiles([fileFromUrl]);
        setUrlInput(''); // Clear input on success
    } catch (err: any) {
        setError(err.message || 'Die URL konnte nicht verarbeitet werden.');
    } finally {
        setIsUrlLoading(false);
    }
  }, [urlInput, handleAddScriptFiles]);


  const handleExportToPdf = useCallback(() => {
      setIsExportingPdf(true);
  }, []);


  const handleGenerateGuide = useCallback(async () => {
    if (scriptFiles.length === 0) return;
    setError(null);
    try {
      const result = await generateStudyGuide(scriptFiles, useStrictContext, detailLevel, model);
      if (result.guide && result.guide.length > 0) {
        setGeneratedContent(prev => ({...prev, guide: result.guide, solvedQuestions: null }));
        setOpenStepIndex(0);
      } else {
        throw new Error("Die KI konnte keinen Guide für dieses Dokument erstellen.");
      }
    } catch (err: any) {
        setNotification({ message: err.message || "Fehler beim Generieren des Guides.", type: 'warning' });
    }
  }, [scriptFiles, useStrictContext, detailLevel, model]);
  
  const handleGenerateKeyConcepts = useCallback(async () => {
    if (scriptFiles.length === 0) return;
    setError(null);
    try {
        const result = await generateKeyConcepts(scriptFiles, model);
        if (result.keyConcepts && result.keyConcepts.length > 0) {
            setGeneratedContent(prev => ({...prev, keyConcepts: result.keyConcepts }));
        } else {
            throw new Error("Die KI konnte keine Schlüsselkonzepte für dieses Dokument finden.");
        }
    } catch (err: any) {
        setNotification({ message: err.message || "Fehler beim Extrahieren der Konzepte.", type: 'warning' });
    }
  }, [scriptFiles, model]);

  const handleGenerateFlashcards = useCallback(async () => {
    if (scriptFiles.length === 0) return;
    setError(null);
    try {
        const result = await generateFlashcards(scriptFiles, model);
        if (result.flashcards && result.flashcards.length > 0) {
            setGeneratedContent(prev => ({...prev, flashcards: result.flashcards }));
        } else {
            throw new Error("Die KI konnte keine Lernkarten für dieses Dokument erstellen.");
        }
    } catch (err: any) {
        setNotification({ message: err.message || "Fehler beim Erstellen der Lernkarten.", type: 'warning' });
    }
  }, [scriptFiles, model]);

  const handleStartExam = useCallback(async () => {
    if (scriptFiles.length === 0) return;
    const interval = startLoadingProcess("Prüfungsfragen werden generiert...");
    try {
        const questions = await generateExamQuestions(scriptFiles, model);
        finishLoadingProcess(interval, () => {
            if (questions && questions.length > 0) {
                setExamQuestions(questions);
                setAppState('exam');
            } else {
                throw new Error("Die KI konnte keine Prüfungsfragen für dieses Dokument erstellen.");
            }
        });
    } catch (err) {
        handleLoadingError(interval, err);
    }
  }, [scriptFiles, model]);

  const handleGradeExam = useCallback(async (answers: ExamAnswer[]) => {
      if (scriptFiles.length === 0 || answers.length === 0) return;
      const interval = startLoadingProcess("Prüfung wird ausgewertet...");
      try {
          const answersWithText = answers.map(ans => ({ ...ans, questionText: examQuestions.find(q => q.id === ans.questionId)?.questionText || '' }));
          const result = await gradeExamAnswers(scriptFiles, answersWithText, model);
          finishLoadingProcess(interval, () => {
              if (result.gradedAnswers && result.gradedAnswers.length > 0) {
                  setGeneratedContent(prev => ({...prev, examResults: result.gradedAnswers }));
                  setAppState('resultsDashboard');
              } else {
                  throw new Error("Die Prüfung konnte nicht ausgewertet werden.");
              }
          });
      } catch (err) {
          handleLoadingError(interval, err);
      }
  }, [scriptFiles, model, examQuestions]);

  const handleSolvePractice = useCallback(async () => {
    if (scriptFiles.length === 0 || !practiceFile) return;
    const interval = startLoadingProcess("Extrahiere Fragen und löse die erste Gruppe...");
    try {
        const allQuestions = await extractQuestions(practiceFile, model);
        if (!allQuestions || allQuestions.length === 0) {
            throw new Error("Es konnten keine Fragen aus dem Übungsdokument extrahiert werden.");
        }
        setAllPracticeQuestions(allQuestions);

        const firstBatch = allQuestions.slice(0, 5);
        const result = await solvePracticeQuestions(scriptFiles, firstBatch, model);

        finishLoadingProcess(interval, () => {
            if (result.solvedQuestions && result.solvedQuestions.length > 0) {
                setGeneratedContent(prev => ({ ...prev, solvedQuestions: result.solvedQuestions, guide: null }));
                setAppState('resultsDashboard');
                setOpenStepIndex(0);
            } else {
                throw new Error("Die KI konnte die ersten Übungsaufgaben nicht lösen.");
            }
        });
    } catch (err) {
        handleLoadingError(interval, err);
    }
  }, [scriptFiles, practiceFile, model]);

  const handleSolveNextBatch = useCallback(async () => {
    if (isSolvingNextBatch || scriptFiles.length === 0) return;

    const solvedCount = generatedContent.solvedQuestions?.length || 0;
    if (solvedCount >= allPracticeQuestions.length) return;

    setIsSolvingNextBatch(true);
    setError(null);

    try {
        const nextBatch = allPracticeQuestions.slice(solvedCount, solvedCount + 5);
        if (nextBatch.length === 0) {
            setIsSolvingNextBatch(false);
            return;
        }
        
        const result = await solvePracticeQuestions(scriptFiles, nextBatch, model);
        if (result.solvedQuestions && result.solvedQuestions.length > 0) {
            setGeneratedContent(prev => ({
                ...prev,
                solvedQuestions: [...(prev.solvedQuestions || []), ...result.solvedQuestions]
            }));
        } else {
             setNotification({ message: "Die KI konnte keine weiteren Aufgaben lösen.", type: 'warning' });
        }
    } catch (err: any) {
        setError(err.message || "Fehler beim Lösen der nächsten Aufgaben.");
    } finally {
        setIsSolvingNextBatch(false);
    }
  }, [isSolvingNextBatch, scriptFiles, model, generatedContent.solvedQuestions, allPracticeQuestions]);

  const handleStartGuidedOrSimulation = useCallback(async () => {
    if (!practiceFile || scriptFiles.length === 0) return;
    const nextState = activeMode === 'solution' ? 'guided' : 'simulation';
    const loadingMsg = nextState === 'guided' ? "Bereite geführte Sitzung vor..." : "Bereite Simulation vor...";
    
    const interval = startLoadingProcess(loadingMsg);
    try {
        const questions = await extractQuestions(practiceFile, model);
        finishLoadingProcess(interval, () => {
            if (questions && questions.length > 0) {
                setPracticeQuestions(questions);
                setAppState(nextState);
            } else {
                throw new Error("Die KI konnte keine Fragen aus dem Dokument extrahieren.");
            }
        });
    } catch(err) {
        handleLoadingError(interval, err);
    }
  }, [practiceFile, model, activeMode, scriptFiles]);

  const handleAskFollowUp = useCallback(async (stepIndex: number, question: string) => {
    if (!generatedContent.guide) return;
    try {
        const answer = await askFollowUpQuestion(generatedContent.guide[stepIndex].content, question);
        setGeneratedContent(current => {
            if (!current.guide) return current;
            const newGuide = [...current.guide];
            const stepToUpdate = { ...newGuide[stepIndex] };
            if (!stepToUpdate.followUps) stepToUpdate.followUps = [];
            stepToUpdate.followUps.push({ question, answer });
            newGuide[stepIndex] = stepToUpdate;
            return { ...current, guide: newGuide };
        });
    } catch (err: any) {
        console.error("Failed to get answer for follow-up question:", err);
        throw err;
    }
  }, [generatedContent.guide]);
  
  const handleAskFollowUpOnSolution = useCallback(async (questionIndex: number, question: string) => {
    if (!generatedContent.solvedQuestions) return;
    try {
        const context = generatedContent.solvedQuestions[questionIndex];
        const answer = await askFollowUpOnSolution(context, question);
        setGeneratedContent(current => {
            if (!current.solvedQuestions) return current;
            const newSolved = [...current.solvedQuestions];
            const questionToUpdate = { ...newSolved[questionIndex] };
            if (!questionToUpdate.followUps) questionToUpdate.followUps = [];
            questionToUpdate.followUps.push({ question, answer });
            newSolved[questionIndex] = questionToUpdate;
            return { ...current, solvedQuestions: newSolved };
        });
    } catch (err: any) {
        console.error("Failed to get answer for follow-up on solution:", err);
        throw err;
    }
  }, [generatedContent.solvedQuestions]);

  const handleStartGeneration = useCallback(() => {
    if (!selectedScriptAction) {
        setError("Bitte wählen Sie eine Aktion aus.");
        return;
    }
    
    const interval = startLoadingProcess("Inhalte werden generiert...");

    const performAction = async () => {
        try {
            switch (selectedScriptAction) {
                case 'guide':
                    await handleGenerateGuide();
                    break;
                case 'concepts':
                    await handleGenerateKeyConcepts();
                    break;
                case 'flashcards':
                    await handleGenerateFlashcards();
                    break;
                case 'exam':
                    // This one handles its own loading, so we just call it.
                    // But for consistency let's adapt it.
                    await handleStartExam();
                    return; // handleStartExam manages its own loading states
            }
            finishLoadingProcess(interval, () => setAppState('resultsDashboard'));
        } catch (err) {
            handleLoadingError(interval, err);
        }
    };
    
    if (selectedScriptAction === 'exam') {
        clearInterval(interval); // Exam handles its own full-page loading
        handleStartExam();
    } else {
        const initialAction = {
            'guide': handleGenerateGuide,
            'concepts': handleGenerateKeyConcepts,
            'flashcards': handleGenerateFlashcards,
        }[selectedScriptAction];
        
        // This is a bit of a workaround because the new local loading logic
        // is now preferred inside the dashboard.
        // For the first generation, we still use the global loader.
        const interval = startLoadingProcess();
        initialAction().then(() => {
            finishLoadingProcess(interval, () => {
                setAppState('resultsDashboard');
            });
        }).catch((err) => {
            handleLoadingError(interval, err);
        });
    }
  }, [selectedScriptAction, handleGenerateGuide, handleGenerateKeyConcepts, handleGenerateFlashcards, handleStartExam]);
  
  const renderContent = () => {
    if (showSessionPrompt) {
        return <SessionPrompt onContinue={handleRestoreSession} onNew={handleStartNewSession} />;
    }

    switch (appState) {
      case 'loading': return <LoadingSpinner progress={progress} message={loadingMessage} />;
      case 'resultsDashboard': return (
        <ResultsDashboard 
            generatedContent={generatedContent}
            scriptFiles={scriptFiles}
            model={model}
            onAskFollowUp={handleAskFollowUp}
            onAskFollowUpOnSolution={handleAskFollowUpOnSolution}
            openStepIndex={openStepIndex}
            onStepClick={setOpenStepIndex}
            onReset={handleReset}
            onExportToPdf={handleExportToPdf}
            onExportSession={handleExportSession}
            isExportingPdf={isExportingPdf}
            // Add More Content Props
            handleGenerateGuide={handleGenerateGuide}
            handleGenerateKeyConcepts={handleGenerateKeyConcepts}
            handleGenerateFlashcards={handleGenerateFlashcards}
            handleStartExam={handleStartExam}
            detailLevel={detailLevel}
            setDetailLevel={setDetailLevel}
            setModel={setModel}
            useStrictContext={useStrictContext}
            setUseStrictContext={setUseStrictContext}
            // Props for batch solving
            handleSolveNextBatch={handleSolveNextBatch}
            isSolvingNextBatch={isSolvingNextBatch}
            totalPracticeQuestionsCount={allPracticeQuestions.length}
            solvedPracticeQuestionsCount={generatedContent.solvedQuestions?.length || 0}
        />
      );
      case 'guided': return <GuidedSolution scriptFiles={scriptFiles} practiceFile={practiceFile!} questions={practiceQuestions} model={model} onExit={handleReturnToConfig} />;
      case 'simulation': return <SimulationMode scriptFiles={scriptFiles} practiceFile={practiceFile!} questions={practiceQuestions} model={model} mode={simulationMode} onExit={handleReturnToConfig} />;
      case 'exam': return <ExamMode questions={examQuestions} onSubmit={handleGradeExam} onExit={handleReturnToConfig} />;
      case 'error': return (
          <div className="text-center p-8 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 rounded-lg max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-red-800 dark:text-red-200">Fehler</h3>
            <p className="mt-2 text-red-600 dark:text-red-300">{error}</p>
            <div className="mt-4">
              <Button onClick={handleReset} variant="primary">
                Erneut versuchen
              </Button>
            </div>
          </div>
        );
      case 'initial':
      default:
        return (
            <SetupWizard
              // File Management
              scriptFiles={scriptFiles}
              practiceFile={practiceFile}
              handleAddScriptFiles={handleAddScriptFiles}
              handleRemoveScriptFile={handleRemoveScriptFile}
              setPracticeFile={setPracticeFile}
              urlInput={urlInput}
              setUrlInput={setUrlInput}
              isUrlLoading={isUrlLoading}
              handleLoadFromUrl={handleLoadFromUrl}
              error={error}
              onImportSession={handleImportSession}
              
              // Lernpfad-Optionen
              selectedScriptAction={selectedScriptAction}
              setSelectedScriptAction={setSelectedScriptAction}
              detailLevel={detailLevel}
              setDetailLevel={setDetailLevel}
              
              // Übungspfad-Optionen
              activeMode={activeMode}
              setActiveMode={setActiveMode}
              solutionMode={solutionMode}
              setSolutionMode={setSolutionMode}
              simulationMode={simulationMode}
              setSimulationMode={setSimulationMode}

              // Allgemeine Optionen
              model={model}
              setModel={setModel}
              useStrictContext={useStrictContext}
              setUseStrictContext={setUseStrictContext}
              
              // Aktionen
              handleStartGeneration={handleStartGeneration}
              handleSolvePractice={handleSolvePractice}
              handleStartGuidedOrSimulation={handleStartGuidedOrSimulation}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      {isExportingPdf && (
        <div 
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: '210mm',
            backgroundColor: 'white',
          }}
        >
          <PdfPreview guide={generatedContent.guide ?? undefined} solvedQuestions={generatedContent.solvedQuestions ?? undefined} />
        </div>
      )}
      <header className="py-4 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center">
              <SparklesIcon className={`h-8 w-8 ${theme['text-primary-500']}`} />
              <h1 className={`ml-3 text-2xl font-bold ${theme['text-primary-500']}`}>Lern-Guide AI</h1>
            </div>
            <div className="flex items-center space-x-4">
               {appState !== 'initial' && (
                <button
                    onClick={handleReset}
                    className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    aria-label="Sitzung zurücksetzen"
                >
                    <ArrowPathIcon className="h-5 w-5" />
                </button>
                )}
              <ThemeSwitcher />
            </div>
        </div>
      </header>
      <main className="py-10 px-4 sm:px-6 lg:px-8">
        <Notification 
          message={notification?.message ?? null} 
          type={notification?.type ?? 'warning'} 
          onDismiss={() => setNotification(null)} 
        />
        <Suspense fallback={<LoadingSpinner progress={50} message="Komponente wird geladen..." />}>
          {renderContent()}
        </Suspense>
      </main>
      <footer className="text-center py-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800"><p>Powered by Google Gemini</p></footer>
    </div>
  );
}