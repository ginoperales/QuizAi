import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CompletedQuiz, ActiveQuiz, FirebaseUser } from '../types';
import { HistoryIcon, TrashIcon, RefreshIcon, EllipsisVerticalIcon, DocumentChartBarIcon, FileTextIcon, KeyIcon, PencilSquareIcon, RectangleStackIcon, TableIcon } from './icons';
import { exportQuizReportToPdf, exportQuizForEvaluationToPdf, exportQuizWithKeyToPdf, exportQuizBackupToExcel } from '../services/fileService';
import { decodeHtml } from '../services/fileService';

type QuizType = 'completed' | 'paused';
type ExportType = 'report' | 'evaluation' | 'key' | 'backup';

interface HistoryViewProps {
  completedHistory: CompletedQuiz[];
  pausedHistory: ActiveQuiz[];
  currentUser?: FirebaseUser | null;
  onDelete: (id: string, type: QuizType) => void;
  onViewDetails: (id: string) => void;
  onRetake: (id: string) => void;
  onResume: (id: string) => void;
  onRestartQuiz: (quiz: CompletedQuiz | ActiveQuiz) => void;
  onRename: (id: string, newName: string, type: QuizType) => void;
  onStudy: (quiz: CompletedQuiz | ActiveQuiz) => void;
  t: (key: any, options?: Record<string, string | number>) => string;
}

const HistoryView: React.FC<HistoryViewProps> = ({ 
  completedHistory, 
  pausedHistory, 
  currentUser,
  onDelete, 
  onViewDetails, 
  onRetake, 
  onResume, 
  onRestartQuiz,
  onRename, 
  onStudy, 
  t 
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<QuizType | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwnership, setSelectedOwnership] = useState<'all' | 'mine' | 'others'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'completed' | 'paused'>('all');

  const allQuizzes = useMemo(() => {
    const completed = completedHistory.map(q => ({...q, type: 'completed' as const, dateValue: new Date(q.date) }));
    const paused = pausedHistory.map(q => {
      const parsedId = parseInt(q.id);
      const isTimestamp = !isNaN(parsedId) && String(parsedId).length >= 10;
      const dateValue = isTimestamp ? new Date(parsedId) : new Date();
      return {
        ...q,
        type: 'paused' as const,
        dateValue
      };
    });
    
    return [...completed, ...paused].sort((a, b) => b.dateValue.getTime() - a.dateValue.getTime());
  }, [completedHistory, pausedHistory]);

  const filteredQuizzes = useMemo(() => {
    return allQuizzes.filter(quiz => {
      const name = quiz.name || '';
      const creator = quiz.creatorAlias || '';
      const matchesSearch = !searchQuery.trim() || 
        name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        creator.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isMine = !quiz.creatorUid || (currentUser && quiz.creatorUid === currentUser.uid);
      const matchesOwnership = 
        selectedOwnership === 'all' ||
        (selectedOwnership === 'mine' && isMine) ||
        (selectedOwnership === 'others' && !isMine);

      const matchesStatus = 
        selectedStatus === 'all' || 
        (selectedStatus === 'completed' && quiz.type === 'completed') || 
        (selectedStatus === 'paused' && quiz.type === 'paused');

      return matchesSearch && matchesOwnership && matchesStatus;
    });
  }, [allQuizzes, searchQuery, selectedOwnership, selectedStatus, currentUser]);
  
  const isAllSelected = filteredQuizzes.length > 0 && selectedIds.length === filteredQuizzes.length;

  const handleSelect = (id: string) => {
      setSelectedIds(prev =>
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedIds(filteredQuizzes.map(q => q.id));
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
            ? Object.values(quiz.writtenUserAnswers || {}).map(a => a as { score?: number }).reduce((sum, a) => sum + (a.score || 0), 0)
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('history')}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Total de {allQuizzes.length} cuestionarios ({completedHistory.length} completados, {pausedHistory.length} en pausa)
          </p>
        </div>
        <div className="flex items-center">
            <input
                id="select-all"
                type="checkbox"
                onChange={handleSelectAll}
                checked={isAllSelected}
                disabled={filteredQuizzes.length === 0}
                className="h-5 w-5 rounded border-gray-300 text-[rgb(var(--primary-600))] focus:ring-[rgb(var(--primary-500))] dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="select-all" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t('selectAll')}</label>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-150 dark:border-gray-700 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en historial por nombre o creador..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--primary-500))] outline-none"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
            <button
              type="button"
              onClick={() => setSelectedStatus('all')}
              className={`px-2.5 py-1.5 rounded-md font-bold transition-all ${
                selectedStatus === 'all'
                  ? 'bg-white dark:bg-gray-700 text-[rgb(var(--primary-600))] dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('completed')}
              className={`px-2.5 py-1.5 rounded-md font-bold transition-all ${
                selectedStatus === 'completed'
                  ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Completados
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('paused')}
              className={`px-2.5 py-1.5 rounded-md font-bold transition-all ${
                selectedStatus === 'paused'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              En Pausa
            </button>
          </div>
        </div>

        {/* Ownership filter pills */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700/60 text-xs">
          <span className="text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Autoría:</span>
          <button
            type="button"
            onClick={() => setSelectedOwnership('all')}
            className={`px-2.5 py-1 rounded-md font-bold transition-all ${
              selectedOwnership === 'all'
                ? 'bg-[rgb(var(--primary-600))] text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setSelectedOwnership('mine')}
            className={`px-2.5 py-1 rounded-md font-bold transition-all ${
              selectedOwnership === 'mine'
                ? 'bg-[rgb(var(--primary-600))] text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Creados por mí
          </button>
          <button
            type="button"
            onClick={() => setSelectedOwnership('others')}
            className={`px-2.5 py-1 rounded-md font-bold transition-all ${
              selectedOwnership === 'others'
                ? 'bg-[rgb(var(--primary-600))] text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            De otros creadores
          </button>
        </div>
      </div>

      {filteredQuizzes.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <HistoryIcon className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-3 text-base font-semibold text-gray-700 dark:text-gray-300">No se encontraron cuestionarios con estos filtros</p>
          <button 
            onClick={() => { setSearchQuery(''); setSelectedOwnership('all'); setSelectedStatus('all'); }}
            className="mt-2 text-xs font-bold text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] hover:underline"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <ul className={`space-y-4 ${selectedIds.length > 0 ? 'pb-24' : ''}`}>
          {filteredQuizzes.map((quiz) => {
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
                      
                      {quiz.creatorAlias && (
                        <p className="text-xs text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] font-semibold mb-1">
                          Creado por: @{quiz.creatorAlias}
                        </p>
                      )}
                      
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                          {quiz.dateValue.toLocaleString()}
                      </p>
                  </div>
                  <div className="sm:ml-4 flex-shrink-0 flex items-center space-x-2">
                    {isPaused ? (
                      <>
                        <button 
                            onClick={() => onRestartQuiz(quiz)}
                            className="px-3 py-2 bg-amber-500 text-white rounded-md text-sm font-medium hover:bg-amber-600 transition-colors flex items-center gap-1 shadow-sm"
                            title="Reiniciar y responder este cuestionario desde el inicio"
                        >
                            <RefreshIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Volver a hacer</span>
                        </button>
                        <button 
                            onClick={() => onResume(quiz.id)}
                            className="px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                            {t('resume')}
                        </button>
                        <button 
                            onClick={() => onRetake(quiz.id)}
                            className="px-2.5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                            title="Editar preguntas del cuestionario"
                        >
                            <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                            onClick={() => onRestartQuiz(quiz)}
                            className="px-3 py-2 bg-amber-500 text-white rounded-md text-sm font-medium hover:bg-amber-600 transition-colors flex items-center gap-1 shadow-sm"
                            title="Reiniciar y responder este cuestionario desde el inicio"
                        >
                            <RefreshIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Volver a hacer</span>
                        </button>
                        <button 
                            onClick={() => onViewDetails(quiz.id)}
                            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            {t('viewDetails')}
                        </button>
                        <button 
                            onClick={() => onRetake(quiz.id)}
                            className="px-2.5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                            title="Editar preguntas del cuestionario"
                        >
                            <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      </>
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
                              <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                                  <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                      <button onClick={() => { onRestartQuiz(quiz); setOpenMenuId(null); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium" role="menuitem">
                                          <RefreshIcon className="mr-3 h-5 w-5 text-amber-500" />
                                          <span>Volver a hacer (Reiniciar)</span>
                                      </button>
                                      <button onClick={() => { onStudy(quiz); setOpenMenuId(null); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem">
                                          <RectangleStackIcon className="mr-3 h-5 w-5" />
                                          <span>{t('studyWithFlashcards')}</span>
                                      </button>
                                      <button onClick={() => handleRenameStart(quiz)} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem">
                                          <PencilSquareIcon className="mr-3 h-5 w-5" />
                                          <span>{t('rename')}</span>
                                      </button>
                                      
                                      <button onClick={() => { onRetake(quiz.id); setOpenMenuId(null); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem">
                                          <PencilSquareIcon className="mr-3 h-5 w-5" />
                                          <span>Editar Cuestionario</span>
                                      </button>
                                      
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
            );
          })}
        </ul>
      )}

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