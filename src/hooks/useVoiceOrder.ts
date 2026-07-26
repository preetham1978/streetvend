import { useState, useEffect, useCallback, useRef } from 'react';
import { Language } from '../lib/I18nContext';

interface UseVoiceOrderProps {
  language: Language;
  onTranscriptComplete?: (transcript: string) => void;
}

export function useVoiceOrder({ language, onTranscriptComplete }: UseVoiceOrderProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const onTranscriptCompleteRef = useRef(onTranscriptComplete);

  useEffect(() => {
    onTranscriptCompleteRef.current = onTranscriptComplete;
  }, [onTranscriptComplete]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    // Map internal language codes to BCP 47
    const langMap: Record<Language, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      kn: 'kn-IN'
    };
    recognition.lang = langMap[language] || 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setError(null);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);

      if (finalTranscript && onTranscriptCompleteRef.current) {
        onTranscriptCompleteRef.current(finalTranscript);
      }
    };

    recognitionRef.current = recognition;
  }, [language]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start recognition', err);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening
  };
}
