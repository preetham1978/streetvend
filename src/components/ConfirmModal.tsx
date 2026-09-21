import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    error?: string | null;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = true,
    error = null,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const [isConfirming, setIsConfirming] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsConfirming(true);
        try {
            await onConfirm();
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-hidden">
            <div className="bg-bg-surface border border-border-subtle rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative my-0 sm:my-8 mt-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-8">
                <div className="w-12 h-1 bg-border-subtle rounded-full mx-auto mb-6 sm:hidden shrink-0" />

                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${danger ? 'bg-red-500/10 text-red-500' : 'bg-brand-500/10 text-brand-500'}`}>
                    <AlertTriangle className="w-6 h-6" />
                </div>

                <h2 className="font-display font-extrabold text-xl text-text-primary mb-2">
                    {title}
                </h2>
                <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                    {message}
                </p>

                <div className="relative">
                    {error && (
                        <div className="absolute bottom-full left-0 right-0 mb-4 w-full p-3.5 rounded-2xl bg-bg-surface border border-red-500/30 shadow-xl text-red-500 text-xs font-medium flex items-center gap-2.5 text-left animate-fade-in z-10">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onCancel}
                            disabled={isConfirming}
                            className="flex-1 min-h-[48px] py-3 rounded-xl bg-bg-base border border-border-subtle text-text-primary font-bold text-xs uppercase tracking-widest hover:border-brand-500 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isConfirming}
                            className={`flex-1 min-h-[48px] py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer ${
                                danger
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'bg-brand-500 text-white hover:bg-brand-600'
                            }`}
                        >
                            {isConfirming ? 'Please wait…' : confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
