export enum ExplanationStyle {
  Tecnica = "Técnica",
  Cientifica = "Científica",
  Academica = "Académica",
  Didactica = "Didáctica o pedagógica",
  Analitica = "Analítica",
  Comparativa = "Comparativa",
  Practica = "Práctica o aplicada",
  Descriptiva = "Descriptiva",
  Causal = "Causal",
  Funcional = "Funcional",
  Teleologica = "Teleológica (por finalidad)",
  Historica = "Histórica",
  Filosofica = "Filosófica",
}

export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  justification?: string;
}

export interface QuizResult {
  id: string;
  score: number;
  totalQuestions: number;
  difficulty: Difficulty;
  date: string;
}

export type QuizMode = 'MultipleChoice' | 'Written';

export interface ActiveQuiz {
    id: string;
    name?: string;
    questions: Question[];
    difficulty: Difficulty;
    isTimed: boolean;
    explanationStyle: ExplanationStyle;
    currentQuestionIndex: number;
    mode: QuizMode;
    userAnswers: { [questionId: string]: number }; // For MCQs
    writtenUserAnswers?: { [questionId: string]: { text: string; score?: number; feedback?: string; isGraded: boolean; gradedBy?: 'ai' | 'local' } }; // For written
    savedExplanations?: { [questionId: string]: string[] };
    notificationId?: string; // ID of the resume notification in Firestore
    creatorUid?: string; // UID of the quiz creator
    creatorAlias?: string; // Alias of the quiz creator
}

export interface CompletedQuiz {
    id: string;
    name?: string;
    questions: Question[];
    difficulty: Difficulty;
    isTimed: boolean;
    explanationStyle: ExplanationStyle;
    mode: QuizMode;
    userAnswers: { [questionId: string]: number };
    writtenUserAnswers?: { [questionId: string]: { text: string; score: number; feedback: string; gradedBy?: 'ai' | 'local' } };
    savedExplanations?: { [questionId: string]: string[] };
    score: number;
    totalQuestions: number; // For MCQ: number of questions. For Written: number of questions * 100
    date: string;
}

export enum Difficulty {
  Easy = "Easy",
  Medium = "Medium",
  Hard = "Hard",
}

export type View = "generator" | "quiz" | "favorites" | "history" | "quizDetail" | "results" | "quizEditor" | "flashcards" | "statistics" | "auth" | "publicQuizzes" | "adminDashboard" | "landing";

export type Language = "en" | "es";

export type ThemeColor = 'indigo' | 'sky' | 'teal' | 'rose';

export type AssistantAiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'deepseek-chat';

export interface ThemeSettings {
    color: ThemeColor;
    mode: 'light' | 'dark';
    autoReadAloud?: boolean;
    soundEnabled?: boolean;
    speechInputEnabled?: boolean;
    voiceAssistantMode?: boolean;
    voicePersona?: 'default' | 'devyn' | 'clotilde'; // Devyn = male, Clotilde = female
    assistantAiModel?: AssistantAiModel;
}

export interface FirebaseUser {
  uid: string;
  email: string;
  alias: string;
  readableId: string; // Unique short readable ID generated at registration (e.g. QZ-1234)
  role: 'admin' | 'student';
  createdAt: string;
  favoriteQuizzes?: string[]; // Array of public quiz IDs favorited by the user
  activeQuizProgress?: ActiveQuiz | null; // Current active/unsaved progress
  pausedQuizzes?: ActiveQuiz[]; // Paused/saved quizzes
  themeSettings?: ThemeSettings;
}

export interface AppNotification {
  id: string;
  recipientUid: string;
  senderAlias: string;
  quizId: string;
  quizName: string;
  status: 'unread' | 'read';
  createdAt: string;
  type?: 'invitation' | 'question_feedback' | 'quiz_report' | 'resume_progress'; // Type of notification
  questionText?: string; // Text of the evaluated question (for feedback)
  detailsText?: string; // Additional details (e.g. report reason or evaluation comment)
}

export interface FirestoreQuiz {
  id: string;
  name: string;
  difficulty: Difficulty;
  isTimed: boolean;
  explanationStyle: ExplanationStyle;
  mode: QuizMode;
  questions: Question[];
  creatorUid: string;
  creatorAlias: string;
  isPublic: boolean;
  completerAliases?: string[];
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizName: string;
  questions: Question[];
  userUid: string;
  userAlias: string;
  score: number;
  totalQuestions: number;
  difficulty: Difficulty;
  mode: QuizMode;
  date: string;
  userAnswers: { [questionId: string]: number };
  writtenUserAnswers?: { [questionId: string]: { text: string; score: number; feedback: string; } };
}
