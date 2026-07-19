import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GlobalState } from '../types';
import { safeParse } from '../utils/storage';

interface GlobalStateContextType {
  state: GlobalState;
  updateState: <K extends keyof GlobalState>(key: K, value: GlobalState[K]) => void;
}

const defaultState: GlobalState = {
  fontSize: 16,
  repeatCount: 3,
  currentCollection: 'awana-recital',
  isRepeatMode: true,
  isDarkMode: false,
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVoice: '',
};

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

export const GlobalStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GlobalState>(() => {
    const saved = localStorage.getItem('bibleApp_globalState');
    // 손상된 저장값(부분 기록·스키마 변경 잔재 등)이 있어도 앱이 부팅 불능이 되지 않도록
    // 무방어 JSON.parse 대신 safeParse로 방어한다. 손상 시 defaultState로 안전 부팅되고
    // 다음 저장(useEffect)에서 정상값으로 자가 치유된다.
    return { ...defaultState, ...safeParse<Partial<GlobalState>>(saved, {}) };
  });

  useEffect(() => {
    localStorage.setItem('bibleApp_globalState', JSON.stringify(state));
    
    // Apply dark mode
    if (state.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state]);

  const updateState = <K extends keyof GlobalState>(key: K, value: GlobalState[K]) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

  return (
    <GlobalStateContext.Provider value={{ state, updateState }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = (): GlobalStateContextType => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error('useGlobalState must be used within GlobalStateProvider');
  }
  return context;
};
