import React, { useEffect, useState } from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from './icons';

interface NotificationProps {
  message: string | null;
  onDismiss: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        handleDismiss();
      }, 8000); // Automatically dismiss after 8 seconds

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [message]);
  
  const handleDismiss = () => {
    setIsVisible(false);
    // Allow animation to finish before calling onDismiss
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  if (!message) return null;

  return (
    <div 
        role="alert"
        aria-live="assertive"
        className={`fixed top-5 right-5 z-50 w-full max-w-sm rounded-lg bg-yellow-50 dark:bg-yellow-900/80 p-4 shadow-lg ring-1 ring-black ring-opacity-5 backdrop-blur-sm transition-all duration-300 ease-in-out ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 dark:text-yellow-300" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{message}</p>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex rounded-md bg-yellow-50 dark:bg-transparent p-1.5 text-yellow-500 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50"
            >
              <span className="sr-only">Schließen</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
