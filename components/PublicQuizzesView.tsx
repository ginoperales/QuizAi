import React, { useEffect, useState, useMemo } from 'react';
import { getPublicQuizzes, sendQuizInvitation, reportQuiz } from '../services/firebaseService';
import { FirestoreQuiz, FirebaseUser } from '../types';
import Modal from './Modal';

interface PublicQuizzesViewProps {
  currentUser: FirebaseUser | null;
  favoriteQuizzes: string[];
  onToggleFavoriteQuiz: (quizId: string) => void;
  onStartQuiz: (quiz: FirestoreQuiz) => void;
  onTriggerAuth: () => void;
  t: (key: any) => string;
}

const PublicQuizzesView: React.FC<PublicQuizzesViewProps> = ({ 
  currentUser, 
  favoriteQuizzes, 
  onToggleFavoriteQuiz, 
  onStartQuiz, 
  onTriggerAuth, 
  t 
}) => {
  const [quizzes, setQuizzes] = useState<FirestoreQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedMode, setSelectedMode] = useState<string>('All');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Sharing states
  const [sharingQuiz, setSharingQuiz] = useState<FirestoreQuiz | null>(null);
  const [recipientId, setRecipientId] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reporting states
  const [reportingQuiz, setReportingQuiz] = useState<FirestoreQuiz | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const fetchedQuizzes = await getPublicQuizzes();
        setQuizzes(fetchedQuizzes);
      } catch (err: any) {
        console.error("Error loading public data:", err);
        setError("Error al cargar los cuestionarios públicos.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Filtered and searched quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(quiz => {
      const matchesSearch = quiz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            quiz.creatorAlias.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDifficulty = selectedDifficulty === 'All' || quiz.difficulty === selectedDifficulty;
      const matchesMode = selectedMode === 'All' || quiz.mode === selectedMode;
      const matchesFavorites = !showOnlyFavorites || favoriteQuizzes.includes(quiz.id);

      return matchesSearch && matchesDifficulty && matchesMode && matchesFavorites;
    });
  }, [quizzes, searchQuery, selectedDifficulty, selectedMode, showOnlyFavorites, favoriteQuizzes]);

  const handleStartReto = (quiz: FirestoreQuiz) => {
    if (!currentUser) {
      if (window.confirm("Debes iniciar sesión o registrarte para empezar este reto. ¿Quieres ir al login?")) {
        onTriggerAuth();
      }
      return;
    }
    onStartQuiz(quiz);
  };

  const shareLink = sharingQuiz ? `${window.location.origin}/?quizId=${sharingQuiz.id}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !sharingQuiz) return;
    setIsSendingInvite(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await sendQuizInvitation(
        currentUser.alias,
        recipientId,
        sharingQuiz.id,
        sharingQuiz.name
      );
      setInviteSuccess(`¡Invitación enviada con éxito a ${recipientId}!`);
      setRecipientId('');
    } catch (err: any) {
      console.error(err);
      setInviteError(err.message || "No se pudo enviar la invitación.");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !reportingQuiz) return;
    if (!reportReason.trim()) {
      setReportError("Por favor, describe brevemente el motivo del reporte.");
      return;
    }
    setIsSubmittingReport(true);
    setReportError(null);
    setReportSuccess(null);

    try {
      await reportQuiz(
        reportingQuiz.id,
        reportingQuiz.name,
        currentUser.uid,
        currentUser.alias,
        reportReason
      );
      setReportSuccess("¡El cuestionario ha sido reportado con éxito y será revisado por los administradores!");
      setReportReason('');
      setTimeout(() => {
        setReportingQuiz(null);
        setReportSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setReportError(err.message || "No se pudo enviar el reporte.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg className="animate-spin h-10 w-10 text-[rgb(var(--primary-500))]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Cargando cuestionarios de la comunidad...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-8 p-6 bg-red-100 dark:bg-red-900/30 border border-red-500/20 text-red-700 dark:text-red-300 rounded-2xl flex flex-col items-center text-center gap-4">
        <p className="font-bold">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title Section */}
      <div className="text-center md:text-left space-y-2">
        <h2 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] dark:from-[rgb(var(--primary-400))] dark:to-[rgb(var(--primary-200))]">
          Cuestionarios de la Comunidad
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Explora los retos compartidos por otros usuarios, pon a prueba tus conocimientos y únete al tablero de honor de cada cuestionario.
        </p>
      </div>

      {/* Search & Filter Premium Box */}
      <div className="backdrop-blur-md bg-white/50 dark:bg-gray-800/40 border border-white/20 dark:border-gray-700/20 shadow-xl rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título o creador..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--primary-500))] focus:border-transparent transition-all outline-none"
          />
          <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex w-full md:w-auto gap-4 flex-wrap">
          {currentUser && (
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`flex-1 md:flex-none px-4 py-3 rounded-xl border transition-all flex items-center justify-center gap-1.5 font-bold text-xs ${
                showOnlyFavorites
                  ? 'bg-yellow-500/10 dark:bg-yellow-500/20 border-yellow-500 text-yellow-600 dark:text-yellow-400 font-extrabold shadow-sm'
                  : 'border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <svg 
                className={`h-4.5 w-4.5 ${showOnlyFavorites ? 'fill-current text-yellow-500' : 'text-gray-400 dark:text-gray-500'}`} 
                fill={showOnlyFavorites ? "currentColor" : "none"} 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.175 0l-3.97 2.883c-.783.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.98 10.1c-.783-.57-.38-1.81.588-1.81h4.906a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {showOnlyFavorites ? 'Solo Favoritos' : 'Ver Favoritos'}
            </button>
          )}

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="flex-1 md:w-40 px-3 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--primary-500))] outline-none text-xs"
          >
            <option value="All">Dificultad (Todas)</option>
            <option value="Easy">Fácil</option>
            <option value="Medium">Medio</option>
            <option value="Hard">Difícil</option>
          </select>

          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="flex-1 md:w-40 px-3 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--primary-500))] outline-none text-xs"
          >
            <option value="All">Tipo (Todos)</option>
            <option value="MultipleChoice">Opción Múltiple</option>
            <option value="Written">Escrito</option>
          </select>
        </div>
      </div>

      {/* Grid of Public Quizzes */}
      {filteredQuizzes.length === 0 ? (
        <div className="text-center py-12 backdrop-blur-md bg-white/30 dark:bg-gray-800/20 border border-white/10 rounded-2xl">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">No se encontraron cuestionarios</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Intenta cambiar los filtros o el término de búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map(quiz => {
            const completers = quiz.completerAliases || [];
            const isFav = favoriteQuizzes.includes(quiz.id);
            
            return (
              <div 
                key={quiz.id}
                className="backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 shadow-lg rounded-3xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Header info with favorite star & report flag */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        quiz.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                        quiz.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {quiz.difficulty === 'Easy' ? 'Fácil' : quiz.difficulty === 'Medium' ? 'Medio' : 'Difícil'}
                      </span>
                      <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-900/40 px-2 py-1 rounded-md">
                        {quiz.mode === 'MultipleChoice' ? 'Opción Múltiple' : 'Escrito'}
                      </span>
                    </div>
                    
                    {currentUser && (
                      <div className="flex items-center gap-1">
                        {/* Favorite Toggle Button */}
                        <button
                          onClick={() => onToggleFavoriteQuiz(quiz.id)}
                          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title={isFav ? "Quitar de favoritos" : "Marcar como favorito"}
                        >
                          <svg 
                            className={`h-5 w-5 transition-transform active:scale-125 ${isFav ? 'text-yellow-500 fill-current' : 'text-gray-400 dark:text-gray-500 hover:text-yellow-500'}`} 
                            fill={isFav ? "currentColor" : "none"} 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.175 0l-3.97 2.883c-.783.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.98 10.1c-.783-.57-.38-1.81.588-1.81h4.906a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                        
                        {/* Report Quiz Button */}
                        <button
                          onClick={() => {
                            setReportingQuiz(quiz);
                            setReportError(null);
                            setReportSuccess(null);
                            setReportReason('');
                          }}
                          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 dark:text-gray-500 hover:text-red-500"
                          title="Reportar Cuestionario"
                        >
                          <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21v11h-8.5l-1-1H5v4m0-4h8.5" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Creator */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">
                    {quiz.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Creado por: <span className="font-semibold text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]">{quiz.creatorAlias}</span>
                  </p>

                  <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mb-6 bg-gray-50 dark:bg-gray-900/20 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div>
                      Preguntas: <span className="font-semibold text-gray-700 dark:text-gray-300">{quiz.questions.length}</span>
                    </div>
                    <div>
                      Tiempo: <span className="font-semibold text-gray-700 dark:text-gray-300">{quiz.isTimed ? 'Sí' : 'No'}</span>
                    </div>
                  </div>

                  {/* Aliases of who completed the quiz */}
                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                      Retadores Exitosos ({completers.length})
                    </h4>
                    {completers.length === 0 ? (
                      <p className="text-xs italic text-gray-400 dark:text-gray-500">
                        ¡Sé el primero en completar este reto!
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                        {completers.map((alias, idx) => (
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
                </div>

                {/* Buttons container */}
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => handleStartReto(quiz)}
                    className="flex-1 py-3 px-4 rounded-xl text-white font-bold bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] hover:from-[rgb(var(--primary-700))] hover:to-[rgb(var(--primary-600))] shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Empezar Reto
                  </button>
                  
                  <button
                    onClick={() => {
                      setSharingQuiz(quiz);
                      setInviteError(null);
                      setInviteSuccess(null);
                      setRecipientId('');
                    }}
                    className="p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center justify-center transform active:scale-[0.98]"
                    title="Compartir Reto"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 10.742l4.63-2.316a3 3 0 11.832 1.664l-4.63 2.316a3 3 0 11-.832-1.664z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Modal */}
      <Modal
        isOpen={sharingQuiz !== null}
        onClose={() => setSharingQuiz(null)}
        title="Compartir Reto"
      >
        {sharingQuiz && (
          <div className="space-y-6 mt-4">
            <div>
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Compartir por Enlace</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Cualquier persona con este enlace podrá acceder y realizar este cuestionario directamente.</p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 text-xs outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 ${
                    copied 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-[rgb(var(--primary-600))] hover:bg-[rgb(var(--primary-700))]'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Copiado
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            <div>
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Enviar Invitación a otro Usuario</h4>
              {currentUser ? (
                <form onSubmit={handleSendInvite} className="space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Introduce el Alias público o el ID de Usuario (ej. QZ-1234) del destinatario.</p>
                  
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      placeholder="Buscar por Alias o ID (ej: QZ-5432)"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--primary-500))] outline-none transition-all"
                    />
                  </div>

                  {inviteError && (
                    <div className="p-3 rounded-xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-center gap-1.5">
                      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{inviteError}</span>
                    </div>
                  )}

                  {inviteSuccess && (
                    <div className="p-3 rounded-xl bg-green-500/10 dark:bg-green-500/20 border border-green-500/30 text-green-600 dark:text-green-300 text-xs flex items-center gap-1.5">
                      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{inviteSuccess}</span>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setSharingQuiz(null)}
                      className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-xl text-xs font-bold hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                      Cerrar
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingInvite}
                      className="px-5 py-2.5 bg-[rgb(var(--primary-600))] text-white rounded-xl text-xs font-bold hover:bg-[rgb(var(--primary-700))] transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md active:scale-[0.98]"
                    >
                      {isSendingInvite ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Enviando...
                        </>
                      ) : (
                        "Enviar Invitación"
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-xl bg-yellow-500/10 dark:bg-yellow-500/20 border border-yellow-500/30 text-yellow-700 dark:text-yellow-300 text-xs text-center space-y-2">
                  <p>Debes iniciar sesión para invitar directamente a otros usuarios y que aparezca en su panel de notificaciones.</p>
                  <button
                    onClick={() => {
                      setSharingQuiz(null);
                      onTriggerAuth();
                    }}
                    className="px-3.5 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold transition-all"
                  >
                    Iniciar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={reportingQuiz !== null}
        onClose={() => setReportingQuiz(null)}
        title="Reportar Cuestionario Público"
      >
        {reportingQuiz && (
          <form onSubmit={handleSendReport} className="space-y-6 mt-4">
            <div className="p-4 rounded-2xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/15">
              <h4 className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">Cuestionario: {reportingQuiz.name}</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Creado por: @{reportingQuiz.creatorAlias}</p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Motivo del Reporte
              </label>
              <textarea
                required
                rows={4}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Explica brevemente por qué consideras que este cuestionario debe ser revisado (ej: respuestas incorrectas, contenido inapropiado, errores de formato, etc.)..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none"
              />
            </div>

            {reportError && (
              <div className="p-3 rounded-xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-center gap-1.5">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{reportError}</span>
              </div>
            )}

            {reportSuccess && (
              <div className="p-3 rounded-xl bg-green-500/10 dark:bg-green-500/20 border border-green-500/30 text-green-600 dark:text-green-300 text-xs flex items-center gap-1.5">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>{reportSuccess}</span>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setReportingQuiz(null)}
                className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-xl text-xs font-bold hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingReport}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md active:scale-[0.98]"
              >
                {isSubmittingReport ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Enviando...
                  </>
                ) : (
                  "Enviar Reporte"
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default PublicQuizzesView;
