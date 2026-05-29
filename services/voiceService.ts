import { Language, ThemeSettings } from '../types';

type VoicePersona = NonNullable<ThemeSettings['voicePersona']>;

// Global cache for voices to allow completely synchronous calls (fixing iOS/Tablet user activation bugs)
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  }
}

const chooseVoice = (
  voices: SpeechSynthesisVoice[],
  language: Language,
  persona: VoicePersona
): SpeechSynthesisVoice | undefined => {
  const langPrefix = language === 'en' ? 'en' : 'es';
  const langVoices = voices.filter(voice => voice.lang.toLowerCase().startsWith(langPrefix));
  const candidates = langVoices.length > 0 ? langVoices : voices;

  if (persona === 'devyn') {
    return candidates.find(voice => /male|hombre|masculin|david|jorge|pablo|miguel|carlos|diego|raul|google espa/i.test(voice.name))
      || candidates.find(voice => !/female|mujer|femenin|zira|helena|paulina|sabina|carmen|monica|lucia|maria/i.test(voice.name))
      || candidates[1]
      || candidates[0];
  }

  if (persona === 'clotilde') {
    return candidates.find(voice => /female|mujer|femenin|zira|helena|paulina|sabina|carmen|monica|lucia|maria|elsa/i.test(voice.name))
      || candidates[0];
  }

  return candidates[0];
};

const applyPersona = (
  utterance: SpeechSynthesisUtterance,
  voices: SpeechSynthesisVoice[],
  language: Language,
  persona: VoicePersona
) => {
  utterance.lang = language === 'en' ? 'en-US' : 'es-ES';

  if (persona === 'devyn') {
    utterance.pitch = 0.72;
    utterance.rate = 0.92;
  } else if (persona === 'clotilde') {
    utterance.pitch = 1.22;
    utterance.rate = 1.03;
  } else {
    utterance.pitch = 1;
    utterance.rate = 1;
  }

  const chosen = persona === 'default'
    ? voices.find(voice => voice.lang.toLowerCase().startsWith(language === 'en' ? 'en' : 'es'))
    : chooseVoice(voices, language, persona);

  if (chosen) {
    utterance.voice = chosen;
    utterance.lang = chosen.lang;
  }
};

/**
 * Plays text using SpeechSynthesis.
 * Note: Made completely synchronous to preserve user-interaction state on iPad, Safari, and other tablets.
 */
export const speakWithVoicePersona = (
  text: string,
  language: Language,
  persona: VoicePersona = 'default',
  callbacks: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (event: SpeechSynthesisErrorEvent) => void;
  } = {}
) => {
  if (!('speechSynthesis' in window)) {
    callbacks.onEnd?.();
    return;
  }

  try {
    // Reset queue
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Retrieve voices synchronously from cache or system
    const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    applyPersona(utterance, voices, language, persona);

    utterance.onstart = () => callbacks.onStart?.();
    utterance.onend = () => callbacks.onEnd?.();
    utterance.onerror = event => {
      console.warn("SpeechSynthesis error details:", event);
      callbacks.onError?.(event);
    };

    // Bug fix for mobile/tablet engines getting stuck in paused state
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("Critical voice playback failed:", err);
    callbacks.onEnd?.();
  }
};
