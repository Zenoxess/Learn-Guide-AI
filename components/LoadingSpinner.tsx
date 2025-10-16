import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface LoadingSpinnerProps {
  progress: number;
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ progress, message: customMessage }) => {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const [subMessage, setSubMessage] = useState('');

  useEffect(() => {
    if (customMessage) {
      setMessage(customMessage);
      setSubMessage('Dies kann einen Moment dauern...');
      return;
    }

    if (progress < 40) {
      setMessage("Dokument wird verarbeitet...");
      setSubMessage("Struktur und Inhalt werden extrahiert.");
    } else if (progress < 100) {
      setMessage("KI generiert deinen Lern-Guide...");
      setSubMessage("Dieser Schritt kann etwas länger dauern, da die KI den Inhalt für dich aufbereitet.");
    } else {
      setMessage("Guide wird fertiggestellt...");
      setSubMessage("Fast geschafft!");
    }
  }, [progress, customMessage]);

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 w-full max-w-2xl mx-auto">
      <div className={`animate-spin rounded-full h-16 w-16 border-b-2 ${theme['border-primary-500']}`}></div>
      <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">{message}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subMessage || 'Dies kann einen Moment dauern...'}</p>

      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-6 shadow-inner">
        <div
          className={`${theme['bg-primary-600']} h-2.5 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        ></div>
      </div>
      <p className={`mt-2 text-sm font-medium ${theme['text-primary-600_dark-400']}`}>{Math.round(progress)}%</p>
    </div>
  );
};