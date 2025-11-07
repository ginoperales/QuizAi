import React, { useState } from 'react';
import { CompletedQuiz, Question } from '../types';
import { ArrowUpIcon, ArrowDownIcon, TrashIcon } from './icons';
import { decodeHtml } from '../services/fileService';


interface QuizEditorViewProps {
  quiz: CompletedQuiz;
  onStartQuiz: (questions: Question[]) => void;
  onGoBack: () => void;
  t: (key: any) => string;
}

const QuizEditorView: React.FC<QuizEditorViewProps> = ({ quiz, onStartQuiz, onGoBack, t }) => {
  const [questions, setQuestions] = useState<Question[]>(quiz.questions);

  const handleDelete = (idToDelete: string) => {
    setQuestions(prev => prev.filter(q => q.id !== idToDelete));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const newQuestions = [...questions];
    const item = newQuestions[index];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    newQuestions.splice(index, 1);
    newQuestions.splice(newIndex, 0, item);
    setQuestions(newQuestions);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('quizEditorTitle')}</h2>
        <div className="flex space-x-2">
           <button onClick={onGoBack} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors">
              {t('goBack')}
            </button>
           <button 
              onClick={() => onStartQuiz(questions)} 
              disabled={questions.length === 0}
              className="px-4 py-2 bg-[rgb(var(--primary-600))] text-white rounded-md text-sm font-medium hover:bg-[rgb(var(--primary-700))] disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors"
            >
              {t('startEditedQuiz')} ({questions.length})
            </button>
        </div>
      </div>
      
      <ul className="space-y-3">
        {questions.map((q, index) => (
          <li key={q.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex items-center justify-between gap-4">
            <div className="flex-grow min-w-0 flex items-baseline gap-2">
              <span className="text-gray-500 dark:text-gray-400 font-semibold flex-shrink-0">{index + 1}.</span>
              <p className="text-gray-800 dark:text-white truncate" title={decodeHtml(q.questionText)}>{decodeHtml(q.questionText)}</p>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
               <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="p-2 text-gray-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ArrowUpIcon />
               </button>
               <button onClick={() => handleMove(index, 'down')} disabled={index === questions.length - 1} className="p-2 text-gray-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ArrowDownIcon />
               </button>
               <button onClick={() => handleDelete(q.id)} className="p-2 text-red-500 rounded-md hover:bg-red-100 dark:hover:bg-red-900 transition-colors">
                 <TrashIcon />
               </button>
            </div>
          </li>
        ))}
         {questions.length === 0 && (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <p className="text-gray-500 dark:text-gray-400">No hay preguntas en este cuestionario.</p>
            </div>
        )}
      </ul>
    </div>
  );
};

export default QuizEditorView;