import React, { useState } from 'react';
import type { Flashcard } from '../types';
import { ArrowUturnLeftIcon, RectangleStackIcon, CheckIcon, XMarkIcon, ArrowPathIcon } from './icons';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './Button';

interface FlashcardModeProps {
  flashcards: Flashcard[];
  onExit: () => void;
}

export const FlashcardMode: React.FC<FlashcardModeProps> = ({ flashcards, onExit }) => {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());
  const [showSummary, setShowSummary] = useState(false);

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    } else {
      setShowSummary(true);
    }
  };

  const handleAnswer = (wasKnown: boolean) => {
    if (wasKnown) {
        setKnownCards(prev => new Set(prev).add(currentIndex));
    }
    handleNext();
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setShowSummary(false);
  };

  const currentCard = flashcards[currentIndex];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col" style={{ minHeight: '60vh' }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
          <RectangleStackIcon className={`h-8 w-8 mr-3 ${theme['text-primary-500']}`} />
          Lernkarten
        </h2>
        <button onClick={onExit} className="text-sm text-slate-600 dark:text-slate-400 hover:underline flex items-center">
          <ArrowUturnLeftIcon className="h-4 w-4 mr-1" />
          Modus verlassen
        </button>
      </div>

      <div className="flex-grow flex items-center justify-center p-4" style={{ perspective: '1000px' }}>
        {showSummary ? (
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full animate-fade-in">
                <CheckIcon className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Super!</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">Du hast {knownCards.size} von {flashcards.length} Karten auf Anhieb gewusst.</p>
                <div className="mt-6">
                    <Button 
                        onClick={handleRestart}
                        variant="primary"
                        leftIcon={<ArrowPathIcon className="h-5 w-5" />}
                    >
                        Nochmal üben
                    </Button>
                </div>
            </div>
        ) : (
            <div 
            className="w-full h-80 relative transition-transform duration-500 cursor-pointer" 
            style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            onClick={() => setIsFlipped(!isFlipped)}
            aria-live="polite"
            >
            {/* Front of the card (Question) */}
            <div className="absolute w-full h-full p-6 flex flex-col justify-center items-center text-center bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700" style={{ backfaceVisibility: 'hidden' }}>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Frage</p>
                <p className="text-xl font-semibold text-slate-800 dark:text-slate-200">{currentCard.question}</p>
                <p className="absolute bottom-4 text-xs text-slate-400">Klicken zum Umdrehen</p>
            </div>
            {/* Back of the card (Answer) */}
            <div className={`absolute w-full h-full p-6 flex flex-col justify-center items-center text-center ${theme['bg-primary-50_dark-900/40']} rounded-lg shadow-xl border ${theme['border-primary-500']}`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <p className={`text-xs ${theme['text-primary-600_dark-400']} mb-4`}>Antwort</p>
                <p className="text-lg text-slate-800 dark:text-slate-200">{currentCard.answer}</p>
                <p className="absolute bottom-4 text-xs text-slate-400">Klicken zum Umdrehen</p>
            </div>
            </div>
        )}
      </div>
      
      {!showSummary && (
        <div className="flex flex-col items-center justify-center mt-8">
            <div className={`flex items-center justify-center gap-4 transition-opacity duration-300 ${!isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <button
                    onClick={() => handleAnswer(false)}
                    className="flex flex-col items-center justify-center w-28 h-20 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-semibold rounded-lg shadow-sm hover:bg-red-200 dark:hover:bg-red-900 transition-colors transform hover:scale-105"
                    aria-label="Nicht gewusst"
                >
                    <XMarkIcon className="h-6 w-6 mb-1" />
                    Nicht gewusst
                </button>
                 <button
                    onClick={() => handleAnswer(true)}
                    className="flex flex-col items-center justify-center w-28 h-20 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 font-semibold rounded-lg shadow-sm hover:bg-green-200 dark:hover:bg-green-900 transition-colors transform hover:scale-105"
                    aria-label="Gewusst"
                >
                    <CheckIcon className="h-6 w-6 mb-1" />
                    Gewusst
                </button>
            </div>
             <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-4" aria-label={`Position ${currentIndex + 1} von ${flashcards.length}`}>
                Karte {currentIndex + 1} von {flashcards.length}
            </p>
        </div>
      )}
    </div>
  );
};