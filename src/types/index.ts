// Theme types
export interface Theme {
  id: string;
  name: string;
  icon: string;
  color: string;
  books: number[];
  description: string;
  chapters?: string[];
  keywords?: string[];
}

export interface ThemeCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  themes: Theme[];
}

// Bible types
export interface Book {
  id?: number;
  name: string;
  english?: string;
  chapters?: number;
}

export interface Verse {
  verse: number;
  content: string;
  english?: string;
}

export interface Passage {
  id: number; // This is the bookId for audio files
  reference?: string;
  book: Book;
  chapter: number;
  verses: Verse[];
  uniqueKey?: string;
}

export interface Collection {
  id: string;
  num?: number;
  name: string;
  passages: Passage[];
}

// Global state types
export interface GlobalState {
  fontSize: number;
  repeatCount: number;
  currentCollection: string;
  isRepeatMode: boolean;
  isDarkMode: boolean;
  // TTS settings
  ttsRate: number;      // 0.5 ~ 2.0 (기본값 1.0)
  ttsPitch: number;     // 0.5 ~ 2.0 (기본값 1.0)
  ttsVoice: string;     // 음성 이름 (빈 문자열이면 기본 한국어 음성)
}

// Navigation types
export type TabType = 'theme' | 'awana' | 'bible' | 'comfort';
