import React, { useState, useEffect } from 'react';
import type { GeneratedContent, DetailLevel, ModelName, ScriptAction } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { GuideDisplay } from './GuideDisplay';
import { KeyConceptsDisplay } from './KeyConceptsDisplay';
import { FlashcardMode } from './FlashcardMode';
import { ExamResults } from './ExamResults';
import { Button } from './Button';
import { DocumentArrowDownIcon, BookOpenIcon, KeyIcon, RectangleStackIcon, AcademicCapIcon, PlusCircleIcon } from './icons';
import { InlineSpinner } from './InlineSpinner';

interface AddMoreContentPanelProps {
  handleGenerateGuide: () => void;
  handleGenerateKeyConcepts: () => void;
  handleGenerateFlashcards: () => void;
  handleStartExam: () => void;
  detailLevel: DetailLevel;
  setDetailLevel: (level: DetailLevel) => void;
  model: ModelName;
  setModel: (model: ModelName) => void;
  useStrictContext: boolean;
  setUseStrictContext: (use: boolean) => void;
  isGenerating: boolean;
}

const AddMoreContentPanel: React.FC<AddMoreContentPanelProps> = (props) => {
    const { theme } = useTheme();
    const [selectedAction, setSelectedAction] = useState<ScriptAction>('guide');

    const scriptActionOptions = [
        { id: 'guide', label: 'Lern-Guide', icon: BookOpenIcon },
        { id: 'concepts', label: 'Konzepte', icon: KeyIcon },
        { id: 'flashcards', label: 'Lernkarten', icon: RectangleStackIcon },
        { id: 'exam', label: 'Prüfung', icon: AcademicCapIcon },
    ];
    
    const detailOptions = [ { id: 'overview', label: 'Übersicht' }, { id: 'standard', label: 'Standard' }, { id: 'detailed', label: 'Detailliert' }, { id: 'eli5', label: 'ELI5' } ];

    const handleStart = () => {
        if (props.isGenerating) return;
        switch (selectedAction) {
            case 'guide': props.handleGenerateGuide(); break;
            case 'concepts': props.handleGenerateKeyConcepts(); break;
            case 'flashcards': props.handleGenerateFlashcards(); break;
            case 'exam': props.handleStartExam(); break;
        }
    };

    return (
        <div className="bg-slate-100 dark:bg-slate-900/50 p-8 rounded-lg animate-fade-in">
            <h3 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-6">Zusätzliche Lernmaterialien generieren</h3>
            <div className="max-w-2xl mx-auto space-y-8">
                <fieldset disabled={props.isGenerating}>
                    <legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">Was möchtest du als Nächstes tun?</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 rounded-lg bg-slate-200 dark:bg-slate-800 p-1">
                        {scriptActionOptions.map((opt) => (<div key={opt.id}><input type="radio" name="script-action" id={`add-${opt.id}`} value={opt.id} checked={selectedAction === opt.id} onChange={() => setSelectedAction(opt.id as ScriptAction)} className="sr-only" /><label htmlFor={`add-${opt.id}`} className={`flex flex-col items-center justify-center cursor-pointer select-none rounded-md p-3 text-center text-sm font-medium transition-colors duration-200 h-full ${selectedAction === opt.id ? `bg-white dark:bg-slate-700 ${theme['text-primary-600_dark-400']} dark:text-white shadow-sm` : 'hover:bg-white/60 dark:hover:bg-slate-700/60'}`}><opt.icon className="h-6 w-6 mb-1.5" />{opt.label}</label></div>))}
                    </div>
                </fieldset>
                
                {selectedAction === 'guide' && (
                     <fieldset disabled={props.isGenerating}>
                        <legend className="text-base font-medium text-slate-900 dark:text-slate-200 mb-2">Detaillierungsgrad</legend>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg bg-slate-200 dark:bg-slate-800 p-1">{detailOptions.map((o) => (<div key={o.id}><input type="radio" id={`add-${o.id}`} name="detail-level" value={o.id} checked={props.detailLevel === o.id} onChange={() => props.setDetailLevel(o.id as DetailLevel)} className="sr-only" /><label htmlFor={`add-${o.id}`} className={`cursor-pointer select-none rounded-md p-2 text-center text-sm font-medium transition-colors ${props.detailLevel === o.id ? `${theme['bg-primary-600']} text-white shadow` : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700' }`}>{o.label}</label></div>))}</div>
                    </fieldset>
                )}

                 <div className="flex justify-center min-h-[48px] items-center">
                    {props.isGenerating ? (
                        <InlineSpinner text="Wird generiert..." />
                    ) : (
                        <Button onClick={handleStart} variant="primary" size="lg" className="transform hover:scale-105">
                            Jetzt generieren
                        </Button>
                    )}
                 </div>
            </div>
        </div>
    );
};


interface ResultsDashboardProps {
  generatedContent: GeneratedContent;
  scriptFiles: File[];
  model: ModelName;
  onAskFollowUp: (stepIndex: number, question: string) => Promise<void>;
  onAskFollowUpOnSolution: (questionIndex: number, question: string) => Promise<void>;
  openStepIndex: number | null;
  onStepClick: (index: number | null) => void;
  onReset: () => void;
  onExportToPdf: () => void;
  onExportSession: () => void;
  isExportingPdf: boolean;
  // Add More Content Props
  handleGenerateGuide: () => void;
  handleGenerateKeyConcepts: () => void;
  handleGenerateFlashcards: () => void;
  handleStartExam: () => void;
  detailLevel: DetailLevel;
  setDetailLevel: (level: DetailLevel) => void;
  setModel: (model: ModelName) => void;
  useStrictContext: boolean;
  setUseStrictContext: (use: boolean) => void;
  // Props for batch solving
  handleSolveNextBatch: () => void;
  isSolvingNextBatch: boolean;
  totalPracticeQuestionsCount: number;
  solvedPracticeQuestionsCount: number;
  // Props for guide batching
  handleGenerateNextGuideBatch: () => void;
  isGeneratingNextBatch: boolean;
  hasMoreTopics: boolean;
}

type TabKey = keyof GeneratedContent | 'add';


export const ResultsDashboard: React.FC<ResultsDashboardProps> = React.memo((props) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const tabOptions: Record<keyof GeneratedContent, { label: string; icon: React.FC<{className?: string}>; content: any }> = {
    guide: { label: "Lern-Guide", icon: BookOpenIcon, content: props.generatedContent.guide },
    solvedQuestions: { label: "Lösungen", icon: BookOpenIcon, content: props.generatedContent.solvedQuestions },
    keyConcepts: { label: "Konzepte", icon: KeyIcon, content: props.generatedContent.keyConcepts },
    flashcards: { label: "Lernkarten", icon: RectangleStackIcon, content: props.generatedContent.flashcards },
    examResults: { label: "Prüfungsergebnis", icon: AcademicCapIcon, content: props.generatedContent.examResults },
  };

  const availableTabs = (Object.keys(tabOptions) as (keyof GeneratedContent)[]).filter(key => 
    tabOptions[key].content && tabOptions[key].content.length > 0
  );

  useEffect(() => {
    // If a new content type is generated, switch to its tab
    const lastAddedKey = availableTabs.find(key => !Object.keys(props.generatedContent).some(oldKey => oldKey === key));

    if (activeTab === 'add' && availableTabs.length > 0) {
        const newlyGeneratedTab = availableTabs.find(tab => !tabOptions[tab as keyof GeneratedContent].content);
        if (newlyGeneratedTab) {
            setActiveTab(newlyGeneratedTab);
            return;
        }
    }

    if (!activeTab && availableTabs.length > 0) {
      setActiveTab(availableTabs[0]);
    } else if (activeTab && availableTabs.indexOf(activeTab as keyof GeneratedContent) === -1 && activeTab !== 'add') {
      setActiveTab(availableTabs.length > 0 ? availableTabs[0] : 'add');
    }

  }, [props.generatedContent, activeTab, availableTabs]);
  
  const createGenerationHandler = (handler: () => Promise<void> | void) => async () => {
      if (isGenerating) return;
      setIsGenerating(true);
      setActiveTab('add'); // Keep the user on the add tab
      try {
          await handler();
      } finally {
          setIsGenerating(false);
          // Effect hook will handle switching to the new tab
      }
  };

  const handleGenerateGuideWrapper = createGenerationHandler(props.handleGenerateGuide);
  const handleGenerateKeyConceptsWrapper = createGenerationHandler(props.handleGenerateKeyConcepts);
  const handleGenerateFlashcardsWrapper = createGenerationHandler(props.handleGenerateFlashcards);
  const handleStartExamWrapper = createGenerationHandler(props.handleStartExam);


  const renderContent = () => {
    switch(activeTab) {
      case 'guide':
      case 'solvedQuestions': // Both handled by GuideDisplay
        return <GuideDisplay 
                    guide={props.generatedContent.guide} 
                    solvedQuestions={props.generatedContent.solvedQuestions} 
                    onAskFollowUp={props.onAskFollowUp} 
                    onAskFollowUpOnSolution={props.onAskFollowUpOnSolution}
                    openStepIndex={props.openStepIndex} 
                    onStepClick={props.onStepClick}
                    onSolveNextBatch={props.handleSolveNextBatch}
                    isSolvingNextBatch={props.isSolvingNextBatch}
                    hasMoreQuestions={props.solvedPracticeQuestionsCount < props.totalPracticeQuestionsCount}
                    onGenerateNextBatch={props.handleGenerateNextGuideBatch}
                    isGeneratingNextBatch={props.isGeneratingNextBatch}
                    hasMoreTopics={props.hasMoreTopics}
                />;
      case 'keyConcepts':
        return <KeyConceptsDisplay concepts={props.generatedContent.keyConcepts!} onReturn={props.onReset} />;
      case 'flashcards':
        return <FlashcardMode flashcards={props.generatedContent.flashcards!} onExit={props.onReset} />;
      case 'examResults':
        return <ExamResults results={props.generatedContent.examResults!} onRetry={props.onReset} scriptFiles={props.scriptFiles} model={props.model} />;
      case 'add':
        return <AddMoreContentPanel 
            {...props} 
            isGenerating={isGenerating}
            handleGenerateGuide={handleGenerateGuideWrapper}
            handleGenerateKeyConcepts={handleGenerateKeyConceptsWrapper}
            handleGenerateFlashcards={handleGenerateFlashcardsWrapper}
            handleStartExam={handleStartExamWrapper}
        />;
      default:
        return (
            <div className="text-center py-20">
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Willkommen im Lern-Dashboard</h3>
                <p className="mt-2 text-slate-500">Wähle einen Tab oder füge neue Lernmaterialien hinzu.</p>
            </div>
        );
    }
  };
  
  const showExportButton = activeTab === 'guide' || activeTab === 'solvedQuestions';

  return (
    <div className="w-full max-w-6xl mx-auto">
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                    {availableTabs.map(key => {
                        const tab = tabOptions[key];
                        const Icon = tab.icon;
                        const isActive = activeTab === key;
                        return (
                            <button key={key} onClick={() => setActiveTab(key)}
                                disabled={isGenerating}
                                className={`whitespace-nowrap flex items-center py-3 px-4 rounded-t-lg border-b-2 font-medium text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200
                                    ${isActive 
                                        ? `${theme['border-primary-500']} ${theme['text-primary-600_dark-400']} bg-slate-50 dark:bg-slate-800/50` 
                                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/20'
                                    }`
                                }>
                                <Icon className={`-ml-0.5 mr-2 h-5 w-5 ${isActive ? theme['text-primary-500'] : 'text-slate-400'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                    <button onClick={() => setActiveTab('add')}
                        disabled={isGenerating}
                        className={`whitespace-nowrap flex items-center py-3 px-4 rounded-t-lg border-b-2 font-medium text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200
                            ${activeTab === 'add' 
                                ? `${theme['border-primary-500']} ${theme['text-primary-600_dark-400']} bg-slate-50 dark:bg-slate-800/50` 
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/20'
                            }`
                        }>
                        <PlusCircleIcon className={`-ml-0.5 mr-2 h-5 w-5 ${activeTab === 'add' ? theme['text-primary-500'] : 'text-slate-400'}`} />
                        Hinzufügen
                    </button>
                </nav>
            </div>
            <div className="mt-3 sm:ml-4 sm:mt-0 flex items-center gap-2">
                <Button onClick={props.onExportSession} variant="secondary" leftIcon={<DocumentArrowDownIcon className="h-5 w-5" />}>
                    Sitzung
                </Button>
                {showExportButton && (
                    <Button onClick={props.onExportToPdf} disabled={props.isExportingPdf || isGenerating} variant="secondary" leftIcon={
                        props.isExportingPdf 
                        ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        : <DocumentArrowDownIcon className="h-5 w-5" />
                    }>
                        {props.isExportingPdf ? 'Exportiere...' : 'PDF'}
                    </Button>
                )}
            </div>
        </div>
        
        <div className="mt-8">
            {renderContent()}
        </div>
    </div>
  );
});