import { useCallback, useRef, useEffect } from 'react';
import { AdPointId } from '../config/adConfig';

// Android 광고 인터페이스 타입 정의 (AdContext에서도 사용하므로 여기서 export)
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

interface UseAdsReturn {
  // 특정 포인트에서 광고 트리거 (새로운 방식)
  triggerAd: (pointId: AdPointId) => void;

  // 레거시 호환용
  showInterstitial: () => boolean;
  showInterstitialWithCallback: (onComplete: (success: boolean) => void) => void;
  checkAndShowInterstitial: () => void;

  // 배너 광고 제어
  showBanner: () => void;
  hideBanner: () => void;
  toggleBanner: () => void;

  // 상태
  isAndroidApp: boolean;
}

// Android 환경 감지
const isAndroidApp = (): boolean => {
  return typeof window !== 'undefined' && !!window.AndroidAds;
};

/**
 * 광고 훅 - AdContext 없이 독립적으로 사용 가능
 * AdContext가 있으면 그것을 사용하고, 없으면 직접 Android 인터페이스 호출
 */
export const useAds = (): UseAdsReturn => {
  const callbackRef = useRef<((success: boolean) => void) | null>(null);

  useEffect(() => {
    if (isAndroidApp()) {
      window.adCompletionCallback = (success: boolean) => {
        if (callbackRef.current) {
          callbackRef.current(success);
          callbackRef.current = null;
        }
      };
    }
    return () => {
      window.adCompletionCallback = undefined;
    };
  }, []);

  // 특정 광고 포인트 트리거 (AdContext 사용 시 그쪽에서 처리)
  const triggerAd = useCallback((pointId: AdPointId) => {
    // 이 훅을 단독으로 사용할 때는 바로 checkAndShowInterstitial 호출
    // AdContext 내에서 사용 시에는 AdContext의 triggerAd가 오버라이드됨
    console.log(`[useAds] Triggering ad for: ${pointId}`);
    if (isAndroidApp() && window.AndroidAds) {
      window.AndroidAds.checkAndShowInterstitial();
    }
  }, []);

  const showInterstitial = useCallback((): boolean => {
    if (isAndroidApp() && window.AndroidAds) {
      return window.AndroidAds.showInterstitialAd();
    }
    return false;
  }, []);

  const showInterstitialWithCallback = useCallback((onComplete: (success: boolean) => void) => {
    if (isAndroidApp() && window.AndroidAds) {
      callbackRef.current = onComplete;
      window.AndroidAds.showInterstitialAd();
    } else {
      onComplete(false);
    }
  }, []);

  const checkAndShowInterstitial = useCallback(() => {
    if (isAndroidApp() && window.AndroidAds) {
      window.AndroidAds.checkAndShowInterstitial();
    }
  }, []);

  const showBanner = useCallback(() => {
    if (isAndroidApp() && window.AndroidAds) {
      window.AndroidAds.showBannerAd();
    }
  }, []);

  const hideBanner = useCallback(() => {
    if (isAndroidApp() && window.AndroidAds) {
      window.AndroidAds.hideBannerAd();
    }
  }, []);

  const toggleBanner = useCallback(() => {
    if (isAndroidApp() && window.AndroidAds) {
      window.AndroidAds.toggleBannerAd();
    }
  }, []);

  return {
    triggerAd,
    showInterstitial,
    showInterstitialWithCallback,
    checkAndShowInterstitial,
    showBanner,
    hideBanner,
    toggleBanner,
    isAndroidApp: isAndroidApp(),
  };
};
