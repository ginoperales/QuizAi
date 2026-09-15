export const readStoredJson = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;

  try {
    const rawValue = window.localStorage.getItem(key);
    if (rawValue === null) return fallback;
    return JSON.parse(rawValue) as T;
  } catch (error) {
    console.warn(`[QuizAI] Se descartó el valor local inválido "${key}".`, error);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage can be unavailable in privacy modes; the in-memory fallback is enough.
    }
    return fallback;
  }
};

export const writeStoredJson = (key: string, value: unknown): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[QuizAI] No se pudo guardar "${key}" en el almacenamiento local.`, error);
    return false;
  }
};

export const readStoredString = (key: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

export const writeStoredString = (key: string, value: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[QuizAI] No se pudo guardar "${key}" en el almacenamiento local.`, error);
    return false;
  }
};
