import React from 'react';
import { SparklesIcon } from './icons';
import { useTheme } from '../contexts/ThemeContext';
import { MarkdownRenderer } from './MarkdownRenderer';

interface PersonalizedFeedbackProps {
  recommendations: string | null;
  isLoading: boolean;
}

export const PersonalizedFeedback: React.FC<PersonalizedFeedbackProps> = ({ recommendations, isLoading }) => {
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <div className="mt-8 text-center p-6 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-600 dark:text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="text-slate-600 dark:text-slate-300 font-semibold">Analysiere deine Ergebnisse für personalisierte Tipps...</p>
        </div>
      </div>
    );
  }

  if (!recommendations) {
    return null;
  }

  return (
    <div className={`mt-8 p-6 rounded-lg shadow-md ${theme['bg-primary-50_dark-900/40']} border ${theme['border-primary-500']}`}>
      <h3 className={`flex items-center text-xl font-bold ${theme['text-primary-700_dark-300']} mb-4`}>
        <SparklesIcon className="h-6 w-6 mr-2" />
        Dein personalisierter Lern-Fokus
      </h3>
      <MarkdownRenderer content={recommendations} />
    </div>
  );
};
