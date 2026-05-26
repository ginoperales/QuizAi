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
    writtenUserAnswers?: { [questionId: string]: { text: string; score?: number; feedback?: string; isGraded: boolean } }; // For written
    savedExplanations?: { [questionId: string]: string[] };
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
    writtenUserAnswers?: { [questionId: string]: { text: string; score: number; feedback: string; } };
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

export type View = "generator" | "quiz" | "favorites" | "history" | "quizDetail" | "results" | "quizEditor" | "flashcards" | "statistics";

export type Language = "en" | "es";

export type ThemeColor = 'indigo' | 'sky' | 'teal' | 'rose';

export interface ThemeSettings {
    color: ThemeColor;
    mode: 'light' | 'dark';
}