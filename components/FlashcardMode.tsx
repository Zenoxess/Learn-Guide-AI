import React, { useState } from 'react';
import type { Flashcard } from '../types';
import { ArrowUturnLeftIcon, RectangleStackIcon } from './icons';
import { useTheme } from '../contexts/ThemeContext';

interface FlashcardModeProps {
  flashcards: Flashcard[];
  onExit: () => void;
}

export const FlashcardMode: React.FC<FlashcardModeProps> = ({ flashcards, onExit }) => {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      // Timeout to allow the card to flip back before showing the next question
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
      }, 150);
    }
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
      </div>
      
      <div className="flex items-center justify-between mt-8">
        <button 
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`px-6 py-2 bg-slate-200 dark:bg-slate-700 font-semibold rounded-lg shadow-sm hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label="Vorherige Lernkarte"
        >
          Zurück
        </button>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400" aria-label={`Position ${currentIndex + 1} von ${flashcards.length}`}>
          Karte {currentIndex + 1} von {flashcards.length}
        </p>
        <button 
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          className={`px-6 py-2 ${theme['bg-primary-600']} text-white font-semibold rounded-lg shadow-md ${theme['hover:bg-primary-700']} disabled:bg-slate-400 disabled:cursor-not-allowed`}
          aria-label="Nächste Lernkarte"
        >
          Weiter
        </button>
      </div>
    </div>
  );
};
