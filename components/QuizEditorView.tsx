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
  
  // Real-time search and success modal states
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter questions by search query
  const filteredQuestions = questions.filter(q => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    
    const textMatch = q.questionText.toLowerCase().includes(query);
    const explanationMatch = q.explanation ? q.explanation.toLowerCase().includes(query) : false;
    const justificationMatch = q.justification ? q.justification.toLowerCase().includes(query) : false;
    const optionsMatch = q.options ? q.options.some(opt => opt.toLowerCase().includes(query)) : false;
    
    return textMatch || explanationMatch || justificationMatch || optionsMatch;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0">
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          0% { stroke-dasharray: 50; stroke-dashoffset: 50; }
          100% { stroke-dasharray: 50; stroke-dashoffset: 0; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-scaleUp {
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-drawCheck {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: drawCheck 0.4s ease-out 0.15s forwards;
        }
      `}</style>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('quizEditorTitle')}</h2>
        <div className="flex flex-wrap gap-2 justify-end">
            <button onClick={onGoBack} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors">
              {t('goBack')}
            </button>
            <button 
              onClick={handleSaveToHistory}
              disabled={isSaving || questions.length === 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-400 transition-all shadow-sm hover:shadow-md"
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

      {/* Real-time search engine input */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Buscar preguntas, respuestas o explicaciones..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-10 py-3 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary-600))] focus:border-transparent dark:text-white transition-all text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <ul className="space-y-3">
        {filteredQuestions.map((q) => {
          // Find original index to ensure actions edit/move the correct question in the full list
          const originalIndex = questions.findIndex(item => item.id === q.id);
          
          return (
            <li key={q.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col gap-4 border border-gray-100 dark:border-gray-750 transition-all hover:shadow-lg">
              {editingIndex === originalIndex && editedQuestion ? (
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
                    <span className="text-gray-500 dark:text-gray-400 font-semibold flex-shrink-0">{originalIndex + 1}.</span>
                    <p className="text-gray-800 dark:text-white truncate" title={decodeHtml(q.questionText)}>{decodeHtml(q.questionText)}</p>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                     <button onClick={() => handleEditClick(originalIndex)} className="p-2 text-blue-500 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
                      <PencilSquareIcon />
                     </button>
                     <button onClick={() => handleMove(originalIndex, 'up')} disabled={originalIndex === 0} className="p-2 text-gray-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ArrowUpIcon />
                     </button>
                     <button onClick={() => handleMove(originalIndex, 'down')} disabled={originalIndex === questions.length - 1} className="p-2 text-gray-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ArrowDownIcon />
                     </button>
                     <button onClick={() => handleDelete(q.id)} className="p-2 text-red-500 rounded-md hover:bg-red-100 dark:hover:bg-red-900 transition-colors">
                       <TrashIcon />
                     </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {filteredQuestions.length === 0 && (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-150 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">
                {questions.length === 0 ? "No hay preguntas en este cuestionario." : "No se encontraron preguntas que coincidan con la búsqueda."}
              </p>
          </div>
        )}
      </ul>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
            onClick={() => setShowSuccessModal(false)}
          />
          
          <div className="relative bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl transform transition-all duration-300 scale-95 opacity-0 animate-scaleUp text-center border border-gray-100 dark:border-gray-800">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 shadow-inner">
              <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-ping opacity-25" />
              
              <svg className="w-12 h-12 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" className="animate-drawCheck" />
              </svg>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
              ¡Guardado con éxito!
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
              Los cambios en tu cuestionario se han guardado de forma segura en tu historial.
            </p>
            
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/20 dark:shadow-emerald-950/40 transform active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizEditorView;