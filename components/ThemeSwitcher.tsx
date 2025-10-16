import React from 'react';
import { useTheme, availableThemes, ThemeName } from '../contexts/ThemeContext';
import { CheckIcon } from './icons';

export const ThemeSwitcher: React.FC = () => {
  const { themeName, setThemeName } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      {Object.entries(availableThemes).map(([key, theme]) => (
        <button
          key={key}
          onClick={() => setThemeName(key as ThemeName)}
          className={`w-6 h-6 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 ${themeName === key ? 'ring-2 ring-slate-900 dark:ring-slate-200' : ''} ${theme.colorClass}`}
          aria-label={`Switch to ${theme.name} theme`}
        >
          {themeName === key && (
            <CheckIcon className="w-4 h-4 text-white mx-auto" />
          )}
        </button>
      ))}
    </div>
  );
};
