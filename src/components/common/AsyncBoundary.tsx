import { motion } from 'framer-motion';

interface Props {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  children?: React.ReactNode;
}

/**
 * 비동기 로드(useFetchJson)의 로딩/에러 상태를 표준 UI로 표시한다.
 * - loading: 스피너
 * - error: 안내 문구 + "다시 시도" 버튼(onRetry)
 * - 정상: children 렌더
 *
 * 목적: fetch 실패 시 빈 화면/무한 스피너로 멈추던 것을 사용자 대응 가능한 상태로 전환.
 */
export function AsyncBoundary({ loading, error, onRetry, children }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-full py-16 px-6 text-center">
        <p className="text-gray-700 dark:text-gray-200">콘텐츠를 불러오지 못했어요.</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
