import { useCallback, useEffect, useState } from 'react';

interface State<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * JSON(또는 텍스트)을 fetch하며 로딩·에러·재시도(reload)를 표준화한다.
 *
 * 기존 컴포넌트들은 `.catch(console.error)`만 처리해 실패 시 화면이 빈 채로/무한
 * 스피너로 멈췄다. 이 훅은 실패를 error 상태로 노출하고 reload로 재시도를 제공한다.
 * (사용자 대응 UI는 AsyncBoundary가 담당.)
 */
export function useFetchJson<T>(url: string, parse: 'json' | 'text' = 'json') {
  const [s, setS] = useState<State<T>>({ data: null, loading: true, error: null });

  const load = useCallback(() => {
    let cancelled = false;
    setS({ data: null, loading: true, error: null });
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
        return parse === 'text' ? r.text() : r.json();
      })
      .then((data) => {
        if (!cancelled) setS({ data: data as T, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('[useFetchJson]', error);
        if (!cancelled) {
          const err = error instanceof Error ? error : new Error(String(error));
          setS({ data: null, loading: false, error: err });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url, parse]);

  useEffect(() => load(), [load]);

  return { ...s, reload: load };
}
