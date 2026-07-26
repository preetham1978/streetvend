import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronLeft, ChevronRight, X, Check, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export interface TourStep {
    target: string; // CSS selector e.g. '[data-tour="quick-tools"]'
    title: string;
    description: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface GuidedTourProps {
    isOpen: boolean;
    onClose: () => void;
    steps: TourStep[];
    onComplete?: () => void;
}

export default function GuidedTour({ isOpen, onClose, steps, onComplete }: GuidedTourProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const step = steps[currentStep];

    const updateTargetRect = useCallback(() => {
        if (!isOpen || !step) return;

        const element = document.querySelector(step.target);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Brief delay to allow smooth scroll to settle before computing position
            setTimeout(() => {
                const rect = element.getBoundingClientRect();
                setTargetRect(rect);
            }, 100);
        } else {
            setTargetRect(null);
        }
    }, [isOpen, step]);

    useEffect(() => {
        if (isOpen) {
            updateTargetRect();
            window.addEventListener('resize', updateTargetRect);
            window.addEventListener('scroll', updateTargetRect, true);
        }
        return () => {
            window.removeEventListener('resize', updateTargetRect);
            window.removeEventListener('scroll', updateTargetRect, true);
        };
    }, [isOpen, currentStep, updateTargetRect]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowRight') {
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                handleBack();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentStep, steps.length]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleFinish();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleFinish = () => {
        if (onComplete) onComplete();
        onClose();
        setCurrentStep(0);
    };

    if (!isOpen || !step) return null;

    // Compute tooltip card position relative to target
    let cardStyle: React.CSSProperties = {};
    const padding = 16;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    if (targetRect && !isMobile) {
        const prefPos = step.position || 'bottom';
        if (prefPos === 'bottom') {
            cardStyle = {
                top: Math.min(window.innerHeight - 280, targetRect.bottom + padding),
                left: Math.max(16, Math.min(window.innerWidth - 380, targetRect.left + targetRect.width / 2 - 175)),
            };
        } else if (prefPos === 'top') {
            cardStyle = {
                top: Math.max(16, targetRect.top - 240 - padding),
                left: Math.max(16, Math.min(window.innerWidth - 380, targetRect.left + targetRect.width / 2 - 175)),
            };
        } else if (prefPos === 'left') {
            cardStyle = {
                top: Math.max(16, targetRect.top + targetRect.height / 2 - 120),
                left: Math.max(16, targetRect.left - 370 - padding),
            };
        } else if (prefPos === 'right') {
            cardStyle = {
                top: Math.max(16, targetRect.top + targetRect.height / 2 - 120),
                left: Math.min(window.innerWidth - 380, targetRect.right + padding),
            };
        } else {
            cardStyle = {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            };
        }
    } else {
        // Fallback or Mobile Centered
        cardStyle = {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
        };
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9990] overflow-hidden pointer-events-auto">
                {/* Backdrop / Spotlight Mask */}
                {targetRect ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed pointer-events-none rounded-2xl transition-all duration-300"
                        style={{
                            top: Math.max(0, targetRect.top - 8),
                            left: Math.max(0, targetRect.left - 8),
                            width: targetRect.width + 16,
                            height: targetRect.height + 16,
                            border: '2px solid #f95808',
                            boxShadow: '0 0 0 9999px rgba(10, 10, 12, 0.78), 0 0 30px rgba(249, 88, 8, 0.5)',
                            zIndex: 9991,
                        }}
                    />
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[9991]"
                        onClick={onClose}
                    />
                )}

                {/* Tour Card */}
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    style={cardStyle}
                    className={cn(
                        "fixed z-[9995] w-[calc(100vw-32px)] sm:w-[360px]",
                        "bg-bg-surface border border-brand-500/30 rounded-3xl p-6 shadow-2xl",
                        "backdrop-blur-xl bg-opacity-95"
                    )}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 font-bold text-xs">
                                <Sparkles className="w-4 h-4" />
                            </span>
                            <span className="text-[11px] font-bold text-brand-500 uppercase tracking-widest">
                                Dashboard Guide • {currentStep + 1} of {steps.length}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-base transition-colors"
                            aria-label="Close Tour"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Step Title & Description */}
                    <h3 className="text-lg font-bold text-text-primary mb-2 font-sans tracking-tight">
                        {step.title}
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed mb-6 font-medium">
                        {step.description}
                    </p>

                    {/* Step Progress Dots */}
                    <div className="flex items-center justify-center gap-1.5 mb-6">
                        {steps.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentStep(idx)}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-300",
                                    idx === currentStep
                                        ? "w-6 bg-brand-500"
                                        : "w-1.5 bg-border-subtle hover:bg-text-tertiary"
                                )}
                                aria-label={`Go to step ${idx + 1}`}
                            />
                        ))}
                    </div>

                    {/* Navigation Actions */}
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-subtle">
                        <button
                            onClick={onClose}
                            className="text-xs font-bold text-text-tertiary hover:text-text-secondary uppercase tracking-widest px-2 py-2"
                        >
                            Skip
                        </button>

                        <div className="flex items-center gap-2">
                            {currentStep > 0 && (
                                <button
                                    onClick={handleBack}
                                    className="p-2 rounded-xl bg-bg-base border border-border-subtle text-text-primary hover:bg-bg-surface-inset transition-colors"
                                    aria-label="Previous step"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                className="px-4 py-2.5 rounded-xl primary-button-gradient text-white text-xs font-bold uppercase tracking-widest shadow-lg flex items-center gap-1.5 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                {currentStep === steps.length - 1 ? (
                                    <>
                                        <span>Got It</span>
                                        <Check className="w-3.5 h-3.5" />
                                    </>
                                ) : (
                                    <>
                                        <span>Next</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

export function TourTriggerButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 text-brand-500 text-xs font-bold uppercase tracking-wider transition-all"
            title="Take a quick guided tour of your dashboard"
        >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Take Tour</span>
        </button>
    );
}
