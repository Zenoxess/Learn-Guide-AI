import React, { useEffect, useState } from 'react';
import { ExclamationTriangleIcon, XMarkIcon, CheckCircleIcon } from './icons';
import type { NotificationType } from '../types';

interface NotificationProps {
  message: string | null;
  type: NotificationType;
  onDismiss: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, type, onDismiss }) => {
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

  const config = {
    warning: {
        Icon: ExclamationTriangleIcon,
        containerClasses: 'bg-yellow-50 dark:bg-yellow-900/80',
        iconClasses: 'text-yellow-400 dark:text-yellow-300',
        textClasses: 'text-yellow-800 dark:text-yellow-200',
        buttonClasses: 'bg-yellow-50 dark:bg-transparent text-yellow-500 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-800 focus:ring-yellow-600 focus:ring-offset-yellow-50',
    },
    success: {
        Icon: CheckCircleIcon,
        containerClasses: 'bg-green-50 dark:bg-green-900/80',
        iconClasses: 'text-green-400 dark:text-green-300',
        textClasses: 'text-green-800 dark:text-green-200',
        buttonClasses: 'bg-green-50 dark:bg-transparent text-green-500 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800 focus:ring-green-600 focus:ring-offset-green-50',
    }
  };

  const currentConfig = config[type] || config.warning;
  const { Icon, containerClasses, iconClasses, textClasses, buttonClasses } = currentConfig;

  if (!message) return null;

  return (
    <div 
        role="alert"
        aria-live="assertive"
        className={`fixed top-5 right-5 z-50 w-full max-w-sm rounded-lg p-4 shadow-lg ring-1 ring-black ring-opacity-5 backdrop-blur-sm transition-all duration-300 ease-in-out ${containerClasses} ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${iconClasses}`} aria-hidden="true" />
        </div>
        <div className="ml-3">
          <p className={`text-sm font-medium ${textClasses}`}>{message}</p>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={handleDismiss}
              className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonClasses}`}
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