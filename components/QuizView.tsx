import React, { useState, useEffect, useRef } from 'react';
import { Question, Difficulty, Language, ActiveQuiz, ExplanationStyle, FirebaseUser, AssistantAiModel } from '../types';
import { getDeeperExplanation, interpretMultipleChoiceAnswerWithAi } from '../services/geminiService';
import { decodeHtml } from '../services/fileService';
import { submitQuestionFeedback } from '../services/firebaseService';
import { StarIcon, FilledStarIcon, SpeakerWaveIcon, StopCircleIcon, LightBulbIcon, RefreshIcon } from './icons';
import { playCorrectSound, playIncorrectSound } from '../services/soundService';
import { speakWithVoicePersona } from '../services/voiceService';

interface QuizViewProps {
  activeQuiz: ActiveQuiz;
  toggleFavorite: (question: Question) => void;
  isFavorite: (questionId: string) => boolean;
  t: (key: any) => string;
  onUpdate: (update: Partial<ActiveQuiz>) => void;
  onComplete: () => void;
  onSaveAndExit: () => void;
  language: Language;
  autoReadAloud: boolean;
  soundEnabled: boolean;
  voiceAssistantMode: boolean;
  voicePersona?: 'default' | 'devyn' | 'clotilde';
  assistantAiModel: AssistantAiModel;
  currentUser: FirebaseUser | null;
}

const TIME_LIMITS: Record<Difficulty, number> = {
    [Difficulty.Easy]: 30,
    [Difficulty.Medium]: 20,
    [Difficulty.Hard]: 10,
};

const QuizView: React.FC<QuizViewProps> = ({ 
  activeQuiz, 
  toggleFavorite, 
  isFavorite, 
  t, 
  onUpdate, 
  onComplete, 
  language, 
  onSaveAndExit,
  autoReadAloud,
  soundEnabled,
  voiceAssistantMode,
  voicePersona = 'default',
  assistantAiModel,
  currentUser
}) => {
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
  const [isExplanationSaved, setIsExplanationSaved] = useState(false);
  
  // Custom interactive animations state
  const [submitFeedback, setSubmitFeedback] = useState<'correct' | 'incorrect' | 'timeout' | null>(null);

  const timeLimit = TIME_LIMITS[difficulty];
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [shuffledCorrectAnswerIndex, setShuffledCorrectAnswerIndex] = useState<number>(0);
  
  // Feedback states
  const [ratedStatus, setRatedStatus] = useState<'good' | 'bad' | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Voice assistant state
  const [assistantStatus, setAssistantStatus] = useState<'idle' | 'reading' | 'listening' | 'grading' | 'explaining'>('idle');
  const [mcqRecognition, setMcqRecognition] = useState<any>(null);
  const voiceAssistantModeRef = useRef(voiceAssistantMode);
  const shuffledOptionsRef = useRef(shuffledOptions);
  const shuffledCorrectAnswerIndexRef = useRef(shuffledCorrectAnswerIndex);

  useEffect(() => { voiceAssistantModeRef.current = voiceAssistantMode; }, [voiceAssistantMode]);
  useEffect(() => { shuffledOptionsRef.current = shuffledOptions; }, [shuffledOptions]);
  useEffect(() => { shuffledCorrectAnswerIndexRef.current = shuffledCorrectAnswerIndex; }, [shuffledCorrectAnswerIndex]);

  useEffect(() => {
    setRatedStatus(null);
  }, [currentQuestionIndex]);

  const handleRateGood = async () => {
    setRatedStatus('good');
    try {
      await submitQuestionFeedback(
        activeQuiz.id,
        activeQuiz.name || t('untitledQuiz'),
        currentQuestion.id,
        currentQuestion.questionText,
        currentUser?.uid || 'guest',
        currentUser?.alias || 'Invitado',
        'good',
        '',
        activeQuiz.creatorUid || ''
      );
    } catch (err) {
      console.error("Error submitting good question feedback:", err);
    }
  };

  const handleRateBadClick = () => {
    setFeedbackComment('');
    setShowFeedbackModal(true);
  };

  const handleConfirmBadFeedback = async () => {
    if (!feedbackComment.trim()) return;
    setIsSubmittingFeedback(true);
    try {
      await submitQuestionFeedback(
        activeQuiz.id,
        activeQuiz.name || t('untitledQuiz'),
        currentQuestion.id,
        currentQuestion.questionText,
        currentUser?.uid || 'guest',
        currentUser?.alias || 'Invitado',
        'bad',
        feedbackComment.trim(),
        activeQuiz.creatorUid || ''
      );
      setRatedStatus('bad');
      setShowFeedbackModal(false);
    } catch (err) {
      console.error("Error submitting bad question feedback:", err);
      alert("No se pudo enviar la valoración.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleTimeOut = () => {
    setIsSubmitted(true);
    setSelectedAnswer(null); // Indicates timeout
    setSubmitFeedback('timeout');
    if (soundEnabled) playIncorrectSound();
  };

  useEffect(() => {
    return () => { // Cleanup speech on component unmount
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      if (mcqRecognition) {
        try { mcqRecognition.stop(); } catch (_) {}
      }
    };
  }, []);

  // Helper to speak text with a callback on finish  
  const speakText = (text: string, onEndCallback?: () => void) => {
    if (!('speechSynthesis' in window)) {
      if (onEndCallback) onEndCallback();
      return;
    }
    speakWithVoicePersona(text, language, voicePersona, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        if (onEndCallback) onEndCallback();
      },
      onError: () => {
        setIsSpeaking(false);
        if (onEndCallback) onEndCallback();
      },
    });
  };

  const parseSpokenOptionLetter = (rawTranscript: string): number | null => {
    const normalized = rawTranscript
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,;:!?()]/g, ' ')
      .trim();
    const patterns: Array<[RegExp, number]> = [
      [/^(?:a|opcion a|option a|letra a|letter a|respuesta a|answer a)$/, 0],
      [/^(?:b|be|opcion b|option b|letra b|letter b|respuesta b|answer b)$/, 1],
      [/^(?:c|ce|opcion c|option c|letra c|letter c|respuesta c|answer c)$/, 2],
      [/^(?:d|de|opcion d|option d|letra d|letter d|respuesta d|answer d)$/, 3],
    ];
    for (const [pattern, index] of patterns) {
      if (pattern.test(normalized)) return index;
    }
    return null;
  };

  // Start recognition for MCQ - listens for A/B/C/D and auto-submits
  const startMcqListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = language === 'en' ? 'en-US' : 'es-ES';
      rec.onstart = () => setAssistantStatus('listening');
      rec.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript.trim();
        let chosenIndex = parseSpokenOptionLetter(transcript);

        if (chosenIndex === null) {
          setAssistantStatus('grading');
          try {
            const aiMatch = await interpretMultipleChoiceAnswerWithAi(
              currentQuestion.questionText,
              shuffledOptionsRef.current,
              transcript,
              language,
              assistantAiModel
            );
            if (aiMatch.optionIndex !== null && aiMatch.confidence >= 45) {
              chosenIndex = aiMatch.optionIndex;
            }
          } catch (err) {
            console.error('AI answer interpretation failed:', err);
          }
        }

        if (chosenIndex !== null && chosenIndex < shuffledOptionsRef.current.length) {
          setAssistantStatus('grading');
          const chosen = chosenIndex;
          const correct = shuffledCorrectAnswerIndexRef.current;
          const opts = shuffledOptionsRef.current;
          // Submit the answer
          const selectedOptionText = opts[chosen];
          const originalOptionIndex = currentQuestion.options.indexOf(selectedOptionText);
          onUpdate({ userAnswers: { ...userAnswers, [currentQuestion.id]: originalOptionIndex } });
          setSelectedAnswer(chosen);
          setIsSubmitted(true);
          const isCorrect = chosen === correct;
          if (isCorrect) {
            setSubmitFeedback('correct');
            if (soundEnabled) playCorrectSound();
          } else {
            setSubmitFeedback('incorrect');
            if (soundEnabled) playIncorrectSound();
          }
          // Speak feedback and advance
          setTimeout(() => {
            if (!voiceAssistantModeRef.current) return;
            setAssistantStatus('explaining');
            const correctText = decodeHtml(opts[correct]);
            const feedbackMsg = language === 'en'
              ? isCorrect
                ? `Correct! The answer is ${correctText}.`
                : `Incorrect. The correct answer was ${correctText}.`
              : isCorrect
                ? `¡Correcto! La respuesta es ${correctText}.`
                : `Incorrecto. La respuesta correcta era ${correctText}.`;
            speakText(feedbackMsg, () => {
              setTimeout(() => {
                if (!voiceAssistantModeRef.current) return;
                setSubmitFeedback(null);
                if (currentQuestionIndex < questions.length - 1) {
                  onUpdate({ currentQuestionIndex: currentQuestionIndex + 1 });
                } else {
                  onComplete();
                }
              }, 1500);
            });
          }, 200);
        } else {
          // Couldn't parse, re-listen
          setAssistantStatus('explaining');
          const retryMessage = language === 'en'
            ? 'I could not understand your answer. Please say the letter, or describe the option again.'
            : 'No pude entender tu respuesta. Di la letra, o describe la opcion nuevamente.';
          speakText(retryMessage, () => {
            if (voiceAssistantModeRef.current) startMcqListening();
            else setAssistantStatus('idle');
          });
        }
      };
      rec.onend = () => {
        if (assistantStatus === 'listening') setAssistantStatus('idle');
      };
      rec.onerror = () => setAssistantStatus('idle');
      rec.start();
      setMcqRecognition(rec);
    } catch (err) {
      console.error('MCQ recognition error:', err);
      setAssistantStatus('idle');
    }
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
    };
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
      const idx = originalOptions.indexOf(userAnswerText);
      setSelectedAnswer(idx);
      setIsSubmitted(true);
      setSubmitFeedback(idx === newShuffledCorrectIndex ? 'correct' : 'incorrect');
    } else {
      setSelectedAnswer(null);
      setIsSubmitted(false);
      setSubmitFeedback(null);
    }
    
    setAnimate('animate-fade-in');
    const timer = setTimeout(() => setAnimate(''), 500);
    return () => clearTimeout(timer);
  }, [currentQuestion, userAnswers]);

  // Voice Assistant or Automatic Speech Synthesis Readout
  useEffect(() => {
    let speechTimer: NodeJS.Timeout;
    if (currentQuestion && !isSubmitted && shuffledOptions.length > 0) {
      if (voiceAssistantMode) {
        setAssistantStatus('idle');
        speechTimer = setTimeout(() => {
          setAssistantStatus('reading');
          const qNum = currentQuestionIndex + 1;
          const qText = decodeHtml(currentQuestion.questionText);
          const optionsText = shuffledOptions.map((opt, i) => `${String.fromCharCode(65 + i)}. ${decodeHtml(opt)}`).join('. ');
          const promptSpeech = language === 'en'
            ? `Question ${qNum}. ${qText}. Options: ${optionsText}. Say the letter, or answer in your own words and I will match it with AI.`
            : `Pregunta ${qNum}. ${qText}. Opciones: ${optionsText}. Di la letra, o responde con tus palabras y la IA elegira la opcion mas cercana.`;
          speakText(promptSpeech, () => {
            if (voiceAssistantModeRef.current) {
              startMcqListening();
            }
          });
        }, 500);
      } else if (autoReadAloud) {
        speechTimer = setTimeout(() => {
          if (!('speechSynthesis' in window)) return;
          const textToSpeak = `${decodeHtml(currentQuestion.questionText)}. ${shuffledOptions.map((opt, i) => `${t('option')} ${String.fromCharCode(65 + i)}. ${decodeHtml(opt)}`).join('. ')}`;
          speakText(textToSpeak);
        }, 250);
      }
    }
    return () => {
      if (speechTimer) clearTimeout(speechTimer);
      if (voiceAssistantMode && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentQuestionIndex, shuffledOptions, voiceAssistantMode, autoReadAloud, isSubmitted]);

  // Cancel speech on submit
  useEffect(() => {
    if (isSubmitted) {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    }
  }, [isSubmitted]);
  
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

      // Trigger interactive feedback (Sound & Premium Animations)
      const isCorrect = selectedAnswer === shuffledCorrectAnswerIndex;
      if (isCorrect) {
        setSubmitFeedback('correct');
        if (soundEnabled) playCorrectSound();
      } else {
        setSubmitFeedback('incorrect');
        if (soundEnabled) playIncorrectSound();
      }
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
    speakText(textToSpeak);
  };

  const fetchExplanation = async (styleToUse: ExplanationStyle) => {
    setIsExplanationLoading(true);
    setExplanation('');
    setIsExplanationSaved(false);
    try {
        const deeperExplanation = await getDeeperExplanation(currentQuestion.questionText, shuffledOptions[shuffledCorrectAnswerIndex], currentQuestion.justification || '', language, styleToUse, assistantAiModel);
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
      setSubmitFeedback(null);
      onUpdate({ currentQuestionIndex: currentQuestionIndex + 1 });
    }
  };

  const getOptionClass = (index: number) => {
    if (!isSubmitted) {
      return `border-gray-300 dark:border-gray-600 hover:bg-[rgba(var(--primary-50),1)] dark:hover:bg-gray-700 ${selectedAnswer === index ? 'ring-2 ring-[rgb(var(--primary-500))] border-[rgb(var(--primary-500))]' : ''}`;
    }
    if (index === shuffledCorrectAnswerIndex) {
      return 'bg-green-100 dark:bg-green-900 border-green-500 text-green-800 dark:text-green-200 animate-green-glow';
    }
    if (index === selectedAnswer) {
      return 'bg-red-100 dark:bg-red-900 border-red-500 text-red-800 dark:text-red-200 animate-red-glow';
    }
    return 'border-gray-300 dark:border-gray-600 opacity-60';
  };

  const finalUserAnswerForFeedback = selectedAnswer ?? (userAnswerForThisQuestion !== undefined ? shuffledOptions.indexOf(currentQuestion.options[userAnswerForThisQuestion]) : null);

  const getFeedbackClass = () => {
    if (!isSubmitted) return '';
    if (finalUserAnswerForFeedback === shuffledCorrectAnswerIndex) return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 animate-correct-pop border border-green-300 dark:border-green-800';
    if (finalUserAnswerForFeedback === null) return 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700';
    return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 border border-red-300 dark:border-red-800';
  };
  
  if (!currentQuestion) return <div>Loading question...</div>;

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / timeLimit) * circumference;
  
  // Decide which transition animation class to use on the card
  const getCardAnimationClass = () => {
    if (submitFeedback === 'correct') return 'animate-correct-pop animate-green-glow';
    if (submitFeedback === 'incorrect' || submitFeedback === 'timeout') return 'animate-incorrect-shake animate-red-glow';
    return animate;
  };

  return (
    <>
      <div className={`max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg transition-all duration-300 ${getCardAnimationClass()}`}>
        {voiceAssistantMode && (
          <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 shadow-md backdrop-blur-md ${
            assistantStatus === 'reading' ? 'bg-blue-50/80 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40 text-blue-700 dark:text-blue-300' :
            assistantStatus === 'listening' ? 'bg-red-50/80 border-red-200 dark:bg-red-950/20 dark:border-red-900/40 text-red-700 dark:text-red-300 animate-pulse' :
            assistantStatus === 'grading' ? 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 text-amber-700 dark:text-amber-300' :
            assistantStatus === 'explaining' ? 'bg-purple-50/80 border-purple-200 dark:bg-purple-950/20 dark:border-purple-900/40 text-purple-700 dark:text-purple-300' :
            'bg-gray-50/80 border-gray-200 dark:bg-gray-850/20 dark:border-gray-800/40 text-gray-700 dark:text-gray-300'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-xl select-none">
                {assistantStatus === 'reading' ? '🔊' :
                 assistantStatus === 'listening' ? '🎙️' :
                 assistantStatus === 'grading' ? '⚡' :
                 assistantStatus === 'explaining' ? '💡' : '🤖'}
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-60">Modo Manos Libres</p>
                <p className="text-sm font-bold mt-0.5">
                  {assistantStatus === 'reading' ? t('assistantStatusReading') :
                   assistantStatus === 'listening' ? (language === 'en' ? 'Listening... say A, B, C or D' : 'Escuchando... di A, B, C o D') :
                   assistantStatus === 'grading' ? t('assistantStatusGrading') :
                   assistantStatus === 'explaining' ? t('assistantStatusFeedback') :
                   t('voiceAssistantMode')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {assistantStatus === 'listening' ? (
                <div className="flex items-center gap-0.5 h-6">
                  <span className="w-1 bg-red-500 rounded-full animate-bounce h-3" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }} />
                  <span className="w-1 bg-red-500 rounded-full animate-bounce h-5" style={{ animationDelay: '0.3s', animationDuration: '0.5s' }} />
                  <span className="w-1 bg-red-500 rounded-full animate-bounce h-4" style={{ animationDelay: '0.2s', animationDuration: '0.7s' }} />
                  <span className="w-1 bg-red-500 rounded-full animate-bounce h-2" style={{ animationDelay: '0.4s', animationDuration: '0.4s' }} />
                </div>
              ) : assistantStatus === 'grading' ? (
                <svg className="animate-spin h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <span className={`h-2.5 w-2.5 rounded-full ${
                  assistantStatus === 'reading' ? 'bg-blue-500 animate-ping' :
                  assistantStatus === 'explaining' ? 'bg-purple-500 animate-ping' : 'bg-gray-400'
                }`} />
              )}
            </div>
          </div>
        )}
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
          <div className="p-4 rounded-md bg-gray-100 dark:bg-gray-700 border-l-4 border-[rgb(var(--primary-500))] mb-6 animate-correct-pop">
              <h4 className="font-bold text-[rgb(var(--primary-800))] dark:text-[rgb(var(--primary-200))]">{t('justification')}</h4>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{decodeHtml(currentQuestion.justification)}</p>
              <button onClick={openExplanationModal} className="mt-3 inline-flex items-center text-sm font-medium text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] hover:underline"><LightBulbIcon className="h-4 w-4 mr-1" />{t('explainBetter')}</button>
          </div>
        )}

        {isSubmitted && (
          <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700/60 shadow-sm animate-fade-in flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                ¿Qué te pareció esta pregunta?
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Valora el contenido para ayudarnos a mejorar.
              </p>
            </div>
            
            {ratedStatus ? (
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                ratedStatus === 'good'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              } animate-correct-pop`}>
                {ratedStatus === 'good'
                  ? '¡Gracias por tu valoración positiva! 💚'
                  : '¡Comentarios enviados! Gracias por ayudarnos. 🧡'}
              </span>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRateGood}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 active:scale-95 border border-green-200 dark:border-green-800/30 transition-all"
                  title="Pregunta correcta o de buena calidad"
                >
                  <span className="text-base select-none">👍</span>
                  <span>Bien</span>
                </button>
                <button
                  type="button"
                  onClick={handleRateBadClick}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 active:scale-95 border border-red-200 dark:border-red-800/30 transition-all"
                  title="Pregunta incorrecta, con fallos o ambigua"
                >
                  <span className="text-base select-none">👎</span>
                  <span>Mal / Reportar</span>
                </button>
              </div>
            )}
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto flex flex-col animate-correct-pop" onClick={(e) => e.stopPropagation()}>
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
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowFeedbackModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-150 dark:border-gray-700/50 flex flex-col animate-correct-pop" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>🚨</span> Reportar Pregunta / Error
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">
              ¿Por qué consideras que esta pregunta está mal? Tu feedback le llegará directamente al creador del reto y al administrador para corregirla.
            </p>
            
            <div className="mt-4">
              <label htmlFor="feedback-comment" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Comentarios / Observación
              </label>
              <textarea
                id="feedback-comment"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--primary-500))] outline-none transition-all text-sm"
                placeholder="Ej. La respuesta correcta no es la opción B, la explicación contradice la respuesta..."
                disabled={isSubmittingFeedback}
              />
            </div>
            
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="px-4 py-2 bg-gray-250 hover:bg-gray-350 text-gray-800 rounded-xl text-xs font-bold dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-all"
                disabled={isSubmittingFeedback}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmBadFeedback}
                disabled={!feedbackComment.trim() || isSubmittingFeedback}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isSubmittingFeedback ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <span>Enviar Reporte</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuizView;
