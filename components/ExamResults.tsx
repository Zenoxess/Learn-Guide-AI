import React, { useState, useEffect } from 'react';
import type { GradedAnswer, ModelName } from '../types';
import { AcademicCapIcon } from './icons';
import { useTheme } from '../contexts/ThemeContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import { getPersonalizedRecommendations } from '../services/geminiService';
import { PersonalizedFeedback } from './PersonalizedFeedback';
import { Button } from './Button';

interface ExamResultsProps {
  results: GradedAnswer[];
  onRetry: () => void;
  scriptFiles: File[];
  model: ModelName;
}

const ScoreDonutChart: React.FC<{ percentage: number }> = ({ percentage }) => {
    const { theme } = useTheme();
    const cleanPercentage = Math.round(percentage);
    const color = cleanPercentage >= 80 ? '#22c55e' : cleanPercentage >= 50 ? '#eab308' : '#ef4444';

    return (
        <div 
            className="relative inline-flex items-center justify-center rounded-full w-40 h-40 transition-all"
            style={{ background: `conic-gradient(${color} ${cleanPercentage}%, #e2e8f0 ${cleanPercentage}%)` }}
            role="progressbar"
            aria-valuenow={cleanPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div className="absolute w-[85%] h-[85%] bg-white dark:bg-slate-800/50 rounded-full flex items-center justify-center">
                 <span className="text-4xl font-bold text-slate-800 dark:text-slate-100">{cleanPercentage}<span className="text-2xl">%</span></span>
            </div>
        </div>
    );
};


export const ExamResults: React.FC<ExamResultsProps> = React.memo(({ results, onRetry, scriptFiles, model }) => {
  const { theme } = useTheme();
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);
  
  const correctAnswers = results.filter(r => r.isCorrect).length;
  const totalQuestions = results.length;
  const scorePercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  useEffect(() => {
    const incorrectAnswers = results.filter(r => !r.isCorrect);
    
    if (incorrectAnswers.length > 0 && scriptFiles.length > 0) {
      const fetchRecommendations = async () => {
        setIsFetchingFeedback(true);
        try {
          const recs = await getPersonalizedRecommendations(scriptFiles, incorrectAnswers, model);
          setRecommendations(recs);
        } catch (error) {
          console.error("Failed to get personalized recommendations:", error);
        } finally {
          setIsFetchingFeedback(false);
        }
      };
      
      fetchRecommendations();
    }
  }, [results, scriptFiles, model]);

  return (
    <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center">
                <AcademicCapIcon className={`h-8 w-8 mr-3 ${theme['text-primary-500']}`} />
                Prüfungsergebnisse
            </h2>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-lg p-6 mb-8 text-center">
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">Dein Ergebnis</h3>
             <div className="my-4">
                 <ScoreDonutChart percentage={scorePercentage} />
             </div>
            <p className="text-slate-800 dark:text-slate-100 font-semibold">{correctAnswers} von {totalQuestions} Fragen korrekt</p>
        </div>

        <div className="space-y-6">
            {results.map((result, index) => (
                <div key={index} className={`bg-white dark:bg-slate-800/50 rounded-lg shadow-md overflow-hidden border-l-4 ${result.isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                    <div className={`p-4 flex justify-between items-center ${result.isCorrect ? 'bg-green-100/50 dark:bg-green-900/30' : 'bg-red-100/50 dark:bg-red-900/30'}`}>
                        <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">Frage {index + 1}: {result.questionText}</h4>
                        <span className={`font-bold text-sm px-3 py-1 rounded-full ${result.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                            {result.isCorrect ? 'Korrekt' : 'Falsch'}
                        </span>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <h5 className="font-semibold text-slate-600 dark:text-slate-400 mb-1">Deine Antwort:</h5>
                            <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-700 dark:text-slate-300">
                               <MarkdownRenderer content={result.userAnswer || '(Keine Antwort gegeben)'} className="prose-sm" />
                            </blockquote>
                        </div>
                         <div>
                            <h5 className="font-semibold text-slate-600 dark:text-slate-400 mb-1">Musterlösung:</h5>
                             <div className="p-3 rounded-md bg-slate-100 dark:bg-slate-900/50">
                                <MarkdownRenderer content={result.suggestedAnswer} className="prose-sm" />
                             </div>
                        </div>
                        <div>
                            <h5 className="font-semibold text-slate-600 dark:text-slate-400 mb-1">Feedback:</h5>
                            <div className={`p-3 rounded-md ${theme['bg-primary-50_dark-900/30']}`}>
                                <MarkdownRenderer content={result.feedback} className="prose-sm" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
        
        <PersonalizedFeedback 
          isLoading={isFetchingFeedback}
          recommendations={recommendations}
        />

        <div className="mt-8 text-center">
             <Button onClick={onRetry} variant="primary">
                Neue Sitzung starten
            </Button>
        </div>
    </div>
  );
});
