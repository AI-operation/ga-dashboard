/**
 * 카페 월 매출 페이지 — 최종 버전
 * 탭: 메인 / 월별현황 / 원가분석
 */
const Pages = window.Pages || {};

Pages.cafe = async function(container) {
  const { year, month } = Utils.getCurrentYM();

  container.innerHTML = `
    <div class="ws-header">
      <div class="ws-header-top">
        <div>
          <div class="ws-title">카페 월 매출</div>
          <div class="ws-subtitle">운영 리포트 · ${year}년 기준</div>
        </div>
        <div class="ws-actions">
          <button class="btn btn-sm" id="btn-export">내보내기</button>
          <button class="btn btn-primary btn-sm" id="btn-add">+ 데이터 추가</button>
        </div>
      </div>
    </div>
    <div class="ws-content" id="cafe-content">${Utils.loadingHTML()}</div>
  `;

  let apiData, costData;
  try {
    apiData = await API.getCafeSales(year, null);
  } catch(err) {
    document.getElementById('cafe-content').innerHTML = Utils.emptyHTML(`데이터 로드 실패: ${err.message}`);
    return;
  }

  if (!apiData.rows || apiData.rows.length === 0) {
    document.getElementById('cafe-content').innerHTML = Utils.emptyHTML('데이터가 없습니다. 먼저 데이터를 추가해주세요.');
    return;
  }

  // 원가 데이터 로드 (실패해도 계속)
  try { costData = await API.getCostData(); } catch(e) { costData = null; }

  let currentRow = apiData.rows.find(r => r.month === month) || apiData.rows[apiData.rows.length - 1];
  const fixed = apiData.fixedCost;

  document.getElementById('sidebar-kpi').innerHTML = `
    <div class="sidebar-kpi-box">
      <div class="sidebar-kpi-label">${currentRow.year}년 ${currentRow.month}월 매출</div>
      <div class="sidebar-kpi-value">${Utils.formatMan(currentRow.매출합계)}</div>
      <div class="sidebar-kpi-sub" style="color:${currentRow.순매출 >= 0 ? 'var(--green)' : 'var(--red)'}">
        순매출 ${Utils.formatMan(currentRow.순매출)}
      </div>
    </div>
  `;

  container.querySelector('#btn-add').addEventListener('click', () => openAddModal(year, month));
  container.querySelector('#btn-export').addEventListener('click', () => Utils.toast('준비 중인 기능입니다.'));

  renderMain(document.getElementById('cafe-content'), apiData, currentRow, fixed, costData);
};

// ══════════════════════════════════════════════════════════
// 공통 탭 바
// ══════════════════════════════════════════════════════════
function renderTabBar(el, activeTab, apiData, currentRow, fixed, costData) {
  const tabs = [
    { key: 'main',    label: '메인' },
    { key: 'monthly', label: '월별 현황' },
    { key: 'cost',    label: '원가 분석' },
  ];
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:0;border-bottom:1.5px solid var(--border-light);margin-bottom:18px;';
  tabs.forEach(t => {
    const tab = document.createElement('div');
    tab.textContent = t.label;
    tab.style.cssText = `padding:8px 20px;font-size:13px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1.5px;color:var(--text-3);transition:color 0.1s;`;
    if (t.key === activeTab) {
      tab.style.color = 'var(--brown)';
      tab.style.fontWeight = '700';
      tab.style.borderBottomColor = 'var(--yellow)';
    }
    tab.addEventListener('click', () => {
      if (t.key === 'main')    renderMain(el, apiData, currentRow, fixed, costData);
      if (t.key === 'monthly') renderMonthly(el, apiData, currentRow, fixed, costData);
      if (t.key === 'cost')    renderCost(el, apiData, costData);
    });
    bar.appendChild(tab);
  });
  return bar;
}

// ══════════════════════════════════════════════════════════
// 메인 탭
// ══════════════════════════════════════════════════════════
function renderMain(el, apiData, row, fixed, costData) {
  const maxSales = Math.max(...apiData.trend.map(t => t.매출합계 || 0), 1);
  const totalExp = row.지출합계;

  el.innerHTML = '';
  el.appendChild(renderTabBar(el, 'main', apiData, row, fixed, costData));

  const content = document.createElement('div');
  content.innerHTML = `
    <style>
      .month-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
      .month-tabs{display:flex;border:0.5px solid var(--border);border-radius:8px;overflow:hidden;}
      .m-tab{padding:6px 14px;font-size:12px;color:var(--text-2);cursor:pointer;border-right:0.5px solid var(--border-light);background:var(--bg-surface);transition:background 0.1s;}
      .m-tab:last-child{border-right:none;}
      .m-tab.active{background:var(--yellow-pale);color:var(--brown);font-weight:700;}
      .m-tab:hover:not(.active){background:var(--bg-hover);}
      .sum-row{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 1.2fr;gap:10px;margin-bottom:16px;}
      .sum-card{background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:13px 14px;}
      .sum-card.featured{background:var(--yellow-pale);border-color:var(--yellow-border);}
      .sum-card.loss{background:#FEF2F2;border-color:#FECACA;}
      .sum-label{font-size:10px;color:var(--text-3);margin-bottom:5px;}
      .sum-card.featured .sum-label{color:var(--brown-mid);}
      .sum-card.loss .sum-label{color:#991B1B;}
      .sum-value{font-size:16px;font-weight:700;color:var(--text-1);line-height:1;letter-spacing:-0.02em;}
      .sum-card.featured .sum-value{color:var(--brown);}
      .sum-card.loss .sum-value{color:#DC2626;}
      .sum-sub{font-size:10px;color:var(--text-3);margin-top:4px;}
      .sum-card.featured .sum-sub{color:var(--brown-mid);}
      .main-grid{display:grid;grid-template-columns:1fr 300px;gap:12px;}
      .c-card{background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;}
      .c-head{padding:11px 16px 9px;border-bottom:1px solid var(--border-light);display:flex;align-items:center;justify-content:space-between;}
      .c-title{font-size:12.5px;font-weight:700;color:var(--text-1);}
      .c-meta{font-size:11px;color:var(--text-3);}
      .sales-row{display:flex;align-items:center;justify-content:space-between;padding:11px 16px;background:var(--yellow-pale);border-bottom:1px solid var(--yellow-border);}
      .sales-name{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:var(--brown);}
      .sales-dot{width:7px;height:7px;border-radius:50%;background:var(--yellow);flex-shrink:0;}
      .sales-val{font-size:14px;font-weight:700;color:var(--brown);}
      .acc-hd{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border-light);transition:background 0.1s;}
      .acc-hd:hover{background:var(--bg-hover);}
      .acc-left{display:flex;align-items:center;gap:8px;}
      .acc-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
      .acc-name{font-size:12px;font-weight:500;color:var(--text-1);}
      .acc-right{display:flex;align-items:center;gap:10px;}
      .acc-amt{font-size:12.5px;font-weight:700;color:var(--text-1);}
      .acc-arrow{font-size:9px;color:var(--text-3);transition:transform 0.2s;display:inline-block;}
      .acc-arrow.open{transform:rotate(180deg);}
      .acc-body{display:none;background:var(--bg-page);}
      .acc-body.open{display:block;}
      .detail-row{display:flex;justify-content:space-between;padding:7px 16px 7px 32px;border-top:1px solid var(--border-light);}
      .detail-row:hover{background:var(--bg-hover);}
      .detail-name{font-size:11.5px;color:var(--text-2);}
      .detail-amt{font-size:11.5px;font-weight:500;color:var(--text-1);}
      .subtotal-row{display:flex;justify-content:space-between;padding:8px 16px;background:var(--bg-hover);border-top:1px solid var(--border);}
      .subtotal-name,.subtotal-amt{font-size:12px;font-weight:500;color:var(--text-1);}
      .total-row{display:flex;justify-content:space-between;padding:10px 16px;background:var(--bg-hover);border-top:1px solid var(--border);}
      .total-name,.total-amt{font-size:13px;font-weight:700;color:var(--text-1);}
      .net-row{display:flex;justify-content:space-between;padding:10px 16px;border-top:1px solid #FECACA;}
      .net-row.loss{background:#FEF2F2;}
      .net-row.profit{background:#ECFDF5;border-top-color:#A7F3D0;}
      .net-name,.net-amt{font-size:14px;font-weight:700;}
      .net-row.loss .net-name,.net-row.loss .net-amt{color:#DC2626;}
      .net-row.profit .net-name,.net-row.profit .net-amt{color:#059669;}
      .rp-panel{display:flex;flex-direction:column;gap:12px;}
      .t-row{display:flex;align-items:center;gap:8px;margin-bottom:9px;}
      .t-row:last-child{margin-bottom:0;}
      .t-month{font-size:11px;color:var(--text-3);width:22px;flex-shrink:0;text-align:right;}
      .t-track{flex:1;height:20px;background:var(--border-light);border-radius:4px;overflow:hidden;}
      .t-fill{height:100%;border-radius:4px;display:flex;align-items:center;padding:0 7px;}
      .t-val{font-size:10px;font-weight:500;color:var(--text-1);white-space:nowrap;}
      .r-row{margin-bottom:9px;}
      .r-row:last-child{margin-bottom:0;}
      .r-top{display:flex;justify-content:space-between;margin-bottom:4px;}
      .r-label{font-size:11.5px;color:var(--text-2);display:flex;align-items:center;gap:5px;}
      .r-sdot{width:7px;height:7px;border-radius:50%;display:inline-block;flex-shrink:0;}
      .r-val{font-size:11.5px;font-weight:500;color:var(--text-1);}
      .r-track{height:5px;background:var(--border-light);border-radius:3px;overflow:hidden;}
      .r-fill{height:100%;border-radius:3px;}
      .memo-strip{background:var(--bg-hover);border:1px solid var(--border);border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:8px;}
      .memo-lbl{font-size:10px;color:var(--text-3);flex-shrink:0;}
      .memo-txt{font-size:12px;color:var(--text-2);}
    </style>

    <!-- 월 탭 -->
    <div class="month-bar">
      <div class="month-tabs" id="month-tabs">
        ${apiData.rows.map(r => `
          <div class="m-tab${r.month === row.month && r.year === row.year ? ' active' : ''}"
               data-year="${r.year}" data-month="${r.month}">
            ${r.month}월
          </div>`).join('')}
      </div>
    </div>

    <!-- KPI -->
    <div class="sum-row">
      <div class="sum-card featured">
        <div class="sum-label">월 매출합계</div>
        <div class="sum-value">${Utils.formatKRW(row.매출합계)}</div>
        <div class="sum-sub">${row.year}년 ${row.month}월</div>
      </div>
      <div class="sum-card">
        <div class="sum-label">변동 지출</div>
        <div class="sum-value">${Utils.formatKRW(row.변동지출)}</div>
        <div class="sum-sub">재료비 + 앱비</div>
      </div>
      <div class="sum-card">
        <div class="sum-label">고정 지출</div>
        <div class="sum-value">${Utils.formatKRW(row.고정지출)}</div>
        <div class="sum-sub">60개월 안분</div>
      </div>
      <div class="sum-card">
        <div class="sum-label">특이 지출</div>
        <div class="sum-value">${Utils.formatKRW(row.특이지출)}</div>
        <div class="sum-sub">직책지원비 등</div>
      </div>
      <div class="sum-card ${row.순매출 >= 0 ? '' : 'loss'}">
        <div class="sum-label">회사 부담금</div>
        <div class="sum-value">${Utils.formatKRW(row.순매출)}</div>
        <div class="sum-sub">복지 운영 비용</div>
      </div>
    </div>

    <!-- 메인 그리드 -->
    <div class="main-grid" data-grid-id="main-grid" data-page="cafe-monthly">

      <!-- 아코디언 -->
      <div class="c-card">
        <div class="c-head">
          <span class="c-title">수입 / 지출 구조</span>
          <span class="c-meta">항목 클릭 시 상세 펼치기</span>
        </div>
        <div class="sales-row">
          <div class="sales-name"><div class="sales-dot"></div>매출 합계</div>
          <span class="sales-val">${Utils.formatKRW(row.매출합계)}</span>
        </div>
        <div class="acc-hd" onclick="cafeToggle('변동')">
          <div class="acc-left"><div class="acc-dot" style="background:#93C5FD;"></div><span class="acc-name">변동 지출</span></div>
          <div class="acc-right"><span class="acc-amt">${Utils.formatKRW(row.변동지출)}</span><span class="acc-arrow" id="acc-arrow-변동">▼</span></div>
        </div>
        <div class="acc-body" id="acc-body-변동">
          <div class="detail-row"><span class="detail-name">재료 및 소모품비</span><span class="detail-amt">${Utils.formatKRW(row.재료비)}</span></div>
          <div class="detail-row"><span class="detail-name">엘리가오더 앱비</span><span class="detail-amt">${Utils.formatKRW(row.엘리가오더)}</span></div>
          <div class="subtotal-row"><span class="subtotal-name">소계</span><span class="subtotal-amt">${Utils.formatKRW(row.변동지출)}</span></div>
        </div>
        <div class="acc-hd" onclick="cafeToggle('고정')">
          <div class="acc-left"><div class="acc-dot" style="background:#D1D5DB;"></div><span class="acc-name">고정 지출 (60개월 안분)</span></div>
          <div class="acc-right"><span class="acc-amt">${Utils.formatKRW(row.고정지출)}</span><span class="acc-arrow" id="acc-arrow-고정">▼</span></div>
        </div>
        <div class="acc-body" id="acc-body-고정">
          <div class="detail-row"><span class="detail-name">인테리어 공사비</span><span class="detail-amt">${Utils.formatKRW(fixed.인테리어공사비)}</span></div>
          <div class="detail-row"><span class="detail-name">카페 장비 구매비</span><span class="detail-amt">${Utils.formatKRW(fixed.카페장비구매비)}</span></div>
          <div class="detail-row"><span class="detail-name">솔루션 장비비</span><span class="detail-amt">${Utils.formatKRW(fixed.솔루션장비비)}</span></div>
          <div class="detail-row"><span class="detail-name">가구비</span><span class="detail-amt">${Utils.formatKRW(fixed.가구비)}</span></div>
          <div class="subtotal-row"><span class="subtotal-name">소계</span><span class="subtotal-amt">${Utils.formatKRW(row.고정지출)}</span></div>
        </div>
        <div class="acc-hd" onclick="cafeToggle('특이')">
          <div class="acc-left"><div class="acc-dot" style="background:#FCA5A5;"></div><span class="acc-name">특이 지출</span></div>
          <div class="acc-right"><span class="acc-amt">${Utils.formatKRW(row.특이지출)}</span><span class="acc-arrow" id="acc-arrow-특이">▼</span></div>
        </div>
        <div class="acc-body" id="acc-body-특이">
          <div class="detail-row"><span class="detail-name">직책지원비</span><span class="detail-amt">${Utils.formatKRW(row.직책지원비)}</span></div>
          <div class="detail-row"><span class="detail-name">입사자지원비</span><span class="detail-amt">${Utils.formatKRW(row.입사자지원비)}</span></div>
          <div class="detail-row"><span class="detail-name">현장실습생</span><span class="detail-amt">${Utils.formatKRW(row.현장실습생)}</span></div>
          <div class="detail-row"><span class="detail-name">이벤트비</span><span class="detail-amt">${Utils.formatKRW(row.이벤트비)}</span></div>
          <div class="subtotal-row"><span class="subtotal-name">소계</span><span class="subtotal-amt">${Utils.formatKRW(row.특이지출)}</span></div>
        </div>
        <div class="total-row"><span class="total-name">지출 합계</span><span class="total-amt">${Utils.formatKRW(row.지출합계)}</span></div>
        <div class="net-row ${row.순매출 >= 0 ? 'profit' : 'loss'}">
          <span class="net-name">회사 부담금 (복지비용)</span>
          <span class="net-amt">${Utils.formatKRW(row.순매출)}</span>
        </div>
      </div>

      <!-- 우측 패널 -->
      <div class="rp-panel">
        <!-- 월별 추이 -->
        <div class="c-card">
          <div class="c-head">
            <span class="c-title">월별 매출 추이</span>
            <span class="c-meta">${apiData.trend.length}개월</span>
          </div>
          <div style="padding:12px 14px;">
            ${apiData.trend.map((t, i) => {
              const w = Math.max(Math.round((t.매출합계/maxSales)*100), 5);
              const isCur = t.month === row.month && t.year === row.year;
              const bg = isCur ? '#F5C800' : (i === apiData.trend.length-2 ? '#FDE68A' : '#E5E7EB');
              return `<div class="t-row">
                <span class="t-month">${t.month}월</span>
                <div class="t-track"><div class="t-fill" style="width:${w}%;background:${bg};">
                  <span class="t-val">${Math.round(t.매출합계/10000).toLocaleString()}만원</span>
                </div></div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- 지출 비중 -->
        <div class="c-card">
          <div class="c-head">
            <span class="c-title">지출 비중</span>
            <span class="c-meta">${Utils.formatMan(row.지출합계)} 기준</span>
          </div>
          <div style="padding:12px 14px;">
            ${totalExp > 0 ? `
            <div class="r-row">
              <div class="r-top">
                <span class="r-label"><span class="r-sdot" style="background:#93C5FD;"></span>변동 지출</span>
                <span class="r-val">${Math.round(row.변동지출/totalExp*100)}% · ${Utils.formatMan(row.변동지출)}</span>
              </div>
              <div class="r-track"><div class="r-fill" style="width:${Math.round(row.변동지출/totalExp*100)}%;background:#93C5FD;"></div></div>
            </div>
            <div class="r-row">
              <div class="r-top">
                <span class="r-label"><span class="r-sdot" style="background:#D1D5DB;"></span>고정 지출</span>
                <span class="r-val">${Math.round(row.고정지출/totalExp*100)}% · ${Utils.formatMan(row.고정지출)}</span>
              </div>
              <div class="r-track"><div class="r-fill" style="width:${Math.round(row.고정지출/totalExp*100)}%;background:#D1D5DB;"></div></div>
            </div>
            <div class="r-row">
              <div class="r-top">
                <span class="r-label"><span class="r-sdot" style="background:#FCA5A5;"></span>특이 지출</span>
                <span class="r-val">${Math.round(row.특이지출/totalExp*100)}% · ${Utils.formatMan(row.특이지출)}</span>
              </div>
              <div class="r-track"><div class="r-fill" style="width:${Math.round(row.특이지출/totalExp*100)}%;background:#FCA5A5;"></div></div>
            </div>` : '<div style="font-size:12px;color:var(--text-3);text-align:center;padding:8px;">데이터 없음</div>'}
          </div>
        </div>

        <!-- 메모 + 수정 -->
        <div class="c-card">
          <div style="padding:12px 14px;">
            ${row.메모 ? `<div class="memo-strip" style="margin-bottom:9px;"><span class="memo-lbl">메모</span><span class="memo-txt">${row.메모}</span></div>` : ''}
            <button class="btn btn-sm" style="width:100%;" onclick="openEditModal(${row.rowIndex},'${encodeURIComponent(JSON.stringify(row))}')">이 달 데이터 수정</button>
          </div>
        </div>
      </div>
    </div>
  `;

  el.appendChild(content);

  // 월 탭 클릭
  el.querySelectorAll('.m-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetRow = apiData.rows.find(r => r.month === Number(tab.dataset.month) && r.year === Number(tab.dataset.year));
      if (targetRow) renderMain(el, apiData, targetRow, fixed, costData);
    });
  });
}

// ══════════════════════════════════════════════════════════
// 월별 현황 탭
// ══════════════════════════════════════════════════════════
function renderMonthly(el, apiData, row, fixed, costData) {
  el.innerHTML = '';
  el.appendChild(renderTabBar(el, 'monthly', apiData, row, fixed, costData));

  const allRows = apiData.rows;
  const totalSales = allRows.reduce((s,r) => s+r.매출합계, 0);
  const totalBurden = allRows.reduce((s,r) => s+r.순매출, 0);

  const wrap = document.createElement('div');

  // 인사이트 배너
  const lastRow = allRows[allRows.length-1];
  const prevRow = allRows.length > 1 ? allRows[allRows.length-2] : null;
  const prevDiff = prevRow && prevRow.매출합계 ? Math.round((lastRow.매출합계-prevRow.매출합계)/prevRow.매출합계*100) : 0;

  wrap.innerHTML = `
    <style>
      .insight-banner{background:var(--yellow-pale);border:1px solid var(--yellow-border);border-radius:10px;padding:12px 16px;display:flex;align-items:flex-start;gap:10px;margin-bottom:16px;}
      .insight-dot{width:8px;height:8px;border-radius:50%;background:var(--yellow);flex-shrink:0;margin-top:4px;}
      .insight-main{font-size:12.5px;font-weight:500;color:var(--brown);}
      .insight-sub{font-size:11px;color:var(--brown-mid);margin-top:3px;}
      .annual-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px;}
      .an-card{background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px;}
      .an-label{font-size:10px;color:var(--text-3);margin-bottom:4px;}
      .an-value{font-size:16px;font-weight:700;color:var(--text-1);line-height:1;}
      .an-value.loss{color:#DC2626;}
      .an-sub{font-size:10px;color:var(--text-3);margin-top:3px;}
      .monthly-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
      .c-card{background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;}
      .c-head{padding:11px 16px 9px;border-bottom:1px solid var(--border-light);display:flex;align-items:center;justify-content:space-between;}
      .c-title{font-size:12.5px;font-weight:700;color:var(--text-1);}
      .c-meta{font-size:11px;color:var(--text-3);}
      .stat3{display:grid;grid-template-columns:1fr 1fr 1fr;border-top:1px solid var(--border-light);}
      .stat-item{padding:10px 12px;text-align:center;border-right:1px solid var(--border-light);}
      .stat-item:last-child{border-right:none;}
      .stat-label{font-size:10px;color:var(--text-3);margin-bottom:3px;}
      .stat-value{font-size:13px;font-weight:700;color:var(--text-1);}
      .stat-value.up{color:#059669;}
      .stat-value.dn{color:#DC2626;}
      .monthly-table{width:100%;border-collapse:collapse;}
      .monthly-table th{padding:8px 14px;font-size:10.5px;color:var(--text-3);background:var(--bg-page);border-bottom:1px solid var(--border-light);text-align:left;font-weight:400;}
      .monthly-table th:not(:first-child){text-align:right;}
      .monthly-table td{padding:9px 14px;font-size:12px;color:var(--text-2);border-bottom:1px solid var(--border-light);}
      .monthly-table td:not(:first-child){text-align:right;}
      .monthly-table tr:last-child td{border-bottom:none;}
      .monthly-table tr:hover td{background:var(--bg-hover);}
      .td-loss{color:#DC2626;font-weight:700;}
    </style>

    <!-- 인사이트 배너 -->
    <div class="insight-banner">
      <div class="insight-dot"></div>
      <div>
        <div class="insight-main">
          ${lastRow.month}월 매출이 전월 대비 ${prevDiff >= 0 ? '+' : ''}${prevDiff}% ${prevDiff >= 0 ? '증가' : '감소'}했습니다.
          올해 누적 회사 부담금은 ${Utils.formatKRW(Math.abs(totalBurden))}입니다.
        </div>
        <div class="insight-sub">사내카페는 복지 목적으로 운영되며, 회사 부담금은 복지 운영 비용으로 처리됩니다.</div>
      </div>
    </div>

    <!-- 연간 누적 -->
    <div class="annual-grid">
      <div class="an-card">
        <div class="an-label">누적 매출 (${allRows[0].month}~${lastRow.month}월)</div>
        <div class="an-value">${Utils.formatKRW(totalSales)}</div>
        <div class="an-sub">월평균 ${Utils.formatKRW(Math.round(totalSales/allRows.length))}</div>
      </div>
      <div class="an-card">
        <div class="an-label">누적 지출</div>
        <div class="an-value">${Utils.formatKRW(allRows.reduce((s,r)=>s+r.지출합계,0))}</div>
        <div class="an-sub">월평균 ${Utils.formatKRW(Math.round(allRows.reduce((s,r)=>s+r.지출합계,0)/allRows.length))}</div>
      </div>
      <div class="an-card">
        <div class="an-label">누적 회사 부담금</div>
        <div class="an-value loss">${Utils.formatKRW(totalBurden)}</div>
        <div class="an-sub">복지 운영 누적 비용</div>
      </div>
      <div class="an-card">
        <div class="an-label">누적 직책지원비</div>
        <div class="an-value">${Utils.formatKRW(allRows.reduce((s,r)=>s+r.직책지원비,0))}</div>
        <div class="an-sub">${allRows.length}개월 합산</div>
      </div>
    </div>

    <!-- 월별 그래프 + 통계 -->
    <div class="monthly-grid" data-grid-id="monthly-grid" data-page="cafe-main">
      <div class="c-card">
        <div class="c-head">
          <span class="c-title">월별 손익 추이</span>
          <span class="c-meta">매출 vs 지출합계</span>
        </div>
        <div style="padding:14px 16px 8px;">
          <canvas id="monthlyChart" height="140"></canvas>
          <div style="display:flex;gap:14px;margin-top:8px;">
            <div style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--text-2);">
              <div style="width:14px;height:2px;background:#F5C800;border-radius:1px;"></div>매출
            </div>
            <div style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--text-2);">
              <div style="width:14px;height:2px;background:#FCA5A5;border-radius:1px;"></div>지출합계
            </div>
            <div style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--text-2);">
              <div style="width:14px;height:2px;background:#93C5FD;border-radius:1px;"></div>회사부담금
            </div>
          </div>
        </div>
        <div class="stat3">
          <div class="stat-item">
            <div class="stat-label">영업일수 (3월)</div>
            <div class="stat-value">${lastRow.영업일수 || 19}일</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">일평균 매출</div>
            <div class="stat-value">${Utils.formatMan(Math.round(lastRow.매출합계/(lastRow.영업일수||19)))}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">전월 대비</div>
            <div class="stat-value ${prevDiff >= 0 ? 'up' : 'dn'}">${prevDiff >= 0 ? '+' : ''}${prevDiff}%</div>
          </div>
        </div>
      </div>

      <!-- 직책지원비 추이 -->
      <div class="c-card">
        <div class="c-head">
          <span class="c-title">직책지원비 추이</span>
          <span class="c-meta">월별 변화</span>
        </div>
        <div style="padding:14px 16px 8px;">
          <canvas id="jikchaekChart" height="140"></canvas>
        </div>
        <div class="stat3">
          ${allRows.slice(-3).map(r => `
            <div class="stat-item">
              <div class="stat-label">${r.month}월</div>
              <div class="stat-value">${Utils.formatMan(r.직책지원비)}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- 월별 상세 테이블 -->
    <div class="c-card">
      <div class="c-head">
        <span class="c-title">월별 상세 내역</span>
        <span class="c-meta">전체 ${allRows.length}개월</span>
      </div>
      <table class="monthly-table">
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
            <th>회사부담금</th>
            <th>메모</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${[...allRows].reverse().map(r => `
            <tr>
              <td style="font-weight:500;color:var(--text-1);">${r.year}년 ${r.month}월</td>
              <td style="font-weight:700;color:var(--brown);">${Utils.formatKRW(r.매출합계)}</td>
              <td>${Utils.formatKRW(r.재료비)}</td>
              <td>${Utils.formatKRW(r.직책지원비)}</td>
              <td>${Utils.formatKRW(r.변동지출)}</td>
              <td>${Utils.formatKRW(r.고정지출)}</td>
              <td>${Utils.formatKRW(r.특이지출)}</td>
              <td style="font-weight:500;">${Utils.formatKRW(r.지출합계)}</td>
              <td class="td-loss">${Utils.formatKRW(r.순매출)}</td>
              <td style="color:var(--text-3);font-size:11px;">${r.메모 || '—'}</td>
              <td><button class="btn btn-sm" onclick="openEditModal(${r.rowIndex},'${encodeURIComponent(JSON.stringify(r))}')">수정</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;

  el.appendChild(wrap);

  // Chart.js 로드 후 그래프 그리기
  if (typeof Chart === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';
    s.onload = () => drawMonthlyCharts(apiData.rows);
    document.head.appendChild(s);
  } else {
    drawMonthlyCharts(apiData.rows);
  }
}

function drawMonthlyCharts(rows) {
  const tc = '#999';
  const gc = 'rgba(0,0,0,0.05)';
  const labels = rows.map(r => `${r.month}월`);

  if (document.getElementById('monthlyChart')) {
    new Chart(document.getElementById('monthlyChart').getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { data: rows.map(r=>r.매출합계), borderColor:'#F5C800', backgroundColor:'rgba(245,200,0,0.08)', borderWidth:2.5, tension:0.4, pointBackgroundColor:'#F5C800', pointRadius:4, fill:true },
          { data: rows.map(r=>r.지출합계), borderColor:'#FCA5A5', backgroundColor:'rgba(252,165,165,0.06)', borderWidth:2.5, tension:0.4, pointBackgroundColor:'#FCA5A5', pointRadius:4, fill:true },
          { data: rows.map(r=>Math.abs(r.순매출)), borderColor:'#93C5FD', borderWidth:2, borderDash:[5,3], tension:0.4, pointBackgroundColor:'#93C5FD', pointRadius:3, fill:false },
        ]
      },
      options: {
        responsive:true, plugins:{legend:{display:false}},
        scales:{
          x:{grid:{color:gc},ticks:{color:tc,font:{size:10}}},
          y:{grid:{color:gc},ticks:{color:tc,font:{size:9},callback:v=>(v/10000).toFixed(0)+'만'}}
        }
      }
    });
  }

  if (document.getElementById('jikchaekChart')) {
    new Chart(document.getElementById('jikchaekChart').getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: rows.map(r=>r.직책지원비),
          borderColor:'#FCA5A5', backgroundColor:'rgba(252,165,165,0.1)',
          borderWidth:2.5, tension:0.4, pointBackgroundColor:'#FCA5A5', pointRadius:4, fill:true
        }]
      },
      options: {
        responsive:true, plugins:{legend:{display:false}},
        scales:{
          x:{grid:{color:gc},ticks:{color:tc,font:{size:10}}},
          y:{grid:{color:gc},ticks:{color:tc,font:{size:9},callback:v=>(v/10000).toFixed(0)+'만'}}
        }
      }
    });
  }
}

// ══════════════════════════════════════════════════════════
// 원가 분석 탭
// ══════════════════════════════════════════════════════════
function renderCost(el, apiData, costData) {
  el.innerHTML = '';
  el.appendChild(renderTabBar(el, 'cost', apiData, apiData.rows[apiData.rows.length-1], apiData.fixedCost, costData));

  const wrap = document.createElement('div');

  if (!costData || !costData.materials) {
    wrap.innerHTML = `
      <div style="background:var(--yellow-pale);border:1px solid var(--yellow-border);border-radius:10px;padding:20px 24px;text-align:center;">
        <div style="font-size:14px;font-weight:700;color:var(--brown);margin-bottom:8px;">원가 데이터 준비 중</div>
        <div style="font-size:12.5px;color:var(--brown-mid);">Google Sheets에 원가_재료단가, 원가_메뉴레시피 시트를 입력해주세요.</div>
      </div>
    `;
    el.appendChild(wrap);
    return;
  }

  const materials = costData.materials || [];
  const menus = costData.menus || [];

  wrap.innerHTML = `
    <style>
      .cost-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
      .c-card{background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;}
      .c-head{padding:11px 16px 9px;border-bottom:1px solid var(--border-light);display:flex;align-items:center;justify-content:space-between;}
      .c-title{font-size:12.5px;font-weight:700;color:var(--text-1);}
      .c-meta{font-size:11px;color:var(--text-3);}
      .cost-table{width:100%;border-collapse:collapse;}
      .cost-table th{padding:8px 14px;font-size:10.5px;color:var(--text-3);background:var(--bg-page);border-bottom:1px solid var(--border-light);text-align:left;font-weight:400;}
      .cost-table td{padding:9px 14px;font-size:12px;color:var(--text-2);border-bottom:1px solid var(--border-light);}
      .cost-table tr:last-child td{border-bottom:none;}
      .cost-table tr:hover td{background:var(--bg-hover);}
      .link-btn{font-size:11px;color:#0563C1;text-decoration:underline;cursor:pointer;background:none;border:none;padding:0;}
      .menu-row{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid var(--border-light);}
      .menu-row:last-child{border-bottom:none;}
      .menu-row:hover{background:var(--bg-hover);}
      .menu-name{font-size:12.5px;font-weight:500;color:var(--text-1);}
      .menu-price{font-size:11.5px;color:var(--text-2);}
      .menu-cost{font-size:12px;font-weight:700;}
      .menu-margin{font-size:11px;padding:2px 8px;border-radius:20px;}
    </style>

    <!-- 재료 단가 테이블 -->
    <div class="c-card" style="margin-bottom:12px;">
      <div class="c-head">
        <span class="c-title">재료 단가 현황</span>
        <span class="c-meta">클릭하면 구매 페이지로 이동</span>
      </div>
      <table class="cost-table">
        <thead>
          <tr><th>품목명</th><th>카테고리</th><th>구매단위</th><th style="text-align:right;">구매금액</th><th style="text-align:right;">단위원가</th><th>구매처</th><th>구매링크</th></tr>
        </thead>
        <tbody>
          ${materials.map(m => `
            <tr>
              <td style="font-weight:500;color:var(--text-1);">${m.품목명||''}</td>
              <td>${m.카테고리||''}</td>
              <td>${m.구매단위||''}</td>
              <td style="text-align:right;">${m.구매금액 ? Utils.formatKRW(m.구매금액) : '—'}</td>
              <td style="text-align:right;font-weight:700;color:var(--brown);">${m.단위원가 ? Utils.formatKRW(m.단위원가) + '/' + (m.단위 || '') : '—'}</td>
              <td>${m.구매처||'—'}</td>
              <td>${m.구매링크 && m.구매링크 !== 'https://' ? `<button class="link-btn" onclick="window.open('${m.구매링크}','_blank')">구매하기 →</button>` : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <!-- 메뉴별 원가 -->
    <div class="cost-grid" data-grid-id="cost-grid" data-page="cafe-cost">
      <div class="c-card">
        <div class="c-head">
          <span class="c-title">메뉴별 원가 분석</span>
          <span class="c-meta">재료비 기준</span>
        </div>
        ${menus.length > 0 ? menus.map(m => `
          <div class="menu-row">
            <div>
              <div class="menu-name">${m.메뉴명}</div>
              <div class="menu-price">판매가 ${Utils.formatKRW(m.판매가)}</div>
            </div>
            <div style="text-align:right;">
              <div class="menu-cost" style="color:${m.원가율 > 80 ? '#DC2626' : m.원가율 > 60 ? '#F59E0B' : '#059669'};">
                원가 ${Utils.formatKRW(m.원가)}
              </div>
              <div class="menu-margin" style="background:${m.원가율 > 80 ? '#FEF2F2' : m.원가율 > 60 ? '#FFFBEB' : '#ECFDF5'};color:${m.원가율 > 80 ? '#DC2626' : m.원가율 > 60 ? '#F59E0B' : '#059669'};">
                원가율 ${m.원가율}%
              </div>
            </div>
          </div>`).join('') : `
          <div style="padding:20px;text-align:center;font-size:12px;color:var(--text-3);">
            원가_메뉴레시피 시트를 입력해주세요.
          </div>`}
      </div>

      <!-- 재료비 추이 -->
      <div class="c-card">
        <div class="c-head">
          <span class="c-title">월별 재료비 추이</span>
          <span class="c-meta">매출 대비 비교</span>
        </div>
        <div style="padding:14px 16px 8px;">
          <canvas id="costChart" height="160"></canvas>
          <div style="display:flex;gap:14px;margin-top:8px;">
            <div style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--text-2);">
              <div style="width:14px;height:2px;background:#F5C800;border-radius:1px;"></div>매출
            </div>
            <div style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--text-2);">
              <div style="width:14px;height:2px;background:#93C5FD;border-radius:1px;"></div>재료비
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;border-top:1px solid var(--border-light);">
          ${apiData.rows.slice(-3).map(r => `
            <div style="padding:10px 12px;text-align:center;border-right:1px solid var(--border-light);">
              <div style="font-size:10px;color:var(--text-3);margin-bottom:3px;">${r.month}월 재료비율</div>
              <div style="font-size:13px;font-weight:700;color:${r.매출합계>0&&(r.재료비/r.매출합계)>0.8?'#DC2626':r.매출합계>0&&(r.재료비/r.매출합계)>0.6?'#F59E0B':'var(--text-1)'};">
                ${r.매출합계 > 0 ? Math.round(r.재료비/r.매출합계*100) : 0}%
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>
  `;

  el.appendChild(wrap);

  // 원가 차트
  const rows = apiData.rows;
  setTimeout(() => {
    if (typeof Chart !== 'undefined' && document.getElementById('costChart')) {
      new Chart(document.getElementById('costChart').getContext('2d'), {
        type: 'line',
        data: {
          labels: rows.map(r=>`${r.month}월`),
          datasets: [
            { data: rows.map(r=>r.매출합계), borderColor:'#F5C800', backgroundColor:'rgba(245,200,0,0.08)', borderWidth:2.5, tension:0.4, pointBackgroundColor:'#F5C800', pointRadius:4, fill:true },
            { data: rows.map(r=>r.재료비), borderColor:'#93C5FD', backgroundColor:'rgba(147,197,253,0.08)', borderWidth:2.5, tension:0.4, pointBackgroundColor:'#93C5FD', pointRadius:4, fill:true },
          ]
        },
        options: {
          responsive:true, plugins:{legend:{display:false}},
          scales:{
            x:{grid:{color:'rgba(0,0,0,0.05)'},ticks:{color:'#999',font:{size:10}}},
            y:{grid:{color:'rgba(0,0,0,0.05)'},ticks:{color:'#999',font:{size:9},callback:v=>(v/10000).toFixed(0)+'만'}}
          }
        }
      });
    }
  }, 100);

  // 저장된 레이아웃 적용
  if (typeof Layout !== 'undefined') Layout.applyToDom('cafe-cost', el);
}

// ══════════════════════════════════════════════════════════
// 아코디언 토글
// ══════════════════════════════════════════════════════════
window.cafeToggle = function(key) {
  const body = document.getElementById('acc-body-' + key);
  const arrow = document.getElementById('acc-arrow-' + key);
  if (!body || !arrow) return;
  body.classList.toggle('open');
  arrow.classList.toggle('open');
};

// ══════════════════════════════════════════════════════════
// 모달: 데이터 추가
// ══════════════════════════════════════════════════════════
function openAddModal(year, month) {
  Utils.openModal(`
    <div class="modal">
      <div class="modal-head">
        <span class="modal-title">월 매출 데이터 추가</span>
        <button class="modal-close" onclick="Utils.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label class="form-label">연도</label><input type="number" class="form-input" id="add-year" value="${year}"></div>
          <div class="form-group"><label class="form-label">월</label><input type="number" class="form-input" id="add-month" value="${month}" min="1" max="12"></div>
        </div>
        <div class="form-group"><label class="form-label">매출합계 (원)</label><input type="number" class="form-input" id="add-sales" placeholder="예: 2162200"></div>
        <div class="form-group"><label class="form-label">재료 및 소모품비 (원)</label><input type="number" class="form-input" id="add-material" placeholder="예: 1995920"></div>
        <div class="form-group"><label class="form-label">직책지원비 (원)</label><input type="number" class="form-input" id="add-jikchaek" value="0"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-group"><label class="form-label">입사자지원비</label><input type="number" class="form-input" id="add-entry" value="0"></div>
          <div class="form-group"><label class="form-label">현장실습생</label><input type="number" class="form-input" id="add-intern" value="0"></div>
          <div class="form-group"><label class="form-label">이벤트비</label><input type="number" class="form-input" id="add-event" value="0"></div>
        </div>
        <div class="form-group"><label class="form-label">메모</label><input type="text" class="form-input" id="add-memo" placeholder="선택사항"></div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="Utils.closeModal()">취소</button>
        <button class="btn btn-primary" onclick="submitAdd()">저장</button>
      </div>
    </div>
  `);
}

window.submitAdd = async function() {
  const row = {
    year: Number(document.getElementById('add-year').value),
    month: Number(document.getElementById('add-month').value),
    매출합계: Number(document.getElementById('add-sales').value),
    재료비: Number(document.getElementById('add-material').value),
    엘리가오더: 73500,
    직책지원비: Number(document.getElementById('add-jikchaek').value),
    입사자지원비: Number(document.getElementById('add-entry').value),
    현장실습생: Number(document.getElementById('add-intern').value),
    이벤트비: Number(document.getElementById('add-event').value),
    메모: document.getElementById('add-memo').value,
  };
  if (!row.매출합계) { Utils.toast('매출합계를 입력해주세요.', 'error'); return; }
  try {
    Utils.closeModal();
    await API.addCafeRow(row);
    Utils.toast('저장되었습니다.', 'success');
    await Router.go('cafe');
  } catch(err) { Utils.toast(`저장 실패: ${err.message}`, 'error'); }
};

// ══════════════════════════════════════════════════════════
// 모달: 데이터 수정
// ══════════════════════════════════════════════════════════
window.openEditModal = function(rowIndex, encodedRow) {
  const r = JSON.parse(decodeURIComponent(encodedRow));
  Utils.openModal(`
    <div class="modal">
      <div class="modal-head">
        <span class="modal-title">${r.year}년 ${r.month}월 수정</span>
        <button class="modal-close" onclick="Utils.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">매출합계 (원)</label><input type="number" class="form-input" id="edit-sales" value="${r.매출합계}"></div>
        <div class="form-group"><label class="form-label">재료 및 소모품비 (원)</label><input type="number" class="form-input" id="edit-material" value="${r.재료비}"></div>
        <div class="form-group"><label class="form-label">직책지원비 (원)</label><input type="number" class="form-input" id="edit-jikchaek" value="${r.직책지원비}"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-group"><label class="form-label">입사자지원비</label><input type="number" class="form-input" id="edit-entry" value="${r.입사자지원비}"></div>
          <div class="form-group"><label class="form-label">현장실습생</label><input type="number" class="form-input" id="edit-intern" value="${r.현장실습생}"></div>
          <div class="form-group"><label class="form-label">이벤트비</label><input type="number" class="form-input" id="edit-event" value="${r.이벤트비}"></div>
        </div>
        <div class="form-group"><label class="form-label">메모</label><input type="text" class="form-input" id="edit-memo" value="${r.메모||''}"></div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="Utils.closeModal()">취소</button>
        <button class="btn btn-primary" onclick="submitEdit(${rowIndex},${r.year},${r.month})">수정</button>
      </div>
    </div>
  `);
};

window.submitEdit = async function(rowIndex, year, month) {
  const row = {
    year, month,
    매출합계: Number(document.getElementById('edit-sales').value),
    재료비: Number(document.getElementById('edit-material').value),
    엘리가오더: 73500,
    직책지원비: Number(document.getElementById('edit-jikchaek').value),
    입사자지원비: Number(document.getElementById('edit-entry').value),
    현장실습생: Number(document.getElementById('edit-intern').value),
    이벤트비: Number(document.getElementById('edit-event').value),
    메모: document.getElementById('edit-memo').value,
  };
  try {
    Utils.closeModal();
    await API.updateCafeRow(rowIndex, row);
    Utils.toast('수정되었습니다.', 'success');
    await Router.go('cafe');
  } catch(err) { Utils.toast(`수정 실패: ${err.message}`, 'error'); }
};

// ══════════════════════════════════════════════════════════
// 다른 페이지 플레이스홀더
// ══════════════════════════════════════════════════════════
Pages.aiCost = async function(container) {
  container.innerHTML = `<div class="ws-header"><div class="ws-header-top"><div><div class="ws-title">AI 비용 현황</div><div class="ws-subtitle">비용 관리 · 월별 도구별 집계</div></div></div></div><div class="ws-content"><div class="state-empty"><span>다음 단계에서 구현됩니다.</span></div></div>`;
};
Pages.algocare = async function(container) {
  container.innerHTML = `<div class="ws-header"><div class="ws-header-top"><div><div class="ws-title">알고케어 이용자 현황</div><div class="ws-subtitle">복지 현황 · 월별 이용자 집계</div></div></div></div><div class="ws-content"><div class="state-empty"><span>다음 단계에서 구현됩니다.</span></div></div>`;
};
Pages.slack = async function(container) {
  container.innerHTML = `<div class="ws-header"><div class="ws-header-top"><div><div class="ws-title">슬랙 / 오피스키퍼</div><div class="ws-subtitle">인프라 · 분기별 사용 현황</div></div></div></div><div class="ws-content"><div class="state-empty"><span>다음 단계에서 구현됩니다.</span></div></div>`;
};
Pages.input = async function(container) {
  container.innerHTML = `<div class="ws-header"><div class="ws-header-top"><div><div class="ws-title">데이터 입력</div></div></div></div><div class="ws-content"><div class="state-empty"><span>다음 단계에서 구현됩니다.</span></div></div>`;
};
Pages.permissions = async function(container) {
  container.innerHTML = `<div class="ws-header"><div class="ws-header-top"><div><div class="ws-title">권한 설정</div></div></div></div><div class="ws-content"><div class="state-empty"><span>Google OAuth 연동 후 구현됩니다.</span></div></div>`;
};
