import React, { useState } from 'react';
import type { ExamQuestion, ExamAnswer } from '../types';
import { ArrowUturnLeftIcon, AcademicCapIcon } from './icons';
import { useTheme } from '../contexts/ThemeContext';

interface ExamModeProps {
  questions: ExamQuestion[];
  onSubmit: (answers: ExamAnswer[]) => void;
  onExit: () => void;
}

export const ExamMode: React.FC<ExamModeProps> = ({ questions, onSubmit, onExit }) => {
  const { theme } = useTheme();
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initialState: Record<string, string> = {};
    questions.forEach(q => {
      initialState[q.id] = '';
    });
    return initialState;
  });

  const handleAnswerChange = (questionId: string, text: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: text }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedAnswers: ExamAnswer[] = questions.map(q => ({
      questionId: q.id,
      answerText: answers[q.id] || '',
    }));
    onSubmit(formattedAnswers);
  };
  
  const allAnswered = questions.every(q => (answers[q.id] || '').trim() !== '');

  return (
    <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                <AcademicCapIcon className={`h-8 w-8 mr-3 ${theme['text-primary-500']}`} />
                Prüfungsmodus
            </h2>
            <button onClick={onExit} className="text-sm text-slate-600 dark:text-slate-400 hover:underline flex items-center">
                 <ArrowUturnLeftIcon className="h-4 w-4 mr-1" />
                Abbrechen und zurück
            </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800/50 rounded-lg shadow-lg p-8 space-y-8">
            {questions.map((q, index) => (
                <div key={q.id} className="border-b border-slate-200 dark:border-slate-700 pb-8">
                    <label htmlFor={`question-${q.id}`} className="block text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
                        Frage {index + 1}: <span className="font-normal">{q.questionText}</span>
                    </label>
                    <textarea
                        id={`question-${q.id}`}
                        value={answers[q.id]}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Deine Antwort hier..."
                        className={`w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 ${theme['focus:ring-primary-500']} ${theme['border-primary-500']} transition-colors bg-slate-50 dark:bg-slate-900`}
                        rows={5}
                        required
                    />
                </div>
            ))}
            
            <div className="text-center pt-4">
                 <button 
                    type="submit"
                    disabled={!allAnswered}
                    className={`w-full sm:w-auto px-12 py-3 ${theme['bg-primary-600']} text-white font-bold text-lg rounded-lg shadow-lg ${theme['hover:bg-primary-700']} focus:outline-none focus:ring-2 ${theme['focus:ring-primary-400']} focus:ring-opacity-75 transition-all transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:transform-none`}
                 >
                    Prüfung abgeben und bewerten lassen
                </button>
                {!allAnswered && (
                    <p className="text-xs text-slate-500 mt-2">Bitte beantworte alle Fragen, bevor du die Prüfung abgibst.</p>
                )}
            </div>
        </form>
    </div>
  );
};