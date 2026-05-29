import React from 'react';
import Modal from './Modal';
import { ThemeSettings, ThemeColor, AssistantAiModel } from '../types';
import { THEMES } from '../themes';

interface SettingsViewProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ThemeSettings;
  onSettingsChange: (newSettings: ThemeSettings) => void;
  t: (key: any) => string;
}

const SettingsView: React.FC<SettingsViewProps> = ({ isOpen, onClose, settings, onSettingsChange, t }) => {
  const handleColorChange = (color: ThemeColor) => {
    onSettingsChange({ ...settings, color });
  };

  const handleModeChange = (mode: 'light' | 'dark') => {
    onSettingsChange({ ...settings, mode });
  };

  const themeColors = Object.keys(THEMES) as ThemeColor[];
  const assistantModels: Array<{ key: AssistantAiModel; label: string; desc: string }> = [
    { key: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Rapido y equilibrado' },
    { key: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Mas razonamiento' },
    { key: 'deepseek-chat', label: 'DeepSeek Chat', desc: 'Modelo alternativo' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('interfaceSettings')}>
      <div className="py-4 space-y-6">
        {/* Theme Color Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('themeColor')}</label>
          <div className="mt-2 flex items-center space-x-3">
            {themeColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorChange(color)}
                className={`h-8 w-8 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(var(--primary-500),1)] ${
                  settings.color === color ? 'ring-2 ring-offset-1 ring-gray-500 dark:ring-gray-300' : ''
                }`}
                style={{ backgroundColor: `rgb(${THEMES[color][500].join(' ')})` }}
                aria-label={color}
              />
            ))}
          </div>
        </div>
        {/* Appearance (Light/Dark Mode) Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('appearance')}</label>
          <fieldset className="mt-2">
            <legend className="sr-only">{t('appearance')}</legend>
            <div className="grid grid-cols-2 gap-3">
              {(['light', 'dark'] as const).map((mode) => (
                <div key={mode}>
                    <input 
                        type="radio" 
                        name="theme-mode" 
                        id={`theme-mode-${mode}`} 
                        value={mode} 
                        checked={settings.mode === mode} 
                        onChange={() => handleModeChange(mode)} 
                        className="sr-only peer" 
                    />
                    <label 
                        htmlFor={`theme-mode-${mode}`} 
                        className="flex items-center justify-center rounded-md py-2 px-3 text-sm font-medium cursor-pointer border bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 peer-checked:ring-2 peer-checked:ring-[rgba(var(--primary-500),1)] peer-checked:border-transparent"
                    >
                        {t(mode)}
                    </label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Automatic Voice Readout Switch */}
        <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-750">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{t('autoReadAloud')}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Lee las preguntas automáticamente al iniciar</span>
          </div>
          <button
            type="button"
            onClick={() => onSettingsChange({ ...settings, autoReadAloud: !settings.autoReadAloud })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ring-2 ring-offset-2 ring-transparent focus:ring-[rgb(var(--primary-500))] ${
              settings.autoReadAloud ? 'bg-[rgb(var(--primary-600))]' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.autoReadAloud ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Sound Effects Switch */}
        <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-750">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{t('soundEffects')}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Efectos interactivos de aciertos y errores</span>
          </div>
          <button
            type="button"
            onClick={() => onSettingsChange({ ...settings, soundEnabled: settings.soundEnabled === false ? true : false })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ring-2 ring-offset-2 ring-transparent focus:ring-[rgb(var(--primary-500))] ${
              settings.soundEnabled !== false ? 'bg-[rgb(var(--primary-600))]' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.soundEnabled !== false ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Voice Answer Switch */}
        <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-750">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{t('speechInputEnabled')}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('speechInputDesc')}</span>
          </div>
          <button
            type="button"
            onClick={() => onSettingsChange({ ...settings, speechInputEnabled: !settings.speechInputEnabled })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ring-2 ring-offset-2 ring-transparent focus:ring-[rgb(var(--primary-500))] ${
              settings.speechInputEnabled ? 'bg-[rgb(var(--primary-600))]' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.speechInputEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Voice Assistant Hands-Free Switch */}
        <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-750">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{t('voiceAssistantMode')}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('voiceAssistantDesc')}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const newMode = !settings.voiceAssistantMode;
              onSettingsChange({
                ...settings,
                voiceAssistantMode: newMode,
                // Automatically turn on microphone and speaker reads if assistant mode is enabled!
                ...(newMode ? { speechInputEnabled: true, autoReadAloud: true } : {})
              });
            }}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ring-2 ring-offset-2 ring-transparent focus:ring-[rgb(var(--primary-500))] ${
              settings.voiceAssistantMode ? 'bg-[rgb(var(--primary-600))]' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.voiceAssistantMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Hands-free AI Model Selection */}
        <div className="py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-3">
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{t('assistantAiModel')}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('assistantAiModelDesc')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {assistantModels.map(({ key, label, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => onSettingsChange({ ...settings, assistantAiModel: key })}
                className={`relative flex min-h-[86px] flex-col justify-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                  (settings.assistantAiModel || 'gemini-2.5-flash') === key
                    ? 'border-[rgb(var(--primary-500))] bg-[rgba(var(--primary-500),0.08)] shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/30 hover:border-[rgb(var(--primary-400))] hover:bg-[rgba(var(--primary-500),0.04)]'
                }`}
              >
                {(settings.assistantAiModel || 'gemini-2.5-flash') === key && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[rgb(var(--primary-500))]" />
                )}
                <span className={`text-xs font-bold leading-tight pr-4 ${
                  (settings.assistantAiModel || 'gemini-2.5-flash') === key
                    ? 'text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]'
                    : 'text-gray-800 dark:text-gray-200'
                }`}>{label}</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Persona Selection */}
        <div className="py-3 border-t border-b border-gray-200 dark:border-gray-700">
          <div className="mb-3">
            <span className="text-sm font-semibold text-gray-800 dark:text-white">🎤 Voz del Asistente</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Elige la voz que leerá las preguntas y el feedback</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: 'default', label: 'Estándar', icon: '🔊', desc: 'Voz del sistema' },
              { key: 'devyn', label: 'Devyn Donayre', icon: '👨', desc: 'Voz masculina' },
              { key: 'clotilde', label: 'Clotilde Ríos', icon: '👩', desc: 'Voz femenina' },
            ] as const).map(({ key, label, icon, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => onSettingsChange({ ...settings, voicePersona: key })}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all duration-200 text-center ${
                  (settings.voicePersona || 'default') === key
                    ? 'border-[rgb(var(--primary-500))] bg-[rgba(var(--primary-500),0.08)] shadow-md'
                    : 'border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/30 hover:border-[rgb(var(--primary-400))] hover:bg-[rgba(var(--primary-500),0.04)]'
                }`}
              >
                {(settings.voicePersona || 'default') === key && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[rgb(var(--primary-500))]" />
                )}
                <span className="text-2xl">{icon}</span>
                <span className={`text-xs font-bold leading-tight ${
                  (settings.voicePersona || 'default') === key
                    ? 'text-[rgb(var(--primary-600))] dark:text-[rgb(var(--primary-400))]'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>{label}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-[rgb(var(--primary-600))] text-white rounded-md text-sm font-medium hover:bg-[rgb(var(--primary-700))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(var(--primary-500),1)]"
        >
          {t('close')}
        </button>
      </div>
    </Modal>
  );
};

export default SettingsView;
