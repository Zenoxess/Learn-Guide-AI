import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowPathIcon, SparklesIcon } from './icons';
import { Button } from './Button';

interface SessionPromptProps {
  onContinue: () => void;
  onNew: () => void;
}

export const SessionPrompt: React.FC<SessionPromptProps> = ({ onContinue, onNew }) => {
  const { theme } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-60 backdrop-blur-sm" aria-labelledby="session-prompt-title" role="dialog" aria-modal="true">
      <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
        <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${theme['bg-primary-100_dark-900/50']} sm:mx-0 sm:h-10 sm:w-10`}>
                <ArrowPathIcon className={`h-6 w-6 ${theme['text-primary-600_dark-400']}`} aria-hidden="true" />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 className="text-base font-semibold leading-6 text-slate-900 dark:text-slate-100" id="session-prompt-title">
                Gespeicherte Sitzung gefunden
              </h3>
              <div className="mt-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Möchten Sie mit Ihrer vorherigen Lernsitzung fortfahren oder eine neue starten?
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
          <Button
            onClick={onContinue}
            variant="primary"
            className="w-full sm:ml-3 sm:w-auto"
          >
            Fortsetzen
          </Button>
          <Button
            onClick={onNew}
            variant="secondary"
            className="mt-3 w-full sm:mt-0 sm:w-auto"
          >
            Neu starten
          </Button>
        </div>
      </div>
    </div>
  );
};