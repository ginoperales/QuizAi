import { Language, ThemeSettings } from '../types';

type VoicePersona = NonNullable<ThemeSettings['voicePersona']>;

const getVoices = async (): Promise<SpeechSynthesisVoice[]> => {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  if (voices.length > 0) return voices;

  return new Promise(resolve => {
    const timer = window.setTimeout(() => {
      synth.onvoiceschanged = null;
      resolve(synth.getVoices());
    }, 500);

    synth.onvoiceschanged = () => {
      window.clearTimeout(timer);
      synth.onvoiceschanged = null;
      resolve(synth.getVoices());
    };
  });
};

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

export const speakWithVoicePersona = async (
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

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = await getVoices();
  applyPersona(utterance, voices, language, persona);

  utterance.onend = () => callbacks.onEnd?.();
  utterance.onerror = event => callbacks.onError?.(event);
  callbacks.onStart?.();
  window.speechSynthesis.speak(utterance);
};
