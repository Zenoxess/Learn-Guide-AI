import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Chat } from '@google/genai';
import { startCoopChat, getAIOpponentAnswer, judgeAnswers } from '../services/geminiService';
import type { ChatMessage, ModelName, SimulationModeType, JudgedRound } from '../types';
import { ArrowUturnLeftIcon, SendIcon, BrainCircuitIcon, UsersIcon, SparklesIcon } from './icons';

const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  return markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br />');
};

const MarkdownRenderer: React.FC<{ content: string, className?: string }> = ({ content, className = '' }) => (
    <div className={`prose prose-sm prose-slate dark:prose-invert max-w-none ${className}`} dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />
);

interface SimulationModeProps {
  scriptFile: File;
  practiceFile: File;
  questions: string[];
  model: ModelName;
  mode: SimulationModeType;
  onExit: () => void;
}

// FIX: Add practiceFile to the component's destructured props.
export const SimulationMode: React.FC<SimulationModeProps> = ({ scriptFile, practiceFile, questions, model, mode, onExit }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRoundOver, setIsRoundOver] = useState(false);
  const [currentRoundResult, setCurrentRoundResult] = useState<JudgedRound | null>(null);
  
  // VS Mode State
  const [userScore, setUserScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');

  // Coop Mode State
  const coopChatRef = useRef<Chat | null>(null);
  const [coopMessages, setCoopMessages] = useState<ChatMessage[]>([]);
  const [isCoopLoading, setIsCoopLoading] = useState(false);
  const coopMessagesEndRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const initialize = async () => {
        if (mode === 'coop') {
            try {
                // For coop, we start one chat session for the entire duration
                const chat = await startCoopChat(scriptFile, practiceFile, model);
                coopChatRef.current = chat;
                const initialMsg: ChatMessage = { role: 'system', text: `Lasst uns mit der ersten Frage anfangen: "${questions[0]}" Was sind deine ersten Gedanken dazu?` };
                setCoopMessages([initialMsg]);
            } catch (err: any) {
                setError(err.message || "Der Ko-op-Chat konnte nicht gestartet werden.");
            }
        }
        setIsLoading(false);
    };
    initialize();
  }, [mode, scriptFile, practiceFile, model, questions]);

  useEffect(() => {
    coopMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [coopMessages]);

  const handleVsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
        const currentQuestion = questions[currentQuestionIndex];
        // 1. Get AI opponent's answer
        const aiOpponentAnswer = await getAIOpponentAnswer(scriptFile, currentQuestion, model);
        
        // 2. Judge both answers
        const result = await judgeAnswers(scriptFile, currentQuestion, userAnswer, aiOpponentAnswer, model);
        
        setCurrentRoundResult(result);
        setUserScore(prev => prev + result.userScore);
        setAiScore(prev => prev + result.aiScore);
        setIsRoundOver(true);

    } catch(err: any) {
        setError(err.message || "Die Runde konnte nicht ausgewertet werden.");
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleNextQuestion = () => {
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < questions.length) {
          setCurrentQuestionIndex(nextIndex);
          // Reset states for the new round
          setIsRoundOver(false);
          setCurrentRoundResult(null);
          setUserAnswer('');
          setError(null);
          if (mode === 'coop') {
              const nextQuestionMsg: ChatMessage = { role: 'system', text: `Okay, nächste Frage: "${questions[nextIndex]}" Wie gehen wir hier vor?` };
              setCoopMessages(prev => [...prev, nextQuestionMsg]);
          }
      } else {
          // End of simulation
          alert("Alle Fragen beantwortet! Endstand: Du " + userScore + " - KI " + aiScore);
          onExit();
      }
  };

  const handleCoopSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || isCoopLoading || !coopChatRef.current) return;

    const newMessages: ChatMessage[] = [...coopMessages, { role: 'user', text: userAnswer }];
    setCoopMessages(newMessages);
    const currentInput = userAnswer;
    setUserAnswer('');
    setIsCoopLoading(true);
    setError(null);

    try {
        const result = await coopChatRef.current.sendMessage({ message: currentInput });
        setCoopMessages(prev => [...prev, { role: 'model', text: result.text }]);
    } catch (err: any) {
        setError("Die Antwort des Partners konnte nicht geladen werden.");
        console.error(err);
    } finally {
        setIsCoopLoading(false);
    }
  };


  const renderVsMode = () => (
    <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center"><SparklesIcon className="h-6 w-6 mr-2 text-yellow-500" />Herausforderer (VS)</h2>
                <div className="text-lg font-bold">
                    <span className="text-indigo-600 dark:text-indigo-400">DU: {userScore}</span>
                    <span className="mx-2 text-slate-400">|</span>
                    <span className="text-rose-600 dark:text-rose-400">KI: {aiScore}</span>
                </div>
            </div>
            <p className="text-sm text-slate-500 mt-1">Frage {currentQuestionIndex + 1} von {questions.length}</p>
        </div>
        
        <div className="flex-grow p-6 overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">{questions[currentQuestionIndex]}</h3>
            {isRoundOver && currentRoundResult ? (
                // Round Result View
                <div className="space-y-6 animate-fade-in">
                    <div><h4 className="font-bold mb-2">Deine Antwort ({currentRoundResult.userScore} Pkt.)</h4><div className="p-3 rounded-md bg-indigo-50 dark:bg-indigo-900/30"><MarkdownRenderer content={currentRoundResult.userAnswer} /></div></div>
                    <div><h4 className="font-bold mb-2">KI-Antwort ({currentRoundResult.aiScore} Pkt.)</h4><div className="p-3 rounded-md bg-rose-50 dark:bg-rose-900/30"><MarkdownRenderer content={currentRoundResult.aiAnswer} /></div></div>
                    <div><h4 className="font-bold mb-2">Urteil des Professors</h4><div className="p-3 rounded-md bg-slate-100 dark:bg-slate-700 italic"><MarkdownRenderer content={currentRoundResult.judgment} /></div></div>
                    <button onClick={handleNextQuestion} className="w-full mt-4 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">
                        {currentQuestionIndex + 1 < questions.length ? 'Nächste Frage' : 'Simulation beenden'}
                    </button>
                </div>
            ) : (
                // Answering View
                <form onSubmit={handleVsSubmit}>
                    <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)} placeholder="Deine Antwort hier..." className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 h-48 bg-white dark:bg-slate-900" required />
                    <button type="submit" disabled={isLoading} className="w-full mt-4 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-400">
                        {isLoading ? 'Bewerte...' : 'Antwort einloggen & bewerten lassen'}
                    </button>
                </form>
            )}
            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </div>
    </div>
  );

 const renderCoopMode = () => (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center"><UsersIcon className="h-6 w-6 mr-2 text-green-500" />Studienpartner (Co-op)</h2>
             <button onClick={handleNextQuestion} className="px-3 py-1 text-sm bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Nächste Frage &rarr;</button>
        </div>

        <div className="flex-grow p-4 space-y-4 overflow-y-auto bg-slate-50 dark:bg-slate-800">
            {coopMessages.map((msg, index) => (
                <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">P</div>}
                    {msg.role === 'system' && <div className="w-full text-center text-xs text-slate-500 dark:text-slate-400 py-2"><p className="max-w-md mx-auto">{msg.text}</p></div>}
                    {msg.role !== 'system' && <div className={`p-3 rounded-2xl max-w-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}><MarkdownRenderer content={msg.text} /></div>}
                </div>
            ))}
            {isCoopLoading && <div className="flex items-end gap-2 justify-start"><div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">P</div><div className="p-3 rounded-2xl bg-slate-200 dark:bg-slate-700"><div className="flex items-center space-x-1"><span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span><span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce delay-150"></span><span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce delay-300"></span></div></div></div>}
            <div ref={coopMessagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
            <form onSubmit={handleCoopSendMessage} className="relative">
                <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCoopSendMessage(e); }}} placeholder="Deine Idee oder Frage..." disabled={isCoopLoading} className="w-full p-3 pr-12 border rounded-lg bg-white dark:bg-slate-900" rows={2}/>
                <button type="submit" disabled={isCoopLoading || !userAnswer.trim()} className="absolute top-1/2 right-3 -translate-y-1/2 p-2 rounded-full text-slate-500 hover:bg-indigo-100 disabled:opacity-50"><SendIcon className="w-5 h-5"/></button>
            </form>
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    </div>
 );


  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-800/50 rounded-lg shadow-lg h-[calc(100vh-200px)] flex flex-col">
       <button onClick={onExit} className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 z-10" aria-label="Simulation beenden"><ArrowUturnLeftIcon className="w-5 h-5" /></button>
       {isLoading ? (
           <div className="flex-grow flex items-center justify-center"><BrainCircuitIcon className="h-16 w-16 text-slate-400 animate-pulse" /><p className="ml-4 text-lg">Simulation wird geladen...</p></div>
       ) : (
           mode === 'vs' ? renderVsMode() : renderCoopMode()
       )}
    </div>
  );
};
