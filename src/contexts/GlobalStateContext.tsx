import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GlobalState } from '../types';

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
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
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
