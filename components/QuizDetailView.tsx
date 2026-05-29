import React, { useState } from 'react';
import { CompletedQuiz, Question, ActiveQuiz, FirebaseUser } from '../types';
import { RefreshIcon, StarIcon, FilledStarIcon, DocumentChartBarIcon, FileTextIcon, PencilSquareIcon, KeyIcon, RectangleStackIcon } from './icons';
import { exportQuizReportToPdf, exportQuizForEvaluationToPdf, exportQuizWithKeyToPdf, decodeHtml } from '../services/fileService';
import { submitQuestionFeedback } from '../services/firebaseService';

interface QuizDetailViewProps {
  quiz: CompletedQuiz;
  currentUser: FirebaseUser | null;
  onGoBack: () => void;
  onRetake: (id: string) => void;
  toggleFavorite: (question: Question) => void;
  isFavorite: (questionId: string) => boolean;
  onStudy: (quiz: CompletedQuiz | ActiveQuiz) => void;
  onShare: (quiz: CompletedQuiz) => void;
  t: (key: any) => string;
}

const QuizDetailView: React.FC<QuizDetailViewProps> = ({ 
  quiz, 
  currentUser,
  onGoBack, 
  onRetake, 
  toggleFavorite, 
  isFavorite, 
  onStudy, 
  onShare,
  t 
}) => {
  // Disagreement evaluation states
  const [activeRating, setActiveRating] = useState<{ [qId: string]: 'good' | 'bad' }>({});
  const [comments, setComments] = useState<{ [qId: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<{ [qId: string]: boolean }>({});
  const [submittedFeedback, setSubmittedFeedback] = useState<{ [qId: string]: boolean }>({});
  const [feedbackError, setFeedbackError] = useState<{ [qId: string]: string | null }>({});

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
  
  const percentage = quiz.totalQuestions > 0 ? Math.round((quiz.score / quiz.totalQuestions) * 100) : 0;
  const quizName = decodeHtml(quiz.name) || t('quizDetails');

  const handleSubmitFeedback = async (questionId: string, questionText: string) => {
    if (!currentUser) return;
    const rating = activeRating[questionId];
    if (!rating) return;

    const comment = comments[questionId] || '';
    if (rating === 'bad' && !comment.trim()) {
      setFeedbackError(prev => ({ ...prev, [questionId]: "Por favor escribe un breve comentario explicando tu discrepancia." }));
      return;
    }

    setIsSubmitting(prev => ({ ...prev, [questionId]: true }));
    setFeedbackError(prev => ({ ...prev, [questionId]: null }));

    try {
      await submitQuestionFeedback(
        quiz.id,
        quiz.name || 'Cuestionario',
        questionId,
        questionText,
        currentUser.uid,
        currentUser.alias,
        rating,
        comment,
        quiz.creatorUid || ''
      );
      setSubmittedFeedback(prev => ({ ...prev, [questionId]: true }));
    } catch (err: any) {
      console.error(err);
      setFeedbackError(prev => ({ ...prev, [questionId]: "Error al enviar la valoración. Reintenta." }));
    } finally {
      setIsSubmitting(prev => ({ ...prev, [questionId]: false }));
    }
  };

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
            <p className="text-3xl font-bold text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]">
                {quiz.mode === 'Written' ? `${percentage}%` : `${quiz.score} / ${quiz.totalQuestions}`}
            </p>
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
            <button onClick={() => onShare(quiz)} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors">
                <span className="text-lg">🌍</span>
                <span>Compartir Cuestionario</span>
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
        {quiz.questions.map((q, index) => {
            if (quiz.mode === 'Written' && quiz.writtenUserAnswers) {
                const userAnswer = quiz.writtenUserAnswers[q.id];
                if (!userAnswer) return null;
                const scoreColor = userAnswer.score >= 70 ? 'text-green-500' : userAnswer.score >= 40 ? 'text-yellow-500' : 'text-red-500';

                return (
                    <li key={q.id} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md space-y-4">
                        <p className="text-lg font-semibold text-gray-800 dark:text-white">{index + 1}. {decodeHtml(q.questionText)}</p>
                        
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('yourWrittenAnswer')}</h4>
                                <p className="mt-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-800 dark:text-gray-200">{decodeHtml(userAnswer.text)}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('correctAnswerText')}</h4>
                                <p className="mt-1 p-3 bg-green-50 dark:bg-green-900/50 rounded-md text-green-800 dark:text-green-200">{decodeHtml(q.options[q.correctAnswerIndex])}</p>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/50 rounded-md">
                                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">{t('aiFeedback')}</h4>
                                <p className="mt-1 text-blue-700 dark:text-blue-300">{decodeHtml(userAnswer.feedback)}</p>
                                <p className={`mt-2 text-lg font-bold ${scoreColor}`}>{t('similarityScore')}: {userAnswer.score}/100</p>
                            </div>
                        </div>

                        {/* Disagreement feedback evaluation panel */}
                        {currentUser && !submittedFeedback[q.id] && (
                          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                              ¿Difieres de la respuesta o de la calificación de la IA? Valora esta pregunta:
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveRating(prev => ({ ...prev, [q.id]: prev[q.id] === 'good' ? undefined : 'good' }))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                                  activeRating[q.id] === 'good'
                                    ? 'bg-green-500/10 border-green-500 text-green-600 dark:text-green-400 font-extrabold shadow-sm'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:text-green-500 dark:hover:text-green-400'
                                }`}
                              >
                                👍 Bien
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => setActiveRating(prev => ({ ...prev, [q.id]: prev[q.id] === 'bad' ? undefined : 'bad' }))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                                  activeRating[q.id] === 'bad'
                                    ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 font-extrabold shadow-sm'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 dark:hover:text-red-400'
                                }`}
                              >
                                👎 Mal
                              </button>
                            </div>

                            {activeRating[q.id] && (
                              <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 space-y-3">
                                <textarea
                                  rows={2}
                                  value={comments[q.id] || ''}
                                  onChange={(e) => setComments(prev => ({ ...prev, [q.id]: e.target.value }))}
                                  placeholder={activeRating[q.id] === 'bad'
                                    ? "Explica brevemente por qué consideras incorrecto el reactivo..."
                                    : "Escribe un comentario opcional sobre esta pregunta..."
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[rgb(var(--primary-500))] resize-none"
                                />
                                
                                {feedbackError[q.id] && (
                                  <p className="text-[10px] text-red-500 font-bold">{feedbackError[q.id]}</p>
                                )}

                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    disabled={isSubmitting[q.id]}
                                    onClick={() => handleSubmitFeedback(q.id, q.questionText)}
                                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] hover:from-[rgb(var(--primary-700))] hover:to-[rgb(var(--primary-600))] shadow transition-all active:scale-[0.98] disabled:opacity-50"
                                  >
                                    {isSubmitting[q.id] ? "Enviando..." : "Enviar Valoración"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {submittedFeedback[q.id] && (
                          <div className="mt-4 pt-2 border-t border-gray-100 dark:border-gray-700/50 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-bold">
                            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>¡Valoración enviada! Gracias por tu feedback.</span>
                          </div>
                        )}
                    </li>
                );
            }

            return (
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

                {/* Disagreement feedback evaluation panel */}
                {currentUser && !submittedFeedback[q.id] && (
                  <div className="mt-4 pt-3 border-t border-gray-150 dark:border-gray-750">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                      ¿Difieres de la respuesta correcta o de la justificación? Valora esta pregunta:
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveRating(prev => ({ ...prev, [q.id]: prev[q.id] === 'good' ? undefined : 'good' }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                          activeRating[q.id] === 'good'
                            ? 'bg-green-500/10 border-green-500 text-green-600 dark:text-green-400 font-extrabold shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:text-green-500 dark:hover:text-green-400'
                        }`}
                      >
                        👍 Bien
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setActiveRating(prev => ({ ...prev, [q.id]: prev[q.id] === 'bad' ? undefined : 'bad' }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                          activeRating[q.id] === 'bad'
                            ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 font-extrabold shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 dark:hover:text-red-400'
                        }`}
                      >
                        👎 Mal
                      </button>
                    </div>

                    {activeRating[q.id] && (
                      <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 space-y-3 animate-fade-in">
                        <textarea
                          rows={2}
                          value={comments[q.id] || ''}
                          onChange={(e) => setComments(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder={activeRating[q.id] === 'bad'
                            ? "Explica brevemente por qué consideras incorrecto el reactivo..."
                            : "Escribe un comentario opcional sobre esta pregunta..."
                          }
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[rgb(var(--primary-500))] resize-none"
                        />
                        
                        {feedbackError[q.id] && (
                          <p className="text-[10px] text-red-500 font-bold">{feedbackError[q.id]}</p>
                        )}

                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={isSubmitting[q.id]}
                            onClick={() => handleSubmitFeedback(q.id, q.questionText)}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] hover:from-[rgb(var(--primary-700))] hover:to-[rgb(var(--primary-600))] shadow transition-all active:scale-[0.98] disabled:opacity-50"
                          >
                            {isSubmitting[q.id] ? "Enviando..." : "Enviar Valoración"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {submittedFeedback[q.id] && (
                  <div className="mt-4 pt-2 border-t border-gray-100 dark:border-gray-700/50 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-bold">
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>¡Valoración enviada! Gracias por tu feedback.</span>
                  </div>
                )}
              </li>
            );
        })}
      </ul>
    </div>
  );
};

export default QuizDetailView;
