/**
 * 카페 월 매출 페이지
 */
const Pages = window.Pages || {};

Pages.cafe = async function(container) {
  const { year, month } = Utils.getCurrentYM();

  // ── 헤더 & 탭 렌더 ──────────────────────────────────────
  container.innerHTML = `
    <div class="ws-header">
      <div class="ws-header-top">
        <div>
          <div class="ws-title">카페 월 매출</div>
          <div class="ws-subtitle">운영 리포트 · ${year}년 ${month}월 기준</div>
        </div>
        <div class="ws-actions">
          <button class="btn btn-sm" id="btn-filter">필터</button>
          <button class="btn btn-sm" id="btn-export">내보내기</button>
          <button class="btn btn-primary btn-sm" id="btn-add">+ 데이터 추가</button>
        </div>
      </div>
      <div class="ws-subtabs">
        <div class="ws-stab active" data-tab="overview">개요</div>
        <div class="ws-stab" data-tab="daily">일별 내역</div>
        <div class="ws-stab" data-tab="category">카테고리</div>
        <div class="ws-stab" data-tab="compare">월별 비교</div>
      </div>
    </div>
    <div class="ws-content" id="cafe-content">
      ${Utils.loadingHTML()}
    </div>
  `;

  // ── 탭 전환 ─────────────────────────────────────────────
  const tabMap = {
    overview: renderOverview,
    daily:    renderDaily,
    category: renderCategory,
    compare:  renderCompare,
  };

  container.querySelectorAll('.ws-stab').forEach(tab => {
    tab.addEventListener('click', async () => {
      container.querySelectorAll('.ws-stab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const content = document.getElementById('cafe-content');
      content.innerHTML = Utils.loadingHTML();
      await tabMap[tab.dataset.tab]?.(content, data);
    });
  });

  // ── 버튼 이벤트 ─────────────────────────────────────────
  container.querySelector('#btn-add').addEventListener('click', openAddModal);
  container.querySelector('#btn-export').addEventListener('click', () => {
    Utils.toast('CSV 내보내기를 준비 중입니다.', 'default');
  });

  // ── 데이터 로드 (Mock 사용) ──────────────────────────────
  let data;
  try {
    // API 연결 후 아래 주석 해제:
    // data = await API.getCafeSales(year, month);
    data = API.MOCK.cafe;
  } catch (err) {
    document.getElementById('cafe-content').innerHTML =
      Utils.emptyHTML(`데이터 로드 실패: ${err.message}`);
    return;
  }

  // ── 사이드바 KPI 요약 업데이트 ──────────────────────────
  document.getElementById('sidebar-kpi').innerHTML = `
    <div class="sidebar-kpi-box">
      <div class="sidebar-kpi-label">이번 달 총 매출</div>
      <div class="sidebar-kpi-value">${Utils.formatMan(data.summary.totalSales)}</div>
      <div class="sidebar-kpi-sub">▲ ${data.summary.prevMonthDiff}% 전월 대비</div>
    </div>
  `;

  // 첫 탭 렌더
  await renderOverview(document.getElementById('cafe-content'), data);
};

// ── 개요 탭 ─────────────────────────────────────────────────
async function renderOverview(el, data) {
  const s = data.summary;
  const maxSales = Math.max(...data.monthly.map(m => m.sales));

  el.innerHTML = `
    <!-- KPI 카드 4개 -->
    <div class="kpi-grid">
      <div class="kpi-card featured">
        <div class="kpi-label">월 총 매출</div>
        <div class="kpi-value">${Utils.formatMan(s.totalSales)}</div>
        ${Utils.diffBadge(s.prevMonthDiff)}
        <span style="font-size:11px;color:var(--text-3);margin-left:4px;">전월 대비</span>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">일 평균 매출</div>
        <div class="kpi-value">${Math.round(s.dailyAvg / 10000).toLocaleString()}<span class="kpi-unit">만원</span></div>
        ${Utils.diffBadge(8.1)}
        <span style="font-size:11px;color:var(--text-3);margin-left:4px;">전월 대비</span>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">목표 달성률</div>
        <div class="kpi-value">${s.achievementRate}<span class="kpi-unit">%</span></div>
        ${Utils.diffBadge(s.achievementRate - 100)}
        <span style="font-size:11px;color:var(--text-3);margin-left:4px;">목표 대비</span>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">영업일</div>
        <div class="kpi-value">${s.workingDays}<span class="kpi-unit">일</span></div>
        <span class="badge badge-gray">이번 달 기준</span>
      </div>
    </div>

    <!-- 차트 + 카테고리 -->
    <div style="display:grid;grid-template-columns:1fr 260px;gap:12px;margin-bottom:18px;">

      <!-- 월별 추이 -->
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">월별 매출 추이</div>
          <div class="panel-meta">최근 6개월</div>
        </div>
        <div class="panel-body">
          <div style="display:flex;align-items:flex-end;gap:8px;height:90px;">
            ${data.monthly.map((m, i) => {
              const h = Math.round((m.sales / maxSales) * 82);
              const isCur = i === data.monthly.length - 1;
              const bg = isCur ? 'var(--yellow)' : (i >= data.monthly.length - 3 ? '#FDE68A' : '#E5E7EB');
              return `
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;">
                  <div style="width:100%;height:${h}px;background:${bg};border-radius:3px 3px 0 0;cursor:pointer;" title="${Utils.formatMan(m.sales)}"></div>
                  <span style="font-size:9.5px;color:${isCur ? 'var(--brown)' : 'var(--text-3)'};font-weight:${isCur ? 700 : 400};">${m.month}</span>
                </div>`;
            }).join('')}
          </div>
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:12px;margin-top:10px;">
            <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-3);">
              <div style="width:10px;height:10px;background:#E5E7EB;border-radius:2px;"></div>이전 분기
            </div>
            <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-3);">
              <div style="width:10px;height:10px;background:#FDE68A;border-radius:2px;"></div>직전 월
            </div>
            <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-3);">
              <div style="width:10px;height:10px;background:var(--yellow);border-radius:2px;"></div>이번 달
            </div>
          </div>
        </div>
      </div>

      <!-- 카테고리 분포 -->
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">카테고리 분포</div>
          <div class="panel-meta">이번 달 기준</div>
        </div>
        <div>
          ${data.categories.map(c => {
            const colors = { '음료': 'var(--yellow)', '푸드': '#6EE7B7', '기타': '#D1D5DB' };
            const bg = colors[c.name] || '#D1D5DB';
            return `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 18px;border-bottom:1px solid var(--border-light);cursor:pointer;transition:background 0.1s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:3px;height:32px;background:${bg};border-radius:2px;flex-shrink:0;"></div>
                  <div>
                    <div style="font-size:12.5px;font-weight:500;color:var(--text-1);">${c.name}</div>
                    <div style="font-size:10px;color:var(--text-3);">${c.pct}%</div>
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:13px;font-weight:700;color:var(--text-1);">${Utils.formatMan(c.amount)}</div>
                  <div style="height:3px;background:var(--border);border-radius:2px;width:52px;margin-top:4px;">
                    <div style="height:100%;width:${c.pct}%;background:${bg};border-radius:2px;max-width:100%;"></div>
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- 일별 내역 테이블 -->
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">최근 일별 내역</div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm">검색</button>
          <button class="btn btn-sm">정렬</button>
          <button class="btn btn-sm">엑셀 다운로드</button>
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>카테고리</th>
            <th>매출액</th>
            <th>전일 대비</th>
            <th>비중</th>
            <th>메모</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${data.daily.map((row, i) => `
            <tr>
              <td class="td-primary">${Utils.formatDate(row.date)}</td>
              <td>${Utils.categoryTag(row.category)}</td>
              <td class="td-number">${Utils.formatKRW(row.amount)}</td>
              <td>${Utils.diffBadge(row.prevDiff)}</td>
              <td class="td-muted">${Math.round(row.amount / s.totalSales * 100)}%</td>
              <td class="td-muted">${row.memo || '—'}</td>
              <td>
                <button class="btn btn-sm row-action" onclick="openEditModal(${i})">편집</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── 일별 내역 탭 ─────────────────────────────────────────────
async function renderDaily(el, data) {
  el.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">일별 매출 전체 내역</div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm">월 선택</button>
          <button class="btn btn-sm">엑셀 다운로드</button>
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>카테고리</th>
            <th>매출액</th>
            <th>전일 대비</th>
            <th>메모</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${data.daily.map((row, i) => `
            <tr>
              <td class="td-primary">${Utils.formatDate(row.date)}</td>
              <td>${Utils.categoryTag(row.category)}</td>
              <td class="td-number">${Utils.formatKRW(row.amount)}</td>
              <td>${Utils.diffBadge(row.prevDiff)}</td>
              <td class="td-muted">${row.memo || '—'}</td>
              <td>
                <button class="btn btn-sm row-action" onclick="openEditModal(${i})">편집</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── 카테고리 탭 ──────────────────────────────────────────────
async function renderCategory(el, data) {
  el.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));">
      ${data.categories.map(c => `
        <div class="kpi-card">
          <div class="kpi-label">${c.name}</div>
          <div class="kpi-value">${Utils.formatMan(c.amount)}</div>
          <span class="badge badge-gray">${c.pct}% 비중</span>
        </div>`).join('')}
    </div>
  `;
}

// ── 월별 비교 탭 ─────────────────────────────────────────────
async function renderCompare(el, data) {
  el.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">월별 매출 비교</div>
        <div class="panel-meta">최근 6개월</div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>월</th>
            <th>매출액</th>
            <th>전월 대비</th>
            <th>비중</th>
          </tr>
        </thead>
        <tbody>
          ${data.monthly.map((m, i) => {
            const prev = data.monthly[i - 1];
            const diff = prev ? ((m.sales - prev.sales) / prev.sales * 100).toFixed(1) : null;
            const maxS = Math.max(...data.monthly.map(x => x.sales));
            return `
              <tr>
                <td class="td-primary">${m.month}</td>
                <td class="td-number">${Utils.formatMan(m.sales)}</td>
                <td>${diff !== null ? Utils.diffBadge(Number(diff)) : '<span class="badge badge-gray">—</span>'}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div style="height:6px;width:100px;background:var(--border);border-radius:3px;">
                      <div style="height:100%;width:${Utils.barWidth(m.sales, maxS)}%;background:var(--yellow);border-radius:3px;"></div>
                    </div>
                    <span style="font-size:11px;color:var(--text-3);">${Math.round(m.sales/maxS*100)}%</span>
                  </div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── 데이터 추가 모달 ─────────────────────────────────────────
function openAddModal() {
  const { year, month } = Utils.getCurrentYM();
  Utils.openModal(`
    <div class="modal">
      <div class="modal-head">
        <span class="modal-title">매출 데이터 추가</span>
        <button class="modal-close" onclick="Utils.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">날짜</label>
          <input type="date" class="form-input" id="add-date" value="${year}-${String(month).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}">
        </div>
        <div class="form-group">
          <label class="form-label">카테고리</label>
          <select class="form-select" id="add-category">
            <option>음료</option>
            <option>푸드</option>
            <option>기타</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">매출액 (원)</label>
          <input type="number" class="form-input" id="add-amount" placeholder="예: 1840000">
        </div>
        <div class="form-group">
          <label class="form-label">메모</label>
          <input type="text" class="form-input" id="add-memo" placeholder="선택사항">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="Utils.closeModal()">취소</button>
        <button class="btn btn-primary" onclick="submitAdd()">저장</button>
      </div>
    </div>
  `);
}

// ── 저장 처리 ────────────────────────────────────────────────
async function submitAdd() {
  const row = {
    date:     document.getElementById('add-date').value,
    category: document.getElementById('add-category').value,
    amount:   Number(document.getElementById('add-amount').value),
    memo:     document.getElementById('add-memo').value,
  };

  if (!row.date || !row.amount) {
    Utils.toast('날짜와 매출액을 입력해주세요.', 'error');
    return;
  }

  try {
    Utils.closeModal();
    // API 연결 후 아래 주석 해제:
    // await API.addCafeRow(row);
    Utils.toast('저장되었습니다.', 'success');
    await Router.go('cafe');   // 페이지 새로고침
  } catch (err) {
    Utils.toast(`저장 실패: ${err.message}`, 'error');
  }
}

function openEditModal(rowIndex) {
  Utils.toast('편집 기능은 API 연결 후 활성화됩니다.', 'default');
}

// 다른 페이지 플레이스홀더
Pages.aiCost = async function(container) {
  container.innerHTML = `
    <div class="ws-header">
      <div class="ws-header-top">
        <div>
          <div class="ws-title">AI 비용 현황</div>
          <div class="ws-subtitle">비용 관리 · 월별 도구별 집계</div>
        </div>
      </div>
      <div class="ws-subtabs">
        <div class="ws-stab active">개요</div>
      </div>
    </div>
    <div class="ws-content">
      <div class="state-empty">
        <span>AI 비용 리포트 — 다음 단계에서 구현됩니다.</span>
      </div>
    </div>
  `;
};

Pages.algocare = async function(container) {
  container.innerHTML = `
    <div class="ws-header">
      <div class="ws-header-top">
        <div>
          <div class="ws-title">알고케어 이용자 현황</div>
          <div class="ws-subtitle">복지 현황 · 월별 이용자 집계</div>
        </div>
      </div>
      <div class="ws-subtabs"><div class="ws-stab active">개요</div></div>
    </div>
    <div class="ws-content">
      <div class="state-empty"><span>알고케어 리포트 — 다음 단계에서 구현됩니다.</span></div>
    </div>
  `;
};

Pages.slack = async function(container) {
  container.innerHTML = `
    <div class="ws-header">
      <div class="ws-header-top">
        <div>
          <div class="ws-title">슬랙 / 오피스키퍼</div>
          <div class="ws-subtitle">인프라 · 분기별 사용 현황</div>
        </div>
      </div>
      <div class="ws-subtabs"><div class="ws-stab active">분기 리포트</div></div>
    </div>
    <div class="ws-content">
      <div class="state-empty"><span>슬랙/오피스키퍼 리포트 — 다음 단계에서 구현됩니다.</span></div>
    </div>
  `;
};

Pages.input = async function(container) {
  container.innerHTML = `
    <div class="ws-header">
      <div class="ws-header-top">
        <div>
          <div class="ws-title">데이터 입력</div>
          <div class="ws-subtitle">리포트별 데이터 직접 입력</div>
        </div>
      </div>
    </div>
    <div class="ws-content">
      <div class="state-empty"><span>통합 데이터 입력 화면 — 다음 단계에서 구현됩니다.</span></div>
    </div>
  `;
};

Pages.permissions = async function(container) {
  container.innerHTML = `
    <div class="ws-header">
      <div class="ws-header-top">
        <div>
          <div class="ws-title">권한 설정</div>
          <div class="ws-subtitle">사용자별 리포트 접근 권한 관리</div>
        </div>
      </div>
    </div>
    <div class="ws-content">
      <div class="state-empty"><span>권한 설정 — Google OAuth 연동 후 구현됩니다.</span></div>
    </div>
  `;
};
