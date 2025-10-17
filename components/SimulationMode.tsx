import React, { useState, useEffect, useRef } from 'react';
import type { Chat } from '@google/genai';
import { startCoopChat, getAIOpponentAnswer, judgeAnswers } from '../services/geminiService';
import type { ChatMessage, ModelName, SimulationModeType, JudgedRound } from '../types';
import { ArrowUturnLeftIcon, SendIcon, BrainCircuitIcon, UsersIcon, SparklesIcon } from './icons';
import { useTheme } from '../contexts/ThemeContext';
import { MarkdownRenderer } from './MarkdownRenderer';

interface SimulationModeProps {
// FIX: Changed from scriptFile: File to scriptFiles: File[] to accept multiple script files.
  scriptFiles: File[];
  practiceFile: File;
  questions: string[];
  model: ModelName;
  mode: SimulationModeType;
  onExit: () => void;
}

type QuestionStatus = 'not-started' | 'in-progress' | 'completed';

export const SimulationMode: React.FC<SimulationModeProps> = ({ scriptFiles, practiceFile, questions, model, mode, onExit }) => {
  const { theme } = useTheme();
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRoundOver, setIsRoundOver] = useState(false);
  const [currentRoundResult, setCurrentRoundResult] = useState<JudgedRound | null>(null);
  const [questionStatuses, setQuestionStatuses] = useState<Record<number, QuestionStatus>>({});

  // VS Mode State
  const [userScore, setUserScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isJudging, setIsJudging] = useState(false);
  
  // Coop Mode State
  const coopChatRef = useRef<Chat | null>(null);
  const [coopMessages, setCoopMessages] = useState<ChatMessage[]>([]);
  const [isCoopLoading, setIsCoopLoading] = useState(false);
  const coopMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialStatuses: Record<number, QuestionStatus> = {};
    questions.forEach((_, i) => {
        initialStatuses[i] = i === 0 ? 'in-progress' : 'not-started';
    });
    setQuestionStatuses(initialStatuses);
    
    const initialize = async () => {
        if (mode === 'coop') {
            try {
// FIX: Pass scriptFiles array to startCoopChat instead of a single file.
                const chat = await startCoopChat(scriptFiles, practiceFile, model);
                coopChatRef.current = chat;
                const initialMsg: ChatMessage = { role: 'system', text: `Lasst uns mit der ersten Frage anfangen: "${questions[0]}" Was sind deine ersten Gedanken dazu?` };
                setCoopMessages([initialMsg]);
            } catch (err: any) {
                setError(err.message || "Der Ko-op-Chat konnte nicht gestartet werden.");
            }
        }
        setIsInitializing(false);
    };
    initialize();
  }, [mode, scriptFiles, practiceFile, model, questions]);

  useEffect(() => {
    coopMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [coopMessages]);

  const handleVsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;
    setIsJudging(true);
    setError(null);
    try {
        const currentQuestion = questions[currentQuestionIndex];
// FIX: Pass scriptFiles array to getAIOpponentAnswer instead of a single file.
        const aiOpponentAnswer = await getAIOpponentAnswer(scriptFiles, currentQuestion, model);
// FIX: Pass scriptFiles array to judgeAnswers instead of a single file.
        const result = await judgeAnswers(scriptFiles, currentQuestion, userAnswer, aiOpponentAnswer, model);
        setCurrentRoundResult(result);
        setUserScore(prev => prev + result.userScore);
        setAiScore(prev => prev + result.aiScore);
        setIsRoundOver(true);
    } catch(err: any) {
        setError(err.message || "Die Runde konnte nicht ausgewertet werden.");
    } finally {
        setIsJudging(false);
    }
  };
  
  const handleNextQuestion = () => {
      const nextIndex = currentQuestionIndex + 1;
      
      setQuestionStatuses(prev => ({
          ...prev,
          [currentQuestionIndex]: 'completed'
      }));

      if (nextIndex < questions.length) {
          setQuestionStatuses(prev => ({
              ...prev,
              [nextIndex]: 'in-progress'
          }));
          setCurrentQuestionIndex(nextIndex);
          setIsRoundOver(false);
          setCurrentRoundResult(null);
          setUserAnswer('');
          setError(null);
          if (mode === 'coop') {
              const nextQuestionMsg: ChatMessage = { role: 'system', text: `Okay, nächste Frage: "${questions[nextIndex]}" Wie gehen wir hier vor?` };
              setCoopMessages(prev => [...prev, nextQuestionMsg]);
          }
      } else {
        // No more questions, simulation ends
        // Keep the UI on the last result screen until user exits
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

  const completedQuestions = Object.values(questionStatuses).filter(s => s === 'completed').length;
  const progress = questions.length > 0 ? (completedQuestions / questions.length) * 100 : 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const renderVsMode = () => (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">{questions[currentQuestionIndex]}</h3>
        </div>
        <div className="flex-grow p-6 overflow-y-auto bg-slate-50 dark:bg-slate-800">
            {isRoundOver && currentRoundResult ? (
                <div className="space-y-6 animate-fade-in">
                    <div><h4 className="font-bold mb-2 text-slate-700 dark:text-slate-300">Deine Antwort ({currentRoundResult.userScore} Pkt.)</h4><div className={`p-3 rounded-md ${theme['bg-primary-50_dark-900/30']}`}><MarkdownRenderer content={currentRoundResult.userAnswer} className="prose-sm" /></div></div>
                    <div><h4 className="font-bold mb-2 text-slate-700 dark:text-slate-300">KI-Antwort ({currentRoundResult.aiScore} Pkt.)</h4><div className="p-3 rounded-md bg-rose-50 dark:bg-rose-900/30"><MarkdownRenderer content={currentRoundResult.aiAnswer} className="prose-sm" /></div></div>
                    <div><h4 className="font-bold mb-2 text-slate-700 dark:text-slate-300">Urteil des Professors</h4><div className="p-3 rounded-md bg-slate-100 dark:bg-slate-700 italic"><MarkdownRenderer content={currentRoundResult.judgment} className="prose-sm" /></div></div>
                </div>
            ) : (
                <form onSubmit={handleVsSubmit}>
                    <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)} placeholder="Deine Antwort hier..." className={`w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 ${theme['focus:ring-primary-500']} h-48 bg-white dark:bg-slate-900`} required />
                </form>
            )}
            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
             {isRoundOver ? (
                 <button onClick={handleNextQuestion} disabled={isLastQuestion && isRoundOver} className={`w-full px-6 py-2 ${theme['bg-primary-600']} text-white font-semibold rounded-lg shadow-md ${theme['hover:bg-primary-700']} disabled:bg-slate-400`}>
                     {isLastQuestion ? 'Simulation beendet' : 'Nächste Frage'}
                 </button>
             ) : (
                 <button onClick={handleVsSubmit} disabled={isJudging || !userAnswer.trim()} className={`w-full px-6 py-2 ${theme['bg-primary-600']} text-white font-semibold rounded-lg shadow-md ${theme['hover:bg-primary-700']} disabled:bg-slate-400`}>
                     {isJudging ? 'Bewerte...' : 'Antwort einloggen & bewerten lassen'}
                 </button>
             )}
        </div>
    </div>
  );

 const renderCoopMode = () => (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">{questions[currentQuestionIndex]}</h3>
             <button onClick={handleNextQuestion} disabled={isLastQuestion} className="px-3 py-1 text-sm bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50">Nächste &rarr;</button>
        </div>
        <div ref={coopMessagesEndRef} className="flex-grow p-4 space-y-4 overflow-y-auto bg-slate-50 dark:bg-slate-800">
            {coopMessages.map((msg, index) => (
                msg.role === 'system' ? 
                <div key={index} className="w-full text-center text-xs text-slate-500 dark:text-slate-400 py-2"><p className="max-w-md mx-auto">{msg.text}</p></div>
                :
                <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">P</div>}
                    <div className={`p-3 rounded-2xl max-w-lg ${msg.role === 'user' ? `${theme['bg-primary-600']} text-white rounded-br-none` : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}><MarkdownRenderer content={msg.text} className="prose-sm" /></div>
                </div>
            ))}
            {isCoopLoading && <div className="flex items-end gap-2 justify-start"><div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">P</div><div className="p-3 rounded-2xl bg-slate-200 dark:bg-slate-700"><div className="flex items-center space-x-1"><span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span><span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce delay-150"></span><span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce delay-300"></span></div></div></div>}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
            <form onSubmit={handleCoopSendMessage} className="relative">
                <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCoopSendMessage(e); }}} placeholder="Deine Idee oder Frage..." disabled={isCoopLoading} className="w-full p-3 pr-12 border rounded-lg bg-white dark:bg-slate-900" rows={2}/>
                <button type="submit" disabled={isCoopLoading || !userAnswer.trim()} className={`absolute top-1/2 right-3 -translate-y-1/2 p-2 rounded-full text-slate-500 ${theme['hover:bg-primary-100_dark-800']} disabled:opacity-50`}><SendIcon className="w-5 h-5"/></button>
            </form>
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    </div>
 );

  return (
    <div className="flex flex-col md:flex-row w-full max-w-6xl mx-auto bg-white dark:bg-slate-800/50 rounded-lg shadow-lg overflow-hidden h-[calc(100vh-200px)]">
      <aside className="w-full md:w-1/3 border-r border-slate-200 dark:border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center">
                <button onClick={onExit} className="p-2 mr-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Zurück zum Start">
                    <ArrowUturnLeftIcon className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold">{mode === 'vs' ? 'VS-Match' : 'Co-op-Sitzung'}</h2>
              </div>
              {mode === 'vs' && (
                  <div className="text-xs font-bold text-right">
                      <span className={`${theme['text-primary-600_dark-400']}`}>DU: {userScore}</span>
                      <span className="mx-1 text-slate-400">/</span>
                      <span className="text-rose-600 dark:text-rose-400">KI: {aiScore}</span>
                  </div>
              )}
          </div>
          <ul className="overflow-y-auto flex-grow">
              {questions.map((q, index) => {
                  const status = questionStatuses[index] || 'not-started';
                  const statusClasses = (() => {
                      switch(status) {
                          case 'in-progress': return { bg: `${theme['bg-primary-100_dark-900/50']}`, indicator: `${theme['bg-primary-500']}` };
                          case 'completed': return { bg: 'bg-green-100 dark:bg-green-900/40', indicator: 'bg-green-500' };
                          default: return { bg: 'bg-transparent', indicator: 'bg-slate-300 dark:bg-slate-600' };
                      }
                  })();
                  return (
                      <li key={index} className={`p-4 text-sm flex items-start gap-3 border-b border-slate-200 dark:border-slate-700 ${statusClasses.bg}`}>
                          <div className="flex-shrink-0 pt-1.5"><div className={`w-2 h-2 rounded-full ${statusClasses.indicator}`}></div></div>
                          <div className="flex-grow"><span className="font-semibold block">Frage {index + 1}</span><span className="text-slate-600 dark:text-slate-400">{q}</span></div>
                      </li>
                  );
              })}
          </ul>
           <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <label htmlFor="progress-bar-sim" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Fortschritt</label>
            <div id="progress-bar-sim" className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                <div className={`${theme['bg-primary-600']} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-right text-xs text-slate-500 dark:text-slate-400 mt-1">{completedQuestions} / {questions.length} Fragen abgeschlossen</p>
        </div>
      </aside>

      <main className="w-full md:w-2/3 flex flex-col h-full">
        {isInitializing ? (
            <div className="flex-grow flex items-center justify-center text-center p-8">
                <div>
                    <BrainCircuitIcon className="h-16 w-16 text-slate-400 dark:text-slate-500 mx-auto animate-pulse" />
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Simulation wird vorbereitet...</p>
                </div>
            </div>
        ) : (
            mode === 'vs' ? renderVsMode() : renderCoopMode()
        )}
      </main>
    </div>
  );
};