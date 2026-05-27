import React, { useEffect, useState } from 'react';
import { getAllUsers, getPublicQuizzes, getAllAttempts, updateUserRole, deleteQuiz, getActivityLogs, getQuizReports, resolveQuizReport, getQuestionFeedback } from '../services/firebaseService';
import { FirebaseUser, FirestoreQuiz, QuizAttempt } from '../types';

interface AdminDashboardProps {
  currentUser: FirebaseUser | null;
  t: (key: any) => string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, t }) => {
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [quizzes, setQuizzes] = useState<FirestoreQuiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Console filters
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('ALL');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [fetchedUsers, fetchedQuizzes, fetchedAttempts, fetchedLogs, fetchedReports, fetchedFeedbacks] = await Promise.all([
        getAllUsers(),
        getPublicQuizzes(),
        getAllAttempts(),
        getActivityLogs(),
        getQuizReports(),
        getQuestionFeedback()
      ]);
      setUsers(fetchedUsers);
      setQuizzes(fetchedQuizzes);
      setAttempts(fetchedAttempts);
      setLogs(fetchedLogs);
      setReports(fetchedReports);
      setFeedbacks(fetchedFeedbacks);
    } catch (err: any) {
      console.error("Error loading admin dashboard data:", err);
      setError("Error al cargar la información del panel de administración.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      loadData();
    }
  }, [currentUser]);

  const handleToggleRole = async (uid: string, currentRole: 'admin' | 'student') => {
    if (uid === currentUser?.uid) {
      alert("No puedes cambiar tu propio rol.");
      return;
    }
    const newRole = currentRole === 'admin' ? 'student' : 'admin';
    if (!window.confirm(`¿Estás seguro de cambiar el rol de este usuario a ${newRole === 'admin' ? 'Administrador' : 'Estudiante'}?`)) {
      return;
    }

    try {
      await updateUserRole(uid, newRole);
      setSuccessMessage("Rol de usuario actualizado correctamente.");
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      // Re-fetch logs to show update in console
      const fetchedLogs = await getActivityLogs();
      setLogs(fetchedLogs);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
      alert("Error al actualizar el rol.");
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm("¿Estás seguro de eliminar permanentemente este cuestionario público?")) {
      return;
    }

    try {
      await deleteQuiz(quizId);
      setSuccessMessage("Cuestionario eliminado con éxito.");
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      // Re-fetch logs to show update in console
      const fetchedLogs = await getActivityLogs();
      setLogs(fetchedLogs);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el cuestionario.");
    }
  };

  const filteredLogs = logs.filter(log => {
    const detailsText = log.details || '';
    const aliasText = log.userAlias || '';
    const matchesSearch = detailsText.toLowerCase().includes(logSearch.toLowerCase()) || 
                          aliasText.toLowerCase().includes(logSearch.toLowerCase());
    const matchesAction = logActionFilter === 'ALL' || log.action === logActionFilter;
    return matchesSearch && matchesAction;
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto my-8 p-6 bg-red-100 dark:bg-red-900/30 border border-red-500/20 text-red-700 dark:text-red-300 rounded-2xl text-center">
        <h3 className="text-xl font-bold mb-2">Acceso Denegado</h3>
        <p className="text-sm">Solo los administradores autorizados pueden acceder a este panel.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg className="animate-spin h-10 w-10 text-[rgb(var(--primary-500))]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Cargando panel de control administrativo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title */}
      <div className="text-center md:text-left space-y-2">
        <h2 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] dark:from-[rgb(var(--primary-400))] dark:to-[rgb(var(--primary-200))]">
          Panel de Administración
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Gestiona las cuentas de los usuarios, modifica sus privilegios de acceso y supervisa los cuestionarios publicados.
        </p>
      </div>

      {/* Alert Messages */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-green-500/10 dark:bg-green-500/20 border border-green-500/30 text-green-600 dark:text-green-300 text-sm flex items-center gap-2">
          <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-300 text-sm flex items-center gap-2">
          <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="backdrop-blur-md bg-white/50 dark:bg-gray-800/40 border border-white/20 dark:border-gray-700/20 shadow-lg rounded-2xl p-6">
          <h3 className="text-gray-400 dark:text-gray-500 text-sm font-bold uppercase tracking-wider">Total Usuarios</h3>
          <p className="text-4xl font-extrabold text-gray-900 dark:text-white mt-2">{users.length}</p>
        </div>

        <div className="backdrop-blur-md bg-white/50 dark:bg-gray-800/40 border border-white/20 dark:border-gray-700/20 shadow-lg rounded-2xl p-6">
          <h3 className="text-gray-400 dark:text-gray-500 text-sm font-bold uppercase tracking-wider">Cuestionarios Públicos</h3>
          <p className="text-4xl font-extrabold text-gray-900 dark:text-white mt-2">{quizzes.length}</p>
        </div>

        <div className="backdrop-blur-md bg-white/50 dark:bg-gray-800/40 border border-white/20 dark:border-gray-700/20 shadow-lg rounded-2xl p-6">
          <h3 className="text-gray-400 dark:text-gray-500 text-sm font-bold uppercase tracking-wider">Intentos Realizados</h3>
          <p className="text-4xl font-extrabold text-gray-900 dark:text-white mt-2">{attempts.length}</p>
        </div>
      </div>

      {/* Users Section */}
      <div className="backdrop-blur-md bg-white/50 dark:bg-gray-800/40 border border-white/20 dark:border-gray-700/20 shadow-xl rounded-2xl p-6 overflow-hidden">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Gestión de Usuarios</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 font-bold">
                <th className="py-3 px-4">Usuario / Email</th>
                <th className="py-3 px-4">Alias</th>
                <th className="py-3 px-4">Rol</th>
                <th className="py-3 px-4">Fecha Registro</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.uid} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100/30 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-white">{user.email}</td>
                  <td className="py-3.5 px-4 font-semibold text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]">{user.alias}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    }`}>
                      {user.role === 'admin' ? 'Administrador' : 'Estudiante'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleRole(user.uid, user.role)}
                      disabled={user.uid === currentUser?.uid}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-[rgb(var(--primary-500))] hover:text-white dark:hover:bg-[rgb(var(--primary-600))] transition-all disabled:opacity-50"
                    >
                      Cambiar Rol
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quizzes Section */}
      <div className="backdrop-blur-md bg-white/50 dark:bg-gray-800/40 border border-white/20 dark:border-gray-700/20 shadow-xl rounded-2xl p-6 overflow-hidden">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Moderación de Cuestionarios Públicos</h3>
        {quizzes.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 italic text-center py-6">No hay cuestionarios públicos para moderar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 font-bold">
                  <th className="py-3 px-4">Título</th>
                  <th className="py-3 px-4">Creador</th>
                  <th className="py-3 px-4">Dificultad</th>
                  <th className="py-3 px-4">Modo</th>
                  <th className="py-3 px-4">Preguntas</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map(quiz => (
                  <tr key={quiz.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100/30 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white line-clamp-1">{quiz.name}</td>
                    <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 font-semibold">{quiz.creatorAlias}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        quiz.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                        quiz.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {quiz.difficulty === 'Easy' ? 'Fácil' : quiz.difficulty === 'Medium' ? 'Medio' : 'Difícil'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400">
                      {quiz.mode === 'MultipleChoice' ? 'Opción Múltiple' : 'Escrito'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-700 dark:text-gray-300 text-center">{quiz.questions.length}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 transition-all"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reports and Feedback Moderation Section */}
      <div className="backdrop-blur-md bg-white/50 dark:bg-gray-800/40 border border-white/20 dark:border-gray-700/20 shadow-xl rounded-2xl p-6 space-y-8">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Moderación de Reportes y Valoraciones
            {reports.filter(r => r.status === 'pending').length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 animate-pulse">
                {reports.filter(r => r.status === 'pending').length} PENDIENTES
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Supervisa las denuncias de contenido público y el feedback enviado por los estudiantes sobre reactivos específicos.</p>
        </div>

        {/* Reports Sub-Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            1. Denuncias de Cuestionarios Públicos ({reports.length})
          </h4>
          {reports.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic py-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800 rounded-xl text-center">No hay reportes registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 font-bold">
                    <th className="py-2.5 px-3">Cuestionario</th>
                    <th className="py-2.5 px-3">Motivo / Explicación</th>
                    <th className="py-2.5 px-3">Reportero</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(report => (
                    <tr key={report.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100/30 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="py-3 px-3 font-bold text-gray-900 dark:text-white max-w-[150px] truncate" title={report.quizName}>
                        {report.quizName}
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-300 max-w-[200px] break-words whitespace-normal font-medium">
                        {report.reason}
                      </td>
                      <td className="py-3 px-3 text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] font-semibold">
                        {report.reporterAlias}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          report.status === 'pending'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-extrabold'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}>
                          {report.status === 'pending' ? 'Pendiente' : 'Resuelto'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-500">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {report.status === 'pending' && (
                            <>
                              <button
                                onClick={async () => {
                                  if (window.confirm("¿Seguro de descartar este reporte sin eliminar el cuestionario?")) {
                                    try {
                                      await resolveQuizReport(report.id);
                                      setSuccessMessage("Reporte descartado.");
                                      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
                                      setTimeout(() => setSuccessMessage(null), 3000);
                                    } catch (e) {
                                      alert("Error al resolver reporte.");
                                    }
                                  }
                                }}
                                className="px-2.5 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-600 hover:text-white dark:hover:bg-green-600 font-bold transition-all"
                              >
                                Resolver
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`¿Seguro de eliminar permanentemente el cuestionario '${report.quizName}'?`)) {
                                    try {
                                      await deleteQuiz(report.quizId);
                                      await resolveQuizReport(report.id);
                                      setSuccessMessage("Cuestionario eliminado y reporte resuelto.");
                                      setQuizzes(prev => prev.filter(q => q.id !== report.quizId));
                                      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
                                      setTimeout(() => setSuccessMessage(null), 3000);
                                    } catch (e) {
                                      alert("Error al eliminar cuestionario.");
                                    }
                                  }
                                }}
                                className="px-2.5 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 font-bold transition-all"
                              >
                                Eliminar Quiz
                              </button>
                            </>
                          )}
                          {report.status === 'resolved' && (
                            <span className="text-[10px] text-gray-400 italic">Resuelto</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Feedback Sub-Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            2. Valoraciones y Discrepancias de Preguntas ({feedbacks.length})
          </h4>
          {feedbacks.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic py-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800 rounded-xl text-center">No hay feedbacks registrados en reactivos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 font-bold">
                    <th className="py-2.5 px-3">Cuestionario</th>
                    <th className="py-2.5 px-3">Pregunta Afectada</th>
                    <th className="py-2.5 px-3">Valoración</th>
                    <th className="py-2.5 px-3">Comentario de Alumno</th>
                    <th className="py-2.5 px-3">Autor</th>
                    <th className="py-2.5 px-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map(fb => (
                    <tr key={fb.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100/30 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="py-3 px-3 font-bold text-gray-900 dark:text-white max-w-[150px] truncate" title={fb.quizName}>
                        {fb.quizName}
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-300 max-w-[200px] break-words whitespace-normal font-medium">
                        {fb.questionText}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-0.5 ${
                          fb.evaluation === 'good'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-extrabold'
                        }`}>
                          {fb.evaluation === 'good' ? '👍 Bien' : '👎 Mal'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-300 max-w-[250px] break-words whitespace-normal italic font-medium">
                        {fb.comment || '(Sin comentarios)'}
                      </td>
                      <td className="py-3 px-3 text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] font-semibold">
                        {fb.userAlias}
                      </td>
                      <td className="py-3 px-3 text-gray-500">
                        {new Date(fb.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Activity Logs Console */}
      <div className="backdrop-blur-md bg-white/50 dark:bg-gray-800/40 border border-white/20 dark:border-gray-700/20 shadow-xl rounded-2xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Consola de Actividades del Sistema</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Historial auditado de operaciones y eventos en tiempo real en la base de datos.</p>
          </div>
          
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] hover:from-[rgb(var(--primary-700))] hover:to-[rgb(var(--primary-600))] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="h-4 w-4 animate-spin-hover" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6H18.79M18 9h-5" />
            </svg>
            Actualizar Consola
          </button>
        </div>

        {/* Console Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input
            type="text"
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            placeholder="Buscar por detalle o alias..."
            className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 text-xs outline-none focus:ring-2 focus:ring-[rgb(var(--primary-500))]"
          />
          <select
            value={logActionFilter}
            onChange={(e) => setLogActionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 text-xs outline-none focus:ring-2 focus:ring-[rgb(var(--primary-500))] sm:w-56"
          >
            <option value="ALL">Todas las Acciones</option>
            <option value="USER_REGISTER">Registros</option>
            <option value="USER_LOGIN">Inicios de Sesión</option>
            <option value="USER_LOGOUT">Cierres de Sesión</option>
            <option value="QUIZ_GENERATED">Cuestionarios Generados</option>
            <option value="QUIZ_SHARED">Cuestionarios Compartidos</option>
            <option value="QUIZ_DELETED">Cuestionarios Eliminados</option>
            <option value="QUIZ_ATTEMPT">Intentos de Cuestionario</option>
            <option value="ROLE_UPDATED">Actualización de Roles</option>
            <option value="INVITATION_SENT">Invitaciones Enviadas</option>
          </select>
        </div>

        {/* Real Terminal Box */}
        <div className="bg-gray-950 border border-gray-900 shadow-2xl rounded-2xl p-5 font-mono text-[11px] text-green-400 max-h-96 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-gray-800">
          {filteredLogs.length === 0 ? (
            <p className="text-gray-500 italic text-center py-6">No se registraron logs con los filtros activos.</p>
          ) : (
            filteredLogs.map(log => {
              const time = new Date(log.timestamp);
              const dateStr = time.toLocaleTimeString([], { hour12: false });
              const fullDateStr = time.toLocaleDateString();
              
              // Define colored tag based on action
              let actionColor = 'text-blue-400';
              if (log.action.includes('REGISTER')) actionColor = 'text-purple-400';
              if (log.action.includes('LOGIN')) actionColor = 'text-teal-400';
              if (log.action.includes('ATTEMPT')) actionColor = 'text-green-400';
              if (log.action.includes('DELETED')) actionColor = 'text-red-400';
              if (log.action.includes('SHARED')) actionColor = 'text-orange-400';
              if (log.action.includes('INVITATION')) actionColor = 'text-pink-400';
              if (log.action.includes('ROLE')) actionColor = 'text-yellow-400';

              return (
                <div key={log.id} className="hover:bg-gray-900/50 p-1 rounded transition-colors flex items-start gap-2 border-b border-gray-900/20">
                  <span className="text-gray-600 select-none">[{fullDateStr} {dateStr}]</span>
                  <span className={`font-bold uppercase ${actionColor}`}>[{log.action}]</span>
                  <span className="text-cyan-400">@{log.userAlias}</span>
                  <span className="text-gray-300 flex-1">{log.details}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
