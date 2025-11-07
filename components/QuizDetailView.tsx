import React from 'react';
import { CompletedQuiz, Question, ActiveQuiz } from '../types';
import { RefreshIcon, StarIcon, FilledStarIcon, DocumentChartBarIcon, FileTextIcon, PencilSquareIcon, KeyIcon, RectangleStackIcon } from './icons';
import { exportQuizReportToPdf, exportQuizForEvaluationToPdf, exportQuizWithKeyToPdf, decodeHtml } from '../services/fileService';

interface QuizDetailViewProps {
  quiz: CompletedQuiz;
  onGoBack: () => void;
  onRetake: (id: string) => void;
  toggleFavorite: (question: Question) => void;
  isFavorite: (questionId: string) => boolean;
  onStudy: (quiz: CompletedQuiz | ActiveQuiz) => void;
  t: (key: any) => string;
}

const QuizDetailView: React.FC<QuizDetailViewProps> = ({ quiz, onGoBack, onRetake, toggleFavorite, isFavorite, onStudy, t }) => {

  const getOptionClass = (optionIndex: number, question: Question) => {
    const userAnswer = quiz.userAnswers[question.id];
    const isCorrect = question.correctAnswerIndex === optionIndex;
    const isSelected = userAnswer === optionIndex;

    if (isCorrect) {
      return 'bg-green-100 dark:bg-green-900 border-green-500 text-green-800 dark:text-green-200';
    }
    if (isSelected && !isCorrect) {
      return 'bg-red-100 dark:bg-red-900 border-red-500 text-red-800 dark:text-red-200 line-through';
    }
    return 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600';
  };

  const quizName = decodeHtml(quiz.name) || t('quizDetails');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white truncate" title={quizName}>{quizName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('completedOn')} {new Date(quiz.date).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">{t('yourScore')}</p>
            <p className="text-3xl font-bold text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]">{quiz.score} / {quiz.totalQuestions}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={onGoBack} className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors">
              {t('backToHistory')}
            </button>
            <button onClick={() => onStudy(quiz)} className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-md text-sm font-medium hover:bg-orange-600 transition-colors">
                <RectangleStackIcon className="h-5 w-5" />
                <span>{t('studyWithFlashcards')}</span>
            </button>
            <button onClick={() => onRetake(quiz.id)} className="flex items-center space-x-2 px-4 py-2 bg-[rgb(var(--primary-600))] text-white rounded-md text-sm font-medium hover:bg-[rgb(var(--primary-700))] transition-colors">
              <PencilSquareIcon className="h-5 w-5" />
              <span>{t('editAndRetake')}</span>
            </button>
            <button onClick={() => exportQuizReportToPdf(quiz, t)} className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 transition-colors">
                <DocumentChartBarIcon className="h-5 w-5" />
                <span>{t('generateReport')}</span>
            </button>
            <button onClick={() => exportQuizForEvaluationToPdf(quiz, t)} className="flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white rounded-md text-sm font-medium hover:bg-sky-700 transition-colors">
                <FileTextIcon className="h-5 w-5" />
                <span>{t('generateEvaluation')}</span>
            </button>
            <button onClick={() => exportQuizWithKeyToPdf(quiz, t)} className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors">
                <KeyIcon className="h-5 w-5" />
                <span>{t('generateQuizWithKey')}</span>
            </button>
          </div>
        </div>
      </div>

      <ul className="space-y-4">
        {quiz.questions.map((q, index) => (
          <li key={q.id} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-start">
              <p className="text-lg font-semibold text-gray-800 dark:text-white flex-1 pr-4 min-w-0">
                {index + 1}. {decodeHtml(q.questionText)}
              </p>
               <button onClick={() => toggleFavorite(q)} className="text-gray-400 hover:text-yellow-500 transition-colors">
                {isFavorite(q.id) ? <FilledStarIcon /> : <StarIcon />}
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {q.options.map((option, i) => (
                <div
                  key={i}
                  className={`text-sm p-3 rounded-lg border ${getOptionClass(i, q)}`}
                >
                  {decodeHtml(option)}
                </div>
              ))}
            </div>
             {quiz.userAnswers[q.id] === undefined && (
                <p className="mt-3 text-sm font-semibold text-yellow-600 dark:text-yellow-400">{t('unanswered')}</p>
             )}
            {q.justification && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">{t('justification')}</h4>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{decodeHtml(q.justification)}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default QuizDetailView;