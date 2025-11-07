
import React from 'react';
import { RefreshIcon } from './icons';

interface ResultsViewProps {
  score: number;
  totalQuestions: number;
  onRestart: () => void;
  onRetake: () => void;
  incorrectCount: number;
  t: (key: any) => string;
}

const ResultsView: React.FC<ResultsViewProps> = ({ score, totalQuestions, onRestart, onRetake, incorrectCount, t }) => {
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const correctCount = score;

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center animate-fade-in">
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
                        transition: 'stroke-dashoffset 0.5s ease-in-out'
                    }}
                    transform="rotate(-90 80 80)"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <p className="text-4xl font-bold text-gray-800 dark:text-white">{percentage}%</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 my-6 text-center">
          <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('correctAnswers')}</p>
              <p className="text-2xl font-bold text-green-600">{correctCount}</p>
          </div>
          <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('incorrectAnswers')}</p>
              <p className="text-2xl font-bold text-red-600">{incorrectCount}</p>
          </div>
      </div>
      
      {incorrectCount > 0 && (
          <button
              onClick={onRetake}
              className="w-full flex items-center justify-center py-3 px-4 mb-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
          >
              <RefreshIcon className="h-5 w-5 mr-2" />
              {t('retakeIncorrect')}
          </button>
      )}

      <button
        onClick={onRestart}
        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[rgb(var(--primary-600))] hover:bg-[rgb(var(--primary-700))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(var(--primary-500),1)] transition-colors"
      >
        <RefreshIcon className="h-5 w-5 mr-2" />
        {t('restartQuiz')}
      </button>
    </div>
  );
};

export default ResultsView;