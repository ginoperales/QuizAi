import React, { useState, useCallback } from 'react';
import { Difficulty, Question, ExplanationStyle, QuizMode, FirebaseUser } from '../types';
import { generateQuestionsFromText, generateQuestionsFromImage } from '../services/geminiService';
import { parseSpreadsheet, readFileAsText, readFileAsBase64, downloadExcelTemplate } from '../services/fileService';
import { UploadIcon, DownloadIcon } from './icons';

interface QuizGeneratorProps {
  currentUser: FirebaseUser | null;
  onTriggerAuth: () => void;
  onQuizGenerated: (questions: Question[], difficulty: Difficulty, isTimed: boolean, explanationStyle: ExplanationStyle, mode: QuizMode) => void;
  onGenerationFailed: (error: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  t: (key: any) => string;
}

const QuizGenerator: React.FC<QuizGeneratorProps> = ({ currentUser, onTriggerAuth, onQuizGenerated, onGenerationFailed, setIsLoading, t }) => {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Medium);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isTimed, setIsTimed] = useState<boolean>(true);
  const [explanationStyle, setExplanationStyle] = useState<ExplanationStyle>(ExplanationStyle.Didactica);
  const [quizMode, setQuizMode] = useState<QuizMode>('MultipleChoice');
  const [customPrompt, setCustomPrompt] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleGenerateClick = useCallback(async () => {
    if (!currentUser) {
      if (window.confirm("Debes iniciar sesión o registrarte para generar o subir un cuestionario. ¿Deseas hacerlo ahora?")) {
        onTriggerAuth();
      }
      return;
    }
    
    if (!file) return;

    setIsLoading(true);
    onGenerationFailed(''); // Clear previous errors

    try {
        if (file.type.includes('sheet') || file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
            const questions = await parseSpreadsheet(file);
            onQuizGenerated(questions, difficulty, isTimed, explanationStyle, quizMode);
        } else if (file.type.startsWith('image/')) {
            const { mimeType, data } = await readFileAsBase64(file);
            const questions = await generateQuestionsFromImage(data, mimeType, difficulty, t, customPrompt);
            onQuizGenerated(questions, difficulty, isTimed, explanationStyle, quizMode);
        } else {
            const textContent = await readFileAsText(file);
            if (!textContent.trim()) {
                throw new Error("File is empty or could not be read.");
            }
            const questions = await generateQuestionsFromText(textContent, difficulty, t, customPrompt);
            onQuizGenerated(questions, difficulty, isTimed, explanationStyle, quizMode);
        }
    } catch (error) {
        console.error(error);
        onGenerationFailed(t('errorGeneratingQuiz'));
    } finally {
        setIsLoading(false);
    }
  }, [file, difficulty, isTimed, explanationStyle, quizMode, customPrompt, onQuizGenerated, onGenerationFailed, setIsLoading, t]);
  
  const difficultyLevels = Object.values(Difficulty);
  const quizModes = ['MultipleChoice', 'Written'] as QuizMode[];
  const difficultyTimeMap: Record<Difficulty, number> = {
    [Difficulty.Easy]: 30,
    [Difficulty.Medium]: 20,
    [Difficulty.Hard]: 10,
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('createYourQuiz')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('tagline')}</p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('uploadFile')}</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600 dark:text-gray-400">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] hover:text-[rgb(var(--primary-500))] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[rgba(var(--primary-500),1)]">
                  <span>{fileName || 'Upload a file'}</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".txt,.md,.csv,.xlsx,.png,.jpg,.jpeg,.webp" />
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">{t('uploadInstructions')}</p>
            </div>
          </div>
           <div className="text-center mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-500">{t('spreadsheetInstructions')}</p>
              <button
                onClick={() => downloadExcelTemplate(t)}
                className="inline-flex items-center mt-1 text-xs font-medium text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] hover:underline"
              >
                <DownloadIcon className="h-4 w-4 mr-1" />
                {t('downloadTemplate')}
              </button>
            </div>
        </div>

        <div>
            <label htmlFor="custom-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('specificInstructions')} <span className="text-gray-400">({t('optional')})</span>
            </label>
            <textarea
                id="custom-prompt"
                rows={3}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="mt-1 block w-full pl-3 pr-4 py-2 text-base border-gray-300 focus:outline-none focus:ring-[rgb(var(--primary-500))] focus:border-[rgb(var(--primary-500))] sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t('promptPlaceholder')}
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('quizMode')}</label>
            <fieldset className="mt-2">
                <legend className="sr-only">{t('quizMode')}</legend>
                <div className="grid grid-cols-2 gap-3">
                    {quizModes.map((mode) => (
                        <div key={mode}>
                            <input type="radio" name="quiz-mode" id={mode} value={mode} checked={quizMode === mode} onChange={() => setQuizMode(mode)} className="sr-only peer" />
                            <label htmlFor={mode} className="flex items-center justify-center rounded-md py-2 px-3 text-sm font-medium uppercase sm:flex-1 cursor-pointer border bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 peer-checked:ring-2 peer-checked:ring-[rgba(var(--primary-500),1)] peer-checked:ring-offset-2 peer-checked:border-transparent">
                                {t(mode)}
                            </label>
                        </div>
                    ))}
                </div>
            </fieldset>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('selectDifficulty')}</label>
          <fieldset className="mt-2">
            <legend className="sr-only">{t('selectDifficulty')}</legend>
            <div className="grid grid-cols-3 gap-3">
              {difficultyLevels.map((level) => (
                <div key={level}>
                  <input type="radio" name="difficulty" id={level} value={level} checked={difficulty === level} onChange={() => setDifficulty(level)} className="sr-only peer" />
                  <label htmlFor={level} className="flex items-center justify-center rounded-md py-2 px-3 text-sm font-medium uppercase sm:flex-1 cursor-pointer border bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 peer-checked:ring-2 peer-checked:ring-[rgba(var(--primary-500),1)] peer-checked:ring-offset-2 peer-checked:border-transparent">
                    {`${t(level)} (${difficultyTimeMap[level]}s)`}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>

        <div>
            <label htmlFor="explanation-style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('selectExplanationStyle')}</label>
            <select
              id="explanation-style"
              name="explanation-style"
              value={explanationStyle}
              onChange={(e) => setExplanationStyle(e.target.value as ExplanationStyle)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[rgb(var(--primary-500))] focus:border-[rgb(var(--primary-500))] sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {Object.values(ExplanationStyle).map((style) => (
                <option key={style} value={style}>
                  {t(style)}
                </option>
              ))}
            </select>
        </div>

        <div>
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                <span>{t('enableTimer')}</span>
                <button
                    type="button"
                    className={`${isTimed ? 'bg-[rgb(var(--primary-600))]' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[rgba(var(--primary-500),1)] focus:ring-offset-2`}
                    role="switch"
                    aria-checked={isTimed}
                    onClick={() => setIsTimed(!isTimed)}
                    >
                    <span
                        aria-hidden="true"
                        className={`${isTimed ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                </button>
            </label>
        </div>

        <button
          onClick={handleGenerateClick}
          disabled={!file}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[rgb(var(--primary-600))] hover:bg-[rgb(var(--primary-700))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(var(--primary-500),1)] disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {t('generateQuiz')}
        </button>
      </div>
    </div>
  );
};

export default QuizGenerator;