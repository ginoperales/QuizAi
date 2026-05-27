import React, { useState, useEffect } from 'react';
import { ActiveQuiz, Language, ExplanationStyle, Difficulty } from '../types';
import { getDeeperExplanation, gradeWrittenAnswer, calculateLocalSimilarity } from '../services/geminiService';
import { decodeHtml } from '../services/fileService';
import { LightBulbIcon, RefreshIcon } from './icons';

interface WrittenQuizViewProps {
  activeQuiz: ActiveQuiz;
  t: (key: any) => string;
  onUpdate: (update: Partial<ActiveQuiz>) => void;
  onComplete: () => void;
  onSaveAndExit: () => void;
  language: Language;
}

const TIME_LIMITS: Record<Difficulty, number> = {
    [Difficulty.Easy]: 30,
    [Difficulty.Medium]: 20,
    [Difficulty.Hard]: 10,
};

const WrittenQuizView: React.FC<WrittenQuizViewProps> = ({ activeQuiz, t, onUpdate, onComplete, onSaveAndExit, language }) => {
  const { questions, currentQuestionIndex, writtenUserAnswers, explanationStyle, isTimed, difficulty } = activeQuiz;
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = writtenUserAnswers?.[currentQuestion.id];
  
  const [userText, setUserText] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [animate, setAnimate] = useState('');

  // Timer state
  const timeLimit = TIME_LIMITS[difficulty];
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  // State for explanation modal
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [modalExplanationStyle, setModalExplanationStyle] = useState<ExplanationStyle>(explanationStyle);
  const [isExplanationSaved, setIsExplanationSaved] = useState(false);

  const handleTimeOut = () => {
    handleSubmit(true);
  };

  useEffect(() => {
    if (isSubmitted || !isTimed) {
      return;
    }
    setTimeLeft(timeLimit);
    const timerId = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerId);
          handleTimeOut();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [currentQuestionIndex, isSubmitted, timeLimit, isTimed]);


  useEffect(() => {
    setAnimate('animate-fade-in');
    const timer = setTimeout(() => setAnimate(''), 500);
    
    const answer = activeQuiz.writtenUserAnswers?.[currentQuestion.id];
    if (answer) {
        setUserText(answer.text);
        setIsSubmitted(answer.isGraded);
    } else {
        setUserText('');
        setIsSubmitted(false);
    }
    setIsGrading(false);

    return () => clearTimeout(timer);
  }, [currentQuestion, activeQuiz.writtenUserAnswers]);

  const handleSubmit = async (fromTimeout = false) => {
    if (!userText.trim() && !fromTimeout) return;
    setIsGrading(true);
    
    if (fromTimeout && !userText.trim()) {
        const newAnswers = {
            ...(activeQuiz.writtenUserAnswers || {}),
            [currentQuestion.id]: {
                text: '',
                score: 0,
                feedback: t('timeUpWritten'),
                isGraded: true,
                gradedBy: 'local' as const
            }
        };
        onUpdate({ writtenUserAnswers: newAnswers });
        setIsSubmitted(true);
        setIsGrading(false);
        return;
    }

    const correctAnswerText = currentQuestion.options[currentQuestion.correctAnswerIndex];
    const referenceTextForLocal = correctAnswerText + " " + (currentQuestion.justification || "");
    
    try {
        const result = await gradeWrittenAnswer(currentQuestion.questionText, correctAnswerText, userText, language);
        const newAnswers = {
            ...(activeQuiz.writtenUserAnswers || {}),
            [currentQuestion.id]: {
                text: userText,
                score: result.score,
                feedback: result.feedback,
                isGraded: true,
                gradedBy: 'ai' as const
            }
        };
        onUpdate({ writtenUserAnswers: newAnswers });
        setIsSubmitted(true);
    } catch (error) {
        console.error("AI grading failed, falling back to local justification similarity algorithm:", error);
        
        // Exceptional Fallback: Local Justification Similarity
        const localScore = calculateLocalSimilarity(userText, referenceTextForLocal);
        const explanationText = currentQuestion.justification || correctAnswerText;
        
        const localFeedback = language === 'es'
          ? `Calificación alternativa local. Tu respuesta se comparó con la justificación del cuestionario: "${explanationText}"`
          : `Alternative local grading. Your answer was compared with the quiz justification: "${explanationText}"`;

        const newAnswers = {
            ...(activeQuiz.writtenUserAnswers || {}),
            [currentQuestion.id]: {
                text: userText,
                score: localScore,
                feedback: localFeedback,
                isGraded: true,
                gradedBy: 'local' as const
            }
        };
        onUpdate({ writtenUserAnswers: newAnswers });
        setIsSubmitted(true);
    } finally {
        setIsGrading(false);
    }
  };

  const fetchExplanation = async (styleToUse: ExplanationStyle) => {
    setIsExplanationLoading(true);
    setExplanation('');
    setIsExplanationSaved(false);
    try {
        const correctAnswerText = currentQuestion.options[currentQuestion.correctAnswerIndex];
        const deeperExplanation = await getDeeperExplanation(currentQuestion.questionText, correctAnswerText, '', language, styleToUse);
        setExplanation(deeperExplanation);
    } catch (error) {
        setExplanation(t('errorGettingExplanation'));
    } finally {
        setIsExplanationLoading(false);
    }
  };

  const openExplanationModal = () => {
    setModalExplanationStyle(explanationStyle);
    setShowExplanationModal(true);
    fetchExplanation(explanationStyle);
  };

  const handleModalStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStyle = e.target.value as ExplanationStyle;
    setModalExplanationStyle(newStyle);
    fetchExplanation(newStyle);
  };

  const handleSaveExplanation = () => {
    if (!explanation || isExplanationSaved) return;

    const currentExplanations = activeQuiz.savedExplanations?.[currentQuestion.id] || [];
    const newExplanations = [...currentExplanations, explanation];
    
    onUpdate({
        savedExplanations: {
            ...activeQuiz.savedExplanations,
            [currentQuestion.id]: newExplanations,
        }
    });

    setIsExplanationSaved(true);
  };

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      onUpdate({ currentQuestionIndex: currentQuestionIndex + 1 });
    }
  };

  const scoreColor = currentAnswer?.score !== undefined 
    ? currentAnswer.score >= 70 ? 'text-green-500' : currentAnswer.score >= 40 ? 'text-yellow-500' : 'text-red-500'
    : 'text-gray-500';

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / timeLimit) * circumference;

  return (
    <>
      <div className={`max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg ${animate}`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-4">
             {isTimed && <div className="relative h-12 w-12">
              <svg className="h-full w-full" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r={radius} strokeWidth="4" className="stroke-gray-200 dark:stroke-gray-700" fill="transparent" />
                <circle cx="22" cy="22" r={radius} strokeWidth="4" className={`stroke-current ${timeLeft > 5 ? 'text-[rgb(var(--primary-500))]' : 'text-red-500'}`} fill="transparent" strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" transform="rotate(-90 22 22)" style={{ transition: 'stroke-dashoffset 0.2s linear' }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-200">{timeLeft}</span>
            </div>}
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('question')} {currentQuestionIndex + 1} / {questions.length}</div>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-gray-800 dark:text-white">{decodeHtml(currentQuestion.questionText)}</h2>
        
        <textarea
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          disabled={isSubmitted || isGrading}
          rows={5}
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary-500))] dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700/50"
          placeholder={t('yourWrittenAnswer')}
        />

        {isGrading && (
          <div className="flex flex-col items-center justify-center h-40">
            <svg className="animate-spin h-8 w-8 text-[rgb(var(--primary-500))]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="mt-4 text-gray-600 dark:text-gray-300">{t('aiGrading')}</p>
          </div>
        )}

        {isSubmitted && currentAnswer && (
          <div className="mt-6 space-y-4 animate-fade-in">
              <div>
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('correctAnswerText')}</h4>
                  <p className="mt-1 p-3 bg-green-50 dark:bg-green-900/50 rounded-md text-green-800 dark:text-green-200">{decodeHtml(currentQuestion.options[currentQuestion.correctAnswerIndex])}</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/50 rounded-md relative overflow-hidden border border-blue-100 dark:border-blue-800/40">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">{t('aiFeedback')}</h4>
                    {currentAnswer.gradedBy === 'ai' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 animate-pulse">
                        ✨ Calificado por IA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50" title="Comparado localmente con la justificación oficial">
                        ⚠️ Calificación Local (Sin IA)
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-blue-700 dark:text-blue-300">{decodeHtml(currentAnswer.feedback)}</p>
                  <p className={`mt-2 text-xl font-bold ${scoreColor}`}>{t('similarityScore')}: {currentAnswer.score}/100</p>
                  <button onClick={openExplanationModal} className="mt-3 inline-flex items-center text-sm font-medium text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] hover:underline"><LightBulbIcon className="h-4 w-4 mr-1" />{t('explainBetter')}</button>
              </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-6">
            <button 
              onClick={onSaveAndExit} 
              className="px-4 py-2 sm:px-6 sm:py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t('saveAndExit')}
            </button>
            {!isSubmitted ? (
                <button onClick={() => handleSubmit(false)} disabled={!userText.trim() || isGrading} className="w-full sm:w-auto px-6 py-2 bg-[rgb(var(--primary-600))] text-white rounded-md text-sm font-medium hover:bg-[rgb(var(--primary-700))] disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">{t('submitAnswer')}</button>
            ) : (
                currentQuestionIndex < questions.length - 1 ? (
                    <button onClick={goToNext} className="w-full sm:w-auto px-6 py-2 bg-[rgb(var(--primary-600))] text-white rounded-md text-sm font-medium hover:bg-[rgb(var(--primary-700))]">{t('next')}</button>
                ) : (
                    <button onClick={onComplete} className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">{t('finishQuiz')}</button>
                )
            )}
          </div>
      </div>

      {showExplanationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowExplanationModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('explanation')}</h3>
                    <select
                      id="explanation-style-modal"
                      name="explanation-style-modal"
                      value={modalExplanationStyle}
                      onChange={handleModalStyleChange}
                      className="block pl-3 pr-8 py-1.5 text-sm border-gray-300 focus:outline-none focus:ring-[rgb(var(--primary-500))] focus:border-[rgb(var(--primary-500))] rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      disabled={isExplanationLoading}
                    >
                      {Object.values(ExplanationStyle).map((style) => (
                        <option key={style} value={style}>
                          {t(style)}
                        </option>
                      ))}
                    </select>
                </div>
                <div className="flex-grow min-h-0 overflow-y-auto">
                  {isExplanationLoading ? (
                    <div className="flex flex-col items-center justify-center h-40">
                      <svg className="animate-spin h-8 w-8 text-[rgb(var(--primary-500))]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <p className="mt-4 text-gray-600 dark:text-gray-300">{t('gettingExplanation')}</p>
                    </div>
                  ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: explanation.replace(/\n/g, '<br />') }} />
                  )}
                </div>
                <div className="mt-6 flex justify-between items-center flex-shrink-0">
                    <button
                        onClick={handleSaveExplanation}
                        disabled={isExplanationSaved || isExplanationLoading || !explanation}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExplanationSaved ? t('explanationSaved') : t('saveExplanation')}
                    </button>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setShowExplanationModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">{t('close')}</button>
                        <button onClick={() => fetchExplanation(modalExplanationStyle)} disabled={isExplanationLoading} className="inline-flex items-center px-4 py-2 bg-[rgb(var(--primary-600))] text-white rounded-md text-sm font-medium hover:bg-[rgb(var(--primary-700))] disabled:opacity-50 disabled:cursor-not-allowed">
                          <RefreshIcon className="h-4 w-4 mr-2" />
                          {t('regenerate')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default WrittenQuizView;