import { useState, useCallback, useEffect, useRef } from 'react';

interface UseTTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

interface UseTTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  currentText: string | null;
}

export const useTTS = (options: UseTTSOptions = {}): UseTTSReturn => {
  const { lang = 'ko-KR', rate = 1, pitch = 1 } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  const speak = useCallback((text: string) => {
    if (!isSupported) {
      console.warn('TTS is not supported in this browser');
      return;
    }

    // 같은 텍스트를 다시 클릭하면 중지
    if (isSpeaking && currentText === text) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentText(null);
      return;
    }

    // 기존 음성 중지
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;

    // 한국어 음성 찾기
    const voices = window.speechSynthesis.getVoices();
    const koreanVoice = voices.find(voice => voice.lang.includes('ko'));
    if (koreanVoice) {
      utterance.voice = koreanVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentText(text);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentText(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentText(null);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, isSpeaking, currentText, lang, rate, pitch]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentText(null);
    }
  }, [isSupported]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    currentText,
  };
};
