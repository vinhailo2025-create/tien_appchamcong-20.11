(function () {
  'use strict';

  const dashboardRole = 'BGD';
  const presenceStatuses = ['DANG_LAM', 'DA_RA'];
  const expensesStates = ['approved', 'partial', 'paid', 'reconciled'];
  const costCategories = [
    { id: 'labor', label: 'Nhân công', color: '#1676eb' },
    { id: 'team', label: 'Đội khoán', color: '#ffa51d' },
    { id: 'materials', label: 'Vật tư', color: '#9c73f3' },
    { id: 'other', label: 'Chưa phân loại', color: '#4b9ab5' }
  ];
  const figuresFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

  const icon = name => window.NPWorkspace?.icon(name) || '';
  const dayLabel = day => /^\d{4}-\d{2}-\d{2}$/.test(day || '') ? day.split('-').reverse().join('/') : '—';
  const nav = (target, label, variant = 'np-dir-link') => `<button class="${variant}" type="button" data-np-target="${target}">${label}</button>`;
  const gridPanel = (title, extra, body, className = '') => `<section class="np-dir-panel ${className}"><header><h3>${title}</h3>${extra}</header>${body}</section>`;
  const toMoney = value => Number.isFinite(value) && value > 0 ? value : 0;

  function costMix(context) {
    const rows = context.data?.finance?.rows || [];
    const scope = context.account?.projectId;
    const permittedProjects = (context.state.projects || []).filter(project => !scope || scope === 'ALL' || project.id === scope);
    const eligible = rows.filter(row => row.kind === 'payable' && expensesStates.includes(row.status)
      && permittedProjects.some(project => project.id === row.projectId));
    const amounts = eligible.reduce((totals, row) => {
      const category = costCategories.find(item => item.id === row.costCategory)?.id || 'other';
      totals[category] += toMoney(row.amount);
      return totals;
    }, { labor: 0, team: 0, materials: 0, other: 0 });
    return costCategories.map(category => ({ ...category, amount: amounts[category.id] })).filter(category => category.amount > 0);
  }

  function mixChart(categories, esc, currency) {
    const total = categories.reduce((sum, item) => sum + item.amount, 0);
    let start = 0;
    const stops = categories.map(item => {
      const finish = start + item.amount / total * 100;
      const segment = `${item.color} ${start}% ${finish}%`;
      start = finish;
      return segment;
    });
    const background = stops.length ? `conic-gradient(${stops.join(', ')})` : '#e6edf7';
    const items = categories.map(item => `<li>
      <span class="np-dir-swatch" style="--swatch:${item.color}" aria-hidden="true"></span>
      <span>${item.label} <small>(${figuresFormat.format(item.amount / total * 100)}%)</small></span>
      <span class="np-dir-mix-amount">${esc(currency(item.amount))}</span>
    </li>`);
    return `<div class="np-dir-mix">
      <div class="np-dir-ring" style="--ring:${background}" aria-hidden="true">
        <div><strong>${total ? figuresFormat.format(total / 1000000) : '—'}</strong><span>Triệu đồng</span></div>
      </div>
      ${items.length ? `<ul>${items.join('')}</ul>` : '<p class="np-dir-note">Chưa có khoản chi được duyệt.</p>'}
    </div>`;
  }

  function exampleTrend() {
    const periods = [
      { label: 'Kỳ 1', revenue: 520, cost: 410 },
      { label: 'Kỳ 2', revenue: 580, cost: 440 },
      { label: 'Kỳ 3', revenue: 640, cost: 470 }
    ];
    const max = 800;
    const points = periods.map((period, index) => ({
      x: (index + 0.5) * 100 / periods.length,
      y: 100 - (period.revenue - period.cost) / max * 100
    }));
    const lineClip = [...points.map(point => `${point.x}% ${point.y - .8}%`),
      ...[...points].reverse().map(point => `${point.x}% ${point.y + .8}%`)].join(', ');
    const seriesDescription = periods.map(period => `${period.label}: doanh thu ${period.revenue}, chi phí ${period.cost}, lợi nhuận ${period.revenue - period.cost} triệu đồng.`).join(' ');
    return `<figure class="np-dir-trend">
      <div class="np-dir-chart-key" aria-hidden="true"><span>Triệu đồng</span><span class="is-revenue">Doanh thu</span><span class="is-cost">Chi phí</span><span class="is-profit">Lợi nhuận</span></div>
      <div class="np-dir-chart" role="img" aria-label="Biểu đồ minh họa. ${seriesDescription}">
        <div class="np-dir-chart-scale" aria-hidden="true"><span>800</span><span>600</span><span>400</span><span>200</span><span>0</span></div>
        <div class="np-dir-plot" aria-hidden="true">
          ${periods.map(period => `<div class="np-dir-chart-group">
            <i class="is-revenue" style="--height:${period.revenue / max * 100}%"></i>
            <i class="is-cost" style="--height:${period.cost / max * 100}%"></i>
            <span>${period.label}</span>
          </div>`).join('')}
          <b class="np-dir-profit-line" style="clip-path:polygon(${lineClip})"></b>
          ${points.map(point => `<b class="np-dir-profit-dot" style="left:${point.x}%;top:${point.y}%"></b>`).join('')}
        </div>
      </div>
      <figcaption class="np-dir-note">Chuỗi minh họa bố cục báo cáo theo kỳ.</figcaption>
    </figure>`;
  }

  function projectRanking(projects, workers, esc) {
    if (!projects.length) return '<p class="np-dir-note">Chưa có công trình trong danh mục.</p>';
    const ranked = projects.map(project => ({
      name: project.name,
      total: workers.filter(worker => worker.projectId === project.id).length
    })).sort((a, b) => b.total - a.total || String(a.name).localeCompare(String(b.name), 'vi'));
    const maximum = ranked[0].total || 1;
    return `<ol class="np-dir-ranking">${ranked.slice(0, 5).map(item => `<li>
      <div><strong>${esc(item.name)}</strong><span>${item.total} công nhân</span></div>
      <div class="np-dir-meter" aria-hidden="true"><i style="--fill:${item.total / maximum * 100}%"></i></div>
    </li>`).join('')}</ol>`;
  }

  function render(context) {
    if (context.role !== dashboardRole) return '';
    const { account, data, state, esc, money, rangeLabel, rangeControl } = context;
    const workers = state.workers || [];
    const projects = state.projects || [];
    const teams = state.teams || [];
    const lastAttendanceDay = workers.reduce((day, worker) => worker.date > day ? worker.date : day, '');
    const present = workers.filter(worker => worker.date === lastAttendanceDay && presenceStatuses.includes(worker.attendanceStatus)).length;
    const leaders = new Set(teams.map(team => team.leaderUsername || team.leader).filter(Boolean)).size;
    const presentShare = workers.length ? Math.round(present / workers.length * 100) : 0;
    const kpis = [
      { color: 'blue', label: 'Công nhân', note: 'Tổng quân số', count: workers.length, icon: 'people' },
      { color: 'green', label: 'Có mặt', note: lastAttendanceDay ? `${presentShare}% · ${dayLabel(lastAttendanceDay)}` : 'Chưa có chấm công', count: present, icon: 'clock' },
      { color: 'orange', label: 'Đội trưởng', note: 'Theo danh sách đội', count: leaders, icon: 'shield' },
      { color: 'violet', label: 'Công trình', note: 'Trong danh mục', count: projects.length, icon: 'building' }
    ];
    const finance = window.NPFinance?.summary?.(context);
    const business = data?.business;
    const acceptanceRows = (business?.acceptance || []).flatMap(item => {
      const contract = business?.contracts?.find(row => row.id === item.contractId);
      const quote = business?.quotes?.find(row => row.id === contract?.quoteId);
      return quote ? [toMoney(quote.rate * item.accepted)] : [];
    });
    const acceptanceValue = acceptanceRows.length ? acceptanceRows.reduce((sum, value) => sum + value, 0) : null;
    const pendingQuotes = (business?.quotes || []).filter(item => item.status === 'pending').length;
    const payments = finance?.pendingCount || 0;
    const advances = (state.advances || []).filter(item => item.status === 'CHO_BGD_DUYET').length;
    const payroll = state.payrollMonthStatus === 'CHO_BGD_DUYET' ? 1 : 0;
    const queueItems = [
      { count: payments, label: 'đề nghị thanh toán', icon: 'money', color: 'orange', target: 'v2-director-payments' },
      { count: pendingQuotes, label: 'báo giá', icon: 'folder', color: 'blue', target: 'v2-director-quotes' },
      { count: advances, label: 'đề nghị tạm ứng', icon: 'list', color: 'green', target: 'bgd-approvals' },
      { count: payroll, label: 'bảng lương', icon: 'calendar', color: 'violet', target: 'bgd-approvals' }
    ].filter(item => item.count > 0);
    const queueCount = queueItems.reduce((count, item) => count + item.count, 0);
    const currency = value => value === null ? '—' : esc(money(value));
    const costs = costMix(context);
    const costTotal = finance ? finance.payable + finance.paid : null;
    const summary = [
      { label: 'Giá trị nghiệm thu', total: acceptanceValue, detail: 'Theo biên bản · Chưa VAT', color: 'green' },
      { label: 'Chi phí đã duyệt', total: costTotal, detail: 'Theo sổ chi', color: 'red' },
      { label: 'Phải thu còn lại', total: finance?.receivable ?? null, detail: 'Theo sổ thu', color: 'blue' }
    ];
    const summaryHTML = `<dl class="np-dir-figures">${summary.map(item => `<div class="is-${item.color}"><dt>${item.label}</dt><dd>${currency(item.total)}</dd><small>${item.detail}</small></div>`).join('')}</dl><p class="np-dir-note">Tổng hợp toàn bộ hồ sơ trong bản demo.</p>`;
    const queueHTML = queueItems.length ? `<ul class="np-dir-queue">${queueItems.map(item => `<li>${nav(item.target, `
      <span class="np-dir-queue-icon is-${item.color}">${icon(item.icon)}</span><strong>${item.count} ${item.label}</strong>
      <span class="np-dir-pending">Chờ duyệt</span>${icon('arrow')}`, 'np-dir-queue-button')}</li>`).join('')}</ul>`
      : '<p class="np-dir-note">Chưa có hồ sơ chờ Giám đốc duyệt.</p>';
    const dateDisplay = rangeControl || (rangeLabel ? `<span class="np-dir-period">${icon('calendar')} Kỳ ${esc(rangeLabel)}</span>` : '');
    const alerts = finance?.overdueCount
      ? nav('v2-director-payments', `<span class="np-dir-queue-icon is-orange">${icon('money')}</span><strong>${finance.overdueCount} chứng từ quá hạn</strong>${icon('arrow')}`, 'np-dir-queue-button')
      : '<p class="np-dir-note">Không có chứng từ quá hạn trong sổ công nợ.</p>';

    return `<div class="np-dir">
      <header class="np-dir-heading">
        <div><h2>Xin chào, ${esc(account?.fullName || 'Giám đốc')}</h2><p>Tổng quan hoạt động toàn công ty</p></div>
        ${dateDisplay}
      </header>
      <div class="np-dir-kpis">${kpis.map(item => `<article class="np-dir-kpi">
        <span class="np-dir-icon is-${item.color}" aria-hidden="true">${icon(item.icon)}</span>
        <div><strong>${item.count}</strong><h3>${item.label}</h3><p>${item.note}</p></div>
      </article>`).join('')}</div>
      <div class="np-dir-panels">
        ${gridPanel('Kết quả kinh doanh', '', summaryHTML, 'np-dir-results')}
        ${gridPanel('Cơ cấu chi phí', nav('v2-director-payments', `Sổ chi ${icon('arrow')}`), mixChart(costs, esc, money), 'np-dir-cost')}
        ${gridPanel('Doanh thu, chi phí & lợi nhuận theo kỳ', '<span class="np-dir-sample">Minh họa</span>', exampleTrend(), 'np-dir-history')}
        ${gridPanel(`Công việc chờ xử lý (${queueCount})`, nav('bgd-approvals', `Duyệt nội bộ ${icon('arrow')}`), queueHTML, 'np-dir-inbox')}
        ${gridPanel('Xếp hạng công trình theo quân số', nav('v2-projects', `Công trình ${icon('arrow')}`), projectRanking(projects, workers, esc), 'np-dir-history')}
        ${gridPanel('Cảnh báo công nợ', nav('v2-director-payments', `Tài chính ${icon('arrow')}`), alerts, 'np-dir-inbox')}
      </div>
    </div>`;
  }

  window.NPDirector = { render };
})();
