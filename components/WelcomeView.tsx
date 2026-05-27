import React, { useState } from 'react';
import QuizGenerator from './QuizGenerator';
// FIX: Import QuizMode to use in the onQuizGenerated prop signature.
import { Question, Difficulty, ExplanationStyle, QuizMode, FirebaseUser } from '../types';
import { UploadIcon, StarIcon, HistoryIcon, ClipboardDocumentIcon } from './icons';

interface WelcomeViewProps {
  currentUser: FirebaseUser | null;
  onTriggerAuth: () => void;
  onQuizGenerated: (questions: Question[], difficulty: Difficulty, isTimed: boolean, explanationStyle: ExplanationStyle, mode: QuizMode) => void;
  onGenerationFailed: (error: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  t: (key: any) => string;
}

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
    <div className="flex-shrink-0 mb-4">{icon}</div>
    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
    <p className="mt-2 text-base text-gray-500 dark:text-gray-400">{description}</p>
  </div>
);


const WelcomeView: React.FC<WelcomeViewProps> = (props) => {
  const { t } = props;
  const [isCopied, setIsCopied] = useState(false);
  
  const features = [
    {
      icon: <UploadIcon className="h-6 w-6 text-[rgb(var(--primary-500))]" />,
      title: t('welcomeFeature1Title'),
      description: t('welcomeFeature1Desc'),
    },
    {
      icon: <StarIcon className="h-6 w-6 text-[rgb(var(--primary-500))]" />,
      title: t('welcomeFeature2Title'),
      description: t('welcomeFeature2Desc'),
    },
    {
      icon: <HistoryIcon className="h-6 w-6 text-[rgb(var(--primary-500))]" />,
      title: t('welcomeFeature3Title'),
      description: t('welcomeFeature3Desc'),
    },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(t('promptToCopy'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
          {t('welcomeTitle')}
        </h1>
      </div>
      
      <div className="grid gap-8 md:grid-cols-3">
        {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
        ))}
      </div>

      <div className="pt-8">
        <QuizGenerator {...props} />
      </div>

      <div className="pt-8 max-w-2xl mx-auto">
        <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{t('createManuallyTitle')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('createManuallyDesc')}</p>
        </div>
        <div className="relative bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-mono pr-28">
              {t('promptToCopy')}
            </p>
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
                <ClipboardDocumentIcon className="h-4 w-4 mr-1.5"/>
                {isCopied ? t('copied') : t('copyPrompt')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeView;