/**
 * LC GA Dashboard — 설정 파일
 * ──────────────────────────────
 * Apps Script 배포 후 아래 값들을 채워주세요.
 * 이 파일만 수정하면 전체 앱에 반영됩니다.
 */
const CONFIG = {

  // ── Apps Script 웹 앱 URL ──────────────────────────────────
  // Apps Script 배포 후 발급되는 URL로 교체하세요.
  // 예: 'https://script.google.com/macros/s/AKfy.../exec'
  API_URL: 'https://script.google.com/macros/s/AKfycbzmCQ8Xx7oXGO_he8o4ZcM2Eg02zBwxPhSXBcE2p5JgmOKAe0xS87hFep77Vm2PGo25/exec',

  // ── Google Sheets ID ───────────────────────────────────────
  // Sheets URL에서 /d/ 뒤의 긴 문자열
  SHEET_ID_DATA: '1l8-gQVGTjbH_m9xvva_kKCFuiKfgB_WftaIUY7QHiD0'
  SHEET_ID_PERMISSIONS: 'YOUR_PERMISSIONS_SHEET_ID',

  // ── 시트 이름 (Sheets 탭 이름과 정확히 일치해야 함) ────────
  SHEETS: {
    CAFE:        '카페_매출',
    AI_COST:     'AI_비용',
    ALGOCARE:    '알고케어',
    SLACK:       '슬랙_오피스키퍼',
    PERMISSIONS: '사용자_권한',
  },

  // ── 앱 설정 ────────────────────────────────────────────────
  APP: {
    NAME:    'LC GA Dashboard',
    VERSION: '1.0.0',
    // 데이터 캐시 유지 시간 (밀리초) — 기본 5분
    CACHE_TTL: 5 * 60 * 1000,
  },

  // ── 사용자 정보 (Google OAuth 붙이기 전 임시) ──────────────
  // OAuth 연동 후 자동으로 채워집니다.
  USER: {
    NAME:   '박성훈',
    EMAIL:  'seonghun@loadcomplete.com',
    ROLE:   'admin',   // admin | editor | viewer
    AVATAR: '박',
  },
};
