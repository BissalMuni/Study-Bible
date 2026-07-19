import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * 최상위 에러 바운더리 — 렌더 중 발생한 예외로 앱 전체가 언마운트되어
 * 화이트스크린이 되는 것을 막고, 사용자가 스스로 복구할 수 있는 폴백 UI를 제공한다.
 *
 * "다시 시작"은 부팅 크래시의 주 원인인 손상 상태(localStorage)를 제거하고
 * 리로드하므로, 1차 방어(safeParse)를 우회하는 예외에서도 재설치 없이 복구된다.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) {
      // 개발 중에만 상세 로깅(프로덕션 콘솔 오염 방지)
      console.error('[ErrorBoundary]', error);
    }
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('bibleApp_globalState');
    } catch {
      /* noop */
    }
    location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-gray-50 dark:bg-gray-900">
          <p className="text-gray-700 dark:text-gray-200">
            일시적인 오류가 발생했어요. 다시 시도해 주세요.
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white"
          >
            다시 시작
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
