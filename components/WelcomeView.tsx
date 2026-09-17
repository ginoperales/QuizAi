import React from 'react';
import QuizGenerator from './QuizGenerator';
import { Question, Difficulty, ExplanationStyle, QuizMode, FirebaseUser } from '../types';

interface WelcomeViewProps {
  currentUser: FirebaseUser | null;
  onTriggerAuth: () => void;
  onQuizGenerated: (questions: Question[], difficulty: Difficulty, isTimed: boolean, explanationStyle: ExplanationStyle, mode: QuizMode) => void;
  onGenerationFailed: (error: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  t: (key: any) => string;
  isOnline?: boolean;
}

const WelcomeView: React.FC<WelcomeViewProps> = (props) => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <QuizGenerator {...props} />
    </div>
  );
};

export default WelcomeView;