// 광고 포인트 ID 정의
export type AdPointId =
  | 'TAB_CHANGE'           // 탭 변경 시
  | 'THEME_SELECT'         // 테마 선택 시
  | 'THEME_BACK'           // 테마에서 뒤로가기
  | 'BIBLE_CHAPTER_SELECT' // 성경 장 선택 시
  | 'COMFORT_RESULT'       // 위로 결과 표시 시
  | 'AWANA_VERSE_COMPLETE'; // 어와나 암송 완료 시

// 광고 포인트 설정 타입
export interface AdPointConfig {
  id: AdPointId;
  name: string;           // 한글 이름
  description: string;    // 설명
  enabled: boolean;       // 활성화 여부
  type: 'interstitial' | 'banner'; // 광고 유형
  probability: number;    // 표시 확률 (0-1)
  countThreshold?: number; // 횟수 임계값 (이 횟수마다 광고 표시)
}

// 기본 광고 포인트 설정
export const defaultAdPoints: Record<AdPointId, AdPointConfig> = {
  TAB_CHANGE: {
    id: 'TAB_CHANGE',
    name: '탭 변경',
    description: '하단 탭 변경 시 광고 표시',
    enabled: true,
    type: 'interstitial',
    probability: 0.5,
    countThreshold: 5,
  },
  THEME_SELECT: {
    id: 'THEME_SELECT',
    name: '테마 선택',
    description: '테마 목록에서 테마 선택 시 광고 표시',
    enabled: true,
    type: 'interstitial',
    probability: 0.5,
    countThreshold: 5,
  },
  THEME_BACK: {
    id: 'THEME_BACK',
    name: '테마 뒤로가기',
    description: '테마 상세에서 뒤로가기 시 광고 표시',
    enabled: true,
    type: 'interstitial',
    probability: 0.5,
    countThreshold: 5,
  },
  BIBLE_CHAPTER_SELECT: {
    id: 'BIBLE_CHAPTER_SELECT',
    name: '성경 장 선택',
    description: '성경 장 선택 시 광고 표시',
    enabled: true,
    type: 'interstitial',
    probability: 0.5,
    countThreshold: 5,
  },
  COMFORT_RESULT: {
    id: 'COMFORT_RESULT',
    name: '위로 결과',
    description: '오늘의 위로 결과 표시 시 광고',
    enabled: true,
    type: 'interstitial',
    probability: 0.5,
    countThreshold: 3,
  },
  AWANA_VERSE_COMPLETE: {
    id: 'AWANA_VERSE_COMPLETE',
    name: '어와나 암송 완료',
    description: '어와나 암송 완료 시 광고 표시',
    enabled: false,
    type: 'interstitial',
    probability: 0.3,
  },
};

// 로컬 스토리지 키
export const AD_CONFIG_STORAGE_KEY = 'bibleApp_adConfig';

// 설정 저장
export const saveAdConfig = (config: Record<AdPointId, AdPointConfig>): void => {
  try {
    localStorage.setItem(AD_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save ad config:', e);
  }
};

// 설정 불러오기
export const loadAdConfig = (): Record<AdPointId, AdPointConfig> => {
  try {
    const saved = localStorage.getItem(AD_CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 기본값과 병합 (새로운 광고 포인트가 추가된 경우 대비)
      return { ...defaultAdPoints, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load ad config:', e);
  }
  return defaultAdPoints;
};
