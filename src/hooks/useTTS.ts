import { useState, useCallback, useEffect, useRef } from 'react';

// Android 인터페이스 타입 정의
declare global {
  interface Window {
    AndroidAudio?: {
      speakTTS: (text: string) => void;
      stopTTS: () => void;
      isTTSSpeaking: () => boolean;
      getTTSCurrentText: () => string;
      setTTSRate?: (rate: number) => void;
      setTTSPitch?: (pitch: number) => void;
    };
    onAndroidTTSStateChange?: (isSpeaking: boolean, text: string | null) => void;
    onAndroidTTSError?: (message: string) => void;
  }
}

interface UseTTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  voice?: string;
}

interface UseTTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  currentText: string | null;
  availableVoices: SpeechSynthesisVoice[];
}

// Android 환경 감지
const isAndroidApp = (): boolean => {
  return typeof window !== 'undefined' && !!window.AndroidAudio;
};

export const useTTS = (options: UseTTSOptions = {}): UseTTSReturn => {
  const { lang = 'ko-KR', rate = 1, pitch = 1, voice = '' } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isAndroid = useRef(false);

  useEffect(() => {
    // Android 또는 Web Speech API 지원 확인
    isAndroid.current = isAndroidApp();
    setIsSupported(isAndroid.current || 'speechSynthesis' in window);

    // Android TTS 상태 변경 콜백 등록
    if (isAndroid.current) {
      window.onAndroidTTSStateChange = (speaking: boolean, text: string | null) => {
        setIsSpeaking(speaking);
        setCurrentText(text);
      };

      window.onAndroidTTSError = (message: string) => {
        console.error('Android TTS Error:', message);
        setIsSpeaking(false);
        setCurrentText(null);
      };
    } else if ('speechSynthesis' in window) {
      // 음성 목록 로드
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // 한국어 음성 필터링 (또는 모든 음성)
        const koreanVoices = voices.filter(v => v.lang.includes('ko'));
        setAvailableVoices(koreanVoices.length > 0 ? koreanVoices : voices);
      };

      loadVoices();
      // Chrome에서는 비동기로 음성 목록이 로드됨
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      // 클린업
      if (isAndroid.current) {
        window.onAndroidTTSStateChange = undefined;
        window.onAndroidTTSError = undefined;
      } else if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Android TTS 설정 업데이트
  useEffect(() => {
    if (isAndroid.current && window.AndroidAudio) {
      if (window.AndroidAudio.setTTSRate) {
        window.AndroidAudio.setTTSRate(rate);
      }
      if (window.AndroidAudio.setTTSPitch) {
        window.AndroidAudio.setTTSPitch(pitch);
      }
    }
  }, [rate, pitch]);

  const speak = useCallback((text: string) => {
    if (!isSupported) {
      console.warn('TTS is not supported');
      return;
    }

    // Android 환경
    if (isAndroid.current && window.AndroidAudio) {
      // 같은 텍스트를 다시 클릭하면 중지
      if (isSpeaking && currentText === text) {
        window.AndroidAudio.stopTTS();
        return;
      }
      window.AndroidAudio.speakTTS(text);
      return;
    }

    // Web Speech API (브라우저)
    if ('speechSynthesis' in window) {
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

      // 선택된 음성 또는 기본 한국어 음성 찾기
      const voices = window.speechSynthesis.getVoices();
      if (voice) {
        const selectedVoice = voices.find(v => v.name === voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      } else {
        const koreanVoice = voices.find(v => v.lang.includes('ko'));
        if (koreanVoice) {
          utterance.voice = koreanVoice;
        }
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
    }
  }, [isSupported, isSpeaking, currentText, lang, rate, pitch, voice]);

  const stop = useCallback(() => {
    if (isAndroid.current && window.AndroidAudio) {
      window.AndroidAudio.stopTTS();
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCurrentText(null);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    currentText,
    availableVoices,
  };
};
