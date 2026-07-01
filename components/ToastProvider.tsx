'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transform transition-all duration-300 animate-fade-in-up font-sarabun
              ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800' : 
                toast.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800' : 
                'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'}`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />}
            <span>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
