import React from 'react';
import { BookOpenIcon } from './icons';
import { APP_TITLE } from '../constants';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-50 animate-fade-out" style={{ animationDelay: '2s', animationFillMode: 'forwards' }}>
      <style>
        {`
          @keyframes fade-out {
            from { opacity: 1; }
            to { opacity: 0; visibility: hidden; }
          }
          .animate-fade-out {
            animation: fade-out 0.5s ease-in-out;
          }
          @keyframes book-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          .animate-book-pulse {
            animation: book-pulse 2s infinite ease-in-out;
          }
          @keyframes slide-up-fade-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-slide-up-fade-in {
            animation: slide-up-fade-in 1s ease-out forwards;
          }
          @keyframes draw-line {
            from { width: 0; }
            to { width: 100%; }
          }
          .animate-draw-line {
            animation: draw-line 1.2s ease-out forwards;
            animation-delay: 0.5s;
          }
        `}
      </style>
      <div className="relative flex flex-col items-center">
        <div className="animate-book-pulse">
          <BookOpenIcon className="h-24 w-24 text-[rgb(var(--primary-400))]" />
        </div>
        <div className="mt-6 text-center overflow-hidden">
          <h1 className="text-3xl font-bold text-white animate-slide-up-fade-in">{APP_TITLE}</h1>
          <div className="w-0 h-0.5 bg-[rgb(var(--primary-400))] mx-auto mt-2 animate-draw-line"></div>
        </div>
      </div>

      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center justify-center text-center animate-slide-up-fade-in opacity-0" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
        <p className="text-[10px] text-gray-500 tracking-[0.25em] font-semibold uppercase">
          Un producto de
        </p>
        <p className="text-xs text-gray-400 tracking-[0.3em] font-bold mt-1.5 uppercase">
          SV GROUP / SV LAB
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;