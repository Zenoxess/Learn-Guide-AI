import React, { useState } from 'react';
import type { GuideStep, SolvedQuestion } from '../types';
import { ChevronDownIcon, SendIcon, SparklesIcon, BookOpenIcon, LightBulbIcon, ExclamationTriangleIcon, ListBulletIcon } from './icons';
import { useTheme } from '../contexts/ThemeContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import { InlineSpinner } from './InlineSpinner';

const getIconForTitle = (title: string): React.FC<{className?: string}> => {
    const lowerCaseTitle = title.toLowerCase();
    if (['grundlagen', 'basis', 'einführung', 'übersicht'].some(keyword => lowerCaseTitle.includes(keyword))) {
        return BookOpenIcon;
    }
    if (['tipp', 'hinweis', 'trick', 'denkanstoß'].some(keyword => lowerCaseTitle.includes(keyword))) {
        return LightBulbIcon;
    }
    if (['fehler', 'problem', 'fallstrick', 'warnung'].some(keyword => lowerCaseTitle.includes(keyword))) {
        return ExclamationTriangleIcon;
    }
    if (['beispiel', 'aufgabe', 'übung'].some(keyword => lowerCaseTitle.includes(keyword))) {
        return ListBulletIcon;
    }
    return SparklesIcon; // Default icon
};


const GuideAccordionItem: React.FC<{ step: GuideStep; isOpen: boolean; onClick: () => void; onAskFollowUp: (question: string) => Promise<void>; }> = ({ step, isOpen, onClick, onAskFollowUp }) => {
  const { theme } = useTheme();
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeButtonIndex, setActiveButtonIndex] = useState<number | null>(null);
  
  const TitleIcon = getIconForTitle(step.title);

  const executeAsk = async (questionToAsk: string) => {
    if (!questionToAsk.trim() || isAsking) return;

    setIsAsking(true);
    setError(null);
    try {
      await onAskFollowUp(questionToAsk);
      setQuestion(''); // Clear textarea on success
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setIsAsking(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeAsk(question);
  };

  const handleSuggestedQuestionClick = async (suggestedQuestion: string, index: number) => {
    setQuestion(suggestedQuestion);
    setActiveButtonIndex(index);
    setTimeout(() => setActiveButtonIndex(null), 500);
    await executeAsk(suggestedQuestion);
  };


  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <h2 id={`accordion-header-${step.title.replace(/\s+/g, '-')}`}>
        <button
          type="button"
          className={`flex items-center justify-between w-full p-5 font-medium text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 ${theme['focus:ring-primary-300_dark-800']}`}
          onClick={onClick}
          aria-expanded={isOpen}
          aria-controls={`accordion-body-${step.title.replace(/\s+/g, '-')}`}
        >
          <span className="flex items-center text-lg">
            <TitleIcon className={`h-6 w-6 mr-3 ${theme['text-primary-500']}`} />
            {step.title}
          </span>
          <ChevronDownIcon className={`w-6 h-6 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </h2>
      <div id={`accordion-body-${step.title.replace(/\s+/g, '-')}`} className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[4000px]' : 'max-h-0'}`} role="region">
        <div className="p-5 border-t-0 border-slate-200 dark:border-slate-700">
          <MarkdownRenderer content={step.content} />
          
          {step.suggestedFollowUps && step.suggestedFollowUps.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                <SparklesIcon className={`h-5 w-5 mr-2 ${theme['text-primary-500']}`} />
                Zum Weiterdenken:
              </h4>
              <div className="flex flex-wrap gap-2">
                {step.suggestedFollowUps.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestionClick(q, index)}
                    disabled={isAsking}
                    className={`px-3 py-1.5 text-sm rounded-full transition-all duration-300 flex items-center ${activeButtonIndex === index ? 'bg-green-200 dark:bg-green-800 scale-105' : `${theme['bg-primary-100_dark-900/50']} ${theme['text-primary-800_dark-200']} hover:bg-slate-200 dark:hover:bg-slate-700`} focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme['focus:ring-primary-500']} disabled:opacity-70 disabled:cursor-not-allowed`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
           )}

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3">Noch etwas unklar? Frag nach!</h4>
            
            {step.followUps && step.followUps.length > 0 && (
                <div className="space-y-6 mb-4">
                    {step.followUps.map((qa, index) => (
                        <div key={index}>
                            <div className="flex flex-col items-start mb-4">
                                <p className="font-semibold text-sm text-slate-600 dark:text-slate-400 mb-1 ml-2">Du</p>
                                <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-2xl rounded-tl-none max-w-[85%] text-slate-800 dark:text-slate-200"><p>{qa.question}</p></div>
                            </div>
                            <div className="flex flex-col items-start">
                                <p className={`font-semibold text-sm ${theme['text-primary-600_dark-400']} mb-1 ml-2`}>AI Tutor</p>
                                <div className={`p-3 ${theme['bg-primary-50_dark-900/40']} rounded-2xl rounded-bl-none max-w-[85%]`}>
                                    <MarkdownRenderer content={qa.answer} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <form onSubmit={handleFormSubmit} className="relative">
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Stelle hier deine Frage zum obigen Inhalt..." className={`w-full p-3 pr-12 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 ${theme['focus:ring-primary-500']} ${theme['border-primary-500']} transition-colors bg-white dark:bg-slate-800`} rows={2} disabled={isAsking} />
              <button type="submit" className={`absolute top-1/2 right-3 -translate-y-1/2 p-2 rounded-full text-slate-500 ${theme['hover:bg-primary-100_dark-800']} ${theme['hover:text-primary-600_dark-300']} disabled:cursor-not-allowed disabled:opacity-50`} disabled={isAsking || !question.trim()} aria-label="Frage absenden"><SendIcon className="w-5 h-5" /></button>
            </form>
            {isAsking && <div className="mt-2"><InlineSpinner text="KI denkt nach..." /></div>}
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const SolvedQuestionAccordionItem: React.FC<{ item: SolvedQuestion; isOpen: boolean; onClick: () => void; }> = ({ item, isOpen, onClick }) => {
    const { theme } = useTheme();
    return (
        <div className="border-b border-slate-200 dark:border-slate-700">
        <h2 id={`accordion-header-${item.title.replace(/\s+/g, '-')}`}>
            <button
            type="button"
            className={`flex items-center justify-between w-full p-5 font-medium text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 ${theme['focus:ring-primary-300_dark-800']}`}
            onClick={onClick}
            aria-expanded={isOpen}
            aria-controls={`accordion-body-${item.title.replace(/\s+/g, '-')}`}
            >
            <span className="text-lg">{item.title}</span>
            <ChevronDownIcon className={`w-6 h-6 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
        </h2>
        <div id={`accordion-body-${item.title.replace(/\s+/g, '-')}`} className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[4000px]' : 'max-h-0'}`} role="region">
            <div className="p-5 space-y-6 border-t-0 border-slate-200 dark:border-slate-700">
                <div>
                    <h3 className={`text-md font-semibold ${theme['text-primary-700_dark-300']} mb-2`}>Antwort</h3>
                    <MarkdownRenderer content={item.answer} />
                </div>
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h3 className={`text-md font-semibold ${theme['text-primary-700_dark-300']} mb-2`}>Erklärung</h3>
                    <MarkdownRenderer content={item.explanation} />
                </div>
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h3 className={`text-md font-semibold ${theme['text-primary-700_dark-300']} mb-2`}>Referenz im Skript</h3>
                    <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-600 dark:text-slate-400">
                        <MarkdownRenderer content={item.reference} />
                    </blockquote>
                </div>
            </div>
        </div>
        </div>
    );
};

interface ResultDisplayProps {
  guide?: GuideStep[];
  solvedQuestions?: SolvedQuestion[];
  onAskFollowUp?: (stepIndex: number, question: string) => Promise<void>;
  openStepIndex: number | null;
  onStepClick: (index: number | null) => void;
}

export const GuideDisplay: React.FC<ResultDisplayProps> = ({ guide, solvedQuestions, onAskFollowUp, openStepIndex, onStepClick }) => {
  const { theme } = useTheme();
  const handleItemClick = (index: number) => {
    onStepClick(openStepIndex === index ? null : index);
  };
  const isGuideMode = !!guide && guide.length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-800/50 rounded-lg shadow-md overflow-hidden">
        <h2 className={`p-5 text-2xl font-bold ${theme['text-primary-600_dark-400']} border-b border-slate-200 dark:border-slate-700`}>
            {isGuideMode ? 'Dein persönlicher Lern-Guide' : 'Gelöste Übungsaufgaben'}
        </h2>
        {isGuideMode && guide.map((step, index) => (
            <GuideAccordionItem
              key={index}
              step={step}
              isOpen={openStepIndex === index}
              onClick={() => handleItemClick(index)}
              onAskFollowUp={(question) => onAskFollowUp!(index, question)}
            />
        ))}
        {!isGuideMode && solvedQuestions && solvedQuestions.map((item, index) => (
            <SolvedQuestionAccordionItem
                key={index}
                item={item}
                isOpen={openStepIndex === index}
                onClick={() => handleItemClick(index)}
            />
        ))}
    </div>
  );
};