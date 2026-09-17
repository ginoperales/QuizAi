import React, { useState, useCallback, useRef } from 'react';
import { Difficulty, Question, ExplanationStyle, QuizMode, FirebaseUser } from '../types';
import { generateQuestionsFromText, generateQuestionsFromImage } from '../services/geminiService';
import { parseSpreadsheet, readFileAsText, readFileAsBase64, downloadExcelTemplate } from '../services/fileService';
import { UploadIcon, DownloadIcon, TrashIcon, Cog6ToothIcon, ClipboardDocumentIcon } from './icons';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set(['txt', 'md', 'csv', 'xlsx', 'png', 'jpg', 'jpeg', 'webp']);

interface QuizGeneratorProps {
  currentUser: FirebaseUser | null;
  onTriggerAuth: () => void;
  onQuizGenerated: (questions: Question[], difficulty: Difficulty, isTimed: boolean, explanationStyle: ExplanationStyle, mode: QuizMode) => void;
  onGenerationFailed: (error: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  t: (key: any) => string;
  isOnline?: boolean;
}

const QuizGenerator: React.FC<QuizGeneratorProps> = ({ 
  currentUser, 
  onTriggerAuth, 
  onQuizGenerated, 
  onGenerationFailed, 
  setIsLoading, 
  t, 
  isOnline 
}) => {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Medium);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isTimed, setIsTimed] = useState<boolean>(true);
  const [explanationStyle, setExplanationStyle] = useState<ExplanationStyle>(ExplanationStyle.Didactica);
  const [quizMode, setQuizMode] = useState<QuizMode>('MultipleChoice');
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // Mobile UX states
  const [isDragging, setIsDragging] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (selectedFile: File) => {
    const extension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    const maxBytes = selectedFile.type.startsWith('image/') ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
    if (!SUPPORTED_EXTENSIONS.has(extension) || selectedFile.size === 0 || selectedFile.size > maxBytes) {
      setFile(null);
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onGenerationFailed(selectedFile.size > maxBytes
        ? `El archivo supera el límite permitido (${maxBytes / 1024 / 1024} MB).`
        : 'Formato no compatible. Admite TXT, MD, CSV, XLSX e imágenes.');
      return;
    }
    onGenerationFailed('');
    setFile(selectedFile);
    setFileName(selectedFile.name);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onGenerationFailed('');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileInfo = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['xlsx', 'csv'].includes(ext)) {
      return { icon: '📊', label: 'Hoja de Cálculo', badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' };
    }
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      return { icon: '🖼️', label: 'Imagen / Apunte', badge: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' };
    }
    return { icon: '📄', label: 'Documento Texto', badge: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' };
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(t('promptToCopy'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2200);
  };

  const handleGenerateClick = useCallback(async () => {
    if (!currentUser) {
      if (window.confirm("Debes iniciar sesión o registrarte para generar un cuestionario. ¿Deseas hacerlo ahora?")) {
        onTriggerAuth();
      }
      return;
    }
    
    if (!file) return;

    setIsLoading(true);
    onGenerationFailed('');

    try {
        const lowerName = file.name.toLowerCase();
        if (file.type.includes('sheet') || lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx')) {
            const questions = await parseSpreadsheet(file);
            if (questions.length === 0) throw new Error('La hoja no contiene preguntas válidas.');
            onQuizGenerated(questions, difficulty, isTimed, explanationStyle, quizMode);
        } else if (file.type.startsWith('image/')) {
            const { mimeType, data } = await readFileAsBase64(file);
            const questions = await generateQuestionsFromImage(data, mimeType, difficulty, t, customPrompt);
            onQuizGenerated(questions, difficulty, isTimed, explanationStyle, quizMode);
        } else {
            const textContent = await readFileAsText(file);
            if (!textContent.trim()) {
                throw new Error("El archivo está vacío o no pudo ser leído.");
            }
            const questions = await generateQuestionsFromText(textContent, difficulty, t, customPrompt);
            onQuizGenerated(questions, difficulty, isTimed, explanationStyle, quizMode);
        }
    } catch (error: any) {
        console.error("Error al generar cuestionario:", error);
        const detailedMsg = error?.message || t('errorGeneratingQuiz');
        onGenerationFailed(detailedMsg);
    } finally {
        setIsLoading(false);
    }
  }, [currentUser, file, difficulty, isTimed, explanationStyle, quizMode, customPrompt, onTriggerAuth, onQuizGenerated, onGenerationFailed, setIsLoading, t]);
  
  const difficultyLevels = Object.values(Difficulty);
  const difficultyTimeMap: Record<Difficulty, number> = {
    [Difficulty.Easy]: 30,
    [Difficulty.Medium]: 20,
    [Difficulty.Hard]: 10,
  };

  if (isOnline === false) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg border border-amber-200 dark:border-amber-900/40 text-center relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
        
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M4 4l16 16M9 9l1.414 1.414M11.828 15H9v-2.828l8.586-8.586a2 2 0 112.828 2.828L11.828 15z" />
          </svg>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Modo sin conexión activo</h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm max-w-md mx-auto mb-6 leading-relaxed">
          Actualmente estás desconectado de internet. La generación de nuevos cuestionarios con Inteligencia Artificial no está disponible en este momento.
        </p>
        
        <div className="bg-gray-50 dark:bg-gray-850 p-4 rounded-xl text-left border border-gray-200 dark:border-gray-750 max-w-lg mx-auto mb-6">
          <p className="text-xs font-bold text-gray-750 dark:text-gray-200 uppercase tracking-wider mb-2 select-none">¿Qué puedes hacer offline?</p>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold select-none">✓</span> Jugar cuestionarios guardados en tu historial.
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold select-none">✓</span> Repasar tus preguntas favoritas.
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold select-none">✓</span> Estudiar tus cuestionarios con tarjetas de memoria.
            </li>
          </ul>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400">
          La conexión se restablecerá automáticamente una vez recuperes tu señal.
        </p>
      </div>
    );
  }

  const fileInfo = file ? getFileInfo(file.name) : null;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-4 sm:p-7 md:p-8 rounded-2xl shadow-xl border border-gray-200/70 dark:border-gray-700/70 transition-all">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[rgba(var(--primary-500),0.12)] text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-300))] mb-2 border border-[rgba(var(--primary-500),0.25)]">
          ✨ Generador Inteligente
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          {t('createYourQuiz')}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-md mx-auto">
          {t('tagline')}
        </p>
      </div>

      <div className="space-y-5">
        {/* PASO 1: Subir Archivo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[rgb(var(--primary-600))] text-white text-[11px] font-black">1</span>
              <span>{t('uploadFile')}</span>
            </label>
            <button
              type="button"
              onClick={() => downloadExcelTemplate(t)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-300))] bg-[rgba(var(--primary-500),0.1)] hover:bg-[rgba(var(--primary-500),0.2)] transition-all cursor-pointer"
              title="Descargar plantilla Excel para rellenar"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              <span>Plantilla Excel</span>
            </button>
          </div>

          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group relative flex flex-col items-center justify-center p-6 sm:p-7 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center ${
                isDragging
                  ? 'border-[rgb(var(--primary-500))] bg-[rgba(var(--primary-500),0.08)] dark:bg-[rgba(var(--primary-500),0.15)] scale-[1.01]'
                  : 'border-gray-300 dark:border-gray-600 hover:border-[rgb(var(--primary-500))] bg-gray-50/70 dark:bg-gray-800/60 hover:bg-gray-100/70 dark:hover:bg-gray-800'
              }`}
            >
              <input
                ref={fileInputRef}
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                onChange={handleFileChange}
                accept=".txt,.md,.csv,.xlsx,.png,.jpg,.jpeg,.webp"
              />
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 shadow-md flex items-center justify-center text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] mb-2.5 group-hover:scale-110 transition-transform">
                <UploadIcon className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                Toca para seleccionar un archivo o foto
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                o arrastra y suelta tu documento aquí
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-100/90 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">📄 .txt, .md</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">📊 .xlsx, .csv</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-100/90 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">🖼️ .png, .jpg, .webp</span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl sm:text-3xl flex-shrink-0">{fileInfo?.icon}</span>
                <div className="min-w-0">
                  <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate" title={fileName}>
                    {fileName}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-300 flex items-center gap-2 mt-0.5">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span className={`px-1.5 py-0.2 rounded font-medium ${fileInfo?.badge}`}>{fileInfo?.label}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                >
                  Cambiar
                </button>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
                  title="Quitar archivo"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                onChange={handleFileChange}
                accept=".txt,.md,.csv,.xlsx,.png,.jpg,.jpeg,.webp"
              />
            </div>
          )}
        </div>

        {/* PASO 2: Modo de Cuestionario */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[rgb(var(--primary-600))] text-white text-[11px] font-black">2</span>
            <span>{t('quizMode')}</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setQuizMode('MultipleChoice')}
              className={`p-3 sm:p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                quizMode === 'MultipleChoice'
                  ? 'border-[rgb(var(--primary-500))] bg-[rgba(var(--primary-500),0.08)] dark:bg-[rgba(var(--primary-500),0.18)] dark:border-[rgb(var(--primary-400))] ring-2 ring-[rgb(var(--primary-500))] shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xl">🎯</span>
                {quizMode === 'MultipleChoice' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[rgb(var(--primary-500))]" />
                )}
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">Opción Múltiple</p>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-tight">4 alternativas con justificación</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setQuizMode('Written')}
              className={`p-3 sm:p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                quizMode === 'Written'
                  ? 'border-[rgb(var(--primary-500))] bg-[rgba(var(--primary-500),0.08)] dark:bg-[rgba(var(--primary-500),0.18)] dark:border-[rgb(var(--primary-400))] ring-2 ring-[rgb(var(--primary-500))] shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xl">✍️</span>
                {quizMode === 'Written' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[rgb(var(--primary-500))]" />
                )}
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">Modo Escrito</p>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-tight">Redacta y la IA evalúa tu respuesta</p>
              </div>
            </button>
          </div>
        </div>

        {/* PASO 3: Dificultad */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[rgb(var(--primary-600))] text-white text-[11px] font-black">3</span>
            <span>{t('selectDifficulty')}</span>
          </label>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {difficultyLevels.map((level) => {
              const isSelected = difficulty === level;
              const config = {
                [Difficulty.Easy]: { icon: '🌱', label: t('Easy'), time: '30s', activeBg: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500' },
                [Difficulty.Medium]: { icon: '⚡', label: t('Medium'), time: '20s', activeBg: 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 ring-2 ring-amber-500' },
                [Difficulty.Hard]: { icon: '🔥', label: t('Hard'), time: '10s', activeBg: 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 ring-2 ring-rose-500' },
              }[level];
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`p-2.5 sm:p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? config.activeBg
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750'
                  }`}
                >
                  <span className="text-base sm:text-lg">{config.icon}</span>
                  <span className="font-bold text-xs sm:text-sm">{config.label}</span>
                  <span className="text-[10px] font-semibold opacity-90 text-gray-500 dark:text-gray-300">{config.time}/preg</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* OPCIONES AVANZADAS (Acordeón colapsable para mantener la pantalla móvil limpia) */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-gray-50/70 dark:bg-gray-850 transition-all">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="w-full flex items-center justify-between p-3.5 text-left font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-100/60 dark:hover:bg-gray-750 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Cog6ToothIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span>Opciones avanzadas</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                {t(explanationStyle)} • {isTimed ? 'Con tiempo' : 'Sin tiempo'}
              </span>
            </div>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isAdvancedOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isAdvancedOpen && (
            <div className="p-4 pt-2 border-t border-gray-200/80 dark:border-gray-700/80 space-y-4">
              {/* Instrucciones específicas (Prompt) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="custom-prompt" className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {t('specificInstructions')} <span className="text-gray-500 dark:text-gray-400 font-normal">({t('optional')})</span>
                  </label>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">{customPrompt.length}/500</span>
                </div>
                <textarea
                  id="custom-prompt"
                  rows={2}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  maxLength={500}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:ring-2 focus:ring-[rgb(var(--primary-500))] outline-none"
                  placeholder="Ej: Enfócate en conceptos clave, genera preguntas tipo examen de admisión, prioriza fórmulas..."
                />
              </div>

              {/* Estilo de explicación */}
              <div>
                <label htmlFor="explanation-style" className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                  {t('selectExplanationStyle')}
                </label>
                <select
                  id="explanation-style"
                  value={explanationStyle}
                  onChange={(e) => setExplanationStyle(e.target.value as ExplanationStyle)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--primary-500))] outline-none"
                >
                  {Object.values(ExplanationStyle).map((style) => (
                    <option key={style} value={style} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                      {t(style)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Temporizador por pregunta */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{t('enableTimer')}</p>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300">Cuenta regresiva por cada pregunta del cuestionario</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isTimed}
                  onClick={() => setIsTimed(!isTimed)}
                  className={`${isTimed ? 'bg-[rgb(var(--primary-600))]' : 'bg-gray-300 dark:bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                >
                  <span
                    className={`${isTimed ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>

              {/* Herramienta: Prompt para copiar a ChatGPT / Gemini */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700/60">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">¿Usas ChatGPT o Gemini para armar preguntas?</span>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-300))] hover:underline cursor-pointer"
                  >
                    <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                    <span>{isCopied ? '¡Copiado al portapapeles!' : 'Copiar formato de prompt'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTÓN PRINCIPAL DE GENERACIÓN (CTA) */}
        <button
          type="button"
          onClick={handleGenerateClick}
          disabled={!file}
          className={`w-full py-3.5 sm:py-4 px-5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
            file
              ? 'bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] text-white hover:opacity-95 shadow-[rgba(var(--primary-500),0.3)] hover:scale-[1.01] active:scale-[0.99]'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-300 border border-gray-300 dark:border-gray-700 cursor-not-allowed shadow-none'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>{file ? t('generateQuiz') : 'Selecciona un archivo para continuar'}</span>
        </button>
      </div>
    </div>
  );
};

export default QuizGenerator;
