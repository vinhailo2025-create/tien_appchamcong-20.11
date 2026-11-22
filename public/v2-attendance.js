(function () {
  'use strict';

  const financeTab = 'v2-finance-attendance';
  const teamTab = 'v2-team-attendance';
  const periodLabels = { draft: 'Nháp', submitted: 'Đội trưởng đã gửi', confirmed: 'Kế toán đã đối chiếu', locked: 'Đã khóa' };
  const leaveLabels = { N: 'Nghỉ', P: 'Nghỉ phép', OM: 'Nghỉ ốm' };
  const filters = new Map();
  let feedback = '';

  const roleOf = ctx => ctx.account?.roleId || ctx.role;
  const actorOf = ctx => String(ctx.account?.id || ctx.account?.username || '');
  const get = (form, name) => String(form.get(name) ?? '').trim();
  const dayLabel = day => String(day).padStart(2, '0');
  const periodKey = (month, teamId, half) => `${month}/${teamId}/${half}`;
  const halfFor = day => day <= 15 ? 'first' : 'second';
  const cellName = (workerId, day) => `cell:${workerId}:${day}`;
  const teamMonth = '2026-11';
  const rangeDays = (first, last) => Array.from({ length: last - first + 1 }, (_, index) => first + index);
  const monthLength = month => new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();

  function scopedTeams(ctx) {
    const { projectId, teamId } = ctx.account || {};
    return (ctx.state.teams || []).filter(team => (!projectId || projectId === 'ALL' || team.projectId === projectId)
      && (roleOf(ctx) !== 'DT1' || team.id === teamId));
  }

  function model(ctx) {
    const teams = scopedTeams(ctx);
    const saved = filters.get(actorOf(ctx)) || {};
    const team = teams.find(item => item.id === saved.teamId) || teams.find(item => !saved.projectId || item.projectId === saved.projectId) || teams[0];
    const month = saved.month || teamMonth;
    const lastDay = monthLength(month);
    const half = saved.half || 'first';
    const role = roleOf(ctx);
    const day = Math.min(saved.day || 1, lastDay);
    const days = role === 'DT1' ? [day] : rangeDays(half === 'second' ? 16 : 1, half === 'first' ? 15 : lastDay);
    const projectId = team?.projectId || '';
    const projects = (ctx.state.projects || []).filter(project => teams.some(item => item.projectId === project.id));
    const workers = team ? (ctx.state.workers || []).filter(worker => worker.teamId === team.id && worker.projectId === team.projectId) : [];
    const query = (saved.query || '').toLocaleLowerCase('vi');
    const visible = workers.filter(worker => `${worker.code} ${worker.name}`.toLocaleLowerCase('vi').includes(query));
    return { month, lastDay, half, day, days, projectId, team, teams, projects, workers, visible, role, query: saved.query || '' };
  }

  function storedPeriod(ctx, selected, half, create = false) {
    const key = periodKey(selected.month, selected.team.id, half);
    if (ctx.data.attendance?.periods?.[key]) return ctx.data.attendance.periods[key];
    const period = { status: 'draft', cells: {}, events: [] };
    if (selected.month === teamMonth) {
      for (const [index, worker] of selected.workers.entries()) {
        for (const day of half === 'first' ? rangeDays(1, 15) : rangeDays(16, 22)) {
          const code = (index + day) % 13 === 0 ? 'N' : (index + day) % 11 === 0 ? '8+2' : '8';
          period.cells[cellName(worker.id, day)] = code;
        }
      }
    }
    if (create) {
      ctx.data.attendance ||= { periods: {} };
      ctx.data.attendance.periods[key] = period;
    }
    return period;
  }

  function parseCode(raw) {
    const code = String(raw).trim().toUpperCase().replace('ỐM', 'OM').replaceAll(',', '.');
    if (!code || Object.hasOwn(leaveLabels, code)) return { code, regular: 0, ot: 0 };
    const matches = /^(\d{1,2}(?:\.\d{1,2})?)(?:\+(\d{1,2}(?:\.\d{1,2})?))?$/.exec(code);
    if (!matches) return null;
    const regular = Number(matches[1]);
    const ot = Number(matches[2] || 0);
    if (regular > 12 || ot > 12 || regular + ot > 16) return null;
    return { code: ot ? `${regular}+${ot}` : String(regular), regular, ot };
  }

  function canEdit(period, role) {
    return (role === 'DT1' && period.status === 'draft') || (role === 'KT' && ['submitted', 'confirmed'].includes(period.status));
  }

  function say(message) {
    feedback = message;
    const notice = document.querySelector('[data-attendance-feedback]');
    if (notice) notice.textContent = message;
    return false;
  }

  function save(ctx, message) {
    feedback = message;
    ctx.save();
    return true;
  }

  function workflowButton(action, label, half) {
    return `<button type="button" data-np-module="attendance" data-np-action="${action}" data-np-id="${half}">${label}</button>`;
  }

  function periodStatus(selected, half, period, esc) {
    const actions = [];
    if (selected.role === 'DT1' && period.status === 'draft') actions.push(workflowButton('submit', 'Gửi Kế toán', half));
    if (selected.role === 'KT' && period.status === 'submitted') actions.push(workflowButton('confirm', 'Xác nhận đối chiếu', half));
    if (selected.role === 'KT' && period.status === 'confirmed') actions.push(workflowButton('lock', 'Khóa kỳ', half));
    const label = half === 'first' ? '01–15' : `16–${selected.lastDay}`;
    const history = [...period.events].reverse().map(event => `<li>${esc(event.label)} · ${esc(event.actor)}${event.at ? ` · ${esc(new Date(event.at).toLocaleString('vi-VN'))}` : ''}</li>`).join('');
    return `<div class="np-attendance-period"><strong>Kỳ ${label}</strong><span data-status="${period.status}">${periodLabels[period.status]}</span>${actions.join('')}${history ? `<details><summary>Lịch sử</summary><ul>${history}</ul></details>` : ''}</div>`;
  }

  function fieldOptions(items, selected, escape) {
    return items.map(item => `<option value="${escape(item.id)}" ${item.id === selected ? 'selected' : ''}>${escape(item.name)}</option>`).join('');
  }

  function filtersForm(selection, esc) {
    const { projects, projectId, teams, team, month, half, role, day, lastDay, query } = selection;
    return `<form class="np-attendance-filters" data-np-module="attendance" data-np-action="filter">
      <label>Tháng<input type="month" name="month" value="${month}" min="2000-01" max="2100-12" required /></label>
      <label>Công trình<select name="projectId">${fieldOptions(projects, projectId, esc)}</select></label>
      <label>Đội<select name="teamId">${fieldOptions(teams, team.id, esc)}</select></label>
      ${role === 'DT1' ? `<label>Ngày<input type="number" min="1" max="31" value="${day}" name="day" required /></label>` : `<label>Kỳ<select name="half"><option value="first" ${half === 'first' ? 'selected' : ''}>01–15</option><option value="second" ${half === 'second' ? 'selected' : ''}>16–${lastDay}</option><option value="full" ${half === 'full' ? 'selected' : ''}>Cả tháng</option></select></label>`}
      <label>Tìm công nhân<input name="query" type="search" value="${esc(query)}" maxlength="80" placeholder="Mã hoặc họ tên" /></label>
      <button type="submit">Áp dụng</button>
    </form>`;
  }

  function cell(worker, day, periods, selected, escape, row, column) {
    const period = periods[halfFor(day)];
    const name = cellName(worker.id, day);
    const value = period.cells[name] || '';
    const edit = canEdit(period, selected.role);
    const tone = Object.hasOwn(leaveLabels, value) ? `leave-${value}` : value.includes('+') ? 'ot' : '';
    const input = edit ? `<input name="${escape(name)}" aria-label="${escape(worker.name)}, ngày ${dayLabel(day)}" value="${escape(value)}" maxlength="14" data-grid-row="${row}" data-grid-col="${column}" autocomplete="off" spellcheck="false" />` : `<span>${escape(value || '—')}</span>`;
    return { input, tone, value };
  }

  function totals(values) {
    const sum = values.reduce((sum, value) => {
      const code = parseCode(value);
      return code ? { regular: sum.regular + Math.round(code.regular * 100), ot: sum.ot + Math.round(code.ot * 100) } : sum;
    }, { regular: 0, ot: 0 });
    return { regular: sum.regular / 100, ot: sum.ot / 100 };
  }

  function record(period, ctx, label) {
    period.events.push({ label, actor: ctx.account.fullName || actorOf(ctx), at: new Date().toISOString() });
  }

  function financeGrid(selected, periods, esc) {
    return `<div class="np-attendance-table" tabindex="0" role="region" aria-label="Bảng công theo ngày">
      <table><thead><tr><th scope="col">STT</th><th scope="col">Mã NV</th><th scope="col">Họ và tên</th><th scope="col">Đội</th><th scope="col">Công trình</th>
      ${selected.days.map(day => `<th scope="col">${dayLabel(day)}</th>`).join('')}<th scope="col">Giờ công</th><th scope="col">TC (giờ)</th></tr></thead><tbody>
      ${selected.visible.map((worker, row) => {
        const cells = selected.days.map((day, col) => cell(worker, day, periods, selected, esc, row, col));
        const hours = totals(cells.map(item => item.value));
        return `<tr><td>${row + 1}</td><td>${esc(worker.code)}</td><td>${esc(worker.name)}</td><td>${esc(worker.teamName || selected.team.name)}</td><td>${esc(worker.projectName || worker.projectId)}</td>
          ${cells.map(item => `<td class="np-attendance-cell" data-tone="${item.tone}">${item.input}</td>`).join('')}<td>${hours.regular.toLocaleString('vi-VN')}</td><td>${hours.ot.toLocaleString('vi-VN')}</td></tr>`;
      }).join('') || `<tr><td colspan="${selected.days.length + 7}">Không tìm thấy công nhân.</td></tr>`}</tbody></table></div>`;
  }

  function dailyGrid(selected, periods, esc) {
    const period = periods[halfFor(selected.day)];
    const missing = selected.visible.filter(worker => !period.cells[cellName(worker.id, selected.day)]).length;
    return `<div class="np-attendance-daily-summary"><span><strong>${selected.visible.length}</strong> Công nhân</span><span><strong>${missing}</strong> Chưa ghi công</span></div>
      <div class="np-attendance-mobile-list">${selected.visible.map((worker, row) => {
        const item = cell(worker, selected.day, periods, selected, esc, row, 0);
        return `<div data-tone="${item.tone}"><span><strong>${esc(worker.name)}</strong><small>${esc(worker.code)}</small></span>${item.input}</div>`;
      }).join('') || '<p>Không tìm thấy công nhân.</p>'}</div>`;
  }

  function render(tab, ctx) {
    const role = roleOf(ctx);
    if ((tab === financeTab && role !== 'KT') || (tab === teamTab && role !== 'DT1')) return '<p>Bạn không có quyền xem bảng công này.</p>';
    if (![teamTab, financeTab].includes(tab)) return '';
    const selected = model(ctx);
    const esc = ctx.esc;
    if (!selected.team) return '<section class="np-work-card"><h2>Chưa có đội trong phạm vi tài khoản</h2><p>Bảng công sẽ hiển thị khi có đội thi công được phân công.</p></section>';
    const periods = { first: storedPeriod(ctx, selected, 'first'), second: storedPeriod(ctx, selected, 'second') };
    const halves = [...new Set(selected.days.map(halfFor))];
    const hasEdits = halves.some(half => canEdit(periods[half], role));
    return `<section class="np-attendance" ${role === 'DT1' ? 'data-attendance-mobile' : ''}>
      <header class="np-attendance-heading"><div><h1>${role === 'KT' ? 'Bảng công Excel Pro' : 'Chấm công đội'}</h1><p>${esc(selected.team.name)} · ${selected.month.slice(5)}/${selected.month.slice(0, 4)}</p></div>${role === 'KT' ? workflowButton('export', 'Xuất Excel (.CSV)', '') : ''}</header>
      ${filtersForm(selected, esc)}
      <div class="np-attendance-periods">${halves.map(half => periodStatus(selected, half, periods[half], esc)).join('')}</div>
      <p data-attendance-feedback class="np-attendance-feedback" role="status">${esc(feedback)}</p>
      <form data-np-module="attendance" data-np-action="save" data-attendance-grid>
        ${role === 'KT' ? financeGrid(selected, periods, esc) : dailyGrid(selected, periods, esc)}
        ${hasEdits ? '<button type="submit" class="np-attendance-save">Lưu bảng công</button>' : ''}
      </form>
      <div class="np-attendance-legend"><span><b>8</b> 8 giờ công</span><span><b data-tone="ot">8+2</b> 8 giờ công + 2 giờ tăng ca</span><span><b data-tone="leave-N">N</b> Nghỉ</span><span><b data-tone="leave-P">P</b> Nghỉ phép</span><span><b data-tone="leave-OM">OM</b> Nghỉ ốm</span>${hasEdits && role === 'KT' ? '<span>Dán vùng ô từ Excel hoặc di chuyển bằng phím mũi tên.</span>' : ''}</div>
      <p class="np-attendance-note">${halves.some(half => periods[half].status === 'locked') ? 'Kỳ đã khóa. Liên hệ Kế toán để làm phiếu điều chỉnh riêng.' : 'Giờ công mẫu dùng để thực hành trên bản demo.'}</p>
    </section>`;
  }

  function exportCSV(selected, periods) {
    const rows = [['STT', 'Mã NV', 'Họ và tên', 'Đội', 'Công trình', ...selected.days.map(dayLabel), 'Giờ công', 'Tăng ca (giờ)']];
    for (const [index, worker] of selected.visible.entries()) {
      const values = selected.days.map(day => periods[halfFor(day)].cells[cellName(worker.id, day)] || '');
      const hours = totals(values);
      rows.push([index + 1, worker.code, worker.name, worker.teamId, worker.projectId, ...values, hours.regular, hours.ot]);
    }
    const quote = value => {
      let field = String(value);
      if (/^[=+\-@\t\r]/.test(field)) field = `'${field}`;
      return `"${field.replaceAll('"', '""')}"`;
    };
    const content = `\uFEFF${rows.map(row => row.map(quote).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Bang-cong-${selected.team.id}-${selected.month}-${selected.half}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  function saveGrid(form, ctx, selected, periods) {
    const writable = new Map();
    for (const worker of selected.visible) {
      for (const day of selected.days) {
        const half = halfFor(day);
        if (canEdit(periods[half], selected.role)) writable.set(cellName(worker.id, day), half);
      }
    }
    const changes = [];
    const seen = new Set();
    for (const [name, value] of form.entries()) {
      if (!writable.has(name) || seen.has(name)) return say('Có ô bị khóa, ngoài phạm vi hoặc bị trùng. Bảng công chưa được lưu.');
      seen.add(name);
      const result = parseCode(value);
      if (!result) {
        const match = /^cell:(.*):(\d+)$/.exec(name);
        const worker = selected.visible.find(item => item.id === match[1]);
        return say(`Kiểm tra ô ${worker.code}, ngày ${dayLabel(match[2])}. Bảng công chưa được lưu.`);
      }
      changes.push({ name, half: writable.get(name), code: result.code });
    }
    if (!changes.length) return say('Không có ô được phép sửa trong kỳ này.');
    const changed = changes.filter(item => item.code !== (periods[item.half].cells[item.name] || ''));
    if (!changed.length) return say('Bảng công không có thay đổi.');
    for (const half of new Set(changed.map(item => item.half))) {
      const period = storedPeriod(ctx, selected, half, true);
      const part = changed.filter(item => item.half === half);
      for (const item of part) {
        if (item.code) period.cells[item.name] = item.code;
        else delete period.cells[item.name];
      }
      record(period, ctx, `Cập nhật ${part.length} ô công`);
    }
    return save(ctx, `Đã lưu ${changed.length} ô công.`);
  }

  function handle(action, form, ctx) {
    const actor = actorOf(ctx);
    const selected = model(ctx);
    if (!['KT', 'DT1'].includes(selected.role) || !actor || !selected.team) return say('Bạn không có quyền thực hiện thao tác này.');
    if (action !== 'save' && document.querySelector('[data-attendance-grid] input[data-grid-row]') && [...document.querySelectorAll('[data-attendance-grid] input[data-grid-row]')].some(input => input.value !== input.defaultValue)) {
      return say('Vui lòng lưu bảng công trước khi chuyển kỳ hoặc thực hiện thao tác khác.');
    }
    if (action === 'filter') {
      const month = get(form, 'month');
      const projectId = get(form, 'projectId');
      if (!/^(?:20\d{2}|2100)-(?:0[1-9]|1[0-2])$/.test(month) || !selected.projects.some(project => project.id === projectId)) return say('Vui lòng chọn tháng và công trình hợp lệ.');
      const team = selected.teams.find(item => item.id === get(form, 'teamId'));
      const half = get(form, 'half');
      const day = Number(get(form, 'day'));
      const wanted = team && (projectId === selected.projectId || team.projectId === projectId) ? team : selected.teams.find(item => item.projectId === projectId);
      filters.set(actor, { month, projectId: wanted.projectId, teamId: wanted.id, half: ['first', 'second', 'full'].includes(half) ? half : 'first', day: Number.isInteger(day) && day > 0 ? day : 1, query: get(form, 'query').slice(0, 80) });
      return save(ctx, 'Đã cập nhật bộ lọc.');
    }

    const periods = { first: storedPeriod(ctx, selected, 'first'), second: storedPeriod(ctx, selected, 'second') };
    if (action === 'export' && selected.role === 'KT') return exportCSV(selected, periods);
    if (action === 'save') return saveGrid(form, ctx, selected, periods);

    const stage = { submit: ['DT1', 'draft', 'submitted'], confirm: ['KT', 'submitted', 'confirmed'], lock: ['KT', 'confirmed', 'locked'] };
    const half = get(form, 'id');
    if (!Object.hasOwn(stage, action) || !selected.days.some(day => halfFor(day) === half)) return say('Thao tác không thuộc kỳ đang mở.');
    const [role, from, to] = stage[action];
    if (selected.role !== role || periods[half].status !== from) return say('Kỳ đã đổi trạng thái hoặc bạn không có quyền thực hiện.');
    if (action === 'submit' && !Object.keys(periods[half].cells).length) return say('Cần ghi công trước khi gửi Kế toán.');
    const period = storedPeriod(ctx, selected, half, true);
    period.status = to;
    record(period, ctx, periodLabels[to]);
    return save(ctx, `${periodLabels[to]}.`);
  }

  document.addEventListener('paste', event => {
    const target = event.target;
    if (!target.matches?.('[data-attendance-grid] input[data-grid-row]')) return;
    const plain = event.clipboardData?.getData('text/plain');
    if (!plain || (!plain.includes('\t') && !plain.includes('\n'))) return;
    event.preventDefault();
    const grid = target.form;
    const firstRow = Number(target.dataset.gridRow);
    const firstColumn = Number(target.dataset.gridCol);
    const lines = plain.replaceAll('\r\n', '\n').replaceAll('\r', '\n').replace(/\n$/, '').split('\n');
    const updates = [];
    for (const [row, line] of lines.entries()) {
      for (const [column, value] of line.split('\t').entries()) {
        const input = grid.querySelector(`[data-grid-row="${firstRow + row}"][data-grid-col="${firstColumn + column}"]`);
        const parsed = parseCode(value);
        if (!input || !parsed) {
          say(`Vị trí dán hàng ${row + 1}, cột ${column + 1} có mã sai hoặc ô bị khóa. Chưa dán ô nào.`);
          return;
        }
        updates.push([input, parsed.code]);
      }
    }
    for (const [input, value] of updates) input.value = value;
    say(`Đã dán ${updates.length} ô. Chọn Lưu bảng công để ghi nhận.`);
  });

  document.addEventListener('keydown', event => {
    const input = event.target;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !input.matches?.('[data-attendance-grid] input[data-grid-row]')) return;
    const keys = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0], Enter: [1, 0] };
    if (!Object.hasOwn(keys, event.key)) return;
    const [y, x] = keys[event.key];
    const next = input.form.querySelector(`[data-grid-row="${Number(input.dataset.gridRow) + y}"][data-grid-col="${Number(input.dataset.gridCol) + x}"]`);
    if (!next) return;
    event.preventDefault();
    next.focus();
    next.select();
  });

  window.NPAttendance = { render, handle };
})();
