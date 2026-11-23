(function () {
  'use strict';

  const financeTab = 'v2-finance-attendance';
  const teamTab = 'v2-team-attendance';
  const periodLabels = { draft: 'Nháp', submitted: 'Đội trưởng đã gửi', returned: 'Cần bổ sung', confirmed: 'Kế toán đã đối chiếu', locked: 'Đã khóa' };
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
  const leaveCode = leave => leave.type === 'sick' ? 'OM' : leave.type === 'unpaid' ? 'N' : 'P';
  const rangeDays = (first, last) => Array.from({ length: last - first + 1 }, (_, index) => first + index);
  const monthLength = month => new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();

  const isoDay = (month, day) => `${month}-${dayLabel(day)}`;
  const daysFor = (month, half) => half === 'first' ? rangeDays(1, 15) : rangeDays(16, monthLength(month));
  const people = ctx => [...ctx.state.workers, ...(ctx.data.people?.employees || [])];

  function rowsFor(ctx, team, month, half) {
    return people(ctx).flatMap(worker => {
      const days = daysFor(month, half).flatMap(day => {
        const date = isoDay(month, day);
        const assignment = window.NPWorkspace.assignmentAt(ctx.data, worker, date);
        return assignment.teamId === team.id && assignment.projectId === team.projectId
          ? [{ day, assignmentId: assignment.id || null, leave: window.NPWorkspace.approvedLeaveAt(ctx.data, worker, date) }]
          : [];
      });
      return days.length ? [{ id: worker.id, code: worker.code, name: worker.name, dailyWage: worker.dailyWage, days }] : [];
    });
  }

  function scopedTeams(ctx) {
    const { projectId, teamId } = ctx.account || {};
    return (ctx.state.teams || []).filter(team => (!projectId || projectId === 'ALL' || team.projectId === projectId)
      && (roleOf(ctx) !== 'DT1' || team.id === teamId));
  }

  function model(ctx) {
    const teams = scopedTeams(ctx);
    const saved = filters.get(actorOf(ctx)) || {};
    const team = teams.find(item => item.id === saved.teamId) || teams.find(item => !saved.projectId || item.projectId === saved.projectId) || teams[0];
    const role = roleOf(ctx);
    const mode = role === 'DT1' ? (ctx.attendanceMode || 'today') : null;
    const current = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const today = Number(current.slice(-2));
    const month = mode === 'today' ? current.slice(0, 7) : (saved.month || (mode === 'period' ? current.slice(0, 7) : teamMonth));
    const lastDay = monthLength(month);
    const half = saved.half || 'first';
    const day = Math.min(mode === 'today' ? today : (saved.day || Math.min(today, lastDay)), lastDay);
    const days = role === 'DT1' ? [day] : rangeDays(half === 'second' ? 16 : 1, half === 'first' ? 15 : lastDay);
    const projectId = team?.projectId || '';
    const projects = (ctx.state.projects || []).filter(project => teams.some(item => item.projectId === project.id));
    const periods = team ? Object.fromEntries(['first', 'second'].map(key => {
      const period = ctx.data.attendance?.periods?.[periodKey(month, team.id, key)];
      return [key, period?.snapshot?.rows || rowsFor(ctx, team, month, key)];
    })) : {};
    const eligible = new Map();
    for (const currentDay of days) {
      for (const row of periods[halfFor(currentDay)] || []) {
        const match = row.days.find(item => item.day === currentDay);
        if (!match) continue;
        if (!eligible.has(row.id)) eligible.set(row.id, { ...row, perDay: new Map() });
        eligible.get(row.id).perDay.set(currentDay, match);
      }
    }
    const workers = [...eligible.values()];
    const query = role === 'DT1' ? '' : (saved.query || '').toLocaleLowerCase('vi');
    const visible = workers.filter(worker => `${worker.code} ${worker.name}`.toLocaleLowerCase('vi').includes(query));
    return { month, lastDay, half, day, today, days, projectId, team, teams, projects, workers, visible, role, mode, periods, query: saved.query || '' };
  }

  function storedPeriod(ctx, selected, half, create = false) {
    const key = periodKey(selected.month, selected.team.id, half);
    const existing = ctx.data.attendance?.periods?.[key];
    if (existing) return existing;
    const period = { status: 'draft', cells: {}, events: [] };
    if (selected.month === teamMonth) {
      for (const [index, worker] of selected.periods[half].entries()) {
        for (const { day } of worker.days) {
          if (day > 22) continue;
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
    return (role === 'DT1' && ['draft', 'returned'].includes(period.status)) || (role === 'KT' && period.status === 'submitted');
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
    if (selected.role === 'DT1' && ['draft', 'returned'].includes(period.status)) actions.push(workflowButton('submit', 'Gửi Kế toán', half));
    if (selected.role === 'KT' && period.status === 'submitted') actions.push(workflowButton('confirm', 'Xác nhận đối chiếu', half));
    if (selected.role === 'KT' && period.status === 'submitted') actions.push(`<details><summary>Trả bổ sung</summary>
      <form data-np-module="attendance" data-np-action="return">
        <input type="hidden" name="id" value="${half}">
        <label>Lý do<input name="reason" required maxlength="240"></label>
        <button type="submit">Trả bảng công</button>
      </form></details>`);
    if (selected.role === 'KT' && period.status === 'confirmed') actions.push(workflowButton('lock', 'Khóa kỳ', half));
    const label = half === 'first' ? '01–15' : `16–${selected.lastDay}`;
    const history = [...period.events].reverse().map(event => `<li>${esc(event.label)} · ${esc(event.actor)}${event.at ? ` · ${esc(new Date(event.at).toLocaleString('vi-VN'))}` : ''}</li>`).join('');
    return `<div class="np-attendance-period"><strong>Kỳ ${label}</strong><span data-status="${period.status}">${periodLabels[period.status]}</span>${period.snapshot ? `<small>${esc(period.snapshot.version)}</small>` : ''}${actions.join('')}${history ? `<details><summary>Lịch sử</summary><ul>${history}</ul></details>` : ''}</div>`;
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
      ${role === 'KT' ? `<label>Tìm công nhân<input name="query" type="search" value="${esc(query)}" maxlength="80" placeholder="Mã hoặc họ tên" /></label>` : ''}
      <button type="submit">Áp dụng</button>
    </form>`;
  }

  function valueFor(worker, day, period) {
    const use = worker.perDay.get(day);
    if (!use) return '';
    const values = period.snapshot?.cells || period.cells;
    if (period.status === 'locked') return values[cellName(worker.id, day)] || '';
    return use.leave ? leaveCode(use.leave) : values[cellName(worker.id, day)] || '';
  }

  function cell(worker, day, periods, selected, escape, row, column) {
    const period = periods[halfFor(day)];
    const name = cellName(worker.id, day);
    const use = worker.perDay.get(day);
    if (!use) return { input: '<span title="Ngoài phân công">—</span>', tone: '', value: '' };
    const value = valueFor(worker, day, period);
    const edit = !use.leave && canEdit(period, selected.role);
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
        return `<tr><td>${row + 1}</td><td>${esc(worker.code)}</td><td>${esc(worker.name)}</td><td>${esc(selected.team.name)}</td><td>${esc(selected.team.projectId)}</td>
          ${cells.map(item => `<td class="np-attendance-cell" data-tone="${item.tone}">${item.input}</td>`).join('')}<td>${hours.regular.toLocaleString('vi-VN')}</td><td>${hours.ot.toLocaleString('vi-VN')}</td></tr>`;
      }).join('') || `<tr><td colspan="${selected.days.length + 7}">Không tìm thấy công nhân.</td></tr>`}</tbody></table></div>`;
  }

  function dailyGrid(selected, periods, esc) {
    const icon = window.NPWorkspace.icon;
    const rows = selected.workers.map((worker, row) => {
      const item = cell(worker, selected.day, periods, selected, esc, row, 0);
      const code = parseCode(item.value);
      const state = code?.ot ? 'overtime' : code?.regular ? 'present' : item.value ? 'absent' : 'pending';
      return { worker, item, state };
    });
    const counts = rows.reduce((sum, row) => ({ ...sum, [row.state]: (sum[row.state] || 0) + 1 }), {});
    const states = {
      present: ['people','Có mặt'], absent: ['user','Nghỉ'], overtime: ['clock','Tăng ca'], pending: ['clock','Chưa ghi']
    };
    return `<div class="np-team-day-metrics">
      ${['present','absent','overtime'].map(state => `<div data-tone="${state}">${icon(states[state][0])}<strong>${counts[state] || 0}</strong><span>${states[state][1]}</span></div>`).join('')}
      </div>
      <label class="np-team-day-search">${icon('search')}<input type="search" data-team-search placeholder="Tìm công nhân…" aria-label="Tìm công nhân" /></label>
      <div class="np-team-day-list">${rows.map(({worker,item,state})=>`<details data-team-worker="${esc(worker.name + ' ' + worker.code)}">
        <summary><img class="np-crew-avatar" src="assets/np-demo-crew.webp" width="33" height="33" alt="" loading="lazy" decoding="async" />
        <span><strong>${esc(worker.name)}</strong><small>${esc(worker.code)}</small></span><b data-tone="${state}">${states[state][1]}</b>${icon('arrow')}</summary>
        <div class="np-team-day-edit"><span>Giờ công / mã nghỉ</span>${item.input}</div></details>`).join('')}<p data-team-no-results ${rows.length ? 'hidden' : ''}>Không tìm thấy công nhân.</p></div>`;
  }

  function renderTeam(selected, periods, halves, hasEdits, esc) {
    const icon = window.NPWorkspace.icon;
    const range = selected.day <= 15 ? '01–15' : '16–' + selected.lastDay;
    const month = selected.month.slice(5);
    return `<section class="np-attendance np-team-day" data-attendance-mobile>
      <div class="np-team-day-tabs" aria-label="Kỳ chấm công">
        <button type="button" data-np-module="attendance" data-np-action="team-mode" data-np-id="today" aria-pressed="${selected.mode==='today'}">Hôm nay (${dayLabel(selected.today)}/${month})</button>
        <button type="button" data-np-module="attendance" data-np-action="team-mode" data-np-id="period" aria-pressed="${selected.mode==='period'}">Kỳ (${range}/${month})</button>
      </div>
      ${selected.mode === 'period' ? filtersForm(selected,esc) : ''}
      <p data-attendance-feedback class="np-attendance-feedback" role="status">${esc(feedback)}</p>
      <form data-np-module="attendance" data-np-action="save" data-attendance-grid>
        ${dailyGrid(selected,periods,esc)}
        ${hasEdits ? `<button type="submit" class="np-attendance-save np-team-primary">${icon('clipboard')} Cập nhật chấm công</button>` : ''}
      </form>
      ${selected.mode === 'period' ? `<div class="np-attendance-periods">${halves.map(half=>periodStatus(selected,half,periods[half],esc)).join('')}</div>` : ''}
    </section>`;
  }

  const correctionTabs = { 'v2-director-corrections': 'BGD', 'v2-worker-corrections': 'CN', 'v2-finance-corrections': 'KT' };
  const corrections = ctx => ctx.data.attendance?.corrections || [];

  function correctionWorkers(ctx, snapshot) {
    const role = roleOf(ctx);
    const projectId = ctx.account.projectId;
    if (role === 'CN') return snapshot.rows.filter(worker => worker.code === ctx.account.workerCode);
    if (!['BGD', 'KT'].includes(role) || (projectId && projectId !== 'ALL' && projectId !== snapshot.projectId)) return [];
    return snapshot.rows;
  }

  function lockedPeriods(ctx) {
    return Object.values(ctx.data.attendance?.periods || {}).filter(period => period.status === 'locked' && period.snapshot && correctionWorkers(ctx, period.snapshot).length);
  }

  function correctionForm(period, ctx) {
    const { esc } = ctx;
    const shot = period.snapshot;
    return `<details class="np-work-card"><summary>${esc(shot.version)}</summary>
      <form class="np-admin-form" data-np-module="attendance" data-np-action="propose-correction">
        <input type="hidden" name="version" value="${esc(shot.version)}">
        <label>Nhân sự<select name="workerId" required>${fieldOptions(correctionWorkers(ctx,shot),'',esc)}</select></label>
        <label>Ngày<select name="day" required>${daysFor(shot.month,shot.half).map(day => `<option>${day}</option>`).join('')}</select></label>
        <label>Công đề nghị<input name="code" placeholder="8, 8+2, N…" maxlength="14" required></label>
        <label>Lý do<input name="reason" maxlength="240" required></label>
        <label>Mã bằng chứng<input name="evidence" maxlength="100" required></label>
        <button type="submit" class="btn btn-primary">Gửi đề nghị</button>
      </form></details>`;
  }

  function renderCorrections(ctx) {
    const role = roleOf(ctx);
    const { esc } = ctx;
    const periods = lockedPeriods(ctx);
    const allowed = new Set(periods.map(period => period.snapshot.version));
    const items = corrections(ctx).filter(item => allowed.has(item.version) && (role !== 'CN' || item.workerCode === ctx.account.workerCode));
    const statuses = { proposed: 'Chờ đối chiếu', reviewed: 'Chờ Giám đốc', approved: 'Đã duyệt', rejected: 'Từ chối' };
    return `<section class="np-work-card np-attendance"><h2>Điều chỉnh công sau khóa</h2>
      <p data-attendance-feedback role="status">${esc(feedback)}</p>
      ${role !== 'BGD' ? periods.map(period => correctionForm(period, ctx)).join('') : ''}
      <div class="table-scroll"><table class="data-table"><thead><tr><th>Phiên bản bảng công</th><th>Nhân sự</th><th>Ngày</th><th>Công cũ → mới</th><th>Lý do / Bằng chứng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>${items.map(item => `<tr><td>${esc(item.version)}</td><td>${esc(item.workerCode)}</td><td>${item.day}</td>
        <td>${esc(item.before || '—')} → ${esc(item.after)}</td><td>${esc(item.reason)}<br>${esc(item.evidence)}</td>
        <td>${statuses[item.status]}</td><td>
        ${role === 'KT' && item.status === 'proposed' && item.requestedBy !== actorOf(ctx) ? workflowButton('review-correction','Đối chiếu',item.id) : ''}
        ${role === 'BGD' && item.status === 'reviewed' && ![item.requestedBy,item.reviewedBy].includes(actorOf(ctx))
          ? workflowButton('approve-correction','Duyệt',item.id) + workflowButton('reject-correction','Từ chối',item.id) : ''}
        </td></tr>`).join('') || '<tr><td colspan="7">Chưa có phiếu điều chỉnh.</td></tr>'}</tbody></table></div>
    </section>`;
  }

  function handleCorrection(action, form, ctx) {
    const role = roleOf(ctx);
    const actor = actorOf(ctx);
    if (!actor) return;
    if (action === 'propose-correction' && ['CN', 'KT'].includes(role)) {
      const version = get(form, 'version');
      const shot = lockedPeriods(ctx).find(period => period.snapshot.version === version)?.snapshot;
      const worker = shot && correctionWorkers(ctx, shot).find(item => item.id === get(form, 'workerId'));
      const day = Number(get(form, 'day'));
      const code = parseCode(get(form, 'code'))?.code;
      const reason = get(form, 'reason');
      const evidence = get(form, 'evidence');
      if (!worker?.days.some(item => item.day === day) || !code || !reason || reason.length > 240 || !evidence || evidence.length > 100) {
        return say('Chọn ngày đã phân công, nhập công, lý do và mã bằng chứng hợp lệ.');
      }
      const related = corrections(ctx).filter(item => item.version === version && item.workerId === worker.id && item.day === day);
      const before = related.findLast(item => item.status === 'approved')?.after ?? shot.cells[cellName(worker.id, day)] ?? '';
      if (before === code || related.some(item => ['proposed', 'reviewed'].includes(item.status))) {
        return say('Công đề nghị phải có thay đổi và mỗi ô chỉ được có một phiếu đang chờ.');
      }
      (ctx.data.attendance.corrections ||= []).push({
        id: crypto.randomUUID(), version, workerId: worker.id, workerCode: worker.code, day, before, after: code,
        reason, evidence, status: 'proposed', requestedBy: actor, requestedAt: new Date().toISOString()
      });
      return save(ctx, 'Đã gửi phiếu điều chỉnh. Bảng công chốt gốc được giữ nguyên.');
    }
    const item = corrections(ctx).find(entry => entry.id === get(form, 'id'));
    if (!item || !lockedPeriods(ctx).some(period => period.snapshot.version === item.version) || item.requestedBy === actor) {
      return say('Phiếu ngoài phạm vi hoặc không thể tự xử lý phiếu đã lập.');
    }
    if (action === 'review-correction' && role === 'KT' && item.status === 'proposed') {
      item.status = 'reviewed';
      item.reviewedBy = actor;
      item.reviewedAt = new Date().toISOString();
    } else if (['approve-correction', 'reject-correction'].includes(action) && role === 'BGD'
      && item.status === 'reviewed' && item.reviewedBy !== actor) {
      item.status = action === 'approve-correction' ? 'approved' : 'rejected';
      item.decidedBy = actor;
      item.decidedAt = new Date().toISOString();
    } else {
      return say('Phiếu chưa đến bước này hoặc vai trò không được thực hiện.');
    }
    return save(ctx, 'Đã cập nhật phiếu điều chỉnh.');
  }

  function render(tab, ctx) {
    const role = roleOf(ctx);
    if (Object.hasOwn(correctionTabs, tab)) return correctionTabs[tab] === role ? renderCorrections(ctx) : '<p>Bạn không có quyền xem phiếu điều chỉnh.</p>';
    if ((tab === financeTab && role !== 'KT') || (tab === teamTab && role !== 'DT1')) return '<p>Bạn không có quyền xem bảng công này.</p>';
    if (![teamTab, financeTab].includes(tab)) return '';
    const selected = model(ctx);
    const esc = ctx.esc;
    if (!selected.team) return '<section class="np-work-card"><h2>Chưa có đội trong phạm vi tài khoản</h2><p>Bảng công sẽ hiển thị khi có đội thi công được phân công.</p></section>';
    const periods = { first: storedPeriod(ctx, selected, 'first'), second: storedPeriod(ctx, selected, 'second') };
    const halves = [...new Set(selected.days.map(halfFor))];
    const hasEdits = halves.some(half => canEdit(periods[half], role));
    if (role === 'DT1') return renderTeam(selected, periods, halves, hasEdits, esc);
    return `<section class="np-attendance" ${role === 'DT1' ? 'data-attendance-mobile' : ''}>
      <header class="np-attendance-heading"><div><h1>${role === 'KT' ? 'Bảng công Excel Pro' : 'Chấm công đội'}</h1><p>${esc(selected.team.name)} · ${selected.month.slice(5)}/${selected.month.slice(0, 4)}</p></div>${role === 'KT' ? workflowButton('export', 'Xuất Excel', '') + workflowButton('print', 'In / PDF', '') : ''}</header>
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

  function exportAttendance(selected, periods, action) {
    const rows = [['STT', 'Mã NV', 'Họ và tên', 'Đội', 'Công trình', ...selected.days.map(dayLabel), 'Giờ công', 'Tăng ca (giờ)']];
    for (const [index, worker] of selected.visible.entries()) {
      const values = selected.days.map(day => valueFor(worker, day, periods[halfFor(day)]));
      const hours = totals(values);
      rows.push([index + 1, worker.code, worker.name, selected.team.id, selected.team.projectId, ...values, hours.regular, hours.ot]);
    }
    const name = `Bang-cong-${selected.team.id}-${selected.month}-${selected.half}`;
    return action === 'print' ? window.NPReport.print(rows, name) : window.NPReport.download(rows, name);
  }

  function saveGrid(form, ctx, selected, periods) {
    const writable = new Map();
    for (const worker of selected.visible) {
      for (const day of selected.days) {
        const half = halfFor(day);
        if (worker.perDay.has(day) && !worker.perDay.get(day).leave && canEdit(periods[half], selected.role)) writable.set(cellName(worker.id, day), half);
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
    if (action.endsWith('-correction')) return handleCorrection(action, form, ctx);
    const actor = actorOf(ctx);
    const selected = model(ctx);
    if (!['KT', 'DT1'].includes(selected.role) || !actor || !selected.team) return say('Bạn không có quyền thực hiện thao tác này.');
    if (action !== 'save' && document.querySelector('[data-attendance-grid] input[data-grid-row]') && [...document.querySelectorAll('[data-attendance-grid] input[data-grid-row]')].some(input => input.value !== input.defaultValue)) {
      return say('Vui lòng lưu bảng công trước khi chuyển kỳ hoặc thực hiện thao tác khác.');
    }
    if (action === 'team-mode' && selected.role === 'DT1') {
      const mode = get(form, 'id');
      if (!['today', 'period'].includes(mode)) return;
      ctx.setAttendanceMode(mode);
      return save(ctx, '');
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
    if (['export', 'print'].includes(action) && selected.role === 'KT') return exportAttendance(selected, periods, action);
    if (action === 'save') return saveGrid(form, ctx, selected, periods);

    const stage = {
      submit: ['DT1', ['draft', 'returned'], 'submitted'],
      return: ['KT', ['submitted'], 'returned'],
      confirm: ['KT', ['submitted'], 'confirmed'],
      lock: ['KT', ['confirmed'], 'locked']
    };
    const half = get(form, 'id');
    if (!Object.hasOwn(stage, action) || !selected.days.some(day => halfFor(day) === half)) return say('Thao tác không thuộc kỳ đang mở.');
    const [role, from, to] = stage[action];
    const current = periods[half];
    if (selected.role !== role || !from.includes(current.status)) return say('Kỳ đã đổi trạng thái hoặc bạn không có quyền thực hiện.');
    const reason = get(form, 'reason');
    if (action === 'return' && (!reason || reason.length > 240)) return say('Nhập lý do trả bảng công.');
    const rows = selected.periods[half];
    const eligibleCells = Object.fromEntries(rows.flatMap(worker => worker.days.map(({day, leave}) => {
      const key = cellName(worker.id, day);
      return [key, leave ? leaveCode(leave) : current.cells[key] || ''];
    })));
    if (action === 'submit' && (!Object.keys(eligibleCells).length || Object.values(eligibleCells).some(value => !value))) {
      return say('Cần ghi đủ công hoặc mã nghỉ cho các ngày đã phân công trước khi gửi.');
    }
    const period = storedPeriod(ctx, selected, half, true);
    if (action === 'lock') {
      const key = periodKey(selected.month, selected.team.id, half);
      period.snapshot = {
        version: key + '/v1', teamId: selected.team.id, projectId: selected.team.projectId, month: selected.month,
        half, rows: structuredClone(rows), cells: eligibleCells, lockedBy: actor, lockedAt: new Date().toISOString()
      };
    }
    period.status = to;
    record(period, ctx, reason ? periodLabels[to] + ' · ' + reason : periodLabels[to]);
    return save(ctx, `${periodLabels[to]}.`);
  }

  document.addEventListener('input', event => {
    if (!event.target.matches?.('[data-team-search]')) return;
    const section = event.target.closest('.np-team-day');
    const plain = value => value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll('đ', 'd');
    const query = plain(event.target.value.trim());
    let matches = 0;
    for (const row of section.querySelectorAll('[data-team-worker]')) {
      row.hidden = !plain(row.dataset.teamWorker).includes(query);
      if (!row.hidden) matches++;
    }
    section.querySelector('[data-team-no-results]').hidden = matches > 0;
  });

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

  window.NPAttendance = { render, handle, parseCode };
})();
