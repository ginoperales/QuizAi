import React, { useState, useEffect } from 'react';
import { Question, CompletedQuiz, ActiveQuiz, Language } from '../types';
import { decodeHtml } from '../services/fileService';
import { SpeakerWaveIcon, StopCircleIcon } from './icons';

interface FlashcardsViewProps {
  quiz: CompletedQuiz | ActiveQuiz;
  onGoBack: () => void;
  t: (key: any, options?: any) => string;
  language?: Language;
  autoReadAloud?: boolean;
}

const FlashcardsView: React.FC<FlashcardsViewProps> = ({ quiz, onGoBack, t, language = 'es', autoReadAloud = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const questions = quiz.questions;
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    // Reset flip state when card changes
    setIsFlipped(false);
  }, [currentIndex]);

  // Auto-read question text when card changes and autoReadAloud is on
  useEffect(() => {
    if (autoReadAloud && currentQuestion && !isFlipped) {
      const timer = setTimeout(() => {
        speakText(decodeHtml(currentQuestion.questionText));
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, autoReadAloud]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'en' ? 'en-US' : 'es-ES';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    if (!isFlipped) {
      speakText(decodeHtml(currentQuestion.questionText));
    } else {
      const answerText = decodeHtml(currentQuestion.options[currentQuestion.correctAnswerIndex]);
      const justText = currentQuestion.justification ? ` ${decodeHtml(currentQuestion.justification)}` : '';
      speakText(answerText + justText);
    }
  };

  const navigate = (direction: 'next' | 'prev') => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setAnimationClass('animate-fade-out-quick');
    setTimeout(() => {
        if (direction === 'next') {
            setCurrentIndex((prev) => (prev + 1) % questions.length);
        } else {
            setCurrentIndex((prev) => (prev - 1 + questions.length) % questions.length);
        }
        setAnimationClass('animate-fade-in-quick');
    }, 150);
  };
  
  const handleFlip = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center">
        <style>{`
            .perspective { perspective: 1000px; }
            .card {
                transform-style: preserve-3d;
                transition: transform 0.6s;
            }
            .card.is-flipped {
                transform: rotateY(180deg);
            }
            .card-face {
                -webkit-backface-visibility: hidden;
                backface-visibility: hidden;
                position: absolute;
                width: 100%;
                height: 100%;
            }
            .card-back {
                transform: rotateY(180deg);
            }
            @keyframes fade-in-quick { 0% { opacity: 0; } 100% { opacity: 1; } }
            @keyframes fade-out-quick { 0% { opacity: 1; } 100% { opacity: 0; } }
            .animate-fade-in-quick { animation: fade-in-quick 0.15s ease-in-out forwards; }
            .animate-fade-out-quick { animation: fade-out-quick 0.15s ease-in-out forwards; }
        `}</style>
      <div className="w-full flex justify-between items-center mb-4">
        <button onClick={onGoBack} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors">
          {t('goBack')}
        </button>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('flashcards')}</h2>
        <div className="flex items-center gap-3">
          {/* TTS Speaker Button */}
          <button
            onClick={handleSpeak}
            className={`p-2 rounded-full transition-all ${isSpeaking ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse' : 'text-gray-400 hover:text-[rgb(var(--primary-500))] hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title={isSpeaking ? t('stopReading') : t('readAloud')}
          >
            {isSpeaking ? <StopCircleIcon /> : <SpeakerWaveIcon />}
          </button>
          <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('cardOf', { current: currentIndex + 1, total: questions.length })}
          </div>
        </div>
      </div>

      <div className={`w-full h-96 relative perspective ${animationClass}`}>
        <div className={`card w-full h-full ${isFlipped ? 'is-flipped' : ''}`} onClick={handleFlip}>
          {/* Front of card */}
          <div className="card-face card-front bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col justify-center items-center p-6 text-center cursor-pointer">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 uppercase">{t('question')}</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{decodeHtml(currentQuestion.questionText)}</p>
            <p className="mt-6 text-xs text-gray-400 dark:text-gray-500 italic">{language === 'en' ? 'Tap to reveal answer' : 'Toca para ver la respuesta'}</p>
          </div>

          {/* Back of card */}
          <div className="card-face card-back bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col p-6 cursor-pointer overflow-y-auto">
            <h3 className="text-lg font-bold text-green-600 dark:text-green-400 mb-2">{t('correctAnswer')}</h3>
            <p className="text-base text-gray-800 dark:text-gray-200 mb-4">{decodeHtml(currentQuestion.options[currentQuestion.correctAnswerIndex])}</p>
            
            {currentQuestion.justification && (
                <>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                    <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">{t('justification')}</h4>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{decodeHtml(currentQuestion.justification)}</p>
                </>
            )}
          </div>
        </div>
      </div>

       <div className="mt-6 flex items-center justify-between w-full max-w-sm">
        <button onClick={() => navigate('prev')} className="px-6 py-2 bg-[rgb(var(--primary-600))] text-white rounded-md text-sm font-medium hover:bg-[rgb(var(--primary-700))] transition-colors">
          {t('previous')}
        </button>
        <button onClick={handleFlip} className="px-8 py-3 bg-green-500 text-white rounded-full text-base font-semibold hover:bg-green-600 transition-colors">
            {t('flip')}
        </button>
        <button onClick={() => navigate('next')} className="px-6 py-2 bg-[rgb(var(--primary-600))] text-white rounded-md text-sm font-medium hover:bg-[rgb(var(--primary-700))] transition-colors">
          {t('next')}
        </button>
      </div>

    </div>
  );
};

export default FlashcardsView;