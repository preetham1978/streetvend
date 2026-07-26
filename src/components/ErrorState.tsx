import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
}

export default function ErrorState({ 
    message = "Failed to connect to the cloud database. Please check your internet connection.", 
    onRetry 
}: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-bg-surface rounded-3xl border border-border-subtle shadow-sm">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6 border border-red-500/20">
                <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-display font-black text-text-primary mb-2">Connection Error</h3>
            <p className="text-text-secondary text-sm max-w-xs mb-8 leading-relaxed font-medium">
                {message}
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand-500/20"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry Connection
                </button>
            )}
        </div>
    );
}
