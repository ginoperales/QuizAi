import React from 'react';
import { Question } from '../types';
import { exportToExcel, exportToPdf, decodeHtml } from '../services/fileService';
import { FilledStarIcon, StarIcon, FileTextIcon, TableIcon } from './icons';

interface FavoritesViewProps {
  favorites: Question[];
  toggleFavorite: (question: Question) => void;
  t: (key: any) => string;
}

const FavoritesView: React.FC<FavoritesViewProps> = ({ favorites, toggleFavorite, t }) => {
  if (favorites.length === 0) {
    return (
      <div className="text-center py-16">
        <StarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('noFavorites')}</h3>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('favorites')}</h2>
          <div className="flex space-x-2">
            <button onClick={() => exportToPdf(favorites, t)} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
              <FileTextIcon/>
              <span>{t('exportToPdf')}</span>
            </button>
            <button onClick={() => exportToExcel(favorites, t)} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
              <TableIcon/>
              <span>{t('exportToExcel')}</span>
            </button>
          </div>
      </div>

      <ul className="space-y-4">
        {favorites.map((q, index) => (
          <li key={q.id} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-start">
              <p className="text-lg font-semibold text-gray-800 dark:text-white flex-1 pr-4">
                {index + 1}. {decodeHtml(q.questionText)}
              </p>
              <button onClick={() => toggleFavorite(q)} className="text-yellow-500 hover:text-yellow-400 transition-colors">
                <FilledStarIcon />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {q.options.map((option, i) => (
                <p
                  key={i}
                  className={`text-sm p-2 rounded ${i === q.correctAnswerIndex ? 'text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900 font-medium' : 'text-gray-600 dark:text-gray-300'}`}
                >
                  - {decodeHtml(option)}
                </p>
              ))}
            </div>
            {q.justification && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">{t('justification')}</h4>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{decodeHtml(q.justification)}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FavoritesView;
