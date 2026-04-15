/**
 * 카페 월 매출 페이지 — 실제 API 연동 버전
 */
const Pages = window.Pages || {};

Pages.cafe = async function(container) {
  const { year, month } = Utils.getCurrentYM();

  container.innerHTML = `
    <div class="ws-header">
      <div class="ws-header-top">
        <div>
          <div class="ws-title">카페 월 매출</div>
          <div class="ws-subtitle">운영 리포트 · ${year}년 ${month}월 기준</div>
        </div>
        <div class="ws-actions">
          <button class="btn btn-sm" id="btn-export">내보내기</button>
          <button class="btn btn-primary btn-sm" id="btn-add">+ 데이터 추가</button>
        </div>
      </div>
      <div class="ws-subtabs">
        <div class="ws-stab active" data-tab="overview">개요</div>
        <div class="ws-stab" data-tab="detail">상세 내역</div>
      </div>
    </div>
    <div class="ws-content" id="cafe-content">
      ${Utils.loadingHTML()}
    </div>
  `;

  // 데이터 로드
  let apiData;
  try {
    apiData = await API.getCafeSales(year, null);
  } catch(err) {
    document.getElementById('cafe-content').innerHTML =
      Utils.emptyHTML(`데이터 로드 실패: ${err.message}`);
    return;
  }

  // 이번 달 데이터
  const currentRow = apiData.rows.find(r => r.year === year && r.month === month)
    || apiData.rows[apiData.rows.length - 1];

  if (!currentRow) {
    document.getElementById('cafe-content').innerHTML =
      Utils.emptyHTML('데이터가 없습니다. 먼저 데이터를 추가해주세요.');
    return;
  }

  // 사이드바 KPI
  document.getElementById('sidebar-kpi').innerHTML = `
    <div class="sidebar-kpi-box">
      <div class="sidebar-kpi-label">${currentRow.year}년 ${currentRow.month}월 매출</div>
      <div class="sidebar-kpi-value">${Utils.formatMan(currentRow.매출합계)}</div>
      <div class="sidebar-kpi-sub">순매출 ${Utils.formatMan(currentRow.순매출)}</div>
    </div>
  `;

  // 탭 전환
  container.querySelectorAll('.ws-stab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.ws-stab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const el = document.getElementById('cafe-content');
      if (tab.dataset.tab === 'overview') renderOverview(el, apiData, currentRow);
      else renderDetail(el, apiData);
    });
  });

  container.querySelector('#btn-add').addEventListener('click', () => openAddModal(year, month, apiData));
  container.querySelector('#btn-export').addEventListener('click', () =>
    Utils.toast('준비 중인 기능입니다.'));

  renderOverview(document.getElementById('cafe-content'), apiData, currentRow);
};

// ── 개요 탭 ─────────────────────────────────────────────────
function renderOverview(el, apiData, row) {
  const fixed = apiData.fixedCost;
  const maxSales = Math.max(...apiData.trend.map(t => t.매출합계 || 0), 1);

  el.innerHTML = `
    <!-- KPI 카드 -->
    <div class="kpi-grid">
      <div class="kpi-card featured">
        <div class="kpi-label">월 매출합계</div>
        <div class="kpi-value">${Utils.formatMan(row.매출합계)}</div>
        <span class="badge badge-gray">${row.year}년 ${row.month}월</span>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">변동 지출</div>
        <div class="kpi-value">${Utils.formatMan(row.변동지출)}</div>
        <span class="badge badge-gray">재료비 + 앱비</span>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">고정 지출</div>
        <div class="kpi-value">${Utils.formatMan(row.고정지출)}</div>
        <span class="badge badge-gray">60개월 안분</span>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">순매출</div>
        <div class="kpi-value" style="color:${row.순매출 >= 0 ? 'var(--green)' : 'var(--red)'}">
          ${Utils.formatMan(row.순매출)}
        </div>
        <span class="badge ${row.순매출 >= 0 ? 'badge-up' : 'badge-down'}">
          ${row.순매출 >= 0 ? '흑자' : '적자'}
        </span>
      </div>
    </div>

    <!-- 월별 추이 + 지출 상세 -->
    <div style="display:grid;grid-template-columns:1fr 280px;gap:12px;margin-bottom:18px;">

      <!-- 월별 매출 추이 -->
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">월별 매출 추이</div>
          <div class="panel-meta">${apiData.trend.length}개월</div>
        </div>
        <div class="panel-body">
          <div style="display:flex;align-items:flex-end;gap:8px;height:90px;">
            ${apiData.trend.map((t, i) => {
              const h = Math.max(Math.round((t.매출합계 / maxSales) * 82), 4);
              const isCur = t.month === row.month && t.year === row.year;
              const isRecent = i >= apiData.trend.length - 3;
              const bg = isCur ? 'var(--yellow)' : isRecent ? '#FDE68A' : '#E5E7EB';
              return `
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;" title="${Utils.formatMan(t.매출합계)}">
                  <div style="width:100%;height:${h}px;background:${bg};border-radius:3px 3px 0 0;cursor:pointer;"></div>
                  <span style="font-size:9.5px;color:${isCur ? 'var(--brown)' : 'var(--text-3)'};font-weight:${isCur ? 700 : 400};">${t.label}</span>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- 지출 상세 -->
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">지출 상세</div>
          <div class="panel-meta">${row.month}월 기준</div>
        </div>
        <div>
          ${[
            { label: '재료 및 소모품비', val: row.재료비, color: '#E5E7EB' },
            { label: '엘리가오더 앱비', val: row.엘리가오더, color: '#E5E7EB' },
            { label: '인테리어(안분)', val: fixed.인테리어공사비, color: '#FDE68A' },
            { label: '카페장비(안분)', val: fixed.카페장비구매비, color: '#FDE68A' },
            { label: '솔루션(안분)', val: fixed.솔루션장비비, color: '#FDE68A' },
            { label: '가구비(안분)', val: fixed.가구비, color: '#FDE68A' },
            { label: '직책지원비', val: row.직책지원비, color: '#fca5a5' },
          ].filter(item => item.val > 0).map(item => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 18px;border-bottom:1px solid var(--border-light);">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:8px;height:8px;border-radius:50%;background:${item.color};flex-shrink:0;"></div>
                <span style="font-size:11.5px;color:var(--text-2);">${item.label}</span>
              </div>
              <span style="font-size:12px;font-weight:700;color:var(--text-1);">${Utils.formatKRW(item.val)}</span>
            </div>`).join('')}
          <div style="display:flex;justify-content:space-between;padding:10px 18px;background:var(--bg-page);">
            <span style="font-size:12px;font-weight:700;color:var(--text-1);">지출 합계</span>
            <span style="font-size:13px;font-weight:700;color:var(--red);">${Utils.formatKRW(row.지출합계)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 메모 -->
    ${row.메모 ? `
    <div class="panel" style="margin-bottom:18px;">
      <div class="panel-body" style="padding:12px 18px;">
        <span style="font-size:11px;color:var(--text-3);margin-right:8px;">메모</span>
        <span style="font-size:13px;color:var(--text-2);">${row.메모}</span>
      </div>
    </div>` : ''}
  `;
}

// ── 상세 내역 탭 ─────────────────────────────────────────────
function renderDetail(el, apiData) {
  el.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">월별 상세 내역</div>
        <div class="panel-meta">전체 ${apiData.rows.length}개월</div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>연월</th>
            <th>매출합계</th>
            <th>재료비</th>
            <th>직책지원비</th>
            <th>변동지출</th>
            <th>고정지출</th>
            <th>특이지출</th>
            <th>지출합계</th>
            <th>순매출</th>
            <th>메모</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${[...apiData.rows].reverse().map(r => `
            <tr>
              <td class="td-primary">${r.year}년 ${r.month}월</td>
              <td class="td-number">${Utils.formatKRW(r.매출합계)}</td>
              <td>${Utils.formatKRW(r.재료비)}</td>
              <td>${Utils.formatKRW(r.직책지원비)}</td>
              <td>${Utils.formatKRW(r.변동지출)}</td>
              <td>${Utils.formatKRW(r.고정지출)}</td>
              <td>${Utils.formatKRW(r.특이지출)}</td>
              <td class="td-number">${Utils.formatKRW(r.지출합계)}</td>
              <td class="td-number" style="color:${r.순매출 >= 0 ? 'var(--green)' : 'var(--red)'}">
                ${Utils.formatKRW(r.순매출)}
              </td>
              <td class="td-muted">${r.메모 || '—'}</td>
              <td>
                <button class="btn btn-sm row-action" onclick="openEditModal(${r.rowIndex}, ${JSON.stringify(r).replace(/"/g, '&quot;')})">편집</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── 데이터 추가 모달 ─────────────────────────────────────────
function openAddModal(year, month, apiData) {
  Utils.openModal(`
    <div class="modal">
      <div class="modal-head">
        <span class="modal-title">월 매출 데이터 추가</span>
        <button class="modal-close" onclick="Utils.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label class="form-label">연도</label>
            <input type="number" class="form-input" id="add-year" value="${year}">
          </div>
          <div class="form-group">
            <label class="form-label">월</label>
            <input type="number" class="form-input" id="add-month" value="${month}" min="1" max="12">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">매출합계 (원)</label>
          <input type="number" class="form-input" id="add-sales" placeholder="예: 2162200">
        </div>
        <div class="form-group">
          <label class="form-label">재료 및 소모품비 (원)</label>
          <input type="number" class="form-input" id="add-material" placeholder="예: 1183130">
        </div>
        <div class="form-group">
          <label class="form-label">직책지원비 (원)</label>
          <input type="number" class="form-input" id="add-jikchaek" value="0">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-group">
            <label class="form-label">입사자지원비</label>
            <input type="number" class="form-input" id="add-entry" value="0">
          </div>
          <div class="form-group">
            <label class="form-label">현장실습생</label>
            <input type="number" class="form-input" id="add-intern" value="0">
          </div>
          <div class="form-group">
            <label class="form-label">이벤트비</label>
            <input type="number" class="form-input" id="add-event" value="0">
          </div>
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

async function submitAdd() {
  const row = {
    year:        Number(document.getElementById('add-year').value),
    month:       Number(document.getElementById('add-month').value),
    매출합계:    Number(document.getElementById('add-sales').value),
    재료비:      Number(document.getElementById('add-material').value),
    엘리가오더:  73500,
    직책지원비:  Number(document.getElementById('add-jikchaek').value),
    입사자지원비:Number(document.getElementById('add-entry').value),
    현장실습생:  Number(document.getElementById('add-intern').value),
    이벤트비:    Number(document.getElementById('add-event').value),
    메모:        document.getElementById('add-memo').value,
  };
  if (!row.매출합계) { Utils.toast('매출합계를 입력해주세요.', 'error'); return; }
  try {
    Utils.closeModal();
    await API.addCafeRow(row);
    Utils.toast('저장되었습니다.', 'success');
    await Router.go('cafe');
  } catch(err) {
    Utils.toast(`저장 실패: ${err.message}`, 'error');
  }
}

function openEditModal(rowIndex, rowData) {
  Utils.openModal(`
    <div class="modal">
      <div class="modal-head">
        <span class="modal-title">${rowData.year}년 ${rowData.month}월 수정</span>
        <button class="modal-close" onclick="Utils.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">매출합계 (원)</label>
          <input type="number" class="form-input" id="edit-sales" value="${rowData.매출합계}">
        </div>
        <div class="form-group">
          <label class="form-label">재료 및 소모품비 (원)</label>
          <input type="number" class="form-input" id="edit-material" value="${rowData.재료비}">
        </div>
        <div class="form-group">
          <label class="form-label">직책지원비 (원)</label>
          <input type="number" class="form-input" id="edit-jikchaek" value="${rowData.직책지원비}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-group">
            <label class="form-label">입사자지원비</label>
            <input type="number" class="form-input" id="edit-entry" value="${rowData.입사자지원비}">
          </div>
          <div class="form-group">
            <label class="form-label">현장실습생</label>
            <input type="number" class="form-input" id="edit-intern" value="${rowData.현장실습생}">
          </div>
          <div class="form-group">
            <label class="form-label">이벤트비</label>
            <input type="number" class="form-input" id="edit-event" value="${rowData.이벤트비}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">메모</label>
          <input type="text" class="form-input" id="edit-memo" value="${rowData.메모}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="Utils.closeModal()">취소</button>
        <button class="btn btn-primary" onclick="submitEdit(${rowIndex}, ${rowData.year}, ${rowData.month})">수정</button>
      </div>
    </div>
  `);
}

async function submitEdit(rowIndex, year, month) {
  const row = {
    year, month,
    매출합계:    Number(document.getElementById('edit-sales').value),
    재료비:      Number(document.getElementById('edit-material').value),
    엘리가오더:  73500,
    직책지원비:  Number(document.getElementById('edit-jikchaek').value),
    입사자지원비:Number(document.getElementById('edit-entry').value),
    현장실습생:  Number(document.getElementById('edit-intern').value),
    이벤트비:    Number(document.getElementById('edit-event').value),
    메모:        document.getElementById('edit-memo').value,
  };
  try {
    Utils.closeModal();
    await API.updateCafeRow(rowIndex, row);
    Utils.toast('수정되었습니다.', 'success');
    await Router.go('cafe');
  } catch(err) {
    Utils.toast(`수정 실패: ${err.message}`, 'error');
  }
}

// 다른 페이지 플레이스홀더
Pages.aiCost = async function(container) {
  container.innerHTML = `
    <div class="ws-header"><div class="ws-header-top"><div>
      <div class="ws-title">AI 비용 현황</div>
      <div class="ws-subtitle">비용 관리 · 월별 도구별 집계</div>
    </div></div></div>
    <div class="ws-content"><div class="state-empty"><span>AI 비용 리포트 — 다음 단계에서 구현됩니다.</span></div></div>`;
};
Pages.algocare = async function(container) {
  container.innerHTML = `
    <div class="ws-header"><div class="ws-header-top"><div>
      <div class="ws-title">알고케어 이용자 현황</div>
      <div class="ws-subtitle">복지 현황 · 월별 이용자 집계</div>
    </div></div></div>
    <div class="ws-content"><div class="state-empty"><span>알고케어 리포트 — 다음 단계에서 구현됩니다.</span></div></div>`;
};
Pages.slack = async function(container) {
  container.innerHTML = `
    <div class="ws-header"><div class="ws-header-top"><div>
      <div class="ws-title">슬랙 / 오피스키퍼</div>
      <div class="ws-subtitle">인프라 · 분기별 사용 현황</div>
    </div></div></div>
    <div class="ws-content"><div class="state-empty"><span>슬랙/오피스키퍼 리포트 — 다음 단계에서 구현됩니다.</span></div></div>`;
};
Pages.input = async function(container) {
  container.innerHTML = `
    <div class="ws-header"><div class="ws-header-top"><div>
      <div class="ws-title">데이터 입력</div>
    </div></div></div>
    <div class="ws-content"><div class="state-empty"><span>통합 데이터 입력 화면 — 다음 단계에서 구현됩니다.</span></div></div>`;
};
Pages.permissions = async function(container) {
  container.innerHTML = `
    <div class="ws-header"><div class="ws-header-top"><div>
      <div class="ws-title">권한 설정</div>
    </div></div></div>
    <div class="ws-content"><div class="state-empty"><span>권한 설정 — Google OAuth 연동 후 구현됩니다.</span></div></div>`;
};
