import React, { createContext, useState, useMemo, useContext, useEffect, ReactNode } from 'react';

const THEME_KEY = 'lernGuideAppTheme';

const generateThemeClasses = (color: string) => ({
    // Backgrounds
    'bg-primary-50_dark-900/30': `bg-${color}-50 dark:bg-${color}-900/30`,
    'bg-primary-50_dark-900/40': `bg-${color}-50 dark:bg-${color}-900/40`,
    'bg-primary-50_dark-900/50': `bg-${color}-50 dark:bg-${color}-900/50`,
    'bg-primary-100_dark-900/50': `bg-${color}-100 dark:bg-${color}-900/50`,
    'bg-primary-500': `bg-${color}-500`,
    'bg-primary-600': `bg-${color}-600`,

    // Hover Backgrounds
    'hover:bg-primary-100_dark-800': `hover:bg-${color}-100 dark:hover:bg-${color}-800`,
    'hover:bg-primary-700': `hover:bg-${color}-700`,

    // Text
    'text-primary-400_dark-500': `text-${color}-400 dark:text-${color}-500`,
    'text-primary-500': `text-${color}-500`,
    'text-primary-600_dark-400': `text-${color}-600 dark:text-${color}-400`,
    'text-primary-700_dark-300': `text-${color}-700 dark:text-${color}-300`,
    'text-primary-800_dark-200': `text-${color}-800 dark:text-${color}-200`,
    'hover:text-primary-600_dark-300': `hover:text-${color}-600 dark:hover:text-${color}-300`,

    // Borders
    'border-primary-300_dark-600': `border-${color}-300 dark:border-${color}-600`,
    'border-primary-500': `border-${color}-500`,
    'hover:border-primary-400_dark-500': `hover:border-${color}-400 dark:hover:border-${color}-500`,
    
    // Rings (Focus)
    'focus:ring-primary-300_dark-800': `focus:ring-${color}-300 dark:focus:ring-${color}-800`,
    'focus:ring-primary-400': `focus:ring-${color}-400`,
    'focus:ring-primary-500': `focus:ring-${color}-500`,

    // Prose (Markdown) Theming
    'prose-headings': `prose-headings:text-${color}-700 dark:prose-headings:text-${color}-300`,
    'prose-strong': `prose-strong:text-${color}-600 dark:prose-strong:text-${color}-400`,
    'prose-a': `prose-a:text-${color}-600 hover:prose-a:text-${color}-700 dark:prose-a:text-${color}-400 dark:hover:prose-a:text-${color}-300`,
    'prose-blockquote': `prose-blockquote:border-${color}-300 dark:prose-blockquote:border-${color}-700`,
    'prose-hr': `prose-hr:border-${color}-200 dark:prose-hr:border-${color}-700`,
    'prose-li-marker': `prose-li:marker:text-${color}-500 dark:prose-li:marker:text-${color}-400`,
});

export const availableThemes = {
  indigo: { name: 'Indigo', classes: generateThemeClasses('indigo'), colorClass: 'bg-indigo-500' },
  sky: { name: 'Sky', classes: generateThemeClasses('sky'), colorClass: 'bg-sky-500' },
  rose: { name: 'Rose', classes: generateThemeClasses('rose'), colorClass: 'bg-rose-500' },
  teal: { name: 'Teal', classes: generateThemeClasses('teal'), colorClass: 'bg-teal-500' },
};

export type ThemeName = keyof typeof availableThemes;
type ThemeClasses = ReturnType<typeof generateThemeClasses>;

interface ThemeContextType {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  theme: ThemeClasses;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    try {
      const savedTheme = window.localStorage.getItem(THEME_KEY);
      return savedTheme && savedTheme in availableThemes ? (savedTheme as ThemeName) : 'indigo';
    } catch {
      return 'indigo';
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_KEY, themeName);
    } catch (e) {
      console.error('Failed to save theme to local storage.', e);
    }
  }, [themeName]);

  const value = useMemo(() => ({
    themeName,
    setThemeName,
    theme: availableThemes[themeName].classes,
  }), [themeName]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};