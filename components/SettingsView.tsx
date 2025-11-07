import React from 'react';
import Modal from './Modal';
import { ThemeSettings, ThemeColor } from '../types';
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