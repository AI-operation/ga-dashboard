/**
 * LC GA Dashboard — 앱 초기화
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── 사용자 정보 반영 ──────────────────────────────────────
  const user = CONFIG.USER;
  document.getElementById('user-avatar').textContent   = user.AVATAR;
  document.getElementById('sidebar-avatar').textContent = user.AVATAR;
  document.getElementById('sidebar-name').textContent   = user.NAME;
  document.getElementById('sidebar-role').textContent   =
    user.ROLE === 'admin'  ? '관리자' :
    user.ROLE === 'editor' ? '편집자' : '뷰어';

  // ── 현재 날짜 반영 ───────────────────────────────────────
  const { year, month } = Utils.getCurrentYM();
  document.getElementById('gnb-period').textContent = `${year}년 ${month}월`;

  // ── GNB 탭 클릭 ─────────────────────────────────────────
  document.querySelectorAll('.gnb-tab[data-gnb]').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.gnb-tab').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      // 탭별 첫 페이지로 이동
      const map = {
        operations: 'cafe',
        cost:        'ai-cost',
        welfare:     'algocare',
        infra:       'slack',
      };
      const target = map[el.dataset.gnb];
      if (target) Router.go(target);
    });
  });

  // ── 사이드바 클릭 바인딩 ────────────────────────────────
  Router.bindSidebar();

  // ── 페이지 등록 ─────────────────────────────────────────
  Router.register('cafe',        Pages.cafe);
  Router.register('ai-cost',     Pages.aiCost);
  Router.register('algocare',    Pages.algocare);
  Router.register('slack',       Pages.slack);
  Router.register('input',       Pages.input);
  Router.register('permissions', Pages.permissions);

  // ── 최근 변경 이력 (Mock) ────────────────────────────────
  document.getElementById('recent-changes').innerHTML = `
    <div style="padding: 5px 6px; margin-bottom: 2px;">
      <div style="font-size: 10.5px; color: var(--text-2);">3/31 카페 데이터 입력</div>
      <div style="font-size: 10px; color: var(--text-3);">${user.NAME} · 방금 전</div>
    </div>
    <div style="padding: 5px 6px; margin-bottom: 2px;">
      <div style="font-size: 10.5px; color: var(--text-2);">AI 비용 3월 확정</div>
      <div style="font-size: 10px; color: var(--text-3);">${user.NAME} · 어제</div>
    </div>
    <div style="padding: 5px 6px;">
      <div style="font-size: 10.5px; color: var(--text-2);">슬랙 Q1 리포트 등록</div>
      <div style="font-size: 10px; color: var(--text-3);">${user.NAME} · 3일 전</div>
    </div>
  `;

  // ── 첫 페이지 진입 ───────────────────────────────────────
  await Router.go('cafe');
});
