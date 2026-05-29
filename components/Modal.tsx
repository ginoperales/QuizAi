import React, { FC, ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity flex items-center justify-center z-50 p-3 sm:p-0"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="relative bg-white dark:bg-gray-800 rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full mx-0 sm:mx-4 max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary-500))] dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
          aria-label="Cerrar"
        >
          <span className="text-2xl leading-none" aria-hidden="true">&times;</span>
        </button>
        <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white pr-10" id="modal-title">
                {title}
              </h3>
              <div className="mt-2">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
