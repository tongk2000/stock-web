/**
 * Naver 응답 파싱 유틸리티
 *
 * `m.stock.naver.com/api/stock/...` 응답은 숫자를 모두 문자열로 직렬화하고
 * 콤마/단위 문자가 섞여 들어옵니다. 여러 API 라우트가 같은 정규식 변환을
 * 반복해 정의하던 것을 모았습니다.
 */

/**
 * 콤마와 비숫자 문자를 제거하고 정수로 파싱합니다.
 * 비문자열·파싱 실패는 0을 반환 — Naver 응답이 누락 필드를 빈 문자열로 보내므로 안전합니다.
 *
 * @example parseInt0("1,234,500")  // 1234500
 * @example parseInt0("-2,300")     // -2300
 */
export function parseInt0(value: unknown): number {
  if (typeof value !== 'string') return 0;
  return parseInt(value.replace(/[^\d-]/g, ''), 10) || 0;
}

/**
 * 콤마를 제거하고 부동소수점으로 파싱합니다 (등락률 등 소수 포함 값용).
 * 비문자열·파싱 실패 시 0.
 */
export function parseFloat0(value: unknown): number {
  if (typeof value !== 'string') return 0;
  return Number.parseFloat(value.replace(/,/g, '')) || 0;
}

/**
 * 콤마와 비숫자(부호/소수점 외) 문자를 제거하고 부동소수점으로 파싱합니다.
 * 단위 문자가 섞여 있을 가능성이 있는 totalInfos 응답(`per`, `pbr`, `eps` 등)에 사용합니다.
 * 파싱 실패 시 null — "값 없음"과 0을 구분해야 하는 통계 컬럼에 적합합니다.
 */
export function parseDecimalOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const num = Number.parseFloat(value.replace(/,/g, '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) ? num : null;
}

/**
 * 한국식 단위가 섞인 금액 문자열("1.23조 4,560억" 같은)을 원 단위 정수로 변환합니다.
 * 단위가 없으면 `parseDecimalOrNull` 폴백을 거칩니다.
 *
 * @example parseKrwAmount("1.23조 4560억")  // 1_234_560_000_000
 * @example parseKrwAmount("1억")            // 100_000_000
 * @example parseKrwAmount("1234")           // 1234
 */
export function parseKrwAmount(value: string | undefined): number | null {
  if (!value) return null;

  const compact = value.replace(/,/g, '').replace(/\s+/g, '');
  const trillion = compact.match(/(-?\d+(?:\.\d+)?)조/);
  const hundredMillion = compact.match(/(-?\d+(?:\.\d+)?)억/);

  if (trillion || hundredMillion) {
    return Math.round(
      (trillion ? Number.parseFloat(trillion[1]) * 1e12 : 0) +
        (hundredMillion ? Number.parseFloat(hundredMillion[1]) * 1e8 : 0),
    );
  }

  return parseDecimalOrNull(value);
}
