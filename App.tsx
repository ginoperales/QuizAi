import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
// FIX: Add Difficulty to imports for type safety in handleQuizGenerated
import { Question, View, Language, ActiveQuiz, CompletedQuiz, ThemeSettings, ThemeColor, ExplanationStyle, QuizMode, Difficulty, FirebaseUser, FirestoreQuiz, QuizAttempt, AppNotification } from './types';
import { APP_TITLE, LOCALIZED_STRINGS } from './constants';
import { THEMES } from './themes';
import WelcomeView from './components/WelcomeView';
import ResumeQuizView from './components/ResumeQuizView';
import QuizView from './components/QuizView';
import WrittenQuizView from './components/WrittenQuizView';
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
import AuthView from './components/AuthView';
import PublicQuizzesView from './components/PublicQuizzesView';
import AdminDashboard from './components/AdminDashboard';
import LandingView from './components/LandingView';
import { StarIcon, BookOpenIcon, PlusCircleIcon, HistoryIcon, Cog6ToothIcon, ChartBarIcon } from './components/icons';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, getUserProfile, logoutUser, saveQuizAttempt, getUserAttempts, uploadQuiz, addCompleterToQuiz, getUserNotifications, markNotificationAsRead, getQuizById, logActivity, toggleQuizFavorite, getQuizReports, updateActiveQuizProgress, updatePausedQuizzesInDb, createResumeNotification, updateResumeNotificationDetails, deleteNotificationFromDb, updateQuizAttemptQuestions } from './services/firebaseService';

type SaveAction = 'complete' | 'exit';
type QuizType = 'completed' | 'paused';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentView, setCurrentView] = useState<View>("landing");
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [favoriteQuizzes, setFavoriteQuizzes] = useState<string[]>([]);
  
  // Animated transitions states
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState<string | null>(null);
  const [showFarewellOverlay, setShowFarewellOverlay] = useState<string | null>(null);
  // Prevents onAuthStateChanged from navigating while manual login overlay is active
  const isManualLoginRef = useRef(false);
  const isRestoringRef = useRef(true);
  // Mobile hamburger menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // PWA install prompt
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  
  // Notification states
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [pendingReportsCount, setPendingReportsCount] = useState<number>(0);
  
  // Shared quiz preview state
  const [sharedQuizPreview, setSharedQuizPreview] = useState<FirestoreQuiz | null>(null);
  const [randomizeSharedQuiz, setRandomizeSharedQuiz] = useState(false);
  
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
  
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('appLanguage');
    return (saved === 'en' || saved === 'es') ? saved : 'es';
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastCompletedQuiz, setLastCompletedQuiz] = useState<CompletedQuiz | null>(null);
  const [viewingQuiz, setViewingQuiz] = useState<CompletedQuiz | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<CompletedQuiz | ActiveQuiz | null>(null);
  const [flashcardQuiz, setFlashcardQuiz] = useState<CompletedQuiz | ActiveQuiz | null>(null);

  // State for the save modal & sharing
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [quizNameToSave, setQuizNameToSave] = useState('');
  const [saveAction, setSaveAction] = useState<SaveAction | null>(null);
  const [shareQuizPublicly, setShareQuizPublicly] = useState<boolean>(false);
  
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => {
    const saved = localStorage.getItem('themeSettings');
    const defaultSettings: ThemeSettings = { color: 'indigo', mode: 'dark', autoReadAloud: false, soundEnabled: true };
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return { ...defaultSettings, ...parsed };
        } catch (e) {
            return defaultSettings;
        }
    }
    return defaultSettings;
  });

  // Save language to localStorage when changed
  useEffect(() => {
    localStorage.setItem('appLanguage', language);
  }, [language]);

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

  const combinedPausedHistory = useMemo(() => {
    if (!activeQuiz) return pausedQuizzes;
    // Prevent duplicate entries by ID
    const filteredPaused = pausedQuizzes.filter(q => q.id !== activeQuiz.id);
    return [activeQuiz, ...filteredPaused];
  }, [activeQuiz, pausedQuizzes]);

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    window.addEventListener('appinstalled', () => {
      setShowInstallBanner(false);
      setDeferredInstallPrompt(null);
    });
    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      setDeferredInstallPrompt(null);
    }
  };

  // Track Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoadingAuth(true);
      isRestoringRef.current = true;
      if (user) {
        try {
          let profile = await getUserProfile(user.uid);
          if (!profile) {
            // Auto-heal / fallback profile creation
            profile = {
              uid: user.uid,
              email: user.email || '',
              alias: user.displayName || user.email?.split('@')[0] || 'Usuario',
              readableId: `QZ-${Math.floor(1000 + Math.random() * 9000)}`,
              role: 'student', // Fallback role
              createdAt: new Date().toISOString()
            };
            try {
              const { doc, setDoc } = await import('firebase/firestore');
              const { db } = await import('./services/firebaseService');
              await setDoc(doc(db, 'users', user.uid), profile);
            } catch (err) {
              console.error("Error creating fallback profile document:", err);
            }
          }
          
          // Restore active quiz progress and paused quizzes from the database profile!
          if (profile) {
            if (profile.activeQuizProgress) {
              setActiveQuiz(profile.activeQuizProgress);
            } else {
              setActiveQuiz(null);
              localStorage.removeItem('activeQuiz');
            }
            if (profile.pausedQuizzes) {
              setPausedQuizzes(profile.pausedQuizzes);
            } else {
              setPausedQuizzes([]);
              localStorage.removeItem('pausedQuizzes');
            }
          } else {
            setActiveQuiz(null);
            setPausedQuizzes([]);
            localStorage.removeItem('activeQuiz');
            localStorage.removeItem('pausedQuizzes');
          }
          
          setCurrentUser(profile);
          setFavoriteQuizzes(profile?.favoriteQuizzes || []);
          
          // Only navigate if not in middle of a manual login (which handles its own navigation)
          if (!isManualLoginRef.current) {
            setCurrentView('generator');
          }
          
          if (profile) {
            const dbAttempts = await getUserAttempts(profile.uid);
            const mappedCompleted: CompletedQuiz[] = dbAttempts.map(att => ({
              id: att.id,
              name: att.quizName,
              questions: att.questions,
              difficulty: att.difficulty,
              isTimed: false,
              explanationStyle: ExplanationStyle.Didactica,
              mode: att.mode,
              userAnswers: att.userAnswers,
              writtenUserAnswers: att.writtenUserAnswers as any,
              score: att.score,
              totalQuestions: att.totalQuestions,
              date: att.date
            }));
            setCompletedQuizzes(mappedCompleted);
          }
        } catch (e) {
          console.error("Error setting user profile or attempts:", e);
        }
      } else {
        setCurrentUser(null);
        setFavoriteQuizzes([]);
        setPendingReportsCount(0);
        setCurrentView('landing'); // Redirect to landing page on logout
        
        // Safe logout cleanups
        setActiveQuiz(null);
        setPausedQuizzes([]);
        setCompletedQuizzes([]);
        localStorage.removeItem('activeQuiz');
        localStorage.removeItem('pausedQuizzes');
        localStorage.removeItem('completedQuizzes');
      }
      setIsLoadingAuth(false);
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 100);
    });
    return () => unsubscribe();
  }, []);

  // Check for shared quizId in URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('quizId');
    if (quizId) {
      // Clear URL params cleanly
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const loadSharedPreview = async () => {
        try {
          setIsLoading(true);
          const quiz = await getQuizById(quizId);
          if (quiz) {
            setSharedQuizPreview(quiz);
          } else {
            alert("El cuestionario compartido no existe o fue eliminado.");
          }
        } catch (err) {
          console.error("Error loading shared quiz preview:", err);
        } finally {
          setIsLoading(false);
        }
      };
      loadSharedPreview();
    }
  }, []);

  // Automatically process pending shared quiz if user state is loaded (e.g. after login)
  useEffect(() => {
    if (isLoadingAuth) return;
    
    const pendingQuizId = sessionStorage.getItem('pendingSharedQuizId');
    if (pendingQuizId && currentUser) {
      const startPendingQuiz = async () => {
        try {
          setIsLoading(true);
          const quiz = await getQuizById(pendingQuizId);
          if (quiz) {
            const newQuiz: ActiveQuiz = {
              id: quiz.id,
              name: quiz.name,
              questions: quiz.questions,
              difficulty: quiz.difficulty,
              isTimed: quiz.isTimed,
              explanationStyle: quiz.explanationStyle,
              currentQuestionIndex: 0,
              mode: quiz.mode,
              userAnswers: {},
              writtenUserAnswers: quiz.mode === 'Written' ? {} : undefined,
              savedExplanations: {},
              creatorUid: quiz.creatorUid,
              creatorAlias: quiz.creatorAlias,
            };
            setActiveQuiz(newQuiz);
            setCurrentView('quiz');
            sessionStorage.removeItem('pendingSharedQuizId');
          } else {
            sessionStorage.removeItem('pendingSharedQuizId');
          }
        } catch (err) {
          console.error("Error loading pending shared quiz:", err);
        } finally {
          setIsLoading(false);
        }
      };
      startPendingQuiz();
    }
  }, [currentUser, isLoadingAuth]);

  // Poll for user notifications and admin reports when logged in
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setPendingReportsCount(0);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const data = await getUserNotifications(currentUser.uid);
        setNotifications(data);

        // Fetch reports if admin
        if (currentUser.role === 'admin') {
          const reports = await getQuizReports();
          const pending = reports.filter(r => r.status === 'pending').length;
          setPendingReportsCount(pending);
        }
      } catch (err) {
        console.error("Error fetching notifications/reports:", err);
      }
    };

    fetchNotifications();
    
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Effect to apply and save theme settings
  useEffect(() => {
    // Apply dark/light mode
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(themeSettings.mode);

    // Apply color theme
    const theme = THEMES[themeSettings.color];
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(`--primary-${key}`, (value as number[]).join(' '));
    });

    // Save to local storage
    localStorage.setItem('themeSettings', JSON.stringify(themeSettings));
  }, [themeSettings]);

  async function disableOlderResumeNotifications(quizId: string, currentNotifId?: string) {
    if (!currentUser) return;
    try {
      const { collection, query, where, getDocs, doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('./services/firebaseService');
      
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('recipientUid', '==', currentUser.uid),
        where('quizId', '==', quizId),
        where('type', '==', 'resume_progress'),
        where('status', '==', 'unread')
      );
      
      const querySnapshot = await getDocs(q);
      const updatePromises: Promise<void>[] = [];
      const markedIds: string[] = [];

      querySnapshot.forEach((docSnap) => {
        if (docSnap.id !== currentNotifId) {
          markedIds.push(docSnap.id);
          updatePromises.push(updateDoc(doc(db, 'notifications', docSnap.id), { status: 'read' }));
        }
      });
      
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        setNotifications(prev => 
          prev.map(n => 
            markedIds.includes(n.id) ? { ...n, status: 'read' as const } : n
          )
        );
      }
    } catch (err) {
      console.error("Error disabling older resume notifications in Firestore:", err);
    }
  }

  useEffect(() => {
    localStorage.setItem('quizFavorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (isInitializing || isLoadingAuth) return;
    localStorage.setItem('activeQuiz', JSON.stringify(activeQuiz));

    if (currentUser && !isRestoringRef.current) {
      // Sync active progress to user document in Firestore
      updateActiveQuizProgress(currentUser.uid, activeQuiz);

      // Auto-create/update resume_progress notification
      if (activeQuiz && !activeQuiz.notificationId) {
        const createNotificationAsync = async () => {
          try {
            const initialDetails = `Pregunta ${activeQuiz.currentQuestionIndex + 1} de ${activeQuiz.questions.length}`;
            const notifId = await createResumeNotification(
              currentUser.uid,
              'QuizAI',
              activeQuiz.id,
              activeQuiz.name || t('untitledQuiz'),
              initialDetails
            );
            setActiveQuiz(prev => prev && prev.id === activeQuiz.id ? { ...prev, notificationId: notifId } : prev);
            disableOlderResumeNotifications(activeQuiz.id, notifId);
          } catch (err) {
            console.error("Error auto-creating resume notification:", err);
          }
        };
        createNotificationAsync();
      }

      if (activeQuiz && activeQuiz.notificationId) {
        const currentDetails = `Pregunta ${activeQuiz.currentQuestionIndex + 1} de ${activeQuiz.questions.length}`;
        updateResumeNotificationDetails(activeQuiz.notificationId, currentDetails);
        disableOlderResumeNotifications(activeQuiz.id, activeQuiz.notificationId);
      }
    }
  }, [activeQuiz, isInitializing, currentUser, isLoadingAuth]);
  
  useEffect(() => {
    localStorage.setItem('pausedQuizzes', JSON.stringify(pausedQuizzes));
    
    // Sync pausedQuizzes to Firestore if logged in and authenticated profile is fully loaded
    if (currentUser && !isInitializing && !isLoadingAuth && !isRestoringRef.current) {
      updatePausedQuizzesInDb(currentUser.uid, pausedQuizzes);
    }
  }, [pausedQuizzes, currentUser, isInitializing, isLoadingAuth]);

  useEffect(() => {
    localStorage.setItem('completedQuizzes', JSON.stringify(completedQuizzes));
  }, [completedQuizzes]);

  const handleToggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'es' : 'en');
  };
  
  // FIX: Type selectedDifficulty as Difficulty for better type safety.
  const handleQuizGenerated = async (generatedQuestions: Question[], selectedDifficulty: Difficulty, timed: boolean, explanationStyle: ExplanationStyle, mode: QuizMode) => {
    if (activeQuiz && !window.confirm(t('areYouSureAbandon'))) {
      setIsLoading(false);
      return;
    }

    if (activeQuiz) {
      await autoPauseActiveQuiz();
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
        mode: mode,
        userAnswers: {},
        writtenUserAnswers: mode === 'Written' ? {} : undefined,
        savedExplanations: {},
        creatorUid: currentUser?.uid,
        creatorAlias: currentUser?.alias,
    };

    setActiveQuiz(newQuiz);
    setCurrentView('quiz');
    setError(null);
    setIsLoading(false);

    // Log quiz generation activity
    logActivity(
      'QUIZ_GENERATED', 
      `Se generó un nuevo cuestionario con ${generatedQuestions.length} preguntas en dificultad ${selectedDifficulty} y modo ${mode}`, 
      currentUser?.uid, 
      currentUser?.alias || 'Invitado'
    );
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
    
    // If sharing publicly, upload the quiz immediately (applies to both Complete and Exit/Pause actions!)
    if (currentUser && shareQuizPublicly) {
        const quizObj: Omit<FirestoreQuiz, 'createdAt'> = {
            id: activeQuiz.id,
            name: namedQuiz.name,
            difficulty: activeQuiz.difficulty,
            isTimed: activeQuiz.isTimed,
            explanationStyle: activeQuiz.explanationStyle,
            mode: activeQuiz.mode,
            questions: activeQuiz.questions,
            creatorUid: currentUser.uid,
            creatorAlias: currentUser.alias,
            isPublic: true
        };
        uploadQuiz(quizObj).then(() => {
            alert("¡Cuestionario compartido exitosamente con la comunidad!");
        }).catch(err => {
            console.error("Error uploading quiz:", err);
            alert("Error al compartir el cuestionario en Firestore: " + err.message);
        });
    }

    if (saveAction === 'exit') {
        const updatedPaused = [namedQuiz, ...pausedQuizzes];
        setPausedQuizzes(updatedPaused);
        if (currentUser) {
            updatePausedQuizzesInDb(currentUser.uid, updatedPaused);
        }
        if (activeQuiz) {
            cleanupActiveQuizProgress(activeQuiz);
        }
        setActiveQuiz(null);
        setCurrentView('generator');
    } else { // 'complete'
        let finalScore = 0;
        let finalTotal = activeQuiz.questions.length;

        if (activeQuiz.mode === 'MultipleChoice') {
            activeQuiz.questions.forEach(q => {
                const userAnswerIndex = activeQuiz.userAnswers[q.id];
                if (userAnswerIndex !== undefined && userAnswerIndex === q.correctAnswerIndex) {
                    finalScore++;
                }
            });
        } else if (activeQuiz.mode === 'Written' && activeQuiz.writtenUserAnswers) {
            const gradedAnswers = Object.values(activeQuiz.writtenUserAnswers).map(a => a as { text: string; score?: number; feedback?: string }).filter(a => a.score !== undefined);
            const totalScore = gradedAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
            finalScore = totalScore;
            finalTotal = activeQuiz.questions.length * 100; // Max possible score
        }

        const completed: CompletedQuiz = {
            ...namedQuiz,
            score: finalScore,
            totalQuestions: finalTotal, // For MCQ: correct count. For Written: sum of scores.
            date: new Date().toISOString(),
            writtenUserAnswers: activeQuiz.writtenUserAnswers as any, // Ensure it's stored
            savedExplanations: activeQuiz.savedExplanations,
        };
        
        if (currentUser) {
            // Save attempt to Firestore (only logged on completion!)
            const attemptObj: Omit<QuizAttempt, 'id'> = {
                quizId: activeQuiz.id,
                quizName: namedQuiz.name,
                questions: activeQuiz.questions,
                userUid: currentUser.uid,
                userAlias: currentUser.alias,
                score: finalScore,
                totalQuestions: finalTotal,
                difficulty: activeQuiz.difficulty,
                mode: activeQuiz.mode,
                date: completed.date,
                userAnswers: activeQuiz.userAnswers,
                writtenUserAnswers: activeQuiz.writtenUserAnswers as any
            };
            
            saveQuizAttempt(attemptObj).then((savedAttempt) => {
                const completedWithDbId: CompletedQuiz = {
                    ...completed,
                    id: savedAttempt.id
                };
                setCompletedQuizzes(prev => [completedWithDbId, ...prev.filter(q => q.id !== activeQuiz.id)]);
                
                // Add user alias to completers array on the quiz document
                addCompleterToQuiz(activeQuiz.id, currentUser.alias);
            }).catch(err => {
                console.error("Error saving attempt to database:", err);
                alert("Error al guardar tu avance en la base de datos: " + err.message);
            });
        } else {
            setCompletedQuizzes(prev => [completed, ...prev]);
        }
        
        if (activeQuiz) {
            cleanupActiveQuizProgress(activeQuiz);
        }
        setActiveQuiz(null);
        setLastCompletedQuiz(completed);
        setCurrentView('results');
    }
    
    setIsSaveModalOpen(false);
    setQuizNameToSave('');
    setSaveAction(null);
    setShareQuizPublicly(false); // Reset checkbox
  };

  const handleAbandonQuiz = async () => {
    if (activeQuiz) {
      await autoPauseActiveQuiz();
    }
    setActiveQuiz(null);
  };

  const handleRetakeIncorrect = () => {
    if (!lastCompletedQuiz) return;
    
    const incorrectQuestions = lastCompletedQuiz.questions.filter(q => {
        if (lastCompletedQuiz.mode === 'Written') {
            const answer = lastCompletedQuiz.writtenUserAnswers?.[q.id];
            return !answer || answer.score < 70; // Threshold for "incorrect"
        }
        const userAnswer = lastCompletedQuiz.userAnswers[q.id];
        return userAnswer === undefined || userAnswer !== q.correctAnswerIndex;
    });

  if (incorrectQuestions.length > 0) {
        handleQuizGenerated(incorrectQuestions, lastCompletedQuiz.difficulty, lastCompletedQuiz.isTimed, lastCompletedQuiz.explanationStyle, lastCompletedQuiz.mode);
    }
  };

  const handleDeleteQuiz = (idToDelete: string, type: QuizType) => {
    if (type === 'completed') {
        setCompletedQuizzes(prev => prev.filter(item => item.id !== idToDelete));
    } else {
        if (activeQuiz && activeQuiz.id === idToDelete) {
            cleanupActiveQuizProgress(activeQuiz);
            setActiveQuiz(null);
        }
        const updatedPaused = pausedQuizzes.filter(item => item.id !== idToDelete);
        setPausedQuizzes(updatedPaused);
        if (currentUser) {
            updatePausedQuizzesInDb(currentUser.uid, updatedPaused);
        }
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
    let quizToEdit: CompletedQuiz | ActiveQuiz | undefined = completedQuizzes.find(q => q.id === idToRetake);
    if (!quizToEdit) {
      quizToEdit = pausedQuizzes.find(q => q.id === idToRetake);
    }
    if (!quizToEdit && activeQuiz?.id === idToRetake) {
      quizToEdit = activeQuiz;
    }
    if (quizToEdit) {
        setEditingQuiz(quizToEdit);
        setCurrentView('quizEditor');
    }
  };
  
  const handleResumeQuiz = (idToResume: string) => {
    if (activeQuiz && activeQuiz.id === idToResume) {
        setCurrentView('quiz');
        disableOlderResumeNotifications(idToResume);
        return;
    }

    const quizToResume = pausedQuizzes.find(q => q.id === idToResume);
    if (quizToResume) {
        const updatedPaused = pausedQuizzes.filter(q => q.id !== idToResume);
        setPausedQuizzes(updatedPaused);
        if (currentUser) {
            updatePausedQuizzesInDb(currentUser.uid, updatedPaused);
        }
        
        // Strip previous notificationId so a new active notification is created for this active session
        const resumedQuiz = { ...quizToResume, notificationId: undefined };
        setActiveQuiz(resumedQuiz);
        setCurrentView('quiz');
        disableOlderResumeNotifications(idToResume);
    }
  };

  const handleStartEditedQuiz = (questions: Question[], originalQuiz: CompletedQuiz) => {
    setEditingQuiz(null);
    handleQuizGenerated(questions, originalQuiz.difficulty, originalQuiz.isTimed, originalQuiz.explanationStyle || ExplanationStyle.Didactica, originalQuiz.mode);
  };

  const handleRenameQuiz = (idToRename: string, newName: string, type: QuizType) => {
    if (!newName || newName.trim() === '') return;
    const trimmedName = newName.trim();

    if (type === 'completed') {
        setCompletedQuizzes(prev => prev.map(q => 
            q.id === idToRename ? { ...q, name: trimmedName } : q
        ));
    } else {
        if (activeQuiz && activeQuiz.id === idToRename) {
            setActiveQuiz(prev => prev ? { ...prev, name: trimmedName } : null);
        }
        const updatedPaused = pausedQuizzes.map(q => 
            q.id === idToRename ? { ...q, name: trimmedName } : q
        );
        setPausedQuizzes(updatedPaused);
        if (currentUser) {
            updatePausedQuizzesInDb(currentUser.uid, updatedPaused);
        }
    }
  };

  const handleStudyWithFlashcards = (quizToStudy: CompletedQuiz | ActiveQuiz) => {
    setFlashcardQuiz(quizToStudy);
    setCurrentView('flashcards');
  };

  const handleSaveEditedQuizToHistory = async (questions: Question[]) => {
    if (!editingQuiz || !currentUser) return;
    try {
      if ('score' in editingQuiz) { // it's a CompletedQuiz
        await updateQuizAttemptQuestions(editingQuiz.id, questions);
        const updatedQuiz = { ...editingQuiz, questions };
        setCompletedQuizzes(prev => prev.map(q => q.id === editingQuiz.id ? updatedQuiz : q));
        setEditingQuiz(updatedQuiz);
      } else { // it's an ActiveQuiz
        const updatedQuiz = { ...editingQuiz, questions };
        if (activeQuiz && activeQuiz.id === editingQuiz.id) {
            setActiveQuiz(updatedQuiz);
            if (currentUser) {
                await updateDoc(doc(db, "users", currentUser.uid), { activeQuizProgress: updatedQuiz });
            }
        } else {
            const updatedPaused = pausedQuizzes.map(q => q.id === editingQuiz.id ? updatedQuiz : q);
            setPausedQuizzes(updatedPaused);
            await updatePausedQuizzesInDb(currentUser.uid, updatedPaused);
        }
        setEditingQuiz(updatedQuiz);
      }
    } catch (err) {
      console.error(err);
      alert("Error al guardar los cambios en el historial.");
    }
  };

  const handleShareHistoricalQuiz = async (quiz: CompletedQuiz) => {
    if (!currentUser) {
      alert(t('mustLoginToStart'));
      return;
    }
    try {
      const quizObj: Omit<FirestoreQuiz, 'createdAt'> = {
        id: quiz.id,
        name: quiz.name,
        difficulty: quiz.difficulty,
        isTimed: quiz.isTimed,
        explanationStyle: quiz.explanationStyle,
        mode: quiz.mode,
        questions: quiz.questions,
        creatorUid: currentUser.uid,
        creatorAlias: currentUser.alias,
        isPublic: true
      };
      await uploadQuiz(quizObj);
      alert("¡Cuestionario compartido exitosamente con la comunidad!");
    } catch (err: any) {
      console.error("Error uploading quiz:", err);
      alert("Error al compartir el cuestionario: " + err.message);
    }
  };

  const handleToggleQuizFavorite = async (quizId: string) => {
    if (!currentUser) return;
    try {
      const updatedFavs = await toggleQuizFavorite(currentUser.uid, quizId, favoriteQuizzes);
      setFavoriteQuizzes(updatedFavs);
      setCurrentUser(prev => prev ? { ...prev, favoriteQuizzes: updatedFavs } : null);
    } catch (err) {
      console.error(err);
      alert("Error al actualizar favoritos.");
    }
  };

  const isFavorite = (questionId: string) => favorites.some(q => q.id === questionId);

  const toggleFavorite = (question: Question) => {
    setFavorites(prev => 
      isFavorite(question.id) 
        ? prev.filter(q => q.id !== question.id)
        : [...prev, question]
    );
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      // Update local state
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, status: 'read' } : n));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleAcceptInvite = async (notification: AppNotification) => {
    setIsNotificationsOpen(false);
    setIsLoading(true);
    try {
      // Mark as read
      await markNotificationAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, status: 'read' } : n));

      // Get quiz
      const quiz = await getQuizById(notification.quizId);
      if (quiz) {
        if (activeQuiz) {
          await autoPauseActiveQuiz();
        }
        const newQuiz: ActiveQuiz = {
          id: quiz.id,
          name: quiz.name,
          questions: quiz.questions,
          difficulty: quiz.difficulty,
          isTimed: quiz.isTimed,
          explanationStyle: quiz.explanationStyle,
          currentQuestionIndex: 0,
          mode: quiz.mode,
          userAnswers: {},
          writtenUserAnswers: quiz.mode === 'Written' ? {} : undefined,
          savedExplanations: {},
          creatorUid: quiz.creatorUid,
          creatorAlias: quiz.creatorAlias,
        };
        setActiveQuiz(newQuiz);
        setCurrentView('quiz');
      } else {
        alert("El reto compartido no existe o fue eliminado.");
      }
    } catch (err) {
      console.error("Error accepting invitation:", err);
      alert("Error al cargar el cuestionario de la invitación.");
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupActiveQuizProgress = async (quizToClean: ActiveQuiz) => {
    if (!currentUser) return;
    try {
      await updateActiveQuizProgress(currentUser.uid, null);
      if (quizToClean.notificationId) {
        await deleteNotificationFromDb(quizToClean.notificationId);
      }
    } catch (err) {
      console.error("Error cleaning up active quiz progress:", err);
    }
  };

  const autoPauseActiveQuiz = async () => {
    if (!activeQuiz) return;
    try {
      const filteredPaused = pausedQuizzes.filter(q => q.id !== activeQuiz.id);
      const updatedPaused = [activeQuiz, ...filteredPaused];
      setPausedQuizzes(updatedPaused);
      if (currentUser) {
        await updatePausedQuizzesInDb(currentUser.uid, updatedPaused);
      }
      await cleanupActiveQuizProgress(activeQuiz);
    } catch (err) {
      console.error("Error auto-pausing active quiz:", err);
    }
  };

  const handleResumeUnsavedQuiz = async (notification: AppNotification) => {
    setIsNotificationsOpen(false);
    if (currentUser && currentUser.activeQuizProgress && currentUser.activeQuizProgress.id === notification.quizId) {
      setActiveQuiz(currentUser.activeQuizProgress);
      setCurrentView('quiz');
      
      await markNotificationAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, status: 'read' } : n));
      await disableOlderResumeNotifications(notification.quizId, notification.id);
    } else {
      try {
        setIsLoading(true);
        const profile = await getUserProfile(currentUser?.uid || '');
        if (profile && profile.activeQuizProgress && profile.activeQuizProgress.id === notification.quizId) {
          setActiveQuiz(profile.activeQuizProgress);
          setCurrentView('quiz');
          
          await markNotificationAsRead(notification.id);
          setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, status: 'read' } : n));
          await disableOlderResumeNotifications(notification.quizId, notification.id);
        } else {
          const quiz = await getQuizById(notification.quizId);
          if (quiz) {
            const newQuiz: ActiveQuiz = {
              id: quiz.id,
              name: quiz.name,
              questions: quiz.questions,
              difficulty: quiz.difficulty,
              isTimed: quiz.isTimed,
              explanationStyle: quiz.explanationStyle,
              currentQuestionIndex: 0,
              mode: quiz.mode,
              userAnswers: {},
              writtenUserAnswers: quiz.mode === 'Written' ? {} : undefined,
              savedExplanations: {},
            };
            setActiveQuiz(newQuiz);
            setCurrentView('quiz');
            await markNotificationAsRead(notification.id);
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, status: 'read' } : n));
            await disableOlderResumeNotifications(notification.quizId, notification.id);
          } else {
            alert("No se encontró el progreso de este reto ni el cuestionario original.");
          }
        }
      } catch (err) {
        console.error(err);
        alert("Error al reanudar el reto.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDismissUnsavedQuiz = async (notification: AppNotification) => {
    try {
      await markNotificationAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, status: 'read' } : n));
      
      if (currentUser) {
        await updateActiveQuizProgress(currentUser.uid, null);
        if (activeQuiz && activeQuiz.id === notification.quizId) {
          setActiveQuiz(null);
        }
      }
    } catch (err) {
      console.error("Error dismissing unsaved progress:", err);
    }
  };

  const navItems = useMemo(() => {
    if (!currentUser) {
      return [
        { view: 'landing', label: t('navLanding'), icon: <PlusCircleIcon className="h-5 w-5" /> },
        { view: 'publicQuizzes', label: t('navPublic'), icon: <BookOpenIcon className="h-5 w-5" /> },
      ];
    } else {
      return [
        { view: 'generator', label: activeQuiz ? t('continueQuiz') : t('startNewQuiz'), icon: <PlusCircleIcon className="h-5 w-5" /> },
        { view: 'publicQuizzes', label: t('navPublic'), icon: <BookOpenIcon className="h-5 w-5" /> },
        { view: 'favorites', label: `${t('favorites')} (${favorites.length})`, icon: <StarIcon className="h-5 w-5" /> },
        { view: 'history', label: t('history'), icon: <HistoryIcon className="h-5 w-5" /> },
      ];
    }
  }, [currentUser, activeQuiz, favorites.length, t]);

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
      case 'landing':
        return (
          <LandingView 
            currentUser={currentUser} 
            onStart={() => {
              if (currentUser) {
                setCurrentView('generator');
              } else {
                setCurrentView('auth');
              }
            }} 
            t={t}
          />
        );
      case 'auth':
        return (
          <AuthView 
            onAuthSuccess={(profile) => {
              isRestoringRef.current = true;
              setCurrentUser(profile);
              setFavoriteQuizzes(profile.favoriteQuizzes || []);
              
              // Restore active progress and paused quizzes from the loaded profile!
              if (profile.activeQuizProgress) {
                setActiveQuiz(profile.activeQuizProgress);
                localStorage.setItem('activeQuiz', JSON.stringify(profile.activeQuizProgress));
              } else {
                setActiveQuiz(null);
                localStorage.removeItem('activeQuiz');
              }

              if (profile.pausedQuizzes) {
                setPausedQuizzes(profile.pausedQuizzes);
                localStorage.setItem('pausedQuizzes', JSON.stringify(profile.pausedQuizzes));
              } else {
                setPausedQuizzes([]);
                localStorage.removeItem('pausedQuizzes');
              }
              
              // Load completed quizzes (attempts) from database
              getUserAttempts(profile.uid).then(dbAttempts => {
                const mappedCompleted: CompletedQuiz[] = dbAttempts.map(att => ({
                  id: att.id,
                  name: att.quizName,
                  questions: att.questions,
                  difficulty: att.difficulty,
                  isTimed: false,
                  explanationStyle: ExplanationStyle.Didactica,
                  mode: att.mode,
                  userAnswers: att.userAnswers,
                  writtenUserAnswers: att.writtenUserAnswers as any,
                  score: att.score,
                  totalQuestions: att.totalQuestions,
                  date: att.date
                }));
                setCompletedQuizzes(mappedCompleted);
              }).catch(err => {
                console.error("Error loading attempts on login:", err);
              });
              
              // Block onAuthStateChanged from navigating while overlay is showing
              isManualLoginRef.current = true;
              setCurrentView('generator');
              setShowWelcomeOverlay(profile.alias);
              setTimeout(() => {
                setShowWelcomeOverlay(null);
                isManualLoginRef.current = false;
                isRestoringRef.current = false;
              }, 2500);
            }} 
            onGoBack={() => setCurrentView('landing')}
            t={t}
          />
        );
      case 'publicQuizzes':
        return (
          <PublicQuizzesView 
            currentUser={currentUser}
            favoriteQuizzes={favoriteQuizzes}
            onToggleFavoriteQuiz={handleToggleQuizFavorite}
            onStartQuiz={async (quiz) => {
              if (activeQuiz) {
                await autoPauseActiveQuiz();
              }
              const newQuiz: ActiveQuiz = {
                id: quiz.id,
                name: quiz.name,
                questions: quiz.questions,
                difficulty: quiz.difficulty,
                isTimed: quiz.isTimed,
                explanationStyle: quiz.explanationStyle,
                currentQuestionIndex: 0,
                mode: quiz.mode,
                userAnswers: {},
                writtenUserAnswers: quiz.mode === 'Written' ? {} : undefined,
                savedExplanations: {},
                creatorUid: quiz.creatorUid,
                creatorAlias: quiz.creatorAlias,
              };
              setActiveQuiz(newQuiz);
              setCurrentView('quiz');
            }}
            onTriggerAuth={() => setCurrentView('auth')}
            t={t}
          />
        );
      case 'adminDashboard':
        return <AdminDashboard currentUser={currentUser} t={t} />;
      case 'quiz':
        if (!activeQuiz) {
             return <WelcomeView currentUser={currentUser} onTriggerAuth={() => setCurrentView('auth')} onQuizGenerated={handleQuizGenerated} onGenerationFailed={handleGenerationFailed} setIsLoading={setIsLoading} t={t} />;
        }
        if (activeQuiz.mode === 'Written') {
            return (
                <WrittenQuizView
                    activeQuiz={activeQuiz}
                    onUpdate={handleUpdateActiveQuiz}
                    onComplete={handleQuizComplete}
                    onSaveAndExit={handleSaveAndExit}
                    t={t}
                    language={language}
                    autoReadAloud={themeSettings.autoReadAloud || false}
                    soundEnabled={themeSettings.soundEnabled !== false}
                    currentUser={currentUser}
                />
            );
        }
        return (
            <QuizView 
                activeQuiz={activeQuiz}
                onUpdate={handleUpdateActiveQuiz}
                onComplete={handleQuizComplete}
                toggleFavorite={toggleFavorite} 
                isFavorite={isFavorite} 
                t={t} 
                language={language} 
                onSaveAndExit={handleSaveAndExit}
                autoReadAloud={themeSettings.autoReadAloud || false}
                soundEnabled={themeSettings.soundEnabled !== false}
                currentUser={currentUser}
            />
        );
      case 'favorites':
        return <FavoritesView favorites={favorites} toggleFavorite={toggleFavorite} t={t} />;
      case 'results':
        if (!lastCompletedQuiz) return <WelcomeView currentUser={currentUser} onTriggerAuth={() => setCurrentView('auth')} onQuizGenerated={handleQuizGenerated} onGenerationFailed={handleGenerationFailed} setIsLoading={setIsLoading} t={t} />;
        return <ResultsView quiz={lastCompletedQuiz} onRestart={() => setCurrentView('generator')} onRetake={handleRetakeIncorrect} t={t} soundEnabled={themeSettings.soundEnabled !== false} />;
      case 'history':
        return <HistoryView 
                  completedHistory={completedQuizzes} 
                  pausedHistory={combinedPausedHistory}
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
                currentUser={currentUser}
                onGoBack={() => setCurrentView('history')} 
                onRetake={handleRetakeQuiz}
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
                onStudy={handleStudyWithFlashcards}
                onShare={handleShareHistoricalQuiz}
                t={t}
              />
          ) : <HistoryView completedHistory={completedQuizzes} pausedHistory={combinedPausedHistory} onDelete={handleDeleteQuiz} onViewDetails={handleViewDetails} onRetake={handleRetakeQuiz} onRename={handleRenameQuiz} onResume={handleResumeQuiz} onStudy={handleStudyWithFlashcards} t={t} />;
      case 'quizEditor':
          return editingQuiz ? (
              <QuizEditorView 
                quiz={editingQuiz} 
                onStartQuiz={(questions) => handleStartEditedQuiz(questions, editingQuiz)} 
                onSaveQuiz={handleSaveEditedQuizToHistory}
                onGoBack={() => { setEditingQuiz(null); setCurrentView('history'); }} 
                t={t}
              />
          ) : <HistoryView completedHistory={completedQuizzes} pausedHistory={combinedPausedHistory} onDelete={handleDeleteQuiz} onViewDetails={handleViewDetails} onRetake={handleRetakeQuiz} onRename={handleRenameQuiz} onResume={handleResumeQuiz} onStudy={handleStudyWithFlashcards} t={t} />;
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
        ) : <HistoryView completedHistory={completedQuizzes} pausedHistory={combinedPausedHistory} onDelete={handleDeleteQuiz} onViewDetails={handleViewDetails} onRetake={handleRetakeQuiz} onRename={handleRenameQuiz} onResume={handleResumeQuiz} onStudy={handleStudyWithFlashcards} t={t} />;
      case 'statistics':
        return <StatisticsView completedQuizzes={completedQuizzes} t={t} />;
      case 'generator':
        if (!currentUser) {
          return (
            <LandingView 
              currentUser={currentUser} 
              onStart={() => setCurrentView('auth')}
              t={t}
            />
          );
        }
        return activeQuiz ? (
          <ResumeQuizView
            activeQuiz={activeQuiz}
            onResume={() => setCurrentView('quiz')}
            onStartNew={handleAbandonQuiz}
            t={t}
          />
        ) : (
          <WelcomeView
            currentUser={currentUser}
            onTriggerAuth={() => setCurrentView('auth')}
            onQuizGenerated={handleQuizGenerated}
            onGenerationFailed={handleGenerationFailed}
            setIsLoading={setIsLoading}
            t={t}
          />
        );
      default:
        return (
          <LandingView 
            currentUser={currentUser} 
            onStart={() => {
              if (currentUser) {
                setCurrentView('generator');
              } else {
                setCurrentView('auth');
              }
            }} 
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
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">

          {/* === MOBILE HEADER (visible only on xs screens) === */}
          <div className="flex sm:hidden items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <BookOpenIcon className="h-7 w-7 text-[rgb(var(--primary-500))]" />
              <span className="text-base font-bold text-gray-800 dark:text-white">{APP_TITLE}</span>
            </div>
            <div className="flex items-center gap-2">
              {currentUser && (
                <div className="relative">
                  <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="relative p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Notificaciones">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {notifications.filter(n => n.status === 'unread' && !(activeQuiz && activeQuiz.id === n.quizId)).length > 0 && (
                      <span className="absolute top-0.5 right-0.5 block h-2 w-2 rounded-full bg-red-500 ring-1 ring-white dark:ring-gray-800" />
                    )}
                  </button>
                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-72 backdrop-blur-lg bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 py-3 overflow-hidden">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                        <span className="font-bold text-sm">Notificaciones</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold">{notifications.filter(n => n.status === 'unread' && !(activeQuiz && activeQuiz.id === n.quizId)).length} nuevas</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {notifications.filter(n => !(activeQuiz && activeQuiz.id === n.quizId)).length === 0 ? (
                          <p className="p-4 text-center text-xs text-gray-400">Sin notificaciones.</p>
                        ) : notifications.filter(n => !(activeQuiz && activeQuiz.id === n.quizId)).map(n => {
                          const isReport = n.type === 'quiz_report';
                          const isFeedback = n.type === 'question_feedback';
                          const isResumeProgress = n.type === 'resume_progress';
                          const isInvite = !n.type || n.type === 'invitation';
                          return (
                            <div key={n.id} className={`p-3 border-b border-gray-100 dark:border-gray-800 ${n.status === 'unread' ? 'bg-primary-50/30' : 'opacity-60'}`}>
                              <p className="text-xs font-bold">{isReport ? '🚨 Reportado' : isFeedback ? '⚠️ Feedback' : isResumeProgress ? '⏱️ Reto Incompleto' : `🚀 Reto de @${n.senderAlias}`}</p>
                              <p className="text-[10px] text-gray-500 truncate">{isResumeProgress ? `Progreso en: ${n.quizName}` : n.quizName}</p>
                              {isResumeProgress && (
                                <p className="text-[9px] text-gray-400 italic">
                                  Dejado en: {n.detailsText || 'Pregunta 1'}
                                </p>
                              )}
                              <div className="flex gap-1 mt-1">
                                {isInvite && <button onClick={() => handleAcceptInvite(n)} className="text-[10px] px-2 py-0.5 rounded bg-[rgb(var(--primary-600))] text-white font-bold">Aceptar</button>}
                                {isResumeProgress && n.status === 'unread' && (
                                  <>
                                    <button onClick={() => handleResumeUnsavedQuiz(n)} className="text-[10px] px-2 py-0.5 rounded bg-[rgb(var(--primary-600))] text-white font-bold">Continuar</button>
                                    <button onClick={() => handleDismissUnsavedQuiz(n)} className="text-[10px] px-2 py-0.5 rounded bg-gray-500 text-white font-bold">Descartar</button>
                                  </>
                                )}
                                {isResumeProgress && n.status === 'read' && (
                                  <span className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold italic">Retomado o descartado</span>
                                )}
                                {isReport && <button onClick={() => { setCurrentView('adminDashboard'); setIsNotificationsOpen(false); handleMarkAsRead(n.id); }} className="text-[10px] px-2 py-0.5 rounded bg-red-600 text-white font-bold">Admin</button>}
                                {n.status === 'unread' && !isResumeProgress && <button onClick={() => handleMarkAsRead(n.id)} className="text-[10px] px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-500">Leído</button>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!currentUser && (
                <button onClick={() => setCurrentView('auth')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] shadow active:scale-95">
                  Entrar
                </button>
              )}
            </div>
          </div>

          {/* === DESKTOP HEADER (hidden on mobile) === */}
          <div className="hidden sm:flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <BookOpenIcon className="h-8 w-8 text-[rgb(var(--primary-500))]" />
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{APP_TITLE}</h1>
            </div>
            <div className="flex items-center space-x-4">
               <button onClick={handleToggleLanguage} className="text-sm font-medium text-gray-500 dark:text-gray-300 hover:text-[rgb(var(--primary-600))] dark:hover:text-[rgb(var(--primary-400))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(var(--primary-500),1)] rounded-md p-1">
                {language === 'en' ? 'Español' : 'English'}
              </button>
              
              {/* Premium Notifications Bell */}
              {currentUser && (
                <div className="relative">
                  <button 
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} 
                    className="relative text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Notificaciones"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {notifications.filter(n => n.status === 'unread' && !(activeQuiz && activeQuiz.id === n.quizId)).length > 0 && (
                      <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800 animate-pulse" />
                    )}
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 backdrop-blur-lg bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 py-3 overflow-hidden">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                        <span className="font-bold text-sm text-gray-800 dark:text-white">Notificaciones</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold">
                          {notifications.filter(n => n.status === 'unread' && !(activeQuiz && activeQuiz.id === n.quizId)).length} nuevas
                        </span>
                      </div>
                      
                      <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                        {notifications.filter(n => !(activeQuiz && activeQuiz.id === n.quizId)).length === 0 ? (
                          <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
                            No tienes ninguna notificación.
                          </div>
                        ) : (
                          notifications.filter(n => !(activeQuiz && activeQuiz.id === n.quizId)).map((n) => {
                            const isReport = n.type === 'quiz_report';
                            const isFeedback = n.type === 'question_feedback';
                            const isResumeProgress = n.type === 'resume_progress';
                            const isInvite = !n.type || n.type === 'invitation';
                            
                            return (
                              <div key={n.id} className={`p-4 transition-colors border-b border-gray-100 dark:border-gray-800 ${n.status === 'unread' ? 'bg-[rgba(var(--primary-500),0.03)]' : 'opacity-70'}`}>
                                <div className="flex gap-2 items-start">
                                  <span className="text-sm select-none">
                                    {isReport ? '🚨' : isFeedback ? '⚠️' : isResumeProgress ? '⏱️' : '🚀'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    {isReport && (
                                      <>
                                        <p className="text-xs font-bold text-red-600 dark:text-red-400">¡Cuestionario Reportado!</p>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 leading-tight">
                                          <span className="font-bold">@{n.senderAlias}</span> denunció: <span className="font-semibold text-gray-900 dark:text-white">'{n.quizName}'</span>
                                        </p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 italic bg-red-500/5 dark:bg-red-500/10 p-1.5 rounded-lg border border-red-500/10 mt-1.5">
                                          Motivo: {n.detailsText}
                                        </p>
                                      </>
                                    )}
                                    {isFeedback && (
                                      <>
                                        <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400">Feedback de Pregunta</p>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 leading-tight">
                                          <span className="font-bold">@{n.senderAlias}</span> discrepó en reactivo de: <span className="font-semibold text-gray-900 dark:text-white">'{n.quizName}'</span>
                                        </p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 italic bg-yellow-500/5 dark:bg-yellow-500/10 p-1.5 rounded-lg border border-yellow-500/10 mt-1.5 line-clamp-2">
                                          " {n.detailsText} "
                                        </p>
                                      </>
                                    )}
                                    {isInvite && (
                                      <>
                                        <p className="text-xs font-bold text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]">¡Reto Educativo!</p>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 leading-tight">
                                          <span className="font-bold">@{n.senderAlias}</span> te invitó a superar: <span className="font-semibold text-gray-900 dark:text-white">'{n.quizName}'</span>
                                        </p>
                                      </>
                                    )}
                                    {isResumeProgress && (
                                      <>
                                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Reto Incompleto</p>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 leading-tight">
                                          Dejaste el reto <span className="font-semibold text-gray-900 dark:text-white">'{n.quizName}'</span> a medias.
                                        </p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 italic bg-amber-500/5 dark:bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/10 mt-1.5">
                                          Último avance: {n.detailsText || 'Pregunta 1'}
                                        </p>
                                      </>
                                    )}
                                    
                                    <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1.5">
                                      {new Date(n.createdAt).toLocaleDateString()} a las {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                    
                                    <div className="flex gap-1.5 mt-2.5">
                                      {isInvite && (
                                        <button
                                          onClick={() => handleAcceptInvite(n)}
                                          className="flex-grow py-1 px-2.5 rounded-lg text-[10px] text-white font-bold bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] hover:from-[rgb(var(--primary-700))] hover:to-[rgb(var(--primary-600))] shadow transition-all active:scale-[0.98]"
                                        >
                                          Aceptar
                                        </button>
                                      )}
                                      {isResumeProgress && n.status === 'unread' && (
                                        <>
                                          <button
                                            onClick={() => handleResumeUnsavedQuiz(n)}
                                            className="flex-grow py-1 px-2.5 rounded-lg text-[10px] text-white font-bold bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] hover:from-[rgb(var(--primary-700))] hover:to-[rgb(var(--primary-600))] shadow transition-all active:scale-[0.98]"
                                          >
                                            Continuar
                                          </button>
                                          <button
                                            onClick={() => handleDismissUnsavedQuiz(n)}
                                            className="py-1 px-2.5 rounded-lg text-[10px] text-gray-600 dark:text-gray-300 font-semibold border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-[0.98]"
                                          >
                                            Descartar
                                          </button>
                                        </>
                                      )}
                                      {isResumeProgress && n.status === 'read' && (
                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold italic">Retomado o descartado</span>
                                      )}
                                      {isReport && (
                                        <button
                                          onClick={() => {
                                            setCurrentView('adminDashboard');
                                            setIsNotificationsOpen(false);
                                            handleMarkAsRead(n.id);
                                          }}
                                          className="flex-grow py-1 px-2.5 rounded-lg text-[10px] text-white font-bold bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow transition-all active:scale-[0.98]"
                                        >
                                          Panel Admin
                                        </button>
                                      )}
                                      {isFeedback && (
                                        <button
                                          onClick={() => {
                                            setCurrentView('history');
                                            setIsNotificationsOpen(false);
                                            handleMarkAsRead(n.id);
                                          }}
                                          className="flex-grow py-1 px-2.5 rounded-lg text-[10px] text-white font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 shadow transition-all active:scale-[0.98]"
                                        >
                                          Ver Historial
                                        </button>
                                      )}
                                      {n.status === 'unread' && !isResumeProgress && (
                                        <button
                                          onClick={() => handleMarkAsRead(n.id)}
                                          className="py-1 px-2 rounded-lg text-[9px] font-semibold border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all"
                                        >
                                          Leído
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => setIsSettingsOpen(true)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white mr-2" aria-label={t('settings')}>
                <Cog6ToothIcon className="h-6 w-6" />
              </button>
              
              {/* Premium Auth indicator */}
              {currentUser ? (
                <div className="flex items-center space-x-3 border-l border-gray-200 dark:border-gray-700 pl-4">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 hidden sm:inline">
                    Hola, <span className="text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]">{currentUser.alias}</span> (ID: <span className="font-mono text-xs">{currentUser.readableId}</span>)
                  </span>
                  {currentUser.role === 'admin' && (
                    <button 
                      onClick={() => setCurrentView('adminDashboard')} 
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all relative flex items-center gap-1 ${
                        currentView === 'adminDashboard'
                          ? 'bg-[rgb(var(--primary-600))] text-white border-transparent'
                          : 'border-[rgb(var(--primary-500))] text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] hover:bg-[rgb(var(--primary-500))] hover:text-white'
                      }`}
                    >
                      <span>Admin Panel</span>
                      {pendingReportsCount > 0 && (
                        <span className="absolute -top-2 -right-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white animate-bounce shadow">
                          {pendingReportsCount}
                        </span>
                      )}
                    </button>
                  )}
                  <button 
                    onClick={async () => {
                      const alias = currentUser?.alias || 'Usuario';
                      setShowFarewellOverlay(alias);
                      setTimeout(async () => {
                        await logoutUser();
                        setCurrentUser(null);
                        setFavoriteQuizzes([]);
                        
                        // Safe manual logout cleanups
                        setActiveQuiz(null);
                        setPausedQuizzes([]);
                        setCompletedQuizzes([]);
                        localStorage.removeItem('activeQuiz');
                        localStorage.removeItem('pausedQuizzes');
                        localStorage.removeItem('completedQuizzes');

                        setShowFarewellOverlay(null);
                        setCurrentView('landing');
                      }, 2000);
                    }}
                    className="text-xs font-bold px-3 py-1.5 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setCurrentView('auth')} 
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] hover:from-[rgb(var(--primary-700))] hover:to-[rgb(var(--primary-600))] shadow-md transition-all active:scale-[0.98]"
                >
                  Iniciar Sesión
                </button>
              )}
            </div>
          </div>
          {/* end desktop header */}

        </div>
      </header>

      {/* ===== NAV: inline tabs ≤2 items | hamburger >2 items on mobile ===== */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-30">
        {/* Desktop: always show tabs */}
        <div className="hidden sm:flex container mx-auto px-4 sm:px-6 lg:px-8 justify-center space-x-4 sm:space-x-8">
          {navItems.map(item => (
            <button key={item.view} onClick={() => handleNavClick(item.view as View)}
              className={`flex items-center space-x-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
                currentView === item.view || (currentView === 'quiz' && item.view === 'generator') || ((currentView === 'quizDetail' || currentView === 'quizEditor' || currentView === 'flashcards') && item.view === 'history')
                  ? 'border-[rgb(var(--primary-500))] text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]'
                  : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-100'}`}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden">
          {navItems.length <= 2 ? (
            /* Unauthenticated: 2 tabs fit fine, show inline */
            <div className="flex">
              {navItems.map(item => {
                const active = currentView === item.view;
                return (
                  <button key={item.view} onClick={() => handleNavClick(item.view as View)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                      active ? 'border-[rgb(var(--primary-500))] text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]'
                             : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
                    {item.icon}<span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Authenticated: many items + user actions → hamburger */
            <>
              <button onClick={() => setIsMobileMenuOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3"
                aria-label="Menu">
                <span className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]">
                  {navItems.find(i => i.view === currentView || (currentView === 'quiz' && i.view === 'generator') || (['quizDetail','quizEditor','flashcards'].includes(currentView) && i.view === 'history'))?.icon}
                  {navItems.find(i => i.view === currentView || (currentView === 'quiz' && i.view === 'generator') || (['quizDetail','quizEditor','flashcards'].includes(currentView) && i.view === 'history'))?.label || 'Menú'}
                </span>
                <svg className={`h-5 w-5 text-gray-500 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isMobileMenuOpen && (
                <div className="border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg pb-3">
                  {/* Nav items */}
                  {navItems.map(item => {
                    const active = currentView === item.view || (currentView === 'quiz' && item.view === 'generator') || (['quizDetail','quizEditor','flashcards'].includes(currentView) && item.view === 'history');
                    return (
                      <button key={item.view} onClick={() => { handleNavClick(item.view as View); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium border-l-4 transition-colors ${
                          active ? 'border-[rgb(var(--primary-500))] bg-[rgba(var(--primary-500),0.06)] text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]'
                                 : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                        <span className={active ? 'text-[rgb(var(--primary-500))]' : 'text-gray-400'}>{item.icon}</span>
                        {item.label}
                      </button>
                    );
                  })}

                  {/* Divider + user account actions */}
                  {currentUser && (
                    <div className="mt-1 pt-2 mx-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mi Cuenta</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        @{currentUser.alias} <span className="font-mono text-xs text-gray-400">({currentUser.readableId})</span>
                      </p>
                      <div className="flex gap-2">
                        {currentUser.role === 'admin' && (
                          <button onClick={() => { setCurrentView('adminDashboard'); setIsMobileMenuOpen(false); }}
                            className={`relative flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                              currentView === 'adminDashboard'
                                ? 'bg-[rgb(var(--primary-600))] text-white border-transparent'
                                : 'border-[rgb(var(--primary-500))] text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]'}`}>
                            Admin Panel
                            {pendingReportsCount > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white">{pendingReportsCount}</span>
                            )}
                          </button>
                        )}
                        <button onClick={async () => {
                          setIsMobileMenuOpen(false);
                          const alias = currentUser?.alias || 'Usuario';
                          setShowFarewellOverlay(alias);
                          setTimeout(async () => {
                            await logoutUser(); setCurrentUser(null); setFavoriteQuizzes([]);
                            setShowFarewellOverlay(null); setCurrentView('landing');
                          }, 2000);
                        }} className="flex-1 py-2 text-xs font-bold rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all">
                          Cerrar Sesión
                        </button>
                      </div>
                      <button onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }}
                        className="w-full py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all flex items-center justify-center gap-1.5">
                        <Cog6ToothIcon className="h-4 w-4" /> Configuración
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </nav>

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:w-80 animate-slide-up-fade-in">
          <div className="backdrop-blur-md bg-white/95 dark:bg-gray-800/95 border border-[rgba(var(--primary-500),0.3)] rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] flex items-center justify-center shadow">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Instalar Quiz AI</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Accédelo como app desde tu celular</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={handleInstallApp}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] hover:from-[rgb(var(--primary-700))] hover:to-[rgb(var(--primary-600))] shadow transition-all active:scale-95">
                Instalar
              </button>
              <button onClick={() => setShowInstallBanner(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1" aria-label="Cerrar">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {renderContent()}
      </main>

      <footer className="text-center py-6 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 mt-12 bg-white/20 dark:bg-gray-800/10 backdrop-blur-sm">
        <p>&copy; {new Date().getFullYear()} {APP_TITLE} - Un producto de{' '}
          <a href="https://sv-construcciones.web.app/" target="_blank" rel="noopener noreferrer" className="font-bold text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] hover:underline">SV GROUP</a>
          {' / '}
          <a href="https://sv-construcciones.web.app/sv-lab" target="_blank" rel="noopener noreferrer" className="font-bold text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] hover:underline">SV LAB</a>
        </p>
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
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--primary-500))] outline-none transition-all"
            placeholder={t('untitledQuiz')}
          />
          
          {/* Checkbox to share publicly, only visible if logged in */}
          {currentUser && (
            <div className="mt-4 flex items-center gap-2">
              <input
                id="share-publicly"
                type="checkbox"
                checked={shareQuizPublicly}
                onChange={(e) => setShareQuizPublicly(e.target.checked)}
                className="h-5 w-5 text-[rgb(var(--primary-600))] focus:ring-[rgb(var(--primary-500))] border-gray-300 dark:border-gray-700 rounded transition-all"
              />
              <label htmlFor="share-publicly" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                Compartir públicamente con la comunidad
              </label>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-2">
            <button onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-xl text-sm font-bold hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-all">{t('cancel')}</button>
            <button onClick={handleConfirmSave} className="px-5 py-2.5 bg-[rgb(var(--primary-600))] text-white rounded-xl text-sm font-bold hover:bg-[rgb(var(--primary-700))] transition-all shadow-md active:scale-[0.98]">{t('save')}</button>
          </div>
        </div>
      </Modal>

      {/* Shared Quiz Preview Modal */}
      <Modal
        isOpen={sharedQuizPreview !== null}
        onClose={() => {
          setSharedQuizPreview(null);
          setRandomizeSharedQuiz(false);
          sessionStorage.removeItem('pendingSharedQuizId');
        }}
        title={t('educationalChallenge')}
      >
        {sharedQuizPreview && (
          <div className="space-y-6 mt-4">
            <div className="text-center py-2">
              <span className="text-4xl select-none">🏆</span>
              <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-3 leading-tight">
                {sharedQuizPreview.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('createdBy')}<span className="font-bold text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]">{sharedQuizPreview.creatorAlias}</span>
              </p>
            </div>

            {/* Badges row */}
            <div className="flex justify-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                sharedQuizPreview.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                sharedQuizPreview.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {t(sharedQuizPreview.difficulty)}
              </span>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/40 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800">
                {t(sharedQuizPreview.mode)}
              </span>
            </div>

            {/* Details panel */}
            <div className="grid grid-cols-2 gap-4 text-center bg-gray-50 dark:bg-gray-900/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/50">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">{t('questionsCount')}</p>
                <p className="text-lg font-black text-gray-800 dark:text-gray-200 mt-0.5">{sharedQuizPreview.questions.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">{t('timeLimit')}</p>
                <p className="text-lg font-black text-gray-800 dark:text-gray-200 mt-0.5">{sharedQuizPreview.isTimed ? t('yes') : t('no')}</p>
              </div>
            </div>

            {/* Completers section */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-center md:text-left">
                {t('successfulChallengers', { count: sharedQuizPreview.completerAliases?.length || 0 })}
              </h4>
              {!sharedQuizPreview.completerAliases || sharedQuizPreview.completerAliases.length === 0 ? (
                <p className="text-xs italic text-gray-400 dark:text-gray-500 text-center md:text-left">
                  {t('noChallengersYet')}
                </p>
              ) : (
                <div className="flex flex-wrap justify-center md:justify-start gap-1.5 max-h-24 overflow-y-auto">
                  {sharedQuizPreview.completerAliases.map((alias, idx) => (
                    <span 
                      key={idx} 
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[rgba(var(--primary-500),0.1)] text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] border border-[rgba(var(--primary-500),0.15)] shadow-sm"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 py-2 border-t border-gray-100 dark:border-gray-800">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={randomizeSharedQuiz}
                    onChange={(e) => setRandomizeSharedQuiz(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[rgba(var(--primary-500),0.3)] dark:peer-focus:ring-[rgba(var(--primary-500),0.3)] rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[rgb(var(--primary-500))]"></div>
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-800 dark:text-white block">Preguntas al Azar</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">Cambia el orden de las preguntas antes de comenzar.</span>
                </div>
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setSharedQuizPreview(null)}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-center"
              >
                {t('cancel')}
              </button>
              
              <button
                onClick={() => {
                  if (currentUser) {
                    let finalQuestions = sharedQuizPreview.questions;
                    if (randomizeSharedQuiz) {
                      const shuffled = [...finalQuestions];
                      for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                      }
                      finalQuestions = shuffled;
                    }

                    const newQuiz: ActiveQuiz = {
                      id: sharedQuizPreview.id,
                      name: sharedQuizPreview.name,
                      questions: finalQuestions,
                      difficulty: sharedQuizPreview.difficulty,
                      isTimed: sharedQuizPreview.isTimed,
                      explanationStyle: sharedQuizPreview.explanationStyle,
                      currentQuestionIndex: 0,
                      mode: sharedQuizPreview.mode,
                      userAnswers: {},
                      writtenUserAnswers: sharedQuizPreview.mode === 'Written' ? {} : undefined,
                      savedExplanations: {},
                      creatorUid: sharedQuizPreview.creatorUid,
                      creatorAlias: sharedQuizPreview.creatorAlias,
                    };
                    setActiveQuiz(newQuiz);
                    setCurrentView('quiz');
                    setSharedQuizPreview(null);
                    setRandomizeSharedQuiz(false);
                  } else {
                    if (window.confirm(t('mustLoginToStart'))) {
                      sessionStorage.setItem('pendingSharedQuizId', sharedQuizPreview.id);
                      setSharedQuizPreview(null);
                      setCurrentView('auth');
                    }
                  }
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] hover:from-[rgb(var(--primary-700))] hover:to-[rgb(var(--primary-600))] transition-all shadow-md text-center active:scale-[0.98]"
              >
                {t('acceptChallenge')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Settings Modal */}
      <SettingsView
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={themeSettings}
        onSettingsChange={setThemeSettings}
        t={t}
      />

      {/* Animated Welcome/Farewell Overlays */}
      {showWelcomeOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-gray-800 border border-gray-250 dark:border-gray-700/50 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 text-center transform scale-100 transition-transform animate-scale-up animate-duration-300">
            <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-3xl select-none">👋</span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-6 leading-tight">
              {t('welcomeUser', { name: showWelcomeOverlay })}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {t('preparingEnvironment')}
            </p>
            <div className="flex justify-center gap-1.5 mt-6">
              <span className="w-2.5 h-2.5 rounded-full bg-[rgb(var(--primary-600))] animate-ping" />
              <span className="w-2.5 h-2.5 rounded-full bg-[rgb(var(--primary-500))] animate-ping" style={{ animationDelay: '0.2s' }} />
              <span className="w-2.5 h-2.5 rounded-full bg-[rgb(var(--primary-400))] animate-ping" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        </div>
      )}

      {showFarewellOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-gray-800 border border-gray-250 dark:border-gray-700/50 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 text-center transform scale-100 transition-transform animate-scale-up animate-duration-300">
            <div className="w-16 h-16 mx-auto bg-red-500/10 dark:bg-red-500/20 rounded-2xl flex items-center justify-center shadow-lg border border-red-500/20">
              <span className="text-3xl select-none">👋</span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-6 leading-tight">
              {t('farewellUser', { name: showFarewellOverlay })}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {t('loggingOutSafely')}
            </p>
            <div className="flex justify-center gap-1.5 mt-6">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping" style={{ animationDelay: '0.2s' }} />
              <span className="w-2.5 h-2.5 rounded-full bg-red-300 animate-ping" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;