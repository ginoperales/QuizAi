import React, { useState } from 'react';
import { registerUser, loginUser } from '../services/firebaseService';
import { FirebaseUser } from '../types';

interface AuthViewProps {
  onAuthSuccess: (userProfile: FirebaseUser) => void;
  onGoBack?: () => void;
  t: (key: any) => string;
}

const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, onGoBack, t }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alias, setAlias] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const userProfile = await loginUser(email, password);
        onAuthSuccess(userProfile);
      } else {
        if (!alias.trim()) {
          throw new Error("El alias es requerido para registrarse.");
        }
        const userProfile = await registerUser(email, password, alias);
        onAuthSuccess(userProfile);
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = err.message || "Ocurrió un error inesperado.";
      
      // Translate common Firebase Auth errors
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMsg = "Correo o contraseña incorrectos.";
      } else if (err.code === 'auth/email-already-in-use') {
        errorMsg = "El correo electrónico ya está registrado.";
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = "El formato de correo no es válido.";
      } else if (err.code === 'auth/weak-password') {
        errorMsg = "La contraseña debe tener al menos 6 caracteres.";
      }
      
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8">
      {/* Premium Glassmorphism Card */}
      <div className="backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 shadow-2xl rounded-3xl p-8 transition-all duration-300">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-400))] dark:from-[rgb(var(--primary-400))] dark:to-[rgb(var(--primary-200))]">
            {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {isLogin ? "Accede a tu cuenta para compartir y jugar cuestionarios" : "Regístrate para guardar tu progreso y participar en retos"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-300 text-sm flex items-center gap-2">
            <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Alias (Público)
              </label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                required={!isLogin}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--primary-500))] focus:border-transparent transition-all outline-none"
                placeholder="Ej. QuizMaster99"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--primary-500))] focus:border-transparent transition-all outline-none"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--primary-500))] focus:border-transparent transition-all outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl text-white font-bold bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-500))] hover:from-[rgb(var(--primary-700))] hover:to-[rgb(var(--primary-600))] shadow-lg shadow-[rgba(var(--primary-500),0.3)] disabled:opacity-50 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : isLogin ? (
              "Ingresar"
            ) : (
              "Registrarse"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-sm font-semibold text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))] hover:underline"
          >
            {isLogin ? "¿No tienes una cuenta? Regístrate aquí" : "¿Ya tienes una cuenta? Inicia sesión aquí"}
          </button>
        </div>

        {onGoBack && (
          <div className="mt-4 text-center">
            <button
              onClick={onGoBack}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              ← Volver
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthView;
