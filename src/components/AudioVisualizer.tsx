import { useEffect, useRef } from 'react';

export function AudioVisualizer({ isRecording, color = '#EAB308' }: { isRecording: boolean, color?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        if (isRecording) {
            startVisualization();
        } else {
            stopVisualization();
        }

        return () => {
            stopVisualization();
        }
    }, [isRecording]);

    const startVisualization = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 128;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            draw();
        } catch (err) {
            console.error('Error accessing microphone for visualization', err);
        }
    };

    const stopVisualization = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        analyser.getByteFrequencyData(dataArray);

        // Match device pixel ratio for sharper rendering
        const dpr = window.devicePixelRatio || 1;
        
        // Ensure canvas internal dimensions match display dimensions * dpr
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
        } else if (dpr !== 1) {
            // Reset scale if it was already set but we're re-drawing
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        }

        const width = rect.width;
        const height = rect.height;

        ctx.clearRect(0, 0, width, height);

        const barWidth = (width / bufferLength) * 2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            // scale data to height
            const barHeight = (dataArray[i] / 255) * height;
            
            const y = (height - barHeight) / 2;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + barHeight);
            ctx.lineWidth = Math.max(1, barWidth - 2);
            ctx.lineCap = 'round';
            ctx.strokeStyle = color;
            ctx.stroke();
            
            x += barWidth;
        }

        animationFrameRef.current = requestAnimationFrame(draw);
    };

    return (
        <canvas 
            ref={canvasRef} 
            className="w-full h-20"
        />
    );
}
