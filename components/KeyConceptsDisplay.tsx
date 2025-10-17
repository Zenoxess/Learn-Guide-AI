import React from 'react';
import type { KeyConcept } from '../types';
import { BookOpenIcon, ArrowUturnLeftIcon } from './icons';
import { useTheme } from '../contexts/ThemeContext';

interface KeyConceptsDisplayProps {
  concepts: KeyConcept[];
  onReturn: () => void;
}

export const KeyConceptsDisplay: React.FC<KeyConceptsDisplayProps> = ({ concepts, onReturn }) => {
  const { theme } = useTheme();

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center mb-4 sm:mb-0">
          <BookOpenIcon className={`h-8 w-8 mr-3 ${theme['text-primary-500']}`} />
          Schlüsselkonzepte & Glossar
        </h2>
        <button onClick={onReturn} className="text-sm text-slate-600 dark:text-slate-400 hover:underline flex items-center">
          <ArrowUturnLeftIcon className="h-4 w-4 mr-1" />
          Neue Analyse starten
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-lg">
        <dl className="divide-y divide-slate-200 dark:divide-slate-700">
          {concepts.map((concept, index) => (
            <div key={index} className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
              <dt className={`text-md font-semibold ${theme['text-primary-700_dark-300']} md:col-span-1`}>
                {concept.term}
              </dt>
              <dd className="text-slate-700 dark:text-slate-300 md:col-span-3">
                {concept.definition}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};
