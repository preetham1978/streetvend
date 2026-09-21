import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Flashlight, AlertTriangle, CheckCircle2, Lock, Sparkles, RefreshCw, Barcode, Search, Keyboard } from 'lucide-react';
import { PlanTier, isTierAtLeast } from '../config/pricing';
import { Product } from '../lib/database.types';
import { cn } from '../lib/utils';

interface BarcodeScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (barcode: string, prefill?: { name?: string; price?: number; category?: string; unit?: string; stock?: number; isExisting?: boolean }) => void;
    existingProducts: Product[];
    currentPlan: PlanTier;
    onUpgradeClick: () => void;
}

export default function BarcodeScannerModal({
    isOpen,
    onClose,
    onScanSuccess,
    existingProducts,
    currentPlan,
    onUpgradeClick
}: BarcodeScannerModalProps) {
    const isPlanUnlocked = isTierAtLeast(currentPlan, 'professional');

    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [hasTorch, setHasTorch] = useState(false);
    const [retryTimeoutWarning, setRetryTimeoutWarning] = useState(false);
    
    // Manual entry state
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualInput, setManualInput] = useState('');
    const [manualInputError, setManualInputError] = useState<string | null>(null);

    // Result review state
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [isMatchSearching, setIsMatchSearching] = useState(false);
    const [prefilledDetails, setPrefilledDetails] = useState<{
        name?: string;
        price?: number;
        category?: string;
        unit?: string;
        stock?: number;
        isExisting?: boolean;
    } | null>(null);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Helper to forcibly stop all camera MediaStreamTracks
    const stopAllCameraTracks = () => {
        try {
            const videoElements = document.querySelectorAll('video');
            videoElements.forEach((videoEl) => {
                if (videoEl.srcObject) {
                    const stream = videoEl.srcObject as MediaStream;
                    if (stream && stream.getTracks) {
                        stream.getTracks().forEach((track) => {
                            try {
                                track.stop();
                            } catch (e) {
                                console.warn("Track stop error:", e);
                            }
                        });
                    }
                    videoEl.srcObject = null;
                }
            });
        } catch (err) {
            console.warn("Error stopping camera tracks:", err);
        }
    };

    const stopScanner = async () => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }

        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (err) {
                console.warn("Scanner stop error:", err);
            } finally {
                scannerRef.current = null;
            }
        }
        stopAllCameraTracks();
        setIsScanning(false);
        setIsTorchOn(false);
    };

    useEffect(() => {
        if (!isOpen) {
            stopScanner();
            setCameraError(null);
            setScannedCode(null);
            setPrefilledDetails(null);
            setIsManualMode(false);
            setManualInput('');
            setManualInputError(null);
            setRetryTimeoutWarning(false);
            return;
        }

        if (isPlanUnlocked && isOpen && !isManualMode) {
            startScanner();
        }

        return () => {
            stopScanner();
        };
    }, [isOpen, isPlanUnlocked]);

    const startScanner = async () => {
        setIsManualMode(false);
        setCameraError(null);
        setScannedCode(null);
        setPrefilledDetails(null);
        setRetryTimeoutWarning(false);

        // Wait for DOM element
        await new Promise(r => setTimeout(r, 150));

        const element = document.getElementById('barcode-reader-viewport');
        if (!element) return;

        try {
            if (scannerRef.current) {
                await stopScanner();
            }

            const html5Qrcode = new Html5Qrcode('barcode-reader-viewport');
            scannerRef.current = html5Qrcode;

            const formatsToSupport = [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_39
            ];

            const qrConfig = {
                fps: 15,
                qrbox: { width: 280, height: 160 },
                aspectRatio: 1.33,
                formatsToSupport,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                }
            };

            // Set retry warning after 5 seconds of scanning without decode
            retryTimerRef.current = setTimeout(() => {
                setRetryTimeoutWarning(true);
            }, 5000);

            setIsScanning(true);

            await html5Qrcode.start(
                { facingMode: 'environment' },
                qrConfig,
                onBarcodeDecoded,
                () => {
                    // Ignore frame decode errors
                }
            );

            // Check if torch track is available
            checkTorchCapability();
        } catch (err: any) {
            console.error('Camera initialization failed:', err);
            setIsScanning(false);
            stopAllCameraTracks();
            if (err?.name === 'NotAllowedError' || err?.toString()?.includes('Permission') || err?.toString()?.includes('denied')) {
                setCameraError('Camera access denied. Please grant camera permissions in your browser settings to scan barcodes, or enter code manually.');
            } else if (err?.name === 'NotFoundError' || err?.toString()?.includes('DevicesNotFoundError')) {
                setCameraError('No camera found on this device. Please enter the barcode manually.');
            } else {
                setCameraError('Could not start camera scanner. Please check permissions or enter details manually.');
            }
        }
    };

    const handleSwitchToManual = async () => {
        await stopScanner();
        setIsManualMode(true);
        setCameraError(null);
        setManualInputError(null);
    };

    const handleSwitchToCamera = async () => {
        setIsManualMode(false);
        setManualInput('');
        setManualInputError(null);
        await startScanner();
    };

    const checkTorchCapability = () => {
        try {
            const videoEl = document.querySelector('#barcode-reader-viewport video') as HTMLVideoElement;
            if (videoEl && videoEl.srcObject) {
                const stream = videoEl.srcObject as MediaStream;
                const track = stream.getVideoTracks()[0];
                if (track) {
                    const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
                    if (capabilities && capabilities.torch) {
                        setHasTorch(true);
                    }
                }
            }
        } catch (e) {
            console.warn("Torch check error:", e);
        }
    };

    const toggleTorch = async () => {
        try {
            const videoEl = document.querySelector('#barcode-reader-viewport video') as HTMLVideoElement;
            if (videoEl && videoEl.srcObject) {
                const stream = videoEl.srcObject as MediaStream;
                const track = stream.getVideoTracks()[0];
                if (track) {
                    const nextState = !isTorchOn;
                    await track.applyConstraints({
                        advanced: [{ torch: nextState } as any]
                    });
                    setIsTorchOn(nextState);
                }
            }
        } catch (err) {
            console.warn("Failed to toggle torch:", err);
        }
    };

    const onBarcodeDecoded = async (decodedText: string) => {
        if (!decodedText) return;

        // Stop scanning immediately on successful decode
        await stopScanner();

        setScannedCode(decodedText);
        setIsMatchSearching(true);

        // 1. Check vendor's local catalog for existing match (re-stock case)
        const matchInCatalog = existingProducts.find(
            p => p.barcode && p.barcode.trim().toLowerCase() === decodedText.trim().toLowerCase()
        );

        if (matchInCatalog) {
            setPrefilledDetails({
                name: matchInCatalog.name,
                price: matchInCatalog.price,
                category: matchInCatalog.category,
                unit: matchInCatalog.unit,
                stock: matchInCatalog.stock,
                isExisting: true
            });
            setIsMatchSearching(false);
            return;
        }

        // 2. Try public Open Food Facts lookup API with a short timeout
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(decodedText)}.json`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (data?.status === 1 && data?.product?.product_name) {
                    const catTag = data.product.categories_tags?.[0]
                        ? data.product.categories_tags[0].replace(/^en:/, '').replace(/-/g, ' ')
                        : 'Groceries';
                    
                    // Capitalize first letter of category
                    const formattedCat = catTag.charAt(0).toUpperCase() + catTag.slice(1);

                    setPrefilledDetails({
                        name: data.product.product_name,
                        category: formattedCat,
                        isExisting: false
                    });
                    setIsMatchSearching(false);
                    return;
                }
            }
        } catch (e) {
            console.warn("Public barcode lookup skipped or timed out:", e);
        }

        // No automated match found - vendor will enter details
        setPrefilledDetails({
            isExisting: false
        });
        setIsMatchSearching(false);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = manualInput.trim();
        if (!trimmed) {
            setManualInputError('Please enter a valid barcode digit string');
            return;
        }
        setManualInputError(null);
        onBarcodeDecoded(trimmed);
    };

    const handleConfirmPrefill = () => {
        if (!scannedCode) return;
        stopAllCameraTracks();
        onScanSuccess(scannedCode, prefilledDetails || undefined);
        onClose();
    };

    const handleCloseModal = async () => {
        await stopScanner();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-bg-surface border border-border-subtle rounded-t-[2rem] sm:rounded-[2.5rem] w-full sm:max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh] sm:max-h-[90vh] my-0 sm:my-auto">
                
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-border-subtle flex items-center justify-between bg-bg-surface-inset shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 shrink-0">
                            <Barcode className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-display font-bold text-base sm:text-lg text-text-primary truncate">Barcode Scanner</h3>
                            <p className="text-xs text-text-tertiary">EAN-13 · UPC-A · Code-128</p>
                        </div>
                    </div>
                    <button
                        onClick={handleCloseModal}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-bg-base text-text-tertiary hover:text-text-primary transition-all cursor-pointer shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center min-h-[300px]">
                    
                    {/* Locked State for Free/Starter plans */}
                    {!isPlanUnlocked && (
                        <div className="text-center py-6 space-y-5 max-w-sm mx-auto">
                            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto shadow-xl">
                                <Lock className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 font-bold text-[10px] uppercase tracking-widest border border-amber-500/20">
                                    <Sparkles className="w-3 h-3" /> Professional Feature
                                </span>
                                <h4 className="font-display font-bold text-xl text-text-primary">
                                    Unlock High-Speed Barcode Scanning
                                </h4>
                                <p className="text-xs text-text-secondary leading-relaxed">
                                    Scan product barcodes directly with your camera to instant fill inventory item details, stock counts, and prices.
                                </p>
                            </div>
                            <div className="pt-2">
                                <button
                                    onClick={() => {
                                        handleCloseModal();
                                        onUpgradeClick();
                                    }}
                                    className="w-full min-h-[48px] py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    Upgrade to Professional (₹299/mo)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Unlocked Plan - Scanner View */}
                    {isPlanUnlocked && (
                        <div className="w-full flex flex-col items-center">
                            
                            {/* Scanned Code Preview & Pre-fill confirmation (Never auto-saves) */}
                            {scannedCode ? (
                                <div className="w-full space-y-5 animate-in fade-in zoom-in-95">
                                    <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
                                                Barcode Decoded Successfully
                                            </span>
                                            <h4 className="font-mono font-bold text-2xl text-text-primary tracking-wider mt-1">
                                                {scannedCode}
                                            </h4>
                                        </div>
                                    </div>

                                    {/* Catalog Match Info */}
                                    <div className="p-5 rounded-2xl bg-bg-surface-inset border border-border-subtle space-y-3 text-left">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Product Info Detected</span>
                                            {isMatchSearching ? (
                                                <span className="text-xs text-brand-500 flex items-center gap-1.5 font-medium">
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Looking up product...
                                                </span>
                                            ) : prefilledDetails?.isExisting ? (
                                                <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold text-[10px] uppercase">
                                                    Existing Inventory Item
                                                </span>
                                            ) : prefilledDetails?.name ? (
                                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-[10px] uppercase">
                                                    Public Catalog Match
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full bg-bg-base text-text-tertiary font-bold text-[10px] uppercase border border-border-subtle">
                                                    New Barcode
                                                </span>
                                            )}
                                        </div>

                                        {prefilledDetails?.name ? (
                                            <div className="space-y-1">
                                                <div className="font-bold text-base text-text-primary">{prefilledDetails.name}</div>
                                                <div className="text-xs text-text-secondary flex gap-3">
                                                    {prefilledDetails.category && <span>Category: <strong>{prefilledDetails.category}</strong></span>}
                                                    {prefilledDetails.price !== undefined && <span>Price: <strong>₹{prefilledDetails.price}</strong></span>}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-text-secondary">
                                                No catalog match found for barcode <code className="font-mono bg-bg-base px-1.5 py-0.5 rounded text-text-primary">{scannedCode}</code>. We'll populate the barcode field on the product form for you to fill in the rest.
                                            </p>
                                        )}
                                    </div>

                                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-xs text-center font-medium">
                                        ⚠️ Note: Product will <strong>not</strong> be saved automatically. Review details on the form before saving.
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                        <button
                                            onClick={() => {
                                                setScannedCode(null);
                                                setPrefilledDetails(null);
                                                if (isManualMode) {
                                                    // stay in manual mode
                                                } else {
                                                    startScanner();
                                                }
                                            }}
                                            className="flex-1 min-h-[48px] py-3.5 rounded-2xl bg-bg-surface-inset border border-border-subtle text-text-primary font-bold text-xs uppercase tracking-widest hover:bg-bg-base transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <RefreshCw className="w-4 h-4" /> Rescan / Re-enter
                                        </button>
                                        <button
                                            onClick={handleConfirmPrefill}
                                            className="flex-1 sm:flex-2 min-h-[48px] py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            Review & Pre-fill Form →
                                        </button>
                                    </div>
                                </div>
                            ) : isManualMode ? (
                                /* Manual Barcode Entry Mode */
                                <div className="w-full space-y-5 animate-in fade-in zoom-in-95">
                                    <div className="text-center space-y-2">
                                        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 mx-auto">
                                            <Keyboard className="w-7 h-7" />
                                        </div>
                                        <h4 className="font-bold text-lg text-text-primary">Enter Barcode Manually</h4>
                                        <p className="text-xs text-text-secondary leading-relaxed max-w-sm mx-auto">
                                            Type the digits printed below the barcode image (e.g. EAN-13, UPC-A, or SKU code).
                                        </p>
                                    </div>

                                    <form onSubmit={handleManualSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">
                                                Barcode Number / Code
                                            </label>
                                            <div className="relative">
                                                <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoFocus
                                                    placeholder="e.g. 8901234567890"
                                                    value={manualInput}
                                                    onChange={(e) => {
                                                        setManualInput(e.target.value);
                                                        setManualInputError(null);
                                                    }}
                                                    className="w-full pl-12 pr-4 py-3.5 min-h-[48px] rounded-2xl bg-bg-surface-inset border border-border-subtle text-text-primary font-mono text-base font-bold focus:outline-none focus:border-brand-500 transition-all"
                                                />
                                            </div>
                                            {manualInputError && (
                                                <p className="text-xs text-red-500 mt-1 font-medium">{manualInputError}</p>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full min-h-[48px] py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <Search className="w-4 h-4" /> Lookup & Review Product
                                        </button>
                                    </form>

                                    <div className="pt-2 text-center">
                                        <button
                                            type="button"
                                            onClick={handleSwitchToCamera}
                                            className="inline-flex items-center gap-2 text-xs font-bold text-brand-500 hover:underline cursor-pointer py-2"
                                        >
                                            <Camera className="w-4 h-4" /> Switch to Camera Scanner
                                        </button>
                                    </div>
                                </div>
                            ) : cameraError ? (
                                /* Camera Error State */
                                <div className="text-center py-6 space-y-4 max-w-sm mx-auto">
                                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto">
                                        <AlertTriangle className="w-7 h-7" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-base text-text-primary">Camera Access Issue</h4>
                                        <p className="text-xs text-text-secondary leading-relaxed">{cameraError}</p>
                                    </div>
                                    <div className="pt-2 flex flex-col gap-2">
                                        <button
                                            onClick={startScanner}
                                            className="w-full min-h-[48px] py-3 rounded-xl bg-bg-surface-inset border border-border-subtle hover:bg-bg-base text-text-primary font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
                                        >
                                            Try Camera Again
                                        </button>
                                        <button
                                            onClick={handleSwitchToManual}
                                            className="w-full min-h-[48px] py-3 rounded-xl bg-brand-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            <Keyboard className="w-4 h-4" /> Enter Barcode Manually
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Active Camera Viewfinder */
                                <div className="w-full flex flex-col items-center">
                                    <div className="relative w-full aspect-4/3 max-w-full sm:max-w-sm bg-black rounded-3xl overflow-hidden border-2 border-border-subtle shadow-inner flex items-center justify-center">
                                        
                                        {/* HTML5 QR Code / Barcode Viewport */}
                                        <div id="barcode-reader-viewport" className="w-full h-full object-cover"></div>

                                        {/* Viewfinder Guide Overlay */}
                                        <div className="absolute inset-0 pointer-events-none border-2 border-brand-500/40 rounded-3xl flex items-center justify-center">
                                            <div className="w-10/12 max-w-[260px] h-32 sm:h-36 border-2 border-brand-500 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                                                {/* Corner Accents */}
                                                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-brand-500 rounded-tl"></div>
                                                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-brand-500 rounded-tr"></div>
                                                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-brand-500 rounded-bl"></div>
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-brand-500 rounded-br"></div>
                                                
                                                {/* Animated Laser Scanning Line */}
                                                <div className="w-full h-0.5 bg-brand-500 shadow-[0_0_8px_#10b981] absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
                                            </div>
                                        </div>

                                        {/* Torch Toggle Button */}
                                        {hasTorch && (
                                            <button
                                                type="button"
                                                onClick={toggleTorch}
                                                className={cn(
                                                    "absolute top-4 right-4 z-20 p-3 rounded-2xl border transition-all cursor-pointer shadow-lg min-h-[44px] min-w-[44px] flex items-center justify-center",
                                                    isTorchOn 
                                                        ? "bg-amber-500 border-amber-400 text-white shadow-amber-500/30" 
                                                        : "bg-black/60 border-white/20 text-white hover:bg-black/80"
                                                )}
                                                title="Toggle Flashlight"
                                            >
                                                <Flashlight className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Status & Retry Warning */}
                                    <div className="mt-4 text-center space-y-2 w-full">
                                        <p className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center justify-center gap-2">
                                            <Camera className="w-4 h-4 text-brand-500 animate-pulse" />
                                            Align Barcode inside viewfinder
                                        </p>

                                        {retryTimeoutWarning && (
                                            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium space-y-1 animate-in fade-in">
                                                <div>⚠️ Couldn't read barcode?</div>
                                                <div className="text-[11px] text-text-tertiary">
                                                    Try repositioning closer, ensuring adequate lighting, or enter code manually below.
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={handleSwitchToManual}
                                            className="pt-2 text-xs text-text-tertiary hover:text-text-primary underline cursor-pointer inline-flex items-center gap-1.5 py-1 min-h-[44px]"
                                        >
                                            <Keyboard className="w-3.5 h-3.5" /> Switch to Manual Entry
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

