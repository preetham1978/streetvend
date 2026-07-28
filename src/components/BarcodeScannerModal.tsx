import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, AlertCircle, RefreshCw, CheckCircle2, ScanLine, Sparkles, Zap, Loader2, Search } from 'lucide-react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const WebcamComponent = Webcam as any;

interface BarcodeScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (barcode: string) => void;
    title?: string;
}

export default function BarcodeScannerModal({
    isOpen,
    onClose,
    onScan,
    title = "AI Vision Scanner"
}: BarcodeScannerModalProps) {
    const webcamRef = useRef<Webcam>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [scannedResult, setScannedResult] = useState<string | null>(null);
    const [autoScan, setAutoScan] = useState(true);

    const handleScan = useCallback(async () => {
        if (!webcamRef.current || isScanning) return;
        
        setIsScanning(true);
        setScanError(null);

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
            setScanError("Could not capture image from camera");
            setIsScanning(false);
            return;
        }

        try {
            // We'll use a generic vision scan that returns text or product ID
            const response = await fetch('/api/vision-scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    image: imageSrc,
                    // In Products.tsx, we might not have the products list passed down, 
                    // so we'll rely on Gemini to just OCR or identify common items
                    products: [] 
                })
            });

            const data = await response.json();

            if (data.error) {
                // If not matched to catalog, just return the detected text or a generic "Not recognized"
                if (!autoScan) setScanError("Visual match failed. Try holding the item closer.");
            } else if (data.productId || data.detectedText) {
                const result = data.productId || data.detectedText || data.name;
                if (result) {
                    setScannedResult(result);
                    // Pause for visual confirmation
                    setTimeout(() => {
                        onScan(result);
                        onClose();
                        setScannedResult(null);
                    }, 800);
                }
            }
        } catch (err) {
            console.error("Scan error:", err);
            if (!autoScan) setScanError("Failed to connect to AI Scanner");
        } finally {
            setIsScanning(false);
        }
    }, [onScan, onClose, autoScan, isScanning]);

    // Auto-scan loop
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isOpen && autoScan && !scannedResult && !isScanning) {
            interval = setInterval(() => {
                handleScan();
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isOpen, autoScan, scannedResult, isScanning, handleScan]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-xl overflow-hidden"
            >
                <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                    className="bg-[#141416] border border-[#28282e] rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col h-[85vh] sm:h-auto"
                >
                    <div className="w-12 h-1 bg-[#28282e] rounded-full mx-auto mt-4 mb-2 sm:hidden shrink-0" />
                    
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2.5 rounded-full text-text-tertiary hover:text-text-primary hover:bg-[#222228] transition-all cursor-pointer z-20"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="p-8 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-500 text-[10px] font-extrabold uppercase tracking-widest border border-brand-500/20 mb-4">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>AI Vision Engine</span>
                        </div>

                        <h2 className="text-xl font-display font-extrabold text-white mb-1 uppercase tracking-tight">{title}</h2>
                        <p className="text-[10px] text-text-tertiary uppercase tracking-widest mb-6">Google Lens style OCR & recognition</p>

                        <div className="relative mx-auto w-full aspect-square rounded-[2rem] overflow-hidden border-4 border-[#28282e] shadow-2xl mb-8">
                            <WebcamComponent
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{
                                    facingMode: "environment"
                                }}
                                className="w-full h-full object-cover"
                            />

                            {/* Lens Overlay */}
                            <div className="absolute inset-0 pointer-events-none z-10">
                                <div className="absolute inset-0 border-[2px] border-white/10 m-12 rounded-3xl"></div>
                                <motion.div 
                                    animate={{ 
                                        scale: [1, 1.1, 1],
                                        opacity: [0.3, 0.6, 0.3]
                                    }}
                                    transition={{ repeat: Infinity, duration: 4 }}
                                    className="absolute inset-0 flex items-center justify-center"
                                >
                                    <div className="w-32 h-32 border-2 border-brand-500 rounded-full shadow-[0_0_30px_rgba(255,107,0,0.4)]"></div>
                                </motion.div>
                                
                                {/* Scanning line */}
                                <motion.div 
                                    animate={{ top: ['20%', '80%', '20%'] }}
                                    transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                                    className="absolute left-12 right-12 h-0.5 bg-brand-500 shadow-[0_0_15px_rgba(255,107,0,0.8)]"
                                />
                            </div>

                            {isScanning && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                                    <p className="text-[10px] font-bold text-brand-500 uppercase tracking-widest animate-pulse">Reading Visuals...</p>
                                </div>
                            )}

                            {scannedResult && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 bg-brand-500/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-8 text-white"
                                >
                                    <CheckCircle2 className="w-16 h-16 mb-4 animate-bounce" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Item Identified</span>
                                    <h3 className="text-xl font-bold text-center leading-tight">{scannedResult}</h3>
                                </motion.div>
                            )}
                        </div>

                        <div className="space-y-4">
                            {scanError ? (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 text-left">
                                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                                    <p className="text-xs text-red-400 font-medium leading-relaxed">{scanError}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setAutoScan(!autoScan)}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-[10px] font-bold uppercase tracking-widest",
                                                autoScan ? "bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/30" : "bg-transparent border-[#28282e] text-text-tertiary"
                                            )}
                                        >
                                            <Zap className="w-3.5 h-3.5" />
                                            {autoScan ? "Auto-Detect On" : "Manual Mode"}
                                        </button>
                                        <button 
                                            onClick={() => handleScan()}
                                            disabled={isScanning}
                                            className="flex items-center gap-2 px-6 py-3 rounded-full primary-button-gradient text-white text-[10px] font-bold uppercase tracking-widest shadow-xl disabled:opacity-50"
                                        >
                                            <Camera className="w-4 h-4" />
                                            Capture
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-text-tertiary uppercase tracking-widest opacity-60">
                                        {autoScan ? "Scanning every 3 seconds..." : "Tap capture to identify item"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-8 pt-0">
                        <button
                            onClick={onClose}
                            className="w-full py-4 rounded-2xl bg-[#1c1c21] text-text-secondary font-bold text-xs uppercase tracking-widest hover:text-white transition-all border border-[#28282e]"
                        >
                            Cancel
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
