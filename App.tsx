import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { GuideStep, DetailLevel, SolvedQuestion, ModelName, SolutionMode, ExamQuestion, ExamAnswer, GradedAnswer, SimulationModeType } from './types';
import { generateStudyGuide, askFollowUpQuestion, solvePracticeQuestions, extractQuestions, generateExamQuestions, gradeExamAnswers } from './services/geminiService';
import { FileUpload } from './components/FileUpload';
import { GuideDisplay } from './components/GuideDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { GuidedSolution } from './components/GuidedSolution';
import { ExamMode } from './components/ExamMode';
import { ExamResults } from './components/ExamResults';
import { SimulationMode } from './components/SimulationMode';
import { BrainCircuitIcon, ListBulletIcon, BookOpenIcon, MagnifyingGlassIcon, DocumentArrowDownIcon, CpuChipIcon, ChatBubbleLeftRightIcon, AcademicCapIcon, UsersIcon, SparklesIcon } from './components/icons';

// TypeScript declarations for global libraries loaded via CDN
declare const html2canvas: any;
declare const jspdf: any;

type AppState = 'initial' | 'loading' | 'success' | 'error' | 'guided' | 'exam' | 'examResults' | 'simulation';
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
  const [guide, setGuide] = useState<GuideStep[]>([]);
  const [solvedQuestions, setSolvedQuestions] = useState<SolvedQuestion[]>([]);
  const [practiceQuestions, setPracticeQuestions] = useState<string[]>([]);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [examResults, setExamResults] = useState<GradedAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('initial');
  const [scriptFile, setScriptFile] = useState<File | null>(null);
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

  const handleExportToPdf = async () => {
      if (!contentRef.current || typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
          setError("Die PDF-Export-Funktion konnte nicht geladen werden. Bitte laden Sie die Seite neu.");
          return;
      }
      setIsExportingPdf(true);

      const nodeToCapture = contentRef.current;
      const clone = nodeToCapture.cloneNode(true) as HTMLElement;

      clone.style.position = 'absolute';
      clone.style.top = '0';
      clone.style.left = '-9999px';
      clone.style.width = `${nodeToCapture.offsetWidth}px`;
      
      clone.querySelectorAll<HTMLElement>('[role="region"]').forEach(body => {
          body.classList.remove('max-h-0');
          body.classList.add('max-h-[9999px]');
          body.style.transition = 'none';
      });

      document.body.appendChild(clone);

      try {
          const { jsPDF } = jspdf;
          const canvas = await html2canvas(clone, { scale: 2, useCORS: true, backgroundColor: document.body.classList.contains('dark:bg-slate-900') ? '#0f172a' : '#f8fafc' });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const imgProps = pdf.getImageProperties(imgData);
          const imgHeightInPdf = (imgProps.height * pdfWidth) / imgProps.width;

          let heightLeft = imgHeightInPdf;
          let position = 0;

          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
          heightLeft -= pdf.internal.pageSize.getHeight();

          while (heightLeft > 0) {
              position -= pdf.internal.pageSize.getHeight();
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
              heightLeft -= pdf.internal.pageSize.getHeight();
          }
          
          const filename = guide.length > 0 ? 'lern-guide.pdf' : 'geloeste-uebungsaufgaben.pdf';
          pdf.save(filename);
      } catch (err) {
          console.error("PDF export failed", err);
          setError("Der PDF-Export ist fehlgeschlagen. Bitte versuchen Sie es erneut.");
      } finally {
          document.body.removeChild(clone);
          setIsExportingPdf(false);
      }
  };

  const handleGenerateGuide = useCallback(async () => {
    if (!scriptFile) return;
    const interval = startLoadingProcess();
    try {
      const result = await generateStudyGuide(scriptFile, useStrictContext, detailLevel, model);
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
  }, [scriptFile, useStrictContext, detailLevel, model]);
  
  const handleStartExam = useCallback(async () => {
    if (!scriptFile) return;
    const interval = startLoadingProcess("Prüfungsfragen werden generiert...");
    try {
        const questions = await generateExamQuestions(scriptFile, model);
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
  }, [scriptFile, model]);

  const handleGradeExam = useCallback(async (answers: ExamAnswer[]) => {
      if (!scriptFile || answers.length === 0) return;
      const interval = startLoadingProcess("Prüfung wird ausgewertet...");
      try {
          const answersWithText = answers.map(ans => ({ ...ans, questionText: examQuestions.find(q => q.id === ans.questionId)?.questionText || '' }));
          const result = await gradeExamAnswers(scriptFile, answersWithText, model);
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
  }, [scriptFile, model, examQuestions]);

  const handleSolvePractice = useCallback(async () => {
    if (!scriptFile || !practiceFile) return;
    const interval = startLoadingProcess();
    try {
        const result = await solvePracticeQuestions(scriptFile, practiceFile, model);
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
  }, [scriptFile, practiceFile, model]);

  const handleStartGuidedOrSimulation = useCallback(async () => {
    if (!practiceFile) return;
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
  }, [practiceFile, model, activeMode]);

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
  
  const handleReset = () => {
    setGuide([]);
    setSolvedQuestions([]);
    setPracticeQuestions([]);
    setExamQuestions([]);
    setExamResults([]);
    setError(null);
    setScriptFile(null);
    setPracticeFile(null);
    setOpenStepIndex(null);
    setAppState('initial');
    setProgress(0);
    localStorage.removeItem(LOCAL_STORAGE_KEY_GUIDE);
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
                    <button onClick={handleReset} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"> Neue Analyse starten </button>
                </div>
            </>
        );
      case 'guided': return <GuidedSolution scriptFile={scriptFile!} practiceFile={practiceFile!} questions={practiceQuestions} model={model} onExit={handleReset} />;
      case 'simulation': return <SimulationMode scriptFile={scriptFile!} practiceFile={practiceFile!} questions={practiceQuestions} model={model} mode={simulationMode} onExit={handleReset} />;
      case 'exam': return <ExamMode questions={examQuestions} onSubmit={handleGradeExam} onExit={handleReset} />;
      case 'examResults': return <ExamResults results={examResults} onRetry={handleReset} />;
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
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Lade ein Skript hoch, um einen Lern-Guide zu erhalten, oder füge Übungsaufgaben hinzu, um diese lösen zu lassen.</p>
            <div className="mt-8"><FileUpload onFileSelect={setScriptFile} isLoading={false} label="1. Skript / Vorlesungsfolien hochladen" /></div>
            
            {scriptFile && (
                <div className="mt-8 space-y-8 p-6 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm">
                    <div className="animate-fade-in"><h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-4">Optional: Übungen hinzufügen</h3><FileUpload onFileSelect={setPracticeFile} isLoading={false} label="2. Übungsaufgaben / Probeklausur" description="Datei hierher ziehen oder auswählen" /></div>
                     
                     {practiceFile ? (
                        <div className="animate-fade-in" style={{animationDelay: '100ms'}}>
                            <fieldset><legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">Modus wählen</legend>
                                <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                                    <div key="solution"><input type="radio" id="solution" name="active-mode" value="solution" checked={activeMode === 'solution'} onChange={() => setActiveMode('solution')} className="sr-only"/><label htmlFor="solution" className={`cursor-pointer select-none rounded-md p-2 text-center text-sm font-medium transition-colors duration-200 ${activeMode === 'solution' ? 'bg-indigo-600 text-white shadow' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700' }`}>Lösung</label></div>
                                    <div key="simulation"><input type="radio" id="simulation" name="active-mode" value="simulation" checked={activeMode === 'simulation'} onChange={() => setActiveMode('simulation')} className="sr-only"/><label htmlFor="simulation" className={`cursor-pointer select-none rounded-md p-2 text-center text-sm font-medium transition-colors duration-200 ${activeMode === 'simulation' ? 'bg-indigo-600 text-white shadow' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700' }`}>Simulation</label></div>
                                </div>
                            </fieldset>
                            {activeMode === 'solution' ? (
                                // FIX: Cast o.id to SolutionMode to satisfy the type of setSolutionMode.
                                <fieldset className="mt-4"><legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">Lösungsmodus</legend><div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">{solutionModeOptions.map(o => <div key={o.id}><input type="radio" id={`sol-${o.id}`} name="solution-mode" value={o.id} checked={solutionMode === o.id} onChange={() => setSolutionMode(o.id as SolutionMode)} className="sr-only"/><label htmlFor={`sol-${o.id}`} className={`flex flex-col items-center justify-center cursor-pointer select-none rounded-md p-3 text-center text-sm font-medium transition-colors ${solutionMode === o.id ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'hover:bg-white/60 dark:hover:bg-slate-700/60'}`}><o.icon className="h-6 w-6 mb-1" />{o.label}</label></div>)}</div></fieldset>
                            ) : (
                                // FIX: Cast o.id to SimulationModeType to satisfy the type of setSimulationMode.
                                <fieldset className="mt-4"><legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">Simulations-Typ</legend><div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">{simulationModeOptions.map(o => <div key={o.id}><input type="radio" id={`sim-${o.id}`} name="simulation-mode" value={o.id} checked={simulationMode === o.id} onChange={() => setSimulationMode(o.id as SimulationModeType)} className="sr-only"/><label htmlFor={`sim-${o.id}`} className={`flex flex-col items-center justify-center cursor-pointer select-none rounded-md p-3 text-center text-sm font-medium transition-colors ${simulationMode === o.id ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'hover:bg-white/60 dark:hover:bg-slate-700/60'}`}><o.icon className="h-6 w-6 mb-1" />{o.label}</label></div>)}</div></fieldset>
                            )}
                        </div>
                    ) : (
                        // FIX: Cast o.id to DetailLevel to satisfy the type of setDetailLevel.
                        <fieldset className="animate-fade-in" style={{animationDelay: '100ms'}}><legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">Detaillierungsgrad (nur für Lern-Guide)</legend><div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">{detailOptions.map((o) => <div key={o.id}><input type="radio" name="detail-level" id={o.id} value={o.id} checked={detailLevel === o.id} onChange={() => setDetailLevel(o.id as DetailLevel)} className="sr-only" /><label htmlFor={o.id} className={`flex flex-col items-center justify-center cursor-pointer select-none rounded-md p-3 text-center text-sm font-medium transition-colors ${detailLevel === o.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700' }`}><o.icon className="h-6 w-6 mb-1" />{o.label}</label></div>)}</div><div className="mt-3 text-sm text-slate-600 dark:text-slate-400 min-h-[3em]"><p>{detailDescriptions[detailLevel]}</p></div></fieldset>
                    )}

                    <fieldset className="animate-fade-in" style={{animationDelay: '200ms'}}><legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">KI-Modell</legend><div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">{modelOptions.map((o) => <div key={o.id}><input type="radio" name="model-select" id={o.id} value={o.id} checked={model === o.id} onChange={() => setModel(o.id as ModelName)} className="sr-only" /><label htmlFor={o.id} className={`flex flex-col items-center justify-center cursor-pointer select-none rounded-md p-3 text-center text-sm font-medium transition-colors ${model === o.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}><CpuChipIcon className="h-6 w-6 mb-1" />{o.label}</label></div>)}</div><div className="mt-3 text-sm text-slate-600 dark:text-slate-400 min-h-[3em]"><p>{modelDescriptions[model]}</p></div></fieldset>
                    <div className="flex items-center justify-center animate-fade-in" style={{animationDelay: '300ms'}}><input id="strict-context-checkbox" type="checkbox" checked={useStrictContext} onChange={(e) => setUseStrictContext(e.target.checked)} className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-transparent" /><label htmlFor="strict-context-checkbox" className="ml-2 block text-sm text-slate-700 dark:text-slate-300 select-none">Nur Inhalt aus dem Skript verwenden (empfohlen)</label></div>
                    <div className="animate-fade-in mt-8" style={{animationDelay: '400ms'}}>
                        {practiceFile ? (
                             <button onClick={buttonAction} className="w-full px-8 py-3 bg-indigo-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 transition-all transform hover:scale-105">{buttonText}</button>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 <button onClick={handleGenerateGuide} className="w-full px-6 py-3 bg-indigo-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 transition-all transform hover:scale-105 flex items-center justify-center"><BookOpenIcon className="h-6 w-6 mr-2" /> Lern-Guide erstellen</button>
                                <button onClick={handleStartExam} className="w-full px-6 py-3 bg-slate-700 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-75 transition-all transform hover:scale-105 flex items-center justify-center"><AcademicCapIcon className="h-6 w-6 mr-2" /> Prüfung starten</button>
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
        <div className="flex items-center justify-center">
            <BrainCircuitIcon className="h-8 w-8 text-indigo-500" />
            <h1 className="ml-3 text-2xl font-bold text-slate-800 dark:text-slate-100">Lern-Guide AI</h1>
        </div>
      </header>
      <main className="py-10 px-4 sm:px-6 lg:px-8">{renderContent()}</main>
      <footer className="text-center py-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800"><p>Powered by Google Gemini</p></footer>
    </div>
  );
}