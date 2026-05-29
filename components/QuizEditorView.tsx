import React, { useState } from 'react';
import { CompletedQuiz, ActiveQuiz, Question } from '../types';
import { PencilSquareIcon, ArrowUpIcon, ArrowDownIcon, TrashIcon } from './icons';
import { decodeHtml } from '../services/fileService';


interface QuizEditorViewProps {
  quiz: CompletedQuiz | ActiveQuiz;
  onStartQuiz: (questions: Question[]) => void;
  onSaveQuiz: (questions: Question[]) => void;
  onGoBack: () => void;
  t: (key: any) => string;
}

const QuizEditorView: React.FC<QuizEditorViewProps> = ({ quiz, onStartQuiz, onSaveQuiz, onGoBack, t }) => {
  const [questions, setQuestions] = useState<Question[]>(quiz.questions);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedQuestion, setEditedQuestion] = useState<Question | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleEditClick = (index: number) => {
    setEditingIndex(index);
    setEditedQuestion(JSON.parse(JSON.stringify(questions[index]))); // Deep copy
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editedQuestion) {
      const newQuestions = [...questions];
      newQuestions[editingIndex] = editedQuestion;
      setQuestions(newQuestions);
      setEditingIndex(null);
      setEditedQuestion(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedQuestion(null);
  };

  const handleSaveToHistory = async () => {
    setIsSaving(true);
    try {
      await onSaveQuiz(questions);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('quizEditorTitle')}</h2>
        <div className="flex flex-wrap gap-2 justify-end">
           <button onClick={onGoBack} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors">
              {t('goBack')}
            </button>
            <button 
              onClick={handleSaveToHistory}
              disabled={isSaving || questions.length === 0}
              className="px-4 py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 disabled:bg-gray-400 transition-colors"
            >
              {isSaving ? "Guardando..." : "Guardar Cambios"}
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
          <li key={q.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col gap-4">
            {editingIndex === index && editedQuestion ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Pregunta</label>
                  <input 
                    type="text" 
                    value={editedQuestion.questionText} 
                    onChange={(e) => setEditedQuestion({...editedQuestion, questionText: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                {editedQuestion.options && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Opciones y Respuesta Correcta</label>
                    <div className="space-y-2">
                      {editedQuestion.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name={`correct-${q.id}`} 
                            checked={editedQuestion.correctAnswerIndex === optIdx}
                            onChange={() => setEditedQuestion({...editedQuestion, correctAnswerIndex: optIdx})}
                            className="w-4 h-4 text-[rgb(var(--primary-600))]"
                          />
                          <input 
                            type="text" 
                            value={opt} 
                            onChange={(e) => {
                              const newOpts = [...editedQuestion.options!];
                              newOpts[optIdx] = e.target.value;
                              setEditedQuestion({...editedQuestion, options: newOpts});
                            }}
                            className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Explicación / Justificación</label>
                  <textarea 
                    value={editedQuestion.explanation || editedQuestion.justification || ''} 
                    onChange={(e) => setEditedQuestion({...editedQuestion, explanation: e.target.value, justification: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button onClick={handleCancelEdit} className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors">Cancelar</button>
                  <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-[rgb(var(--primary-600))] text-white rounded-md text-sm font-medium hover:bg-[rgb(var(--primary-700))] transition-colors">Guardar Pregunta</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex-grow min-w-0 flex items-baseline gap-2">
                  <span className="text-gray-500 dark:text-gray-400 font-semibold flex-shrink-0">{index + 1}.</span>
                  <p className="text-gray-800 dark:text-white truncate" title={decodeHtml(q.questionText)}>{decodeHtml(q.questionText)}</p>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                   <button onClick={() => handleEditClick(index)} className="p-2 text-blue-500 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
                    <PencilSquareIcon />
                   </button>
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
              </div>
            )}
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