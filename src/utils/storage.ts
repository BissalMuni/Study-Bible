/**
 * localStorage 등에서 읽은 문자열을 안전하게 파싱한다.
 * 값이 없거나(null) 손상(JSON 파싱 실패)된 경우 fallback을 반환한다.
 *
 * 목적: 최상위 상태 초기화(GlobalStateContext) 등에서 무방어 JSON.parse가
 * 던지는 예외로 앱이 부팅 불능(화이트스크린)이 되는 것을 막는다.
 */
export function safeParse<T>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
