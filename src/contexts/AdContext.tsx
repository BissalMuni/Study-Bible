import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  AdPointId,
  AdPointConfig,
  defaultAdPoints,
  loadAdConfig,
  saveAdConfig,
} from '../config/adConfig';

// Android 광고 인터페이스 타입
declare global {
  interface Window {
    AndroidAds?: {
      showInterstitialAd: () => boolean;
      checkAndShowInterstitial: () => void;
      showBannerAd: () => void;
      hideBannerAd: () => void;
      toggleBannerAd: () => void;
      setAdIntervalEnabled: (enabled: boolean) => void;
      setAdIntervalTime: (milliseconds: number) => void;
    };
    adCompletionCallback?: (success: boolean) => void;
  }
}

interface AdContextType {
  // 광고 포인트 설정
  adPoints: Record<AdPointId, AdPointConfig>;

  // 전체 광고 활성화/비활성화
  globalAdEnabled: boolean;
  setGlobalAdEnabled: (enabled: boolean) => void;

  // 개별 광고 포인트 제어
  setAdPointEnabled: (pointId: AdPointId, enabled: boolean) => void;
  setAdPointProbability: (pointId: AdPointId, probability: number) => void;
  updateAdPoint: (pointId: AdPointId, config: Partial<AdPointConfig>) => void;

  // 광고 표시 함수
  triggerAd: (pointId: AdPointId) => void;

  // 배너 광고 제어
  showBanner: () => void;
  hideBanner: () => void;

  // 설정 초기화
  resetToDefault: () => void;

  // Android 환경 여부
  isAndroidApp: boolean;
}

const AdContext = createContext<AdContextType | null>(null);

// Android 환경 감지
const isAndroidApp = (): boolean => {
  return typeof window !== 'undefined' && !!window.AndroidAds;
};

export const AdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adPoints, setAdPoints] = useState<Record<AdPointId, AdPointConfig>>(loadAdConfig);
  const [globalAdEnabled, setGlobalAdEnabled] = useState(true);

  // 각 광고 포인트별 카운터 (countThreshold용)
  const countersRef = useRef<Record<AdPointId, number>>({} as Record<AdPointId, number>);

  // 광고 완료 콜백 등록
  useEffect(() => {
    if (isAndroidApp()) {
      window.adCompletionCallback = (success: boolean) => {
        console.log('Ad completion:', success);
      };
    }
    return () => {
      window.adCompletionCallback = undefined;
    };
  }, []);

  // 설정 변경 시 저장
  useEffect(() => {
    saveAdConfig(adPoints);
  }, [adPoints]);

  // 개별 광고 포인트 활성화/비활성화
  const setAdPointEnabled = useCallback((pointId: AdPointId, enabled: boolean) => {
    setAdPoints(prev => ({
      ...prev,
      [pointId]: { ...prev[pointId], enabled },
    }));
  }, []);

  // 광고 포인트 확률 설정
  const setAdPointProbability = useCallback((pointId: AdPointId, probability: number) => {
    setAdPoints(prev => ({
      ...prev,
      [pointId]: { ...prev[pointId], probability: Math.max(0, Math.min(1, probability)) },
    }));
  }, []);

  // 광고 포인트 업데이트
  const updateAdPoint = useCallback((pointId: AdPointId, config: Partial<AdPointConfig>) => {
    setAdPoints(prev => ({
      ...prev,
      [pointId]: { ...prev[pointId], ...config },
    }));
  }, []);

  // 광고 트리거
  const triggerAd = useCallback((pointId: AdPointId) => {
    // 전역 광고가 비활성화되어 있으면 무시
    if (!globalAdEnabled) {
      console.log(`[Ad] Global ads disabled, skipping: ${pointId}`);
      return;
    }

    const point = adPoints[pointId];
    if (!point || !point.enabled) {
      console.log(`[Ad] Point disabled: ${pointId}`);
      return;
    }

    // Android 앱이 아니면 무시
    if (!isAndroidApp() || !window.AndroidAds) {
      console.log(`[Ad] Not Android app, skipping: ${pointId}`);
      return;
    }

    // countThreshold가 있는 경우 카운터 체크
    if (point.countThreshold) {
      const currentCount = (countersRef.current[pointId] || 0) + 1;
      countersRef.current[pointId] = currentCount;

      if (currentCount < point.countThreshold) {
        console.log(`[Ad] Counter: ${currentCount}/${point.countThreshold} for ${pointId}`);
        return;
      }
      // 임계값 도달, 카운터 리셋
      countersRef.current[pointId] = 0;
    }

    // 확률 체크
    if (Math.random() > point.probability) {
      console.log(`[Ad] Probability check failed for ${pointId} (${point.probability * 100}%)`);
      return;
    }

    // 광고 표시
    console.log(`[Ad] Showing ${point.type} ad for: ${pointId}`);
    if (point.type === 'interstitial') {
      window.AndroidAds.showInterstitialAd();
    } else if (point.type === 'banner') {
      window.AndroidAds.showBannerAd();
    }
  }, [globalAdEnabled, adPoints]);

  // 배너 광고 표시
  const showBanner = useCallback(() => {
    console.log('[Ad] showBanner called', {
      globalAdEnabled,
      isAndroid: isAndroidApp(),
      hasAndroidAds: !!window.AndroidAds
    });
    if (globalAdEnabled && isAndroidApp() && window.AndroidAds) {
      console.log('[Ad] Calling AndroidAds.showBannerAd()');
      window.AndroidAds.showBannerAd();
    } else {
      console.log('[Ad] showBanner skipped - conditions not met');
    }
  }, [globalAdEnabled]);

  // 배너 광고 숨기기
  const hideBanner = useCallback(() => {
    if (isAndroidApp() && window.AndroidAds) {
      window.AndroidAds.hideBannerAd();
    }
  }, []);

  // 기본값으로 초기화
  const resetToDefault = useCallback(() => {
    setAdPoints(defaultAdPoints);
    countersRef.current = {} as Record<AdPointId, number>;
  }, []);

  const value: AdContextType = {
    adPoints,
    globalAdEnabled,
    setGlobalAdEnabled,
    setAdPointEnabled,
    setAdPointProbability,
    updateAdPoint,
    triggerAd,
    showBanner,
    hideBanner,
    resetToDefault,
    isAndroidApp: isAndroidApp(),
  };

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
};

// 커스텀 훅
export const useAdContext = (): AdContextType => {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAdContext must be used within an AdProvider');
  }
  return context;
};

// 간단한 광고 트리거 훅 (컴포넌트에서 사용)
export const useAdTrigger = () => {
  const { triggerAd, globalAdEnabled, adPoints } = useAdContext();

  return {
    triggerAd,
    isEnabled: (pointId: AdPointId) => globalAdEnabled && adPoints[pointId]?.enabled,
  };
};
