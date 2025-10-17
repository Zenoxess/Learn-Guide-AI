import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Chat } from '@google/genai';
import { startTutorChat } from '../services/geminiService';
import type { ChatMessage, ModelName } from '../types';
import { ArrowUturnLeftIcon, SendIcon, DocumentArrowDownIcon, ChatBubbleLeftRightIcon } from './icons';
import { useTheme } from '../contexts/ThemeContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Button } from './Button';

// TypeScript declarations for global libraries loaded via CDN
declare const jspdf: any;

interface GuidedSolutionProps {
  scriptFiles: File[];
  practiceFile: File;
  questions: string[];
  model: ModelName;
  onExit: () => void;
}

type QuestionStatus = 'not-started' | 'in-progress' | 'completed';

export const GuidedSolution: React.FC<GuidedSolutionProps> = ({ scriptFiles, practiceFile, questions, model, onExit }) => {
  const { theme } = useTheme();
  const chatRef = useRef<Chat | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const [questionStatuses, setQuestionStatuses] = useState<Record<number, QuestionStatus>>({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const chat = await startTutorChat(scriptFiles, practiceFile, model);
        chatRef.current = chat;
      } catch (err: any) {
        setError(err.message || "Der Chat mit dem Tutor konnte nicht gestartet werden.");
      } finally {
        setIsInitializing(false);
      }
    };
    initializeChat();
  }, [scriptFiles, practiceFile, model]);

  const handleSelectQuestion = useCallback(async (index: number) => {
    if (isTutorLoading || !chatRef.current) return;
    
    const isSameQuestion = selectedQuestionIndex === index;

    setQuestionStatuses(prevStatuses => {
        const newStatuses = { ...prevStatuses };
        if (selectedQuestionIndex !== null && !isSameQuestion) {
            newStatuses[selectedQuestionIndex] = 'completed';
        }
        newStatuses[index] = 'in-progress';
        return newStatuses;
    });

    if (isSameQuestion) return;

    setSelectedQuestionIndex(index);
    setMessages([]);
    setIsTutorLoading(true);
    setError(null);
    setUserInput('');

    try {
        const initialPrompt = `Lass uns an dieser Frage arbeiten: "${questions[index]}". Wie würdest du anfangen, diese Aufgabe zu lösen?`;
        const result = await chatRef.current.sendMessage({ message: initialPrompt });
        setMessages([{ role: 'model', text: result.text }]);
    } catch (err: any) {
        setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
        console.error(err);
    } finally {
        setIsTutorLoading(false);
    }
  }, [questions, isTutorLoading, selectedQuestionIndex]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isTutorLoading || !chatRef.current) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', text: userInput }];
    setMessages(newMessages);
    setUserInput('');
    setIsTutorLoading(true);
    setError(null);

    try {
        const result = await chatRef.current.sendMessage({ message: userInput });
        setMessages([...newMessages, { role: 'model', text: result.text }]);
    } catch (err: any) {
        setError("Die Antwort des Tutors konnte nicht geladen werden.");
        console.error(err);
    } finally {
        setIsTutorLoading(false);
    }
  };

  const handleExportPdf = async () => {
      if (typeof jspdf === 'undefined' || selectedQuestionIndex === null) {
          setError("Die PDF-Export-Funktion konnte nicht geladen werden.");
          return;
      }
      setIsExportingPdf(true);
      setError(null);

      try {
          const { jsPDF } = jspdf;
          const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          
          const MARGIN = 15;
          const PAGE_WIDTH = doc.internal.pageSize.getWidth();
          const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
          const TEXT_WIDTH = PAGE_WIDTH - MARGIN * 2;
          let y = MARGIN;

          const addTextWithBreaks = (text: string, options: { fontSize?: number, style?: 'normal' | 'bold' | 'italic' } = {}) => {
              const { fontSize = 10, style = 'normal' } = options;
              doc.setFontSize(fontSize);
              doc.setFont('helvetica', style);

              const lines = doc.splitTextToSize(text, TEXT_WIDTH);
              const textHeight = lines.length * (fontSize * 0.35);

              if (y + textHeight > PAGE_HEIGHT - MARGIN) {
                  doc.addPage();
                  y = MARGIN;
              }

              doc.text(lines, MARGIN, y);
              y += textHeight + 4; 
          };
          
          addTextWithBreaks(`Chat-Protokoll: Frage ${selectedQuestionIndex + 1}`, { fontSize: 18, style: 'bold' });
          addTextWithBreaks(questions[selectedQuestionIndex], { fontSize: 12, style: 'italic' });
          y += 10;

          messages.forEach(msg => {
              const prefix = msg.role === 'user' ? 'Du: ' : 'AI Tutor: ';
              const style = msg.role === 'user' ? 'bold' : 'normal';
              const cleanText = msg.text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');

              addTextWithBreaks(prefix + cleanText, { style });
          });
          
          doc.save(`lern-chat-frage-${selectedQuestionIndex + 1}.pdf`);
      } catch (err) {
          console.error("PDF export failed", err);
          setError("Der PDF-Export ist fehlgeschlagen.");
      } finally {
          setIsExportingPdf(false);
      }
  };

  const completedQuestions = Object.values(questionStatuses).filter(s => s === 'completed').length;
  const progress = questions.length > 0 ? (completedQuestions / questions.length) * 100 : 0;
  
  if (isInitializing) {
    return <div className="text-center p-8">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${theme['border-primary-500']} mx-auto`}></div>
        <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">Tutor wird vorbereitet...</p>
    </div>;
  }
  
  if(error && !isTutorLoading) {
     return <div className="text-center p-8 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 rounded-lg max-w-2xl mx-auto">
        <h3 className="text-xl font-semibold text-red-800 dark:text-red-200">Fehler</h3>
        <p className="mt-2 text-red-600 dark:text-red-300">{error}</p>
        <button onClick={onExit} className="mt-4 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">Zurück zum Start</button>
      </div>;
  }

  return (
    <div className="flex flex-col md:flex-row w-full max-w-6xl mx-auto bg-white dark:bg-slate-800/50 rounded-lg shadow-lg overflow-hidden h-[calc(100vh-200px)]">
      <aside className="w-full md:w-1/3 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center">
            <button onClick={onExit} className="p-2 mr-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Zurück zum Start">
                <ArrowUturnLeftIcon className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">Fragenübersicht</h2>
        </div>
        <ul className="overflow-y-auto flex-grow">
          {questions.map((q, index) => {
            const status = questionStatuses[index] || 'not-started';
            
            const getStatusClasses = () => {
                switch(status) {
                    case 'in-progress':
                        return {
                            bg: `${theme['bg-primary-100_dark-900/50']}`,
                            text: `${theme['text-primary-800_dark-200']}`,
                            indicator: `${theme['bg-primary-500']}`
                        };
                    case 'completed':
                        return {
                            bg: 'bg-green-100 dark:bg-green-900/40',
                            text: 'text-green-800 dark:text-green-300',
                            indicator: 'bg-green-500'
                        };
                    default: // 'not-started'
                        return {
                            bg: 'hover:bg-slate-100 dark:hover:bg-slate-700/50',
                            text: '',
                            indicator: 'bg-slate-300 dark:bg-slate-600'
                        };
                }
            };
            const statusClasses = getStatusClasses();

            return (
                <li key={index}>
                  <button
                    onClick={() => handleSelectQuestion(index)}
                    disabled={isTutorLoading}
                    className={`w-full text-left p-4 text-sm transition-colors disabled:opacity-50 flex items-start gap-3 ${statusClasses.bg} ${statusClasses.text}`}
                  >
                    <div className="flex-shrink-0 pt-1.5">
                        <div className={`w-2 h-2 rounded-full ${statusClasses.indicator}`}></div>
                    </div>
                    <div className="flex-grow min-w-0">
                        <span className="font-semibold block">Frage {index + 1}</span>
                        <span className="text-slate-600 dark:text-slate-400 break-words">{q}</span>
                    </div>
                  </button>
                </li>
            );
          })}
        </ul>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <label htmlFor="progress-bar" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Fortschritt</label>
            <div id="progress-bar" className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                <div 
                    className={`${theme['bg-primary-600']} h-2.5 rounded-full transition-all duration-500`}
                    style={{ width: `${progress}%` }}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                ></div>
            </div>
            <p className="text-right text-xs text-slate-500 dark:text-slate-400 mt-1">
                {completedQuestions} / {questions.length} Fragen abgeschlossen
            </p>
        </div>
      </aside>

      <main className="w-full md:w-2/3 flex flex-col h-full">
        {selectedQuestionIndex === null ? (
            <div className="flex-grow flex items-center justify-center text-center p-8">
                <div className="flex flex-col items-center">
                    <ChatBubbleLeftRightIcon className="h-20 w-20 text-slate-300 dark:text-slate-600 mx-auto" />
                    <h3 className="mt-4 text-xl font-semibold text-slate-800 dark:text-slate-200">Wähle eine Frage zum Starten</h3>
                    <p className="mt-2 max-w-xs text-slate-500 dark:text-slate-400">Wähle links eine Aufgabe aus, um die geführte Lernsitzung mit deinem KI-Tutor zu beginnen.</p>
                </div>
            </div>
        ) : (
            <>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 pr-4">
                        {questions[selectedQuestionIndex]}
                    </h3>
                    <Button 
                        onClick={handleExportPdf} 
                        disabled={isExportingPdf || messages.length === 0}
                        variant="secondary"
                        size="sm"
                        leftIcon={isExportingPdf 
                            ? <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            : <DocumentArrowDownIcon className="h-4 w-4" />
                        }
                    >
                        Exportieren
                    </Button>
                </div>
                <div ref={chatContentRef} className="flex-grow p-4 space-y-4 overflow-y-auto bg-slate-50 dark:bg-slate-800">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && <div className={`flex-shrink-0 w-8 h-8 rounded-full ${theme['bg-primary-500']} flex items-center justify-center text-white font-bold text-sm`}>AI</div>}
                            <div className={`p-3 rounded-2xl max-w-lg ${msg.role === 'user' ? `${theme['bg-primary-600']} text-white rounded-br-none` : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                                <MarkdownRenderer content={msg.text} />
                            </div>
                        </div>
                    ))}
                     {isTutorLoading && (
                        <div className="flex items-end gap-2 justify-start">
                             <div className={`flex-shrink-0 w-8 h-8 rounded-full ${theme['bg-primary-500']} flex items-center justify-center text-white font-bold text-sm`}>AI</div>
                            <div className="p-3 rounded-2xl bg-slate-200 dark:bg-slate-700">
                                <div className="flex items-center space-x-1">
                                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce delay-0"></span>
                                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce delay-300"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
                    <form onSubmit={handleSendMessage} className="relative">
                        <textarea 
                            value={userInput}
                            onChange={e => setUserInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }}}
                            placeholder="Stelle eine Frage oder gib deine Antwort ein..."
                            disabled={isTutorLoading}
                            className={`w-full p-3 pr-12 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 ${theme['focus:ring-primary-500']} ${theme['border-primary-500']} transition-colors bg-white dark:bg-slate-900`}
                            rows={2}
                        />
                        <button type="submit" disabled={isTutorLoading || !userInput.trim()} className={`absolute top-1/2 right-3 -translate-y-1/2 p-2 rounded-full text-slate-500 ${theme['hover:bg-primary-100_dark-800']} ${theme['hover:text-primary-600_dark-300']} disabled:cursor-not-allowed disabled:opacity-50`}>
                            <SendIcon className="w-5 h-5"/>
                        </button>
                    </form>
                    {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
                </div>
            </>
        )}
      </main>
    </div>
  );
};