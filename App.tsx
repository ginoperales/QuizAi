import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Question, View, Language, ActiveQuiz, CompletedQuiz, ThemeSettings, ThemeColor, ExplanationStyle } from './types';
import { APP_TITLE, LOCALIZED_STRINGS } from './constants';
import { THEMES } from './themes';
import WelcomeView from './components/WelcomeView';
import ResumeQuizView from './components/ResumeQuizView';
import QuizView from './components/QuizView';
import FavoritesView from './components/FavoritesView';
import ResultsView from './components/ResultsView';
import HistoryView from './components/HistoryView';
import QuizDetailView from './components/QuizDetailView';
import QuizEditorView from './components/QuizEditorView';
import SplashScreen from './components/SplashScreen';
import Modal from './components/Modal';
import SettingsView from './components/SettingsView';
import StatisticsView from './components/StatisticsView';
import FlashcardsView from './components/FlashcardsView';
import { StarIcon, BookOpenIcon, PlusCircleIcon, HistoryIcon, Cog6ToothIcon, ChartBarIcon } from './components/icons';

type SaveAction = 'complete' | 'exit';
type QuizType = 'completed' | 'paused';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentView, setCurrentView] = useState<View>("generator");
  
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(() => {
    const saved = localStorage.getItem('activeQuiz');
    return saved ? JSON.parse(saved) : null;
  });

  const [pausedQuizzes, setPausedQuizzes] = useState<ActiveQuiz[]>(() => {
    const saved = localStorage.getItem('pausedQuizzes');
    return saved ? JSON.parse(saved) : [];
  });

  const [completedQuizzes, setCompletedQuizzes] = useState<CompletedQuiz[]>(() => {
    const saved = localStorage.getItem('completedQuizzes');
    return saved ? JSON.parse(saved) : [];
  });

  const [favorites, setFavorites] = useState<Question[]>(() => {
    const saved = localStorage.getItem('quizFavorites');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [language, setLanguage] = useState<Language>('es');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastCompletedQuiz, setLastCompletedQuiz] = useState<CompletedQuiz | null>(null);
  const [viewingQuiz, setViewingQuiz] = useState<CompletedQuiz | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<CompletedQuiz | null>(null);
  const [flashcardQuiz, setFlashcardQuiz] = useState<CompletedQuiz | ActiveQuiz | null>(null);

  // State for the save modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [quizNameToSave, setQuizNameToSave] = useState('');
  const [saveAction, setSaveAction] = useState<SaveAction | null>(null);
  
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => {
    const saved = localStorage.getItem('themeSettings');
    const defaultSettings: ThemeSettings = { color: 'indigo', mode: 'dark' };
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            return defaultSettings;
        }
    }
    return defaultSettings;
  });

  const t = useCallback((key: keyof typeof LOCALIZED_STRINGS.en | ExplanationStyle, options?: Record<string, string | number>) => {
    let str = LOCALIZED_STRINGS[language][key as keyof typeof LOCALIZED_STRINGS.en] || LOCALIZED_STRINGS.en[key as keyof typeof LOCALIZED_STRINGS.en];
    if (options) {
        Object.keys(options).forEach(optKey => {
            str = str.replace(`{${optKey}}`, String(options[optKey]));
        });
    }
    return str;
  }, [language]);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsInitializing(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Effect to apply and save theme settings
  useEffect(() => {
    // Apply dark/light mode
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(themeSettings.mode);

    // Apply color theme
    const theme = THEMES[themeSettings.color];
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(`--primary-${key}`, value.join(' '));
    });

    // Save to local storage
    localStorage.setItem('themeSettings', JSON.stringify(themeSettings));
  }, [themeSettings]);

  useEffect(() => {
    localStorage.setItem('quizFavorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (!isInitializing) {
      localStorage.setItem('activeQuiz', JSON.stringify(activeQuiz));
    }
  }, [activeQuiz, isInitializing]);
  
  useEffect(() => {
    localStorage.setItem('pausedQuizzes', JSON.stringify(pausedQuizzes));
  }, [pausedQuizzes]);

  useEffect(() => {
    localStorage.setItem('completedQuizzes', JSON.stringify(completedQuizzes));
  }, [completedQuizzes]);

  const handleToggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'es' : 'en');
  };
  
  const handleQuizGenerated = (generatedQuestions: Question[], selectedDifficulty: any, timed: boolean, explanationStyle: ExplanationStyle) => {
    if (activeQuiz && !window.confirm(t('areYouSureAbandon'))) {
      setIsLoading(false);
      return;
    }

    const shuffledQuestions = [...generatedQuestions];
    for (let i = shuffledQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
    }
    
    const newQuiz: ActiveQuiz = {
        id: Date.now().toString(),
        questions: shuffledQuestions,
        difficulty: selectedDifficulty,
        isTimed: timed,
        explanationStyle: explanationStyle,
        currentQuestionIndex: 0,
        userAnswers: {},
    };

    setActiveQuiz(newQuiz);
    setCurrentView('quiz');
    setError(null);
    setIsLoading(false);
  };
  
  const handleGenerationFailed = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  const handleUpdateActiveQuiz = (update: Partial<ActiveQuiz>) => {
    setActiveQuiz(prev => prev ? { ...prev, ...update } : null);
  };
  
  const handleQuizComplete = () => {
    setSaveAction('complete');
    setQuizNameToSave(activeQuiz?.name || t('untitledQuiz'));
    setIsSaveModalOpen(true);
  };

  const handleSaveAndExit = () => {
    setSaveAction('exit');
    setQuizNameToSave(activeQuiz?.name || t('untitledQuiz'));
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = () => {
    if (!activeQuiz || !saveAction) return;

    const namedQuiz = {
        ...activeQuiz,
        name: quizNameToSave.trim() || t('untitledQuiz'),
    };
    
    if (saveAction === 'exit') {
        setPausedQuizzes(prev => [namedQuiz, ...prev]);
        setActiveQuiz(null);
        setCurrentView('generator');
    } else { // 'complete'
        let score = 0;
        activeQuiz.questions.forEach(q => {
            const userAnswerIndex = activeQuiz.userAnswers[q.id];
            if (userAnswerIndex !== undefined && userAnswerIndex === q.correctAnswerIndex) {
                score++;
            }
        });

        const completed: CompletedQuiz = {
            ...namedQuiz,
            score,
            totalQuestions: activeQuiz.questions.length,
            date: new Date().toISOString(),
        };
        
        setCompletedQuizzes(prev => [completed, ...prev]);
        setActiveQuiz(null);
        setLastCompletedQuiz(completed);
        setCurrentView('results');
    }
    
    setIsSaveModalOpen(false);
    setQuizNameToSave('');
    setSaveAction(null);
  };

  const handleAbandonQuiz = () => {
    if (window.confirm(t('areYouSureAbandon'))) {
        setActiveQuiz(null);
    }
  };

  const handleRetakeIncorrect = () => {
    if (!lastCompletedQuiz) return;
    
    const incorrectQuestions = lastCompletedQuiz.questions.filter(q => {
        const userAnswer = lastCompletedQuiz.userAnswers[q.id];
        return userAnswer === undefined || userAnswer !== q.correctAnswerIndex;
    });

    if (incorrectQuestions.length > 0) {
        handleQuizGenerated(incorrectQuestions, lastCompletedQuiz.difficulty, lastCompletedQuiz.isTimed, lastCompletedQuiz.explanationStyle);
    }
  };

  const handleDeleteQuiz = (idToDelete: string, type: QuizType) => {
    if (type === 'completed') {
        setCompletedQuizzes(prev => prev.filter(item => item.id !== idToDelete));
    } else {
        setPausedQuizzes(prev => prev.filter(item => item.id !== idToDelete));
    }
  };

  const handleViewDetails = (idToView: string) => {
    const quizToView = completedQuizzes.find(q => q.id === idToView);
    if (quizToView) {
        setViewingQuiz(quizToView);
        setCurrentView('quizDetail');
    }
  };

  const handleRetakeQuiz = (idToRetake: string) => {
    const quizToEdit = completedQuizzes.find(q => q.id === idToRetake);
    if (quizToEdit) {
        setEditingQuiz(quizToEdit);
        setCurrentView('quizEditor');
    }
  };
  
  const handleResumeQuiz = (idToResume: string) => {
    const quizToResume = pausedQuizzes.find(q => q.id === idToResume);
    if (quizToResume) {
        setActiveQuiz(quizToResume);
        setPausedQuizzes(prev => prev.filter(q => q.id !== idToResume));
        setCurrentView('quiz');
    }
  };

  const handleStartEditedQuiz = (questions: Question[], originalQuiz: CompletedQuiz) => {
    setEditingQuiz(null);
    handleQuizGenerated(questions, originalQuiz.difficulty, originalQuiz.isTimed, originalQuiz.explanationStyle || ExplanationStyle.Didactica);
  };

  const handleRenameQuiz = (idToRename: string, newName: string, type: QuizType) => {
    if (!newName || newName.trim() === '') return;
    const trimmedName = newName.trim();

    if (type === 'completed') {
        setCompletedQuizzes(prev => prev.map(q => 
            q.id === idToRename ? { ...q, name: trimmedName } : q
        ));
    } else {
        setPausedQuizzes(prev => prev.map(q => 
            q.id === idToRename ? { ...q, name: trimmedName } : q
        ));
    }
  };

  const handleStudyWithFlashcards = (quizToStudy: CompletedQuiz | ActiveQuiz) => {
    setFlashcardQuiz(quizToStudy);
    setCurrentView('flashcards');
  };

  const isFavorite = (questionId: string) => favorites.some(q => q.id === questionId);

  const toggleFavorite = (question: Question) => {
    setFavorites(prev => 
      isFavorite(question.id) 
        ? prev.filter(q => q.id !== question.id)
        : [...prev, question]
    );
  };

  const navItems = useMemo(() => [
    { view: 'generator', label: activeQuiz ? t('continueQuiz') : t('startNewQuiz'), icon: <PlusCircleIcon /> },
    { view: 'favorites', label: `${t('favorites')} (${favorites.length})`, icon: <StarIcon /> },
    { view: 'history', label: t('history'), icon: <HistoryIcon /> },
    { view: 'statistics', label: t('statistics'), icon: <ChartBarIcon /> },
  ], [t, favorites.length, activeQuiz]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <svg className="animate-spin h-10 w-10 text-[rgb(var(--primary-500))]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">{t('generating')}</p>
        </div>
      );
    }
    
    if (error) {
       return (
         <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
           <p className="font-bold">{t('errorTitle')}</p>
           <p>{error}</p>
         </div>
       );
    }

    switch (currentView) {
      case 'quiz':
        return activeQuiz ? (
            <QuizView 
                activeQuiz={activeQuiz}
                onUpdate={handleUpdateActiveQuiz}
                onComplete={handleQuizComplete}
                toggleFavorite={toggleFavorite} 
                isFavorite={isFavorite} 
                t={t} 
                language={language} 
                onSaveAndExit={handleSaveAndExit}
            />
        ) : <WelcomeView onQuizGenerated={handleQuizGenerated} onGenerationFailed={handleGenerationFailed} setIsLoading={setIsLoading} t={t} />;
      case 'favorites':
        return <FavoritesView favorites={favorites} toggleFavorite={toggleFavorite} t={t} />;
      case 'results':
        if (!lastCompletedQuiz) return <WelcomeView onQuizGenerated={handleQuizGenerated} onGenerationFailed={handleGenerationFailed} setIsLoading={setIsLoading} t={t} />;
        const incorrectCount = lastCompletedQuiz.totalQuestions - lastCompletedQuiz.score;
        return <ResultsView score={lastCompletedQuiz.score} totalQuestions={lastCompletedQuiz.totalQuestions} onRestart={() => setCurrentView('generator')} onRetake={handleRetakeIncorrect} incorrectCount={incorrectCount} t={t} />;
      case 'history':
        return <HistoryView 
                  completedHistory={completedQuizzes} 
                  pausedHistory={pausedQuizzes}
                  onDelete={handleDeleteQuiz} 
                  onViewDetails={handleViewDetails} 
                  onRetake={handleRetakeQuiz} 
                  onRename={handleRenameQuiz} 
                  onResume={handleResumeQuiz}
                  onStudy={handleStudyWithFlashcards}
                  t={t} />;
      case 'quizDetail':
          return viewingQuiz ? (
              <QuizDetailView 
                quiz={viewingQuiz} 
                onGoBack={() => setCurrentView('history')} 
                onRetake={handleRetakeQuiz}
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
                onStudy={handleStudyWithFlashcards}
                t={t}
              />
          ) : <HistoryView completedHistory={completedQuizzes} pausedHistory={pausedQuizzes} onDelete={handleDeleteQuiz} onViewDetails={handleViewDetails} onRetake={handleRetakeQuiz} onRename={handleRenameQuiz} onResume={handleResumeQuiz} onStudy={handleStudyWithFlashcards} t={t} />;
      case 'quizEditor':
          return editingQuiz ? (
              <QuizEditorView 
                quiz={editingQuiz} 
                onStartQuiz={(questions) => handleStartEditedQuiz(questions, editingQuiz)} 
                onGoBack={() => { setEditingQuiz(null); setCurrentView('history'); }} 
                t={t}
              />
          ) : <HistoryView completedHistory={completedQuizzes} pausedHistory={pausedQuizzes} onDelete={handleDeleteQuiz} onViewDetails={handleViewDetails} onRetake={handleRetakeQuiz} onRename={handleRenameQuiz} onResume={handleResumeQuiz} onStudy={handleStudyWithFlashcards} t={t} />;
      case 'flashcards':
        return flashcardQuiz ? (
          <FlashcardsView
            quiz={flashcardQuiz}
            onGoBack={() => {
              if ('score' in flashcardQuiz) {
                setViewingQuiz(flashcardQuiz);
                setCurrentView('quizDetail');
              } else {
                setCurrentView('history');
              }
              setFlashcardQuiz(null);
            }}
            t={t}
          />
        ) : <HistoryView completedHistory={completedQuizzes} pausedHistory={pausedQuizzes} onDelete={handleDeleteQuiz} onViewDetails={handleViewDetails} onRetake={handleRetakeQuiz} onRename={handleRenameQuiz} onResume={handleResumeQuiz} onStudy={handleStudyWithFlashcards} t={t} />;
      case 'statistics':
        return <StatisticsView completedQuizzes={completedQuizzes} t={t} />;
      case 'generator':
      default:
        return activeQuiz ? (
          <ResumeQuizView
            activeQuiz={activeQuiz}
            onResume={() => setCurrentView('quiz')}
            onStartNew={handleAbandonQuiz}
            t={t}
          />
        ) : (
          <WelcomeView
            onQuizGenerated={handleQuizGenerated}
            onGenerationFailed={handleGenerationFailed}
            setIsLoading={setIsLoading}
            t={t}
          />
        );
    }
  };
  
  const handleNavClick = (view: View) => {
    if (view === 'generator' && activeQuiz) {
        setCurrentView('quiz');
    } else {
        setCurrentView(view);
    }
    setError(null);
  }

  if (isInitializing) {
    return <SplashScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <BookOpenIcon className="h-8 w-8 text-[rgb(var(--primary-500))]" />
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{APP_TITLE}</h1>
            </div>
            <div className="flex items-center space-x-4">
               <button onClick={handleToggleLanguage} className="text-sm font-medium text-gray-500 dark:text-gray-300 hover:text-[rgb(var(--primary-600))] dark:hover:text-[rgb(var(--primary-400))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(var(--primary-500),1)] rounded-md p-1">
                {language === 'en' ? 'Español' : 'English'}
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white" aria-label={t('settings')}>
                <Cog6ToothIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-center space-x-4 sm:space-x-8">
            {navItems.map(item => (
                <button
                    key={item.view}
                    onClick={() => handleNavClick(item.view as View)}
                    className={`flex items-center space-x-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors duration-200 ${currentView === item.view || (currentView === 'quiz' && item.view === 'generator') || ((currentView === 'quizDetail' || currentView === 'quizEditor' || currentView === 'flashcards') && item.view === 'history') ? 'border-[rgb(var(--primary-500))] text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]' : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-100'}`}
                >
                    {item.icon}
                    <span>{item.label}</span>
                </button>
            ))}
        </div>
      </nav>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {renderContent()}
      </main>

      <footer className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} {APP_TITLE}.</p>
      </footer>

      <Modal 
        isOpen={isSaveModalOpen} 
        onClose={() => setIsSaveModalOpen(false)}
        title={t('enterQuizName')}
      >
        <div className="mt-4">
            <input 
                type="text" 
                value={quizNameToSave} 
                onChange={(e) => setQuizNameToSave(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[rgb(var(--primary-500))] focus:border-[rgb(var(--primary-500))] sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t('untitledQuiz')}
            />
        </div>
        <div className="mt-6 flex justify-end space-x-3">
            <button 
                type="button" 
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            >
                {t('cancel')}
            </button>
            <button 
                type="button" 
                onClick={handleConfirmSave}
                className="px-4 py-2 bg-[rgb(var(--primary-600))] text-white rounded-md text-sm font-medium hover:bg-[rgb(var(--primary-700))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(var(--primary-500),1)]"
            >
                {t('save')}
            </button>
        </div>
      </Modal>

      <SettingsView 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        settings={themeSettings}
        onSettingsChange={setThemeSettings}
        t={t}
      />
    </div>
  );
};

export default App;
