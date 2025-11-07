import React, { useState, useEffect, useRef } from 'react';
import { Question, Difficulty, Language, ActiveQuiz, ExplanationStyle } from '../types';
import { getDeeperExplanation } from '../services/geminiService';
import { decodeHtml } from '../services/fileService';
import { StarIcon, FilledStarIcon, SpeakerWaveIcon, StopCircleIcon, LightBulbIcon, RefreshIcon } from './icons';

interface QuizViewProps {
  activeQuiz: ActiveQuiz;
  toggleFavorite: (question: Question) => void;
  isFavorite: (questionId: string) => boolean;
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

const QuizView: React.FC<QuizViewProps> = ({ activeQuiz, toggleFavorite, isFavorite, t, onUpdate, onComplete, language, onSaveAndExit }) => {
  const { questions, currentQuestionIndex, userAnswers, difficulty, isTimed, explanationStyle } = activeQuiz;
  
  const currentQuestion = questions[currentQuestionIndex];
  const userAnswerForThisQuestion = userAnswers[currentQuestion.id];
  
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(userAnswerForThisQuestion !== undefined);
  const [animate, setAnimate] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [modalExplanationStyle, setModalExplanationStyle] = useState<ExplanationStyle>(explanationStyle);

  const timeLimit = TIME_LIMITS[difficulty];
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [shuffledCorrectAnswerIndex, setShuffledCorrectAnswerIndex] = useState<number>(0);

  const handleTimeOut = () => {
    setIsSubmitted(true);
    setSelectedAnswer(null); // Indicates timeout
  };

  useEffect(() => {
    return () => { // Cleanup speech on component unmount
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);


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
    if (!currentQuestion) return;
    
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }

    const originalOptions = [...currentQuestion.options];
    const correctAnswerText = originalOptions[currentQuestion.correctAnswerIndex];

    const seedrandom = (seed: string) => {
        let h = 1779033703 ^ seed.length;
        for(let i = 0; i < seed.length; i++) {
            h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
            h = h << 13 | h >>> 19;
        }
        return () => {
            h = Math.imul(h ^ h >>> 16, 2246822507);
            h = Math.imul(h ^ h >>> 13, 3266489909);
            return (h ^= h >>> 16) >>> 0;
        }
    }
    const rng = seedrandom(currentQuestion.id);
    for (let i = originalOptions.length - 1; i > 0; i--) {
        const j = rng() % (i + 1);
        [originalOptions[i], originalOptions[j]] = [originalOptions[j], originalOptions[i]];
    }
    
    setShuffledOptions(originalOptions);
    const newShuffledCorrectIndex = originalOptions.indexOf(correctAnswerText);
    setShuffledCorrectAnswerIndex(newShuffledCorrectIndex);

    const userAnswerIndex = userAnswers[currentQuestion.id];
    if (userAnswerIndex !== undefined) {
      const userAnswerText = currentQuestion.options[userAnswerIndex];
      setSelectedAnswer(originalOptions.indexOf(userAnswerText));
      setIsSubmitted(true);
    } else {
      setSelectedAnswer(null);
      setIsSubmitted(false);
    }
    
    setAnimate('animate-fade-in');
    const timer = setTimeout(() => setAnimate(''), 500);
    return () => clearTimeout(timer);
  }, [currentQuestion, userAnswers]);
  
  const handleAnswerSelect = (index: number) => {
    if (!isSubmitted) {
      setSelectedAnswer(index);
    }
  };
  
  const handleSubmit = () => {
    if (selectedAnswer !== null) {
      const selectedOptionText = shuffledOptions[selectedAnswer];
      const originalOptionIndex = currentQuestion.options.indexOf(selectedOptionText);
      onUpdate({ userAnswers: { ...userAnswers, [currentQuestion.id]: originalOptionIndex } });
      setIsSubmitted(true);
    }
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const textToSpeak = `${decodeHtml(currentQuestion.questionText)}. ${shuffledOptions.map((opt, i) => `${t('option')} ${String.fromCharCode(65 + i)}. ${decodeHtml(opt)}`).join('. ')}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = language;
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const fetchExplanation = async (styleToUse: ExplanationStyle) => {
    setIsExplanationLoading(true);
    setExplanation('');
    try {
        const deeperExplanation = await getDeeperExplanation(currentQuestion.questionText, shuffledOptions[shuffledCorrectAnswerIndex], currentQuestion.justification || '', language, styleToUse);
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


  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      onUpdate({ currentQuestionIndex: currentQuestionIndex + 1 });
    }
  };

  const getOptionClass = (index: number) => {
    if (!isSubmitted) {
      return `border-gray-300 dark:border-gray-600 hover:bg-[rgba(var(--primary-50),1)] dark:hover:bg-gray-700 ${selectedAnswer === index ? 'ring-2 ring-[rgb(var(--primary-500))] border-[rgb(var(--primary-500))]' : ''}`;
    }
    if (index === shuffledCorrectAnswerIndex) {
      return 'bg-green-100 dark:bg-green-900 border-green-500 text-green-800 dark:text-green-200';
    }
    if (index === selectedAnswer) {
      return 'bg-red-100 dark:bg-red-900 border-red-500 text-red-800 dark:text-red-200';
    }
    return 'border-gray-300 dark:border-gray-600';
  };

  const finalUserAnswerForFeedback = selectedAnswer ?? (userAnswerForThisQuestion !== undefined ? shuffledOptions.indexOf(currentQuestion.options[userAnswerForThisQuestion]) : null);

  const getFeedbackClass = () => {
    if (!isSubmitted) return '';
    if (finalUserAnswerForFeedback === shuffledCorrectAnswerIndex) return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200';
    if (finalUserAnswerForFeedback === null) return 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200';
    return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200';
  };
  
  if (!currentQuestion) return <div>Loading question...</div>;

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
          <div className="flex items-center space-x-2">
            <button onClick={handleSpeak} className="text-gray-400 hover:text-[rgb(var(--primary-500))] transition-colors p-2" aria-label={isSpeaking ? t('stopReading') : t('readAloud')}>{isSpeaking ? <StopCircleIcon /> : <SpeakerWaveIcon />}</button>
            <button onClick={() => toggleFavorite(currentQuestion)} className="text-gray-400 hover:text-yellow-500 transition-colors p-2">{isFavorite(currentQuestion.id) ? <FilledStarIcon /> : <StarIcon />}</button>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-gray-800 dark:text-white">{decodeHtml(currentQuestion.questionText)}</h2>
        <div className="space-y-4 mb-6">
          {shuffledOptions.map((option, index) => (
            <button key={index} onClick={() => handleAnswerSelect(index)} disabled={isSubmitted} className={`w-full text-left p-4 border rounded-lg transition-all duration-200 ${getOptionClass(index)} disabled:cursor-not-allowed`}>
              <span className="font-medium">{decodeHtml(option)}</span>
            </button>
          ))}
        </div>
        
        {isSubmitted && (
          <div className={`p-4 rounded-md text-center mb-6 text-sm font-semibold ${getFeedbackClass()}`}>
            {finalUserAnswerForFeedback === shuffledCorrectAnswerIndex ? t('correct') : `${finalUserAnswerForFeedback === null ? t('timeUp') : t('incorrect')} ${decodeHtml(shuffledOptions[shuffledCorrectAnswerIndex])}`}
          </div>
        )}

        {isSubmitted && currentQuestion.justification && (
          <div className="p-4 rounded-md bg-gray-100 dark:bg-gray-700 border-l-4 border-[rgb(var(--primary-500))] mb-6">
              <h4 className="font-bold text-[rgb(var(--primary-800))] dark:text-[rgb(var(--primary-200))]">{t('justification')}</h4>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{decodeHtml(currentQuestion.justification)}</p>
              <button onClick={openExplanationModal} className="mt-3 inline-flex items-center text-sm font-medium text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] hover:underline"><LightBulbIcon className="h-4 w-4 mr-1" />{t('explainBetter')}</button>
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
              <button onClick={handleSubmit} disabled={selectedAnswer === null} className="w-full sm:w-auto px-6 py-2 bg-[rgb(var(--primary-600))] text-white rounded-md text-sm font-medium hover:bg-[rgb(var(--primary-700))] disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">{t('submit')}</button>
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
                <div className="mt-6 text-right flex justify-between items-center flex-shrink-0">
                    <button onClick={() => setShowExplanationModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">{t('close')}</button>
                    <button onClick={() => fetchExplanation(modalExplanationStyle)} disabled={isExplanationLoading} className="inline-flex items-center px-4 py-2 bg-[rgb(var(--primary-600))] text-white rounded-md text-sm font-medium hover:bg-[rgb(var(--primary-700))] disabled:opacity-50 disabled:cursor-not-allowed">
                      <RefreshIcon className="h-4 w-4 mr-2" />
                      {t('regenerate')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default QuizView;