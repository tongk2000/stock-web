/**
 * 앱 전역 상수 모음
 *
 * 여러 파일에서 참조하던 매직 넘버와 문자열 리터럴을 한 곳에 모읍니다.
 * 값을 바꿀 일이 있을 때 사용처를 일일이 찾지 않고 이 파일만 수정하면 되도록 합니다.
 */

/**
 * 토론 피드 페이지네이션 기본 크기.
 *
 * 화면별로 밀도가 다르므로 다음 세 값을 노출합니다:
 *   - `DEFAULT`     : 전체 토론 피드 (홈의 최근 글, /discussions)
 *   - `ROOM`        : 종목별 토론방 (/stocks/[code]) — 긴 대화 흐름을 보여줘야 해서 크게 잡음
 *   - `FAVORITES`   : 즐겨찾기 모음 피드 — N개 종목 합쳐 조회하므로 전체보다 작게 잡음
 */
export const PAGE_SIZE = {
  DEFAULT: 20,
  ROOM: 30,
  FAVORITES: 15,
} as const;

/**
 * SEO 참여도 임계값.
 *
 * 좋아요 또는 댓글 수가 이 값 미만이면:
 *   - sitemap.xml에서 제외 (크롤링 우선순위 하향)
 *   - generateMetadata에서 noindex 지정 (색인 제외)
 *
 * 저품질/봇 생성 글이 검색 결과를 오염시키지 않도록 하는 장치입니다.
 */
export const ENGAGEMENT_THRESHOLD = 3;

/**
 * 브라우저 스토리지 키 모음.
 *
 * - 값은 기존 사용자의 데이터와 호환성을 유지하기 위해 변경하지 마세요.
 * - `THEME`이 'vite-ui-theme'인 것은 shadcn/ui 초기 템플릿(Vite 기반)에서 유래한 이름으로,
 *   이미 배포된 사용자의 localStorage 키를 보존하기 위해 그대로 둡니다.
 */
export const STORAGE_KEYS = {
  /** 테마 (light/dark/system) — localStorage */
  THEME: 'vite-ui-theme',
  /** 비로그인 상태의 즐겨찾기 목록 — localStorage */
  FAVORITES: 'stock-favorites',
  /** 차트 보조지표 설정 — localStorage */
  INDICATORS: 'stock-indicators',
  /** OAuth 로그인 후 복귀 경로 — sessionStorage */
  POST_AUTH_NEXT: 'post-auth-next',
} as const;

/**
 * 차트 보조지표 — 이동평균선 기본 기간.
 * StockChartSection과 CandleChart 양쪽에서 동일하게 사용됩니다.
 */
export const MA_PERIODS = [5, 20, 60, 120] as const;

/**
 * 랭킹 페이지(/rankings/*) 공용 상수.
 *
 * - PAGE_SIZE                  : 한 랭킹에 노출할 종목 수
 * - HUB_PREVIEW_SIZE           : 허브 페이지 카드에 미리보기로 보여줄 행 수
 * - VOLUME_SURGE_LOOKBACK_DAYS : 거래량 급증 계산 시 평균에 사용하는 직전 영업일 수
 * - TRENDING_WINDOW_HOURS      : 토론 핫 종목 집계 윈도우(시간)
 */
export const RANKING = {
  PAGE_SIZE: 50,
  HUB_PREVIEW_SIZE: 5,
  VOLUME_SURGE_LOOKBACK_DAYS: 20,
  TRENDING_WINDOW_HOURS: 24,
} as const;

/**
 * 페이지/쿼리별 결과 상한 (PAGE_SIZE / RANKING과 별개로 분리).
 *
 * - SEARCH_STOCKS              : /search 페이지 종목 검색 결과 최대 개수
 * - SEARCH_POSTS               : /search 페이지 토론글 검색 결과 최대 개수
 * - SITEMAP_MAX_POSTS          : sitemap.xml에 포함할 최대 게시글 수
 * - COMPANY_INFO_LOOKBACK_DAYS : CompanyInfoSection의 5일/20일 고저가 계산용 캔들 lookback
 * - BATCH_PRICE_CODES          : `/api/stock/today` 단일 요청에서 허용하는 종목 수 상한
 */
export const LIMITS = {
  SEARCH_STOCKS: 10,
  SEARCH_POSTS: 20,
  SITEMAP_MAX_POSTS: 10000,
  COMPANY_INFO_LOOKBACK_DAYS: 20,
  BATCH_PRICE_CODES: 50,
} as const;

/**
 * 장중 실시간 캔들 폴링 주기 (밀리초).
 * useTodayCandle 훅이 Naver 시세 API를 다시 찌르는 간격입니다.
 * 너무 짧으면 외부 API에 부담이 되고, 너무 길면 차트가 멈춰 보입니다.
 */
export const LIVE_CANDLE_POLL_MS = 30_000;
