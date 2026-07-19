/**
 * 태그 목록(중복 포함 가능)으로 구절을 점수화해 상위 N개를 선택하는 순수 함수.
 *
 * ⚠️ 반드시 "원시 태그"(rawTags, 중복 포함)를 넘길 것. 빈도 가중치는 중복 횟수에서
 * 계산되므로, 이미 dedup된 배열을 넣으면 모든 count=1이 되어 가중치가 소실된다.
 * (기존 handleNewVerse가 dedup된 collectedTags를 넘겨 결과 화면과 랭킹이 달라지던 버그의 원인.)
 *
 * rand를 주입하면 결정론적 테스트가 가능하다(기본값 Math.random).
 */
/** 수기 큐레이션 관련도(priority: 1=최고연관) → 가산점. 태그가 매칭된 구절에만 적용한다. */
const PRIORITY_BONUS: Record<number, number> = { 1: 6, 2: 3, 3: 1 };

export function selectVersesByTags<T extends { id: number; tags: string[]; priority?: number }>(
  verses: T[],
  rawTags: string[],
  opts: { pick?: number; pool?: number; rand?: () => number } = {},
): { verses: T[]; sortedTags: string[] } {
  const pick = opts.pick ?? 5;
  const pool = opts.pool ?? 10;
  const rand = opts.rand ?? Math.random;

  // 태그 빈도 집계 + 빈도순 정렬
  const tagCounts: Record<string, number> = {};
  rawTags.forEach((t) => {
    tagCounts[t] = (tagCounts[t] || 0) + 1;
  });
  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);

  let result: T[] = [];
  if (sortedTags.length > 0) {
    const scored = verses.map((verse) => {
      let score = 0;
      sortedTags.forEach((tag, i) => {
        if (verse.tags.includes(tag)) {
          score += (sortedTags.length - i) * (tagCounts[tag] || 1);
        }
      });
      // 관련도(태그 매칭)가 있는 구절에 한해 수기 큐레이션 우선순위를 가산점으로 반영.
      // 무관한 고priority 구절이 결과를 오염시키지 않도록 매칭이 있을 때만 적용.
      if (score > 0 && verse.priority != null) {
        score += PRIORITY_BONUS[verse.priority] ?? 0;
      }
      return { verse, score };
    });
    const top = scored
      .filter((v) => v.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, pool)
      .map((v) => v.verse);
    result = [...top].sort(() => rand() - 0.5).slice(0, pick);
  }

  // 부족분은 comfort 태그 구절로 채움
  if (result.length < pick) {
    const fill = verses
      .filter((v) => v.tags.includes('comfort') && !result.some((r) => r.id === v.id))
      .sort(() => rand() - 0.5)
      .slice(0, pick - result.length);
    result = [...result, ...fill];
  }

  return { verses: result, sortedTags: sortedTags.length ? sortedTags : ['comfort'] };
}
