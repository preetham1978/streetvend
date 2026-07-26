import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, Sparkles, Share, PlusSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Check if already running as standalone PWA
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                             (window.navigator as any).standalone === true ||
                             document.referrer.includes('android-app://');
    
    setIsStandalone(isStandaloneMode);

    // Check iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Check if user previously dismissed prompt
    const dismissed = localStorage.getItem('streetvend_pwa_dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setDeferredPrompt(null);
      setIsStandalone(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstalledSuccess(true);
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosInstructions(true);
    } else {
      // Fallback hint for standard browser
      alert("To install Streetvend:\n1. Open your browser menu (⋮ or Share icon)\n2. Tap 'Add to Home screen' or 'Install App'");
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('streetvend_pwa_dismissed', 'true');
  };

  if (isStandalone) return null;

  return (
    <>
      <AnimatePresence>
        {!isDismissed && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[99990] bg-bg-surface border-2 border-brand-500/40 rounded-3xl p-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-amber-500 p-0.5 shadow-lg shadow-brand-500/20 shrink-0">
                  <img src="/icon-192.png" alt="Streetvend Icon" className="w-full h-full object-cover rounded-[14px]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-text-primary">Install Streetvend App</h4>
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20">
                      PWA
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 leading-snug">
                    Full-screen app experience, instant launch, and offline billing support!
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-text-tertiary hover:text-text-primary p-1 rounded-full hover:bg-white/10 transition-all shrink-0"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3.5 pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Fast & Offline Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-xs font-semibold text-text-tertiary hover:text-text-primary transition-colors"
                >
                  Not now
                </button>
                <button
                  onClick={handleInstallClick}
                  className="px-4 py-1.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install Now</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Safari Instructions Modal */}
      <AnimatePresence>
        {showIosInstructions && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-surface border border-border-subtle rounded-3xl p-6 max-w-sm w-full shadow-2xl relative"
            >
              <button
                onClick={() => setShowIosInstructions(false)}
                className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary p-1 rounded-full hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center border border-brand-500/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-text-primary">Install on iPhone / iPad</h3>
                  <p className="text-xs text-text-secondary">Follow these 2 quick steps in Safari:</p>
                </div>
              </div>

              <div className="space-y-3 my-4 text-xs font-medium text-text-secondary">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-bg-base border border-border-subtle">
                  <div className="w-7 h-7 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 font-bold">1</div>
                  <div className="flex-1">
                    Tap the <span className="font-bold text-text-primary inline-flex items-center gap-1"><Share className="w-3.5 h-3.5 text-brand-500 inline" /> Share button</span> at the bottom of Safari.
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-2xl bg-bg-base border border-border-subtle">
                  <div className="w-7 h-7 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 font-bold">2</div>
                  <div className="flex-1">
                    Scroll down and tap <span className="font-bold text-text-primary inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 text-brand-500 inline" /> Add to Home Screen</span>.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIosInstructions(false)}
                className="w-full py-2.5 rounded-full bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all mt-2"
              >
                Got it!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Installed Toast Notification */}
      <AnimatePresence>
        {installedSuccess && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[99999] bg-emerald-500 text-white px-5 py-2.5 rounded-full shadow-2xl font-bold text-xs flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Streetvend App installed successfully to Home Screen!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
