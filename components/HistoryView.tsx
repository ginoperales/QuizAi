import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CompletedQuiz, ActiveQuiz } from '../types';
import { HistoryIcon, TrashIcon, RefreshIcon, EllipsisVerticalIcon, DocumentChartBarIcon, FileTextIcon, KeyIcon, PencilSquareIcon, RectangleStackIcon, TableIcon } from './icons';
import { exportQuizReportToPdf, exportQuizForEvaluationToPdf, exportQuizWithKeyToPdf, exportQuizBackupToExcel } from '../services/fileService';
import { decodeHtml } from '../services/fileService';

type QuizType = 'completed' | 'paused';
type ExportType = 'report' | 'evaluation' | 'key' | 'backup';

interface HistoryViewProps {
  completedHistory: CompletedQuiz[];
  pausedHistory: ActiveQuiz[];
  onDelete: (id: string, type: QuizType) => void;
  onViewDetails: (id: string) => void;
  onRetake: (id: string) => void;
  onResume: (id: string) => void;
  onRename: (id: string, newName: string, type: QuizType) => void;
  onStudy: (quiz: CompletedQuiz | ActiveQuiz) => void;
  t: (key: any, options?: Record<string, string | number>) => string;
}

const HistoryView: React.FC<HistoryViewProps> = ({ completedHistory, pausedHistory, onDelete, onViewDetails, onRetake, onResume, onRename, onStudy, t }) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<QuizType | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allQuizzes = useMemo(() => {
    const completed = completedHistory.map(q => ({...q, type: 'completed' as const, dateValue: new Date(q.date) }));
    const paused = pausedHistory.map(q => ({...q, type: 'paused' as const, dateValue: new Date(parseInt(q.id)) }));
    
    return [...completed, ...paused].sort((a, b) => b.dateValue.getTime() - a.dateValue.getTime());
  }, [completedHistory, pausedHistory]);
  
  const isAllSelected = allQuizzes.length > 0 && selectedIds.length === allQuizzes.length;

  const handleSelect = (id: string) => {
      setSelectedIds(prev =>
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedIds(allQuizzes.map(q => q.id));
      } else {
          setSelectedIds([]);
      }
  };

  const handleDeleteSelected = () => {
      if (window.confirm(t('confirmDeleteSelected', { count: selectedIds.length }))) {
          selectedIds.forEach(id => {
              const quiz = allQuizzes.find(q => q.id === id);
              if (quiz) {
                  onDelete(quiz.id, quiz.type);
              }
          });
          setSelectedIds([]);
      }
  };

  const toggleMenu = (id: string) => {
    setOpenMenuId(prevId => (prevId === id ? null : id));
  };

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleRenameStart = (quiz: (typeof allQuizzes)[0]) => {
    setEditingId(quiz.id);
    setEditingType(quiz.type);
    setEditingName(quiz.name || '');
    setOpenMenuId(null);
  };

  const handleRenameSave = () => {
    if (editingId && editingType) {
      onRename(editingId, editingName, editingType);
    }
    setEditingId(null);
    setEditingType(null);
    setEditingName('');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleRenameSave();
    } else if (event.key === 'Escape') {
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleExport = (quiz: (typeof allQuizzes)[0], type: ExportType) => {
    let quizData: CompletedQuiz;

    if (quiz.type === 'paused') {
        const score = quiz.mode === 'Written'
            ? Object.values(quiz.writtenUserAnswers || {}).reduce((sum, a) => sum + (a.score || 0), 0)
            : Object.keys(quiz.userAnswers).reduce((acc, qId) => {
                const question = quiz.questions.find(q => q.id === qId);
                if (question && quiz.userAnswers[qId] === question.correctAnswerIndex) {
                    return acc + 1;
                }
                return acc;
            }, 0);
        
        const totalQuestions = quiz.mode === 'Written' ? quiz.questions.length * 100 : quiz.questions.length;
        
        quizData = {
            ...quiz,
            score,
            totalQuestions,
            date: new Date(parseInt(quiz.id)).toISOString(),
        } as CompletedQuiz;
    } else {
        quizData = quiz as CompletedQuiz;
    }
    
    switch (type) {
        case 'report':
            exportQuizReportToPdf(quizData, t);
            break;
        case 'evaluation':
            exportQuizForEvaluationToPdf(quizData, t);
            break;
        case 'key':
            exportQuizWithKeyToPdf(quizData, t);
            break;
        case 'backup':
            exportQuizBackupToExcel(quizData, t);
            break;
    }
    setOpenMenuId(null);
  };

  if (allQuizzes.length === 0) {
    return (
      <div className="text-center py-16">
        <HistoryIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('noHistory')}</h3>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('history')}</h2>
        <div className="flex items-center">
            <input
                id="select-all"
                type="checkbox"
                onChange={handleSelectAll}
                checked={isAllSelected}
                disabled={allQuizzes.length === 0}
                className="h-5 w-5 rounded border-gray-300 text-[rgb(var(--primary-600))] focus:ring-[rgb(var(--primary-500))] dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="select-all" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t('selectAll')}</label>
        </div>
      </div>

      <ul className={`space-y-4 ${selectedIds.length > 0 ? 'pb-24' : ''}`}>
        {allQuizzes.map((quiz) => {
            const isPaused = quiz.type === 'paused';
            const isWritten = quiz.mode === 'Written';
            const totalValue = quiz.questions.length;

            let percentage, progressText;

            if (isPaused) {
                const answeredCount = quiz.mode === 'Written' ? Object.keys(quiz.writtenUserAnswers || {}).length : quiz.currentQuestionIndex;
                percentage = totalValue > 0 ? (answeredCount / totalValue) * 100 : 0;
                progressText = `${t('question')} ${answeredCount} / ${totalValue}`;
            } else {
                percentage = quiz.totalQuestions > 0 ? Math.round((quiz.score / quiz.totalQuestions) * 100) : 0;
                progressText = isWritten ? `${t('score')}: ${percentage}%` : `${t('score')}: ${quiz.score} / ${quiz.totalQuestions} (${percentage}%)`;
            }
            
            const difficultyColor = {
                Easy: 'bg-green-500',
                Medium: 'bg-yellow-500',
                Hard: 'bg-red-500',
            }[quiz.difficulty];
            const isEditing = editingId === quiz.id;
            const isSelected = selectedIds.includes(quiz.id);

            return (
              <li key={quiz.id} className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex items-center gap-4 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/50 ring-2 ring-[rgb(var(--primary-500))]' : ''}`}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelect(quiz.id)}
                    className="h-5 w-5 rounded border-gray-300 text-[rgb(var(--primary-600))] focus:ring-[rgb(var(--primary-500))] dark:bg-gray-700 dark:border-gray-600 flex-shrink-0"
                />
                <div className="flex-grow min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                           {isEditing ? (
                               <input 
                                  ref={inputRef}
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onBlur={handleRenameSave}
                                  onKeyDown={handleKeyDown}
                                  className="font-bold text-lg text-gray-800 dark:text-white bg-transparent border-b-2 border-[rgb(var(--primary-500))] focus:outline-none"
                               />
                           ) : (
                              <p className="font-bold text-lg text-gray-800 dark:text-white truncate" title={decodeHtml(quiz.name) || t('untitledQuiz')}>
                                  {decodeHtml(quiz.name) || t('untitledQuiz')}
                              </p>
                           )}
                           <div className="flex items-center gap-2">
                               {isPaused && (
                                  <span className="px-2 py-1 text-xs font-semibold text-white rounded-full bg-blue-500">
                                      {t('paused')}
                                  </span>
                               )}
                              <span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${difficultyColor}`}>
                                  {t(quiz.difficulty)}
                              </span>
                           </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          {progressText}
                      </p>

                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                          <div className="bg-[rgb(var(--primary-600))] h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                      </div>
                      
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                          {quiz.dateValue.toLocaleString()}
                      </p>
                  </div>
                  <div className="sm:ml-4 flex-shrink-0 flex items-center space-x-2">
                    {isPaused ? (
                      <button 
                          onClick={() => onResume(quiz.id)}
                          className="px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                          {t('resume')}
                      </button>
                    ) : (
                      <button 
                          onClick={() => onViewDetails(quiz.id)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                          {t('viewDetails')}
                      </button>
                    )}
                    <div className="relative" ref={openMenuId === quiz.id ? menuRef : null}>
                          <button
                              onClick={() => toggleMenu(quiz.id)}
                              className="p-2 text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--primary-500),1)]"
                              aria-label="Options"
                          >
                              <EllipsisVerticalIcon className="h-5 w-5" />
                          </button>
                          {openMenuId === quiz.id && (
                              <div className="origin-top-right absolute right-0 mt-2 w-60 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                                  <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                      <button onClick={() => { onStudy(quiz); setOpenMenuId(null); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem">
                                          <RectangleStackIcon className="mr-3 h-5 w-5" />
                                          <span>{t('studyWithFlashcards')}</span>
                                      </button>
                                      <button onClick={() => handleRenameStart(quiz)} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem">
                                          <PencilSquareIcon className="mr-3 h-5 w-5" />
                                          <span>{t('rename')}</span>
                                      </button>
                                      
                                      {!isPaused && (
                                          <button onClick={() => { onRetake(quiz.id); setOpenMenuId(null); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem">
                                              <RefreshIcon className="mr-3 h-5 w-5" />
                                              <span>{t('editAndRetake')}</span>
                                          </button>
                                      )}
                                      
                                      <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                                      
                                      <button onClick={() => handleExport(quiz, 'report')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem">
                                          <DocumentChartBarIcon className="mr-3 h-5 w-5" />
                                          <span>{t('generateReport')}</span>
                                      </button>
                                      <button onClick={() => handleExport(quiz, 'evaluation')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem">
                                          <FileTextIcon className="mr-3 h-5 w-5" />
                                          <span>{t('generateEvaluation')}</span>
                                      </button>
                                      <button onClick={() => handleExport(quiz, 'key')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem">
                                          <KeyIcon className="mr-3 h-5 w-5" />
                                          <span>{t('generateQuizWithKey')}</span>
                                      </button>
                                      <button onClick={() => handleExport(quiz, 'backup')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem">
                                          <TableIcon className="mr-3 h-5 w-5" />
                                          <span>{t('downloadBackupExcel')}</span>
                                      </button>
                                      
                                      <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                                      <button onClick={() => { onDelete(quiz.id, quiz.type); setOpenMenuId(null); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900" role="menuitem">
                                          <TrashIcon className="mr-3 h-5 w-5" />
                                          <span>{t('delete')}</span>
                                      </button>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
                </div>
              </li>
            )
        })}
      </ul>

      {selectedIds.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg z-20">
              <div className="container mx-auto flex justify-between items-center">
                   <span className="font-semibold">{t('itemsSelected', { count: selectedIds.length })}</span>
                   <div className="flex space-x-2">
                       <button onClick={() => setSelectedIds([])} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">{t('cancel')}</button>
                       <button onClick={handleDeleteSelected} className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700">
                           <TrashIcon className="mr-2 h-5 w-5" />
                           {t('deleteSelected')}
                       </button>
                   </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default HistoryView;