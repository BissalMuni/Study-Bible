import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Volume2, Play } from 'lucide-react';
import { useGlobalState } from '../../contexts/GlobalStateContext';
import { useTTS } from '../../hooks/useTTS';

interface TTSSettingsProps {
  compact?: boolean; // 컴팩트 모드 (아이콘만 표시)
}

export const TTSSettings: React.FC<TTSSettingsProps> = ({ compact = true }) => {
  const { state, updateState } = useGlobalState();
  const [isOpen, setIsOpen] = useState(false);
  const { speak, stop, isSpeaking, availableVoices } = useTTS({
    rate: state.ttsRate,
    pitch: state.ttsPitch,
    voice: state.ttsVoice,
  });

  // 테스트 문장
  const testText = '태초에 하나님이 천지를 창조하시니라';

  const handleTestPlay = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(testText);
    }
  };

  const handleRateChange = (value: number) => {
    updateState('ttsRate', value);
  };

  const handlePitchChange = (value: number) => {
    updateState('ttsPitch', value);
  };

  const handleVoiceChange = (voiceName: string) => {
    updateState('ttsVoice', voiceName);
  };

  // 설정창 닫힐 때 TTS 중지
  useEffect(() => {
    if (!isOpen && isSpeaking) {
      stop();
    }
  }, [isOpen, isSpeaking, stop]);

  return (
    <>
      {/* 설정 버튼 */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
        title="TTS 설정"
      >
        <Settings size={18} />
      </motion.button>

      {/* 설정 모달 - Portal로 body에 직접 렌더링 */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center px-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
              >
              {/* 헤더 */}
              <div className="bg-blue-500 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 size={20} />
                  <h2 className="text-lg font-bold">음성 설정</h2>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full hover:bg-blue-400"
                >
                  <X size={20} />
                </motion.button>
              </div>

              {/* 내용 */}
              <div className="p-4 space-y-6">
                {/* 읽기 속도 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    읽기 속도: {state.ttsRate.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={state.ttsRate}
                    onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>느리게</span>
                    <span>보통</span>
                    <span>빠르게</span>
                  </div>
                </div>

                {/* 음높이 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    음높이: {state.ttsPitch.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={state.ttsPitch}
                    onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>낮음</span>
                    <span>보통</span>
                    <span>높음</span>
                  </div>
                </div>

                {/* 음성 선택 (웹 브라우저 전용) */}
                {availableVoices.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      음성 선택
                    </label>
                    <select
                      value={state.ttsVoice}
                      onChange={(e) => handleVoiceChange(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    >
                      <option value="">기본 음성</option>
                      {availableVoices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 테스트 버튼 */}
                <div className="pt-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleTestPlay}
                    className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${
                      isSpeaking
                        ? 'bg-red-500 text-white'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    <Play size={18} />
                    {isSpeaking ? '중지' : '테스트 재생'}
                  </motion.button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                    "{testText}"
                  </p>
                </div>

                {/* 기본값 복원 */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    updateState('ttsRate', 1.0);
                    updateState('ttsPitch', 1.0);
                    updateState('ttsVoice', '');
                  }}
                  className="w-full py-2 text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-200"
                >
                  기본값으로 복원
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
};
