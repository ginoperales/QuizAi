import React from 'react';
import { FirebaseUser } from '../types';

interface LandingViewProps {
  currentUser: FirebaseUser | null;
  onStart: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ currentUser, onStart }) => {
  return (
    <div className="space-y-16 max-w-6xl mx-auto my-6 px-4">
      {/* Hero Section */}
      <div className="relative text-center space-y-6 py-12 px-6 rounded-3xl overflow-hidden shadow-xl border border-white/20 dark:border-gray-700/20 backdrop-blur-md bg-gradient-to-br from-[rgba(var(--primary-600),0.05)] to-[rgba(var(--primary-500),0.02)] dark:from-[rgba(var(--primary-600),0.1)] dark:to-[rgba(var(--primary-900),0.05)]">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
        
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-[rgba(var(--primary-500),0.1)] text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] border border-[rgba(var(--primary-500),0.15)] shadow-sm animate-pulse mx-auto">
          ✨ Inteligencia Artificial Potenciada por Gemini 2.5
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] dark:from-[rgb(var(--primary-400))] dark:to-[rgb(var(--primary-200))] leading-tight max-w-4xl mx-auto">
          Transforma Cualquier Contenido en Cuestionarios Interactivos
        </h1>
        
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto font-medium leading-relaxed">
          QuizAI es una plataforma avanzada que te permite subir documentos, hojas de cálculo o imágenes de tus apuntes para crear retos educativos con explicaciones profundas e IA calificadora de respuestas.
        </p>

        <div className="pt-6">
          <button
            onClick={onStart}
            className="px-8 py-4 rounded-2xl text-lg font-bold text-white bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] hover:from-[rgb(var(--primary-700))] hover:to-[rgb(var(--primary-600))] shadow-lg shadow-[rgba(var(--primary-500),0.3)] hover:shadow-xl hover:-translate-y-0.5 transition-all transform active:scale-[0.98] cursor-pointer inline-flex items-center gap-3"
          >
            {currentUser ? "Ir a Crear Cuestionarios" : "Comenzar Ahora - Iniciar Sesión"}
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">¿Qué puedes hacer con QuizAI?</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">Explora las herramientas que hemos diseñado para llevar tu aprendizaje al siguiente nivel.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 p-6 rounded-3xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-64">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-[rgba(var(--primary-500),0.1)] text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] flex items-center justify-center shadow-inner">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Generación con IA</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Sube archivos de texto, fotos de tus apuntes o plantillas Excel y genera cuestionarios estructurados al instante.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 p-6 rounded-3xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-64">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-[rgba(var(--primary-500),0.1)] text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] flex items-center justify-center shadow-inner">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Modo Escrito e IA</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Responde preguntas con tus palabras. Gemini evaluará el significado y te dará notas y justificaciones formativas.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 p-6 rounded-3xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-64">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-[rgba(var(--primary-500),0.1)] text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] flex items-center justify-center shadow-inner">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Retos Públicos</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Comparte tus cuestionarios con el público para que otros alumnos demuestren su conocimiento y aparezcan en tu reto.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 p-6 rounded-3xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-64">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-[rgba(var(--primary-500),0.1)] text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] flex items-center justify-center shadow-inner">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Historial y Flashcards</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Guarda tus favoritos, repasa estadísticas detalladas de tu aprendizaje y estudia tus errores usando flashcards dinámicas.
              </p>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Social Media Section */}
      <div className="backdrop-blur-md bg-white/50 dark:bg-gray-800/40 border border-white/20 dark:border-gray-700/20 shadow-xl rounded-3xl p-8 max-w-4xl mx-auto text-center space-y-6 animate-slide-up-fade-in">
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Redes Sociales</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sigue nuestros canales oficiales de SV GROUP para enterarte de novedades, proyectos e innovaciones tecnológicas.</p>
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-4 pt-2">
          {/* Facebook */}
          <a
            href="https://www.facebook.com/selvavivaconstrucciones"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600/10 hover:bg-blue-600 text-blue-700 dark:text-blue-400 hover:text-white border border-blue-600/10 hover:border-transparent transition-all font-bold text-sm shadow-sm active:scale-95 cursor-pointer"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
            </svg>
            Facebook
          </a>

          {/* LinkedIn */}
          <a
            href="https://www.linkedin.com/company/selva-viva-construcciones"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-cyan-700/10 hover:bg-cyan-700 text-cyan-800 dark:text-cyan-400 hover:text-white border border-cyan-700/10 hover:border-transparent transition-all font-bold text-sm shadow-sm active:scale-95 cursor-pointer"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
            LinkedIn
          </a>

          {/* TikTok */}
          <a
            href="https://www.tiktok.com/@selvavivaconstrucciones"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-black/10 hover:bg-black text-gray-900 dark:text-gray-100 hover:text-white dark:hover:text-black dark:hover:bg-white border border-black/10 hover:border-transparent transition-all font-bold text-sm shadow-sm active:scale-95 cursor-pointer"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.525.02c1.31 0 2.57.44 3.59 1.25.12.1.2.24.2.39v3.42c0 .12-.08.23-.2.27a7.22 7.22 0 01-3.66-1c-.08-.05-.18-.02-.22.06l-.01.03v10.59a6.006 6.006 0 01-6.01 6.01 6.006 6.006 0 01-6.01-6.01 6.006 6.006 0 016.01-6.01c.71 0 1.39.12 2.03.35.12.04.2-.04.2-.17V5.51c0-.1-.06-.19-.15-.22A8.995 8.995 0 006.01 5.01a8.996 8.996 0 00-9 9 8.996 8.996 0 009 9 8.996 8.996 0 009-9v-9.35c1.65.65 3.42 1 5.2 1 .15 0 .27-.12.27-.27V1.1c0-.15-.12-.27-.27-.27a11.233 11.233 0 01-5.7-1.54.341.341 0 00-.31-.02.272.272 0 00-.17.25v.02c-.01.16-.01.32-.01.48z" />
            </svg>
            TikTok
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/selva_vivaconstrucciones/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-pink-600/10 hover:bg-pink-600 text-pink-700 dark:text-pink-400 hover:text-white border border-pink-600/10 hover:border-transparent transition-all font-bold text-sm shadow-sm active:scale-95 cursor-pointer"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            Instagram
          </a>

          {/* WhatsApp */}
          <a
            href="https://wa.me/51921976412"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-green-500/10 hover:bg-green-500 text-green-600 dark:text-green-400 hover:text-white border border-green-500/10 hover:border-transparent transition-all font-bold text-sm shadow-sm active:scale-95 cursor-pointer"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 2.766 1.411 4.542 1.412 5.517 0 10.007-4.48 10.01-9.997.002-2.673-1.037-5.187-2.925-7.077C16.335 1.6 13.826.562 11.997.562 6.48.562 1.99 5.042 1.987 10.56c-.001 1.92.51 3.393 1.472 4.921l-.982 3.582 3.672-.962.496.293z" />
            </svg>
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default LandingView;
