import { useState, useEffect, useCallback, useRef } from 'react';
import { Language } from '../lib/I18nContext';

interface UseVoiceOrderProps {
  language: Language;
  onTranscriptComplete?: (transcript: string, base64Audio?: string, mimeType?: string) => void;
}

export function useVoiceOrder({ language, onTranscriptComplete }: UseVoiceOrderProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscriptState] = useState('');
  const transcriptRef = useRef('');
  const [error, setError] = useState<string | null>(null);

  const setTranscript = useCallback((text: string) => {
    setTranscriptState(text);
    transcriptRef.current = text;
  }, []);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const onTranscriptCompleteRef = useRef(onTranscriptComplete);

  useEffect(() => {
    onTranscriptCompleteRef.current = onTranscriptComplete;
  }, [onTranscriptComplete]);

  const getSpeechRecognitionClass = () => {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  };

  const stopListening = useCallback(() => {
    console.log('[Boli Voice Engine] Stopping capture...');
    setIsListening(false);
    setIsProcessing(true);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('[Boli Voice Engine] SpeechRecognition stop warning:', err);
      }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('[Boli Voice Engine] MediaRecorder stop warning:', err);
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    console.log('[Boli Voice Engine] Starting session...');
    setError(null);
    setTranscript('');
    setIsProcessing(false);
    audioChunksRef.current = [];

    const langMap: Record<Language, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      kn: 'kn-IN'
    };
    const bcpLang = langMap[language] || 'en-IN';

    try {
      // 1. Get Stream
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported in this browser/context.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Initialize MediaRecorder (PRIMARY)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      const mimeTypes = isIOS 
        ? ['audio/mp4', 'audio/aac', 'audio/wav']
        : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/wav'];
        
      const selectedMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
      const mimeType = selectedMime || (isIOS ? 'audio/mp4' : 'audio/webm');

      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log(`[Boli Voice Engine] Recording stopped. Blob size: ${audioBlob.size} (${mimeType})`);

        if (audioBlob.size > 0) {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            if (onTranscriptCompleteRef.current) {
              onTranscriptCompleteRef.current(transcriptRef.current, base64Audio, mimeType);
            }
            setIsProcessing(false);
          };
        } else {
          if (onTranscriptCompleteRef.current && transcriptRef.current) {
            onTranscriptCompleteRef.current(transcriptRef.current);
          }
          setIsProcessing(false);
        }
      };

      // Tiny delay for mobile stream stability
      setTimeout(() => {
        if (recorder.state === 'inactive') {
          recorder.start(250);
          setIsListening(true);
        }
      }, 100);

      // 3. Initialize SpeechRecognition (SECONDARY - for real-time visual only)
      const SpeechRecognitionClass = getSpeechRecognitionClass();
      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = bcpLang;

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript.trim());
        };

        recognition.onerror = (event: any) => {
          console.warn('[Boli Voice Engine] SpeechRecognition error (falling back to pure audio):', event.error);
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

    } catch (err: any) {
      console.error('[Boli Voice Engine] Failed to start:', err);
      let userMsg = 'Could not access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        userMsg = 'Microphone permission denied. Please allow access.';
      } else if (!window.isSecureContext) {
        userMsg = 'Microphone requires a secure (HTTPS) connection.';
      }
      setError(userMsg);
      setIsListening(false);
    }
  }, [language, setTranscript]);

  return {
    isListening,
    isProcessing,
    transcript,
    error,
    startListening,
    stopListening
  };
}

