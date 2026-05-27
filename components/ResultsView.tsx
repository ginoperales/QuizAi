import React, { useEffect } from 'react';
import { RefreshIcon } from './icons';
import { CompletedQuiz } from '../types';
import Confetti from './Confetti';
import { playSuccessSound } from '../services/soundService';

interface ResultsViewProps {
  quiz: CompletedQuiz;
  onRestart: () => void;
  onRetake: () => void;
  t: (key: any) => string;
  soundEnabled: boolean;
}

const ResultsView: React.FC<ResultsViewProps> = ({ quiz, onRestart, onRetake, t, soundEnabled }) => {
  const { score, totalQuestions, mode } = quiz;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  
  const isWritten = mode === 'Written';

  const questionsToReviewCount = isWritten
    ? Object.values(quiz.writtenUserAnswers || {}).map(a => a as { score: number }).filter(a => a.score < 70).length
    : quiz.totalQuestions - quiz.score;

  // Play triumphant completion music on mount
  useEffect(() => {
    if (soundEnabled) {
      playSuccessSound();
    }
  }, [soundEnabled]);

  return (
    <>
      {/* Celebration Particle Shower */}
      <Confetti duration={5000} />

      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center animate-correct-pop relative z-10 border border-gray-150 dark:border-gray-700/50">
        <h2 className="text-3xl font-bold text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]">{t('quizComplete')}</h2>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">{t('yourScore')}</p>
        
        <div className="my-6">
          <div className="inline-block relative">
              <svg className="h-40 w-40">
                  <circle className="stroke-current text-gray-200 dark:text-gray-700" strokeWidth="10" fill="transparent" r="70" cx="80" cy="80"/>
                  <circle 
                      className="stroke-current text-[rgb(var(--primary-500))]" 
                      strokeWidth="10" 
                      strokeLinecap="round" 
                      fill="transparent" 
                      r="70" 
                      cx="80" 
                      cy="80"
                      style={{
                          strokeDasharray: 2 * Math.PI * 70,
                          strokeDashoffset: 2 * Math.PI * 70 * (1 - percentage / 100),
                          transition: 'stroke-dashoffset 0.8s ease-out'
                      }}
                      transform="rotate(-90 80 80)"
                  />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <p className="text-4xl font-bold text-gray-800 dark:text-white animate-pulse">{percentage}%</p>
              </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 my-6 text-center">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('score')}</p>
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{isWritten ? `${score} / ${totalQuestions}` : `${score} / ${totalQuestions}`}</p>
            </div>
        </div>
        
        {questionsToReviewCount > 0 && (
            <button
                onClick={onRetake}
                className="w-full flex items-center justify-center py-3 px-4 mb-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
                <RefreshIcon className="h-5 w-5 mr-2" />
                {isWritten ? t('retakeIncorrect').replace('Incorrect Questions', 'Questions to Review') : t('retakeIncorrect')}
            </button>
        )}

        <button
          onClick={onRestart}
          className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[rgb(var(--primary-600))] hover:bg-[rgb(var(--primary-700))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(var(--primary-500),1)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          <RefreshIcon className="h-5 w-5 mr-2" />
          {t('restartQuiz')}
        </button>
      </div>
    </>
  );
};

export default ResultsView;
