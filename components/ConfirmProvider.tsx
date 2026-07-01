'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
}

type ConfirmContextType = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
    const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void } | null>(null);

    const confirm = useCallback((opts: ConfirmOptions | string) => {
        return new Promise<boolean>((resolve) => {
            if (typeof opts === 'string') {
                setOptions({ message: opts });
            } else {
                setOptions(opts);
            }
            setResolver({ resolve });
            setIsOpen(true);
        });
    }, []);

    const handleConfirm = () => {
        if (resolver) resolver.resolve(true);
        setIsOpen(false);
    };

    const handleCancel = () => {
        if (resolver) resolver.resolve(false);
        setIsOpen(false);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] font-sarabun">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 shadow-xl animate-fade-in-up">
                        <div className="flex items-start gap-4 text-red-600 dark:text-red-400 mb-4">
                            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full shrink-0">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div className="flex-1 pt-1">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {options.title || 'ยืนยันการดำเนินการ'}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm">
                                    {options.message}
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md font-medium transition-colors"
                            >
                                {options.cancelText || 'ยกเลิก'}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 font-medium shadow-sm transition-colors"
                            >
                                {options.confirmText || 'ยืนยันลบ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (context === undefined) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
}
