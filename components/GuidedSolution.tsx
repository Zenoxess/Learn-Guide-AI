import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Chat } from '@google/genai';
import { startTutorChat } from '../services/geminiService';
import type { ChatMessage, ModelName } from '../types';
import { ArrowUturnLeftIcon, SendIcon, BrainCircuitIcon } from './icons';

const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  return markdown
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
};

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => (
    <div 
        className="prose prose-slate dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} 
    />
);

interface GuidedSolutionProps {
  scriptFile: File;
  practiceFile: File;
  questions: string[];
  model: ModelName;
  onExit: () => void;
}

export const GuidedSolution: React.FC<GuidedSolutionProps> = ({ scriptFile, practiceFile, questions, model, onExit }) => {
  const chatRef = useRef<Chat | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const chat = await startTutorChat(scriptFile, practiceFile, model);
        chatRef.current = chat;
      } catch (err: any) {
        setError(err.message || "Der Chat mit dem Tutor konnte nicht gestartet werden.");
      } finally {
        setIsInitializing(false);
      }
    };
    initializeChat();
  }, [scriptFile, practiceFile, model]);

  const handleSelectQuestion = useCallback(async (index: number) => {
    if (isTutorLoading || !chatRef.current) return;
    
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
  }, [questions, isTutorLoading]);

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

  if (isInitializing) {
    return <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
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
          {questions.map((q, index) => (
            <li key={index}>
              <button
                onClick={() => handleSelectQuestion(index)}
                disabled={isTutorLoading}
                className={`w-full text-left p-4 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50 ${selectedQuestionIndex === index ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200' : ''}`}
              >
                <span className="font-semibold block">Frage {index + 1}</span>
                <span className="text-slate-600 dark:text-slate-400">{q.substring(0, 80)}{q.length > 80 ? '...' : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="w-full md:w-2/3 flex flex-col h-full">
        {selectedQuestionIndex === null ? (
            <div className="flex-grow flex items-center justify-center text-center p-8">
                <div>
                    <BrainCircuitIcon className="h-16 w-16 text-slate-400 dark:text-slate-500 mx-auto" />
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Wähle links eine Frage aus, um mit deinem persönlichen Tutor zu beginnen.</p>
                </div>
            </div>
        ) : (
            <>
                <div className="flex-grow p-4 space-y-4 overflow-y-auto bg-slate-50 dark:bg-slate-800">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">AI</div>}
                            <div className={`p-3 rounded-2xl max-w-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                                <MarkdownRenderer content={msg.text} />
                            </div>
                        </div>
                    ))}
                     {isTutorLoading && (
                        <div className="flex items-end gap-2 justify-start">
                             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">AI</div>
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
                            className="w-full p-3 pr-12 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white dark:bg-slate-900"
                            rows={2}
                        />
                        <button type="submit" disabled={isTutorLoading || !userInput.trim()} className="absolute top-1/2 right-3 -translate-y-1/2 p-2 rounded-full text-slate-500 hover:bg-indigo-100 dark:hover:bg-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-50">
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
