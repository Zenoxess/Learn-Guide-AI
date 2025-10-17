import React, { useState } from 'react';
import type { DetailLevel, ModelName, SolutionMode, SimulationModeType, ScriptAction } from '../types';
import { FileUpload } from './FileUpload';
import { useTheme } from '../contexts/ThemeContext';
import { XMarkIcon, LinkIcon, ListBulletIcon, BookOpenIcon, MagnifyingGlassIcon, CpuChipIcon, ChatBubbleLeftRightIcon, AcademicCapIcon, UsersIcon, SparklesIcon, KeyIcon, RectangleStackIcon, ChevronRightIcon, ChevronLeftIcon, LightBulbIcon, CheckIcon } from './icons';
import { Button } from './Button';

// Prop-Typen für den Wizard
interface SetupWizardProps {
  scriptFiles: File[];
  practiceFile: File | null;
  handleAddScriptFiles: (files: File[]) => void;
  handleRemoveScriptFile: (index: number) => void;
  setPracticeFile: (file: File | null) => void;
  urlInput: string;
  setUrlInput: (url: string) => void;
  isUrlLoading: boolean;
  handleLoadFromUrl: () => void;
  error: string | null;

  selectedScriptAction: ScriptAction;
  setSelectedScriptAction: (action: ScriptAction) => void;
  detailLevel: DetailLevel;
  setDetailLevel: (level: DetailLevel) => void;

  activeMode: 'solution' | 'simulation';
  setActiveMode: (mode: 'solution' | 'simulation') => void;
  solutionMode: SolutionMode;
  setSolutionMode: (mode: SolutionMode) => void;
  simulationMode: SimulationModeType;
  setSimulationMode: (mode: SimulationModeType) => void;

  model: ModelName;
  setModel: (model: ModelName) => void;
  useStrictContext: boolean;
  setUseStrictContext: (use: boolean) => void;

  handleStartGeneration: () => void;
  handleSolvePractice: () => void;
  handleStartGuidedOrSimulation: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = (props) => {
  const { theme } = useTheme();
  const [step, setStep] = useState(1);
  const [path, setPath] = useState<'learn' | 'practice' | null>(null);

  // Definitionen für Optionen, um sie nicht aus App.tsx durchreichen zu müssen
  const detailOptions = [ { id: 'overview', label: 'Übersicht', icon: ListBulletIcon }, { id: 'standard', label: 'Standard', icon: BookOpenIcon }, { id: 'detailed', label: 'Detailliert', icon: MagnifyingGlassIcon }, { id: 'eli5', label: 'ELI5', icon: LightBulbIcon } ];
  const detailDescriptions: Record<DetailLevel, string> = { overview: 'Ideal für eine schnelle Zusammenfassung.', standard: 'Eine ausgewogene, schrittweise Erklärung.', detailed: 'Eine tiefgehende Analyse mit Beispielen.', eli5: 'Erklärung wie für ein 5-jähriges Kind, mit einfachen Analogien.' };
  const scriptActionOptions = [
    { id: 'guide', label: 'Lern-Guide', icon: BookOpenIcon, description: 'Erstellt eine detaillierte, schrittweise Anleitung durch Ihre Dokumente.' },
    { id: 'concepts', label: 'Konzepte', icon: KeyIcon, description: 'Extrahiert die wichtigsten Schlüsselbegriffe und Definitionen.' },
    { id: 'flashcards', label: 'Lernkarten', icon: RectangleStackIcon, description: 'Generiert automatisch Frage-Antwort-Karten zum Abfragen.' },
    { id: 'exam', label: 'Prüfung', icon: AcademicCapIcon, description: 'Erstellt einen simulierten Test basierend auf Ihren Unterlagen.' },
  ];
  const solutionModeOptions = [ { id: 'direct', label: 'Direkte Lösung', icon: BookOpenIcon }, { id: 'guided', label: 'Geführte Lösung', icon: ChatBubbleLeftRightIcon } ];
  const simulationModeOptions = [ { id: 'coop', label: 'Studienpartner', icon: UsersIcon }, { id: 'vs', label: 'Herausforderer', icon: SparklesIcon } ];
  const modelOptions = [ { id: 'gemini-2.5-flash', label: 'Flash' }, { id: 'gemini-2.5-pro', label: 'Pro' } ];
  const modelDescriptions: Record<ModelName, string> = { 'gemini-2.5-flash': 'Schnell und effizient, für die meisten Aufgaben.', 'gemini-2.5-pro': 'Leistungsstark, für komplexe Dokumente.' };

  const renderStepIndicator = () => {
    const steps = ['Dateien', 'Lernpfad', 'Details'];
    return (
      <nav aria-label="Fortschritt" className="mb-12 w-full max-w-2xl mx-auto px-4">
        <ol className="flex items-start">
          {steps.map((label, index) => {
            const s = index + 1;
            const isCompleted = s < step;
            const isActive = s === step;

            return (
              <React.Fragment key={s}>
                {/* Step Item (Circle + Label) */}
                <li className="relative flex flex-col items-center text-center w-24">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 z-10 ${
                      isActive || isCompleted
                        ? `${theme['border-primary-500']}`
                        : 'border-slate-300 dark:border-slate-600'
                    } ${
                      isCompleted ? theme['bg-primary-500'] : 'bg-white dark:bg-slate-800'
                    }`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {isCompleted ? (
                      <CheckIcon className="h-6 w-6 text-white" />
                    ) : (
                      <span
                        className={`font-bold ${
                          isActive
                            ? theme['text-primary-600_dark-400']
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {s}
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-2 text-sm font-medium transition-colors duration-300 ${
                      isActive
                        ? theme['text-primary-600_dark-400']
                        : isCompleted
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </p>
                </li>

                {/* Connector Line */}
                {s < steps.length && (
                  <li className="relative flex-auto" aria-hidden="true">
                    {/* Background line, positioned to be in the vertical center of the circle */}
                    <div className="absolute top-5 h-0.5 w-full bg-slate-300 dark:bg-slate-600" />
                    {/* Animated foreground line */}
                    <div
                      className={`absolute top-5 h-0.5 ${theme['bg-primary-500']} transition-transform duration-500 ease-in-out`}
                      style={{
                        transform: isCompleted ? 'scaleX(1)' : 'scaleX(0)',
                        transformOrigin: 'left',
                      }}
                    />
                  </li>
                )}
              </React.Fragment>
            );
          })}
        </ol>
      </nav>
    );
  };

  const renderStep1 = () => (
    <div className="space-y-6">
       <h3 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100">Schritt 1: Lern-Grundlagen hochladen</h3>
       <p className="text-center text-slate-600 dark:text-slate-400">Lade ein oder mehrere Skripte, Vorlesungsfolien oder Webinhalte hoch, die als Wissensbasis dienen sollen.</p>
        <FileUpload onFilesAdd={props.handleAddScriptFiles} isLoading={false} label="Skript(e) / Vorlesungsfolien hochladen" />
        <div className="flex items-center text-slate-500 dark:text-slate-400"><div className="flex-grow border-t border-slate-300 dark:border-slate-700"></div><span className="flex-shrink mx-4 text-sm font-semibold">ODER</span><div className="flex-grow border-t border-slate-300 dark:border-slate-700"></div></div>
         <div>
            <label htmlFor="url-input" className="block text-sm font-medium text-left text-slate-700 dark:text-slate-300 mb-2">Inhalt von URL laden</label>
            <div className="flex gap-2">
                <div className="relative flex-grow">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><LinkIcon className="h-5 w-5 text-slate-400" /></div>
                    <input id="url-input" type="url" value={props.urlInput} onChange={(e) => props.setUrlInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') props.handleLoadFromUrl(); }} disabled={props.isUrlLoading} placeholder="https://beispiel.de/mein-skript.html" className={`w-full rounded-md border-0 py-2 pl-10 text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-800/50 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-inset ${theme['focus:ring-primary-600']}`} />
                </div>
                <Button onClick={props.handleLoadFromUrl} disabled={!props.urlInput.trim() || props.isUrlLoading} variant="primary">
                    {props.isUrlLoading ? <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Lädt...</> : "Laden"}
                </Button>
            </div>
            {props.error && <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-left">{props.error}</p>}
        </div>
        {props.scriptFiles.length > 0 && (
            <div className="mt-4 text-left"><h4 className="font-semibold text-slate-700 dark:text-slate-300">Hochgeladene Lern-Grundlagen:</h4>
                <ul className="mt-2 space-y-2">{props.scriptFiles.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-md text-sm"><span className="text-slate-800 dark:text-slate-200 truncate pr-2">{file.name}</span><button onClick={() => props.handleRemoveScriptFile(index)} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200"><XMarkIcon className="h-4 w-4" /></button></li>)}</ul>
            </div>
        )}
        <div className="pt-6 text-right">
            <Button onClick={() => setStep(2)} disabled={props.scriptFiles.length === 0} rightIcon={<ChevronRightIcon className="h-5 w-5" />}>
                Weiter
            </Button>
        </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
       <h3 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100">Schritt 2: Wähle deinen Lernpfad</h3>
       <p className="text-center text-slate-600 dark:text-slate-400">Möchtest du die hochgeladenen Inhalte verstehen und lernen oder konkrete Übungsaufgaben bearbeiten?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div onClick={() => { setPath('learn'); setStep(3); }} className={`p-6 border-2 rounded-lg text-center cursor-pointer transition-all transform hover:scale-105 hover:shadow-xl ${theme['border-primary-400_dark-500']} bg-slate-50 dark:bg-slate-800/50`}>
                <BookOpenIcon className={`h-12 w-12 mx-auto mb-3 ${theme['text-primary-500']}`} />
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Inhalte lernen</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Lern-Guides, Konzepte, Lernkarten oder eine Prüfung aus deinen Skripten erstellen.</p>
            </div>
            <div className={`p-6 border-2 rounded-lg text-center transition-all ${props.practiceFile ? `cursor-pointer transform hover:scale-105 hover:shadow-xl ${theme['border-primary-400_dark-500']}` : 'opacity-60 bg-slate-100 dark:bg-slate-800'} bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700`}>
                 <div onClick={() => { if(props.practiceFile) { setPath('practice'); setStep(3); }}} className={props.practiceFile ? 'cursor-pointer' : 'cursor-default'}>
                    <ChatBubbleLeftRightIcon className={`h-12 w-12 mx-auto mb-3 ${props.practiceFile ? theme['text-primary-500'] : 'text-slate-400'}`} />
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Übungen lösen</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Lade eine Übungsdatei hoch, um sie lösen zu lassen, dich anleiten zu lassen oder eine Lernsitzung zu simulieren.</p>
                 </div>
                 <div className="mt-4">
                    <FileUpload onFilesAdd={(files) => props.setPracticeFile(files[0])} isLoading={false} label="Übungsdatei hochladen" description={props.practiceFile ? props.practiceFile.name : '...um diesen Pfad zu aktivieren'} />
                 </div>
            </div>
        </div>
        <div className="pt-6 flex justify-between">
            <Button onClick={() => setStep(1)} variant="secondary" leftIcon={<ChevronLeftIcon className="h-5 w-5" />}>
                Zurück
            </Button>
        </div>
    </div>
  );
  
  const renderStep3 = () => {
    const startButtonAction = path === 'learn' ? props.handleStartGeneration : (props.activeMode === 'solution' && props.solutionMode === 'direct' ? props.handleSolvePractice : props.handleStartGuidedOrSimulation);
    const startButtonText = path === 'learn' 
        ? "Aktion starten" 
        : (props.activeMode === 'solution' ? (props.solutionMode === 'direct' ? 'Übungen lösen' : 'Geführte Lösung starten') : (props.simulationMode === 'coop' ? 'Co-op-Sitzung starten' : 'VS-Match starten'));

    return (
    <div className="space-y-6">
         <h3 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100">Schritt 3: Details anpassen und starten</h3>
         <p className="text-center text-slate-600 dark:text-slate-400">Wähle die letzten Optionen für deinen Lernpfad.</p>
        <div className="p-6 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm space-y-8">
            {path === 'learn' && (
                <>
                    <fieldset>
                        <legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">Was möchtest du tun?</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                            {scriptActionOptions.map((opt) => (<div key={opt.id}><input type="radio" name="script-action" id={opt.id} value={opt.id} checked={props.selectedScriptAction === opt.id} onChange={() => props.setSelectedScriptAction(opt.id as ScriptAction)} className="sr-only" /><label htmlFor={opt.id} className={`flex flex-col items-center justify-center cursor-pointer select-none rounded-md p-3 text-center text-sm font-medium transition-colors duration-200 h-full ${props.selectedScriptAction === opt.id ? `bg-white dark:bg-slate-700 ${theme['text-primary-600_dark-400']} dark:text-white shadow-sm` : 'hover:bg-white/60 dark:hover:bg-slate-700/60'}`}><opt.icon className="h-6 w-6 mb-1.5" />{opt.label}</label></div>))}
                        </div>
                    </fieldset>
                    {props.selectedScriptAction === 'guide' && (
                        <fieldset>
                            <legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">Detaillierungsgrad</legend>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">{detailOptions.map((o) => (<div key={o.id}><input type="radio" name="detail-level" id={o.id} value={o.id} checked={props.detailLevel === o.id} onChange={() => props.setDetailLevel(o.id as DetailLevel)} className="sr-only" /><label htmlFor={o.id} className={`flex flex-col items-center justify-center cursor-pointer select-none rounded-md p-3 text-center text-sm font-medium transition-colors ${props.detailLevel === o.id ? `${theme['bg-primary-600']} text-white shadow` : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700' }`}><o.icon className="h-6 w-6 mb-1" />{o.label}</label></div>))}</div>
                            <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 min-h-[2em]"><p>{detailDescriptions[props.detailLevel]}</p></div>
                        </fieldset>
                    )}
                </>
            )}
            {path === 'practice' && (
                <>
                 <fieldset><legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">Modus wählen</legend><div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1"><div key="solution"><input type="radio" id="solution" name="active-mode" value="solution" checked={props.activeMode === 'solution'} onChange={() => props.setActiveMode('solution')} className="sr-only"/><label htmlFor="solution" className={`cursor-pointer select-none rounded-md p-2 text-center text-sm font-medium transition-colors duration-200 ${props.activeMode === 'solution' ? `${theme['bg-primary-600']} text-white shadow` : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700' }`}>Lösung</label></div><div key="simulation"><input type="radio" id="simulation" name="active-mode" value="simulation" checked={props.activeMode === 'simulation'} onChange={() => props.setActiveMode('simulation')} className="sr-only"/><label htmlFor="simulation" className={`cursor-pointer select-none rounded-md p-2 text-center text-sm font-medium transition-colors duration-200 ${props.activeMode === 'simulation' ? `${theme['bg-primary-600']} text-white shadow` : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700' }`}>Simulation</label></div></div></fieldset>
                 {props.activeMode === 'solution' ? (<fieldset className="mt-4"><legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">Lösungsmodus</legend><div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">{solutionModeOptions.map(o => <div key={o.id}><input type="radio" id={`sol-${o.id}`} name="solution-mode" value={o.id} checked={props.solutionMode === o.id} onChange={() => props.setSolutionMode(o.id as SolutionMode)} className="sr-only"/><label htmlFor={`sol-${o.id}`} className={`flex flex-col items-center justify-center cursor-pointer select-none rounded-md p-3 text-center text-sm font-medium transition-colors ${props.solutionMode === o.id ? `bg-white dark:bg-slate-700 ${theme['text-primary-600_dark-400']} dark:text-white shadow-sm` : 'hover:bg-white/60 dark:hover:bg-slate-700/60'}`}><o.icon className="h-6 w-6 mb-1" />{o.label}</label></div>)}</div></fieldset>) : (<fieldset className="mt-4"><legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">Simulations-Typ</legend><div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">{simulationModeOptions.map(o => <div key={o.id}><input type="radio" id={`sim-${o.id}`} name="simulation-mode" value={o.id} checked={props.simulationMode === o.id} onChange={() => props.setSimulationMode(o.id as SimulationModeType)} className="sr-only"/><label htmlFor={`sim-${o.id}`} className={`flex flex-col items-center justify-center cursor-pointer select-none rounded-md p-3 text-center text-sm font-medium transition-colors ${props.simulationMode === o.id ? `bg-white dark:bg-slate-700 ${theme['text-primary-600_dark-400']} dark:text-white shadow-sm` : 'hover:bg-white/60 dark:hover:bg-slate-700/60'}`}><o.icon className="h-6 w-6 mb-1" />{o.label}</label></div>)}</div></fieldset>)}
                </>
            )}
             <fieldset><legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">KI-Modell</legend><div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">{modelOptions.map((o) => <div key={o.id}><input type="radio" name="model-select" id={o.id} value={o.id} checked={props.model === o.id} onChange={() => props.setModel(o.id as ModelName)} className="sr-only" /><label htmlFor={o.id} className={`flex flex-col items-center justify-center cursor-pointer select-none rounded-md p-3 text-center text-sm font-medium transition-colors ${props.model === o.id ? `${theme['bg-primary-600']} text-white shadow` : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}><CpuChipIcon className="h-6 w-6 mb-1" />{o.label}</label></div>)}</div><div className="mt-3 text-sm text-slate-600 dark:text-slate-400 min-h-[2em]"><p>{modelDescriptions[props.model]}</p></div></fieldset>
             <div className="flex items-center justify-center"><input id="strict-context-checkbox" type="checkbox" checked={props.useStrictContext} onChange={(e) => props.setUseStrictContext(e.target.checked)} className={`h-4 w-4 rounded border-slate-300 dark:border-slate-600 ${theme['text-primary-600_dark-400']} focus:ring-indigo-500 bg-transparent`} /><label htmlFor="strict-context-checkbox" className="ml-2 block text-sm text-slate-700 dark:text-slate-300 select-none">Nur Inhalt aus Skripten verwenden (empfohlen)</label></div>
        </div>
        <div className="pt-6 flex justify-between items-center">
             <Button onClick={() => setStep(2)} variant="secondary" leftIcon={<ChevronLeftIcon className="h-5 w-5" />}>
                Zurück
            </Button>
            <Button onClick={startButtonAction} variant="primary" size="lg" className="transform hover:scale-105">
                {startButtonText}
            </Button>
        </div>
    </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
        {renderStepIndicator()}
        <div className="bg-slate-100/50 dark:bg-slate-800/20 p-6 sm:p-8 rounded-xl shadow-inner">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
        </div>
    </div>
  );
};