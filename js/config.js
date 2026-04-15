/**
 * LC GA Dashboard — 설정 파일
 */
const CONFIG = {

  // Apps Script 웹 앱 URL
  API_URL: 'https://script.google.com/macros/s/AKfycbzmCQ8Xx7oXGO_he8o4ZcM2Eg02zBwxPhSXBcE2p5JgmOKAe0xS87hFep77Vm2PGo25/exec',

  // Google Sheets ID
  SHEET_ID_DATA:        '1l8-gQVGTjbH_m9xvva_kKCFuiKfgB_WftaIUY7QHiD0',
  SHEET_ID_PERMISSIONS: 'YOUR_PERMISSIONS_SHEET_ID',

  // 시트 이름
  SHEETS: {
    CAFE:        '카페_월요약',
    AI_COST:     'AI_비용',
    ALGOCARE:    '알고케어',
    SLACK:       '슬랙_오피스키퍼',
    PERMISSIONS: '사용자_권한',
  },

  // 앱 설정
  APP: {
    NAME:      'LC GA Dashboard',
    VERSION:   '1.0.0',
    CACHE_TTL: 5 * 60 * 1000,
  },

  // 사용자 정보 (OAuth 연동 전 임시)
  USER: {
    NAME:   '박성훈',
    EMAIL:  'seonghun@loadcomplete.com',
    ROLE:   'admin',
    AVATAR: '박',
  },
};
