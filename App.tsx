import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { GuideStep, DetailLevel, SolvedQuestion, ModelName, SolutionMode, ExamQuestion, ExamAnswer, GradedAnswer, SimulationModeType, KeyConcept, Flashcard } from './types';
import { generateStudyGuide, askFollowUpQuestion, solvePracticeQuestions, extractQuestions, generateExamQuestions, gradeExamAnswers, generateKeyConcepts, generateFlashcards } from './services/geminiService';
import { FileUpload } from './components/FileUpload';
import { GuideDisplay } from './components/GuideDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { GuidedSolution } from './components/GuidedSolution';
import { ExamMode } from './components/ExamMode';
import { ExamResults } from './components/ExamResults';
import { SimulationMode } from './components/SimulationMode';
import { KeyConceptsDisplay } from './components/KeyConceptsDisplay';
import { FlashcardMode } from './components/FlashcardMode';
import { SparklesIcon, ListBulletIcon, BookOpenIcon, MagnifyingGlassIcon, DocumentArrowDownIcon, CpuChipIcon, ChatBubbleLeftRightIcon, AcademicCapIcon, UsersIcon, KeyIcon, RectangleStackIcon, XMarkIcon } from './components/icons';
import { useTheme } from './contexts/ThemeContext';
import { ThemeSwitcher } from './components/ThemeSwitcher';

// TypeScript declarations for global libraries loaded via CDN
declare const jspdf: any;

type AppState = 'initial' | 'loading' | 'success' | 'error' | 'guided' | 'exam' | 'examResults' | 'simulation' | 'keyConcepts' | 'flashcards';
const LOCAL_STORAGE_KEY_GUIDE = 'lernGuideAppState';

interface SavedState {
  guide: GuideStep[];
  appState: 'success';
  openStepIndex: number | null;
}

const saveGuideToLocalStorage = (state: SavedState) => {
  try {
    const stateToSave = JSON.stringify(state);
    localStorage.setItem(LOCAL_STORAGE_KEY_GUIDE, stateToSave);
  } catch (err) {
    console.error("Failed to save state to localStorage", err);
  }
};

const loadGuideFromLocalStorage = (): SavedState | null => {
  try {
    const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY_GUIDE);
    if (!savedStateJSON) return null;

    const savedState: SavedState = JSON.parse(savedStateJSON);
    if (savedState.guide && savedState.appState === 'success') {
      return savedState;
    }
    return null;
  } catch (err) {
    console.error("Failed to load state from localStorage", err);
    localStorage.removeItem(LOCAL_STORAGE_KEY_GUIDE);
    return null;
  }
};


export default function App() {
  const { theme } = useTheme();
  const [guide, setGuide] = useState<GuideStep[]>([]);
  const [solvedQuestions, setSolvedQuestions] = useState<SolvedQuestion[]>([]);
  const [practiceQuestions, setPracticeQuestions] = useState<string[]>([]);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [examResults, setExamResults] = useState<GradedAnswer[]>([]);
  const [keyConcepts, setKeyConcepts] = useState<KeyConcept[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
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
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedState = loadGuideFromLocalStorage();
    if (savedState) {
        setGuide(savedState.guide);
        setAppState(savedState.appState);
        setOpenStepIndex(savedState.openStepIndex);
    }
  }, []);

  useEffect(() => {
    if (appState === 'success' && guide.length > 0) {
      saveGuideToLocalStorage({
        guide,
        appState,
        openStepIndex,
      });
    }
  }, [guide, appState, openStepIndex]);

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
  
  const handleAddScriptFiles = (newFiles: File[]) => {
      setScriptFiles(prevFiles => {
          const uniqueNewFiles = newFiles.filter(nf => !prevFiles.some(pf => pf.name === nf.name && pf.size === nf.size && pf.lastModified === nf.lastModified));
          return [...prevFiles, ...uniqueNewFiles];
      });
  };

  const handleRemoveScriptFile = (indexToRemove: number) => {
      setScriptFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const handleExportToPdf = async () => {
      if (typeof jspdf === 'undefined') {
          setError("Die PDF-Export-Funktion konnte nicht geladen werden. Bitte laden Sie die Seite neu.");
          return;
      }
      setIsExportingPdf(true);

      try {
          const { jsPDF } = jspdf;
          const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

          const MARGIN = 15;
          const PAGE_WIDTH = doc.internal.pageSize.getWidth();
          const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
          const TEXT_WIDTH = PAGE_WIDTH - MARGIN * 2;
          let y = MARGIN;

          const addTextWithBreaks = (text: string, options: { fontSize?: number, style?: 'normal' | 'bold' | 'italic', indent?: number } = {}) => {
              const { fontSize = 10, style = 'normal', indent = 0 } = options;
              doc.setFontSize(fontSize);
              doc.setFont('helvetica', style);

              const lines = doc.splitTextToSize(text, TEXT_WIDTH - indent);
              const textHeight = lines.length * (fontSize * 0.35); // Approximation of line height

              if (y + textHeight > PAGE_HEIGHT - MARGIN) {
                  doc.addPage();
                  y = MARGIN;
              }

              doc.text(lines, MARGIN + indent, y);
              y += textHeight + 2; // Add a small gap after the text
          };
          
          const processMarkdownContent = (content: string) => {
              const contentLines = content.split('\n');
              contentLines.forEach(line => {
                  let isList = false;
                  let contentLine = line;
                  if (line.match(/^\s*[-*]\s/)) {
                      isList = true;
                      contentLine = `\u2022 ${line.replace(/^\s*[-*]\s/, '')}`;
                  }
                  
                  // Clean up bold/italic markers for text output
                  contentLine = contentLine.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');

                  if (contentLine.trim()) {
                      addTextWithBreaks(contentLine, { indent: isList ? 5 : 0 });
                  }
              });
          };

          if (guide.length > 0) {
              addTextWithBreaks('Dein persönlicher Lern-Guide', { fontSize: 22, style: 'bold' });
              y += 5;
              guide.forEach(step => {
                  addTextWithBreaks(step.title, { fontSize: 16, style: 'bold' });
                  processMarkdownContent(step.content);
                  y += 8; // Extra space between sections
              });
          } else if (solvedQuestions.length > 0) {
              addTextWithBreaks('Gelöste Übungsaufgaben', { fontSize: 22, style: 'bold' });
              y += 5;
              solvedQuestions.forEach(item => {
                  addTextWithBreaks(item.title, { fontSize: 16, style: 'bold' });

                  addTextWithBreaks('Antwort:', { fontSize: 12, style: 'bold' });
                  processMarkdownContent(item.answer);
                  y += 4;
                  
                  addTextWithBreaks('Erklärung:', { fontSize: 12, style: 'bold' });
                  processMarkdownContent(item.explanation);
                  y += 4;

                  addTextWithBreaks('Referenz im Skript:', { fontSize: 12, style: 'bold' });
                   addTextWithBreaks(item.reference.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1'), { style: 'italic' });

                  y += 8; // Extra space between sections
              });
          }
          
          const filename = guide.length > 0 ? 'lern-guide.pdf' : 'geloeste-uebungsaufgaben.pdf';
          doc.save(filename);
      } catch (err) {
          console.error("PDF export failed", err);
          setError("Der PDF-Export ist fehlgeschlagen. Bitte versuchen Sie es erneut.");
      } finally {
          setIsExportingPdf(false);
      }
  };

  const handleGenerateGuide = useCallback(async () => {
    if (scriptFiles.length === 0) return;
    const interval = startLoadingProcess();
    try {
      const result = await generateStudyGuide(scriptFiles, useStrictContext, detailLevel, model);
      finishLoadingProcess(interval, () => {
        if (result.guide && result.guide.length > 0) {
          setGuide(result.guide);
          setSolvedQuestions([]);
          setAppState('success');
          setOpenStepIndex(0);
        } else {
          throw new Error("Die KI konnte keinen Guide für dieses Dokument erstellen.");
        }
      });
    } catch (err) {
      handleLoadingError(interval, err);
    }
  }, [scriptFiles, useStrictContext, detailLevel, model]);
  
  const handleGenerateKeyConcepts = useCallback(async () => {
    if (scriptFiles.length === 0) return;
    const interval = startLoadingProcess("Schlüsselkonzepte werden extrahiert...");
    try {
        const result = await generateKeyConcepts(scriptFiles, model);
        finishLoadingProcess(interval, () => {
            if (result.keyConcepts && result.keyConcepts.length > 0) {
                setKeyConcepts(result.keyConcepts);
                setAppState('keyConcepts');
            } else {
                throw new Error("Die KI konnte keine Schlüsselkonzepte für dieses Dokument finden.");
            }
        });
    } catch (err) {
        handleLoadingError(interval, err);
    }
  }, [scriptFiles, model]);

  const handleGenerateFlashcards = useCallback(async () => {
    if (scriptFiles.length === 0) return;
    const interval = startLoadingProcess("Lernkarten werden erstellt...");
    try {
        const result = await generateFlashcards(scriptFiles, model);
        finishLoadingProcess(interval, () => {
            if (result.flashcards && result.flashcards.length > 0) {
                setFlashcards(result.flashcards);
                setAppState('flashcards');
            } else {
                throw new Error("Die KI konnte keine Lernkarten für dieses Dokument erstellen.");
            }
        });
    } catch (err) {
        handleLoadingError(interval, err);
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
                  setExamResults(result.gradedAnswers);
                  setAppState('examResults');
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
    const interval = startLoadingProcess();
    try {
        const result = await solvePracticeQuestions(scriptFiles, practiceFile, model);
        finishLoadingProcess(interval, () => {
            if (result.solvedQuestions && result.solvedQuestions.length > 0) {
                setSolvedQuestions(result.solvedQuestions);
                setGuide([]);
                setAppState('success');
                setOpenStepIndex(0);
            } else {
                throw new Error("Die KI konnte die Übungsaufgaben nicht lösen.");
            }
        });
    } catch (err) {
        handleLoadingError(interval, err);
    }
  }, [scriptFiles, practiceFile, model]);

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
    try {
        const answer = await askFollowUpQuestion(guide[stepIndex].content, question);
        setGuide(currentGuide => {
            const newGuide = [...currentGuide];
            const stepToUpdate = { ...newGuide[stepIndex] };
            if (!stepToUpdate.followUps) stepToUpdate.followUps = [];
            stepToUpdate.followUps.push({ question, answer });
            newGuide[stepIndex] = stepToUpdate;
            return newGuide;
        });
    } catch (err: any) {
        console.error("Failed to get answer for follow-up question:", err);
        throw err;
    }
  }, [guide]);
  
  const handleReturnToConfig = () => {
    setGuide([]);
    setSolvedQuestions([]);
    setPracticeQuestions([]);
    setExamQuestions([]);
    setExamResults([]);
    setKeyConcepts([]);
    setFlashcards([]);
    setError(null);
    setOpenStepIndex(null);
    setAppState('initial');
    setProgress(0);
    localStorage.removeItem(LOCAL_STORAGE_KEY_GUIDE);
  };
  
  const handleReset = () => {
    handleReturnToConfig();
    setScriptFiles([]);
    setPracticeFile(null);
  };
  
  const detailOptions = [ { id: 'overview', label: 'Übersicht', icon: ListBulletIcon }, { id: 'standard', label: 'Standard', icon: BookOpenIcon }, { id: 'detailed', label: 'Detailliert', icon: MagnifyingGlassIcon } ];
  const solutionModeOptions = [ { id: 'direct', label: 'Direkte Lösung', icon: BookOpenIcon }, { id: 'guided', label: 'Geführte Lösung', icon: ChatBubbleLeftRightIcon } ];
  const simulationModeOptions = [ { id: 'coop', label: 'Studienpartner', icon: UsersIcon }, { id: 'vs', label: 'Herausforderer', icon: SparklesIcon } ];
  const detailDescriptions: Record<DetailLevel, string> = { overview: 'Ideal für eine schnelle Zusammenfassung.', standard: 'Eine ausgewogene, schrittweise Erklärung.', detailed: 'Eine tiefgehende Analyse mit Beispielen.' };
  const modelOptions = [ { id: 'gemini-2.5-flash', label: 'Flash' }, { id: 'gemini-2.5-pro', label: 'Pro' } ];
  const modelDescriptions: Record<ModelName, string> = { 'gemini-2.5-flash': 'Schnell und effizient, für die meisten Aufgaben geeignet.', 'gemini-2.5-pro': 'Leistungsstark, ideal für komplexe Dokumente.' };
  
  const getButtonTextAndAction = () => {
      if (!practiceFile) return { text: "Aktion wählen", action: () => {}, disabled: true };
      if (activeMode === 'solution') {
          return {
              text: solutionMode === 'direct' ? 'Übungsaufgaben lösen' : 'Geführte Lösung starten',
              action: solutionMode === 'direct' ? handleSolvePractice : handleStartGuidedOrSimulation
          };
      } else { // simulation
          return {
              text: simulationMode === 'coop' ? 'Co-op-Sitzung starten' : 'VS-Match starten',
              action: handleStartGuidedOrSimulation
          };
      }
  };

  const { text: buttonText, action: buttonAction } = getButtonTextAndAction();

  const renderContent = () => {
    switch (appState) {
      case 'loading': return <LoadingSpinner progress={progress} message={loadingMessage} />;
      case 'success': return (
            <>
                <div ref={contentRef}>
                  <GuideDisplay guide={guide} solvedQuestions={solvedQuestions} onAskFollowUp={guide.length > 0 ? handleAskFollowUp : undefined} openStepIndex={openStepIndex} onStepClick={setOpenStepIndex} />
                </div>
                <div className="mt-8 text-center flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={handleExportToPdf} disabled={isExportingPdf} className="inline-flex items-center justify-center px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75 disabled:bg-slate-400 disabled:cursor-wait">
                        {isExportingPdf ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Exportiere...</>) : (<><DocumentArrowDownIcon className="h-5 w-5 mr-2" /> Als PDF exportieren</>)}
                    </button>
                    <button onClick={handleReset} className={`px-6 py-2 ${theme['bg-primary-600']} ${theme['hover:bg-primary-700']} text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 ${theme['focus:ring-primary-400']} focus:ring-opacity-75`}> Neue Analyse starten </button>
                </div>
            </>
        );
// FIX: Changed prop name from scriptFile to scriptFiles to match the component's updated props interface.
      case 'guided': return <GuidedSolution scriptFiles={scriptFiles} practiceFile={practiceFile!} questions={practiceQuestions} model={model} onExit={handleReturnToConfig} />;
// FIX: Changed prop name from scriptFile to scriptFiles to match the component's updated props interface.
      case 'simulation': return <SimulationMode scriptFiles={scriptFiles} practiceFile={practiceFile!} questions={practiceQuestions} model={model} mode={simulationMode} onExit={handleReturnToConfig} />;
      case 'exam': return <ExamMode questions={examQuestions} onSubmit={handleGradeExam} onExit={handleReturnToConfig} />;
      case 'examResults': return <ExamResults results={examResults} onRetry={handleReset} />;
      case 'keyConcepts': return <KeyConceptsDisplay concepts={keyConcepts} onReturn={handleReset} />;
      case 'flashcards': return <FlashcardMode flashcards={flashcards} onExit={handleReset} />;
      case 'error': return (
          <div className="text-center p-8 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 rounded-lg max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-red-800 dark:text-red-200">Fehler</h3>
            <p className="mt-2 text-red-600 dark:text-red-300">{error}</p>
            <button onClick={handleReset} className="mt-4 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">Erneut versuchen</button>
          </div>
        );
      case 'initial':
      default:
        return (
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Verwandle Dokumente in interaktive Lernpfade</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Lade ein oder mehrere Skripte hoch, um einen Lern-Guide zu erhalten, oder füge Übungsaufgaben hinzu, um diese lösen zu lassen.</p>
            <div className="mt-8">
              <FileUpload onFilesAdd={handleAddScriptFiles} isLoading={false} label="1. Skript(e) / Vorlesungsfolien hochladen" />
              {scriptFiles.length > 0 && (
                <div className="mt-4 text-left">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300">Hochgeladene Skripte:</h4>
                  <ul className="mt-2 space-y-2">
                    {scriptFiles.map((file, index) => (
                      <li key={`${file.name}-${index}`} className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-md text-sm">
                        <span className="text-slate-800 dark:text-slate-200 truncate pr-2">{file.name}</span>
                        <button onClick={() => handleRemoveScriptFile(index)} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200">
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {scriptFiles.length > 0 && (
                <div className="mt-8 space-y-8 p-6 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm">
                    <div className="animate-fade-in"><h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-4">Optional: Übungen hinzufügen</h3><FileUpload onFilesAdd={(files) => setPracticeFile(files[0])} isLoading={false} label="2. Übungsaufgaben / Probeklausur" description="Datei hierher ziehen oder auswählen" /></div>
                     
                     {practiceFile ? (
                        <div className="animate-fade-in" style={{animationDelay: '100ms'}}>
                            <fieldset><legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">Modus wählen</legend>
                                <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                                    <div key="solution"><input type="radio" id="solution" name="active-mode" value="solution" checked={activeMode === 'solution'} onChange={() => setActiveMode('solution')} className="sr-only"/><label htmlFor="solution" className={`cursor-pointer select-none rounded-md p-2 text-center text-sm font-medium transition-colors duration-200 ${activeMode === 'solution' ? `${theme['bg-primary-600']} text-white shadow` : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700' }`}>Lösung</label></div>
                                    <div key="simulation"><input type="radio" id="simulation" name="active-mode" value="simulation" checked={activeMode === 'simulation'} onChange={() => setActiveMode('simulation')} className="sr-only"/><label htmlFor="simulation" className={`cursor-pointer select-none rounded-md p-2 text-center text-sm font-medium transition-colors duration-200 ${activeMode === 'simulation' ? `${theme['bg-primary-600']} text-white shadow` : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700' }`}>Simulation</label></div>
                                </div>
                            </fieldset>
                            {activeMode === 'solution' ? (
                                <fieldset className="mt-4"><legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">Lösungsmodus</legend><div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">{solutionModeOptions.map(o => <div key={o.id}><input type="radio" id={`sol-${o.id}`} name="solution-mode" value={o.id} checked={solutionMode === o.id} onChange={() => setSolutionMode(o.id as SolutionMode)} className="sr-only"/><label htmlFor={`sol-${o.id}`} className={`flex flex-col items-center justify-center cursor-pointer select-none rounded-md p-3 text-center text-sm font-medium transition-colors ${solutionMode === o.id ? `bg-white dark:bg-slate-700 ${theme['text-primary-600_dark-400']} dark:text-white shadow-sm` : 'hover:bg-white/60 dark:hover:bg-slate-700/60'}`}><o.icon className="h-6 w-6 mb-1" />{o.label}</label></div>)}</div></fieldset>
                            ) : (
                                <fieldset className="mt-4"><legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">Simulations-Typ</legend><div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">{simulationModeOptions.map(o => <div key={o.id}><input type="radio" id={`sim-${o.id}`} name="simulation-mode" value={o.id} checked={simulationMode === o.id} onChange={() => setSimulationMode(o.id as SimulationModeType)} className="sr-only"/><label htmlFor={`sim-${o.id}`} className={`flex flex-col items-center justify-center cursor-pointer select-none rounded-md p-3 text-center text-sm font-medium transition-colors ${simulationMode === o.id ? `bg-white dark:bg-slate-700 ${theme['text-primary-600_dark-400']} dark:text-white shadow-sm` : 'hover:bg-white/60 dark:hover:bg-slate-700/60'}`}><o.icon className="h-6 w-6 mb-1" />{o.label}</label></div>)}</div></fieldset>
                            )}
                        </div>
                    ) : (
                        <fieldset className="animate-fade-in" style={{animationDelay: '100ms'}}><legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">Detaillierungsgrad (nur für Lern-Guide)</legend><div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">{detailOptions.map((o) => <div key={o.id}><input type="radio" name="detail-level" id={o.id} value={o.id} checked={detailLevel === o.id} onChange={() => setDetailLevel(o.id as DetailLevel)} className="sr-only" /><label htmlFor={o.id} className={`flex flex-col items-center justify-center cursor-pointer select-none rounded-md p-3 text-center text-sm font-medium transition-colors ${detailLevel === o.id ? `${theme['bg-primary-600']} text-white shadow` : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700' }`}><o.icon className="h-6 w-6 mb-1" />{o.label}</label></div>)}</div><div className="mt-3 text-sm text-slate-600 dark:text-slate-400 min-h-[3em]"><p>{detailDescriptions[detailLevel]}</p></div></fieldset>
                    )}

                    <fieldset className="animate-fade-in" style={{animationDelay: '200ms'}}><legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">KI-Modell</legend><div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">{modelOptions.map((o) => <div key={o.id}><input type="radio" name="model-select" id={o.id} value={o.id} checked={model === o.id} onChange={() => setModel(o.id as ModelName)} className="sr-only" /><label htmlFor={o.id} className={`flex flex-col items-center justify-center cursor-pointer select-none rounded-md p-3 text-center text-sm font-medium transition-colors ${model === o.id ? `${theme['bg-primary-600']} text-white shadow` : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}><CpuChipIcon className="h-6 w-6 mb-1" />{o.label}</label></div>)}</div><div className="mt-3 text-sm text-slate-600 dark:text-slate-400 min-h-[3em]"><p>{modelDescriptions[model]}</p></div></fieldset>
                    <div className="flex items-center justify-center animate-fade-in" style={{animationDelay: '300ms'}}><input id="strict-context-checkbox" type="checkbox" checked={useStrictContext} onChange={(e) => setUseStrictContext(e.target.checked)} className={`h-4 w-4 rounded border-slate-300 dark:border-slate-600 ${theme['text-primary-600_dark-400']} focus:ring-indigo-500 bg-transparent`} /><label htmlFor="strict-context-checkbox" className="ml-2 block text-sm text-slate-700 dark:text-slate-300 select-none">Nur Inhalt aus Skripten verwenden (empfohlen)</label></div>
                    <div className="animate-fade-in mt-8" style={{animationDelay: '400ms'}}>
                        {practiceFile ? (
                             <button onClick={buttonAction} className={`w-full px-8 py-3 ${theme['bg-primary-600']} text-white font-bold text-lg rounded-lg shadow-lg ${theme['hover:bg-primary-700']} focus:outline-none focus:ring-2 ${theme['focus:ring-primary-400']} focus:ring-opacity-75 transition-all transform hover:scale-105`}>{buttonText}</button>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                 <button onClick={handleGenerateGuide} className={`w-full px-4 py-3 ${theme['bg-primary-600']} text-white font-bold text-lg rounded-lg shadow-lg ${theme['hover:bg-primary-700']} focus:outline-none focus:ring-2 ${theme['focus:ring-primary-400']} focus:ring-opacity-75 transition-all transform hover:scale-105 flex items-center justify-center`}><BookOpenIcon className="h-6 w-6 mr-2" /> Lern-Guide</button>
                                 <button onClick={handleGenerateKeyConcepts} className="w-full px-4 py-3 bg-slate-700 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-75 transition-all transform hover:scale-105 flex items-center justify-center"><KeyIcon className="h-6 w-6 mr-2" /> Konzepte</button>
                                 <button onClick={handleGenerateFlashcards} className="w-full px-4 py-3 bg-slate-700 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-75 transition-all transform hover:scale-105 flex items-center justify-center"><RectangleStackIcon className="h-6 w-6 mr-2" /> Lernkarten</button>
                                 <button onClick={handleStartExam} className="w-full px-4 py-3 bg-slate-700 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-75 transition-all transform hover:scale-105 flex items-center justify-center"><AcademicCapIcon className="h-6 w-6 mr-2" /> Prüfung</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      <header className="py-4 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center">
              <SparklesIcon className={`h-8 w-8 ${theme['text-primary-500']}`} />
              <h1 className={`ml-3 text-2xl font-bold ${theme['text-primary-500']}`}>Lern-Guide AI</h1>
            </div>
            <ThemeSwitcher />
        </div>
      </header>
      <main className="py-10 px-4 sm:px-6 lg:px-8">{renderContent()}</main>
      <footer className="text-center py-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800"><p>Powered by Google Gemini</p></footer>
    </div>
  );
}