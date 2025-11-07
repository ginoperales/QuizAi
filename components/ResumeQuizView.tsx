import React from 'react';
import { ActiveQuiz } from '../types';
import { decodeHtml } from '../services/fileService';

interface ResumeQuizViewProps {
  activeQuiz: ActiveQuiz;
  onResume: () => void;
  onStartNew: () => void;
  t: (key: any) => string;
}

const ResumeQuizView: React.FC<ResumeQuizViewProps> = ({ activeQuiz, onResume, onStartNew, t }) => {
  const quizName = activeQuiz.name || t('untitledQuiz');

  return (
    <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('resumeQuizTitle')}</h2>
      <p className="mt-2 text-gray-600 dark:text-gray-300">{t('resumeQuizText')}</p>

      <div className="my-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <p className="font-semibold text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] truncate" title={decodeHtml(quizName)}>
          {decodeHtml(quizName)}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {activeQuiz.currentQuestionIndex > 0
            ? `${t('question')} ${activeQuiz.currentQuestionIndex + 1} / ${activeQuiz.questions.length}`
            : `${activeQuiz.questions.length} ${t('question').toLowerCase()}s`}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onResume}
          className="w-full sm:w-auto flex-1 justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[rgb(var(--primary-600))] hover:bg-[rgb(var(--primary-700))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(var(--primary-500),1)] transition-colors"
        >
          {t('continueQuiz')}
        </button>
        <button
          onClick={onStartNew}
          className="w-full sm:w-auto flex-1 justify-center py-3 px-6 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(var(--primary-500),1)] transition-colors"
        >
          {t('abandonQuiz')}
        </button>
      </div>
    </div>
  );
};

export default ResumeQuizView;