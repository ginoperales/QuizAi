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

export interface ActiveQuiz {
    id: string;
    name?: string;
    questions: Question[];
    difficulty: Difficulty;
    isTimed: boolean;
    explanationStyle: ExplanationStyle;
    currentQuestionIndex: number;
    userAnswers: { [questionId: string]: number }; // question.id -> selected option index
}

export interface CompletedQuiz {
    id: string;
    name?: string;
    questions: Question[];
    difficulty: Difficulty;
    isTimed: boolean;
    explanationStyle: ExplanationStyle;
    userAnswers: { [questionId: string]: number };
    score: number;
    totalQuestions: number;
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