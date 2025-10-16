import React from 'react';
import type { GradedAnswer } from '../types';
import { AcademicCapIcon, CheckIcon } from './icons';

// Helper to convert simple markdown to HTML for safe rendering
const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  return markdown
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
};

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => (
    <div 
        className="prose prose-sm prose-slate dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} 
    />
);

interface ExamResultsProps {
  results: GradedAnswer[];
  onRetry: () => void;
}

export const ExamResults: React.FC<ExamResultsProps> = ({ results, onRetry }) => {
  const correctAnswers = results.filter(r => r.isCorrect).length;
  const totalQuestions = results.length;
  const scorePercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  let scoreColor = 'text-red-500';
  if (scorePercentage >= 80) {
    scoreColor = 'text-green-500';
  } else if (scorePercentage >= 50) {
    scoreColor = 'text-yellow-500';
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center">
                <AcademicCapIcon className="h-8 w-8 mr-3 text-indigo-500" />
                Prüfungsergebnisse
            </h2>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-lg p-6 mb-8 text-center">
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">Dein Ergebnis</h3>
            <p className={`text-6xl font-bold my-2 ${scoreColor}`}>{Math.round(scorePercentage)}%</p>
            <p className="text-slate-800 dark:text-slate-100 font-semibold">{correctAnswers} von {totalQuestions} Fragen korrekt</p>
        </div>

        <div className="space-y-6">
            {results.map((result, index) => (
                <div key={index} className="bg-white dark:bg-slate-800/50 rounded-lg shadow-md overflow-hidden">
                    <div className={`p-4 flex justify-between items-center ${result.isCorrect ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                        <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">Frage {index + 1}: {result.questionText}</h4>
                        <span className={`font-bold text-sm px-3 py-1 rounded-full ${result.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                            {result.isCorrect ? 'Korrekt' : 'Falsch'}
                        </span>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <h5 className="font-semibold text-slate-600 dark:text-slate-400 mb-1">Deine Antwort:</h5>
                            <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-700 dark:text-slate-300">
                               <MarkdownRenderer content={result.userAnswer || '(Keine Antwort gegeben)'} />
                            </blockquote>
                        </div>
                         <div>
                            <h5 className="font-semibold text-slate-600 dark:text-slate-400 mb-1">Musterlösung:</h5>
                             <div className="p-3 rounded-md bg-slate-100 dark:bg-slate-900/50">
                                <MarkdownRenderer content={result.suggestedAnswer} />
                             </div>
                        </div>
                        <div>
                            <h5 className="font-semibold text-slate-600 dark:text-slate-400 mb-1">Feedback:</h5>
                            <div className="p-3 rounded-md bg-indigo-50 dark:bg-indigo-900/30">
                                <MarkdownRenderer content={result.feedback} />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
        
        <div className="mt-8 text-center">
             <button
                onClick={onRetry}
                className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"
            >
                Neue Sitzung starten
            </button>
        </div>
    </div>
  );
};