(() => {
  'use strict';

  const views = new Map([
    ['ns-workers', 'NS'], ['ns-assignments', 'NS'], ['ns-leave', 'NS'],
    ['v2-team-leave', 'DT1'], ['v2-worker-leave', 'CN']
  ]);

  const profileStates = { active: 'Đang làm', paused: 'Tạm nghỉ', left: 'Đã nghỉ việc', rehired: 'Tái tuyển' };
  const leaveStates = { submitted: 'Chờ đội trưởng xác nhận', confirmed: 'Chờ nhân sự duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' };

  function read(context) {
    const saved = context.data.people || {};
    return {
      employees: saved.employees || [],
      profiles: saved.profiles || {},
      assignments: saved.assignments || [],
      leave: saved.leave || []
    };
  }

  function roster(context, people) {
    return [...(context.state.workers || []), ...people.employees];
  }

  function mayUse(context, role) {
    return Boolean(role && context.account && context.role === role && (!context.account.roleId || context.account.roleId === role));
  }

  function identity(account) {
    return String(account.id || account.username || account.workerCode || '');
  }

  function byId(items, id) {
    return (items || []).find(x => String(x.id) === String(id));
  }

  function normalize(value) {
    return String(value ?? '').trim();
  }

  function dateValue(raw) {
    const value = normalize(raw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value ? value : '';
  }

  function today() {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  }

  function formatDate(value) {
    if (!value) return '—';
    const [year, month, day] = value.split('-');
    return day + '/' + month + '/' + year;
  }

  function range(form) {
    const start = dateValue(form.get('start'));
    const end = dateValue(form.get('end'));
    if (!start || !end || end < start) throw new Error('Chọn khoảng ngày hợp lệ.');
    return { start, end };
  }

  function overlaps(a, b) {
    return a.start <= b.end && b.start <= a.end;
  }

  function teamAt(worker, people, date) {
    return people.assignments.find(x => x.workerCode === worker?.code && x.start <= date && x.end >= date)?.teamId || worker?.teamId || '';
  }

  function fixedTeam(worker, people, period) {
    const firstTeam = teamAt(worker, people, period.start);
    const assignments = people.assignments.filter(x => x.workerCode === worker?.code && overlaps(x, period))
      .sort((a,b) => a.start.localeCompare(b.start));
    let nextDay = period.start;
    for (const assignment of assignments) {
      if (assignment.teamId !== firstTeam) return '';
      if (assignment.start > nextDay && worker?.teamId !== firstTeam) return '';
      if (assignment.end >= period.end) return firstTeam;
      nextDay = new Date(Date.parse(assignment.end) + 86400000).toISOString().slice(0, 10);
    }
    return worker?.teamId === firstTeam ? firstTeam : '';
  }

  function panel(title, subtitle, body, actions = '') {
    return `<section class="section-card v2-table-section v2-people">
      <div class="section-header v2-table-header"><div><h3>${title}</h3><p class="section-desc">${subtitle}</p></div>${actions}</div>
      ${body}
    </section>`;
  }

  function table(heads, rows, label, emptyMessage, filterable = false) {
    return `<div class="table-scroll" tabindex="0" role="region" aria-label="${label}">
      <table class="data-table"><thead><tr>${heads.map(head => `<th scope="col">${head}</th>`).join('')}</tr></thead>
      <tbody>${rows.join('') || `<tr><td class="v2-table-empty" colspan="${heads.length}">${emptyMessage}</td></tr>`}
      ${filterable && rows.length ? `<tr data-people-empty hidden><td class="v2-table-empty" colspan="${heads.length}">Không tìm thấy nhân sự phù hợp.</td></tr>` : ''}</tbody></table>
    </div>`;
  }

  function form(action, inner, btn) {
    return `<form class="v2-people-form" data-np-module="people" data-np-action="${action}">${inner}
      <button type="submit" class="btn btn-primary">${btn}</button></form>`;
  }

  function input(label, name, attrs = '', type = 'text') {
    return `<label>${label}<input type="${type}" name="${name}" ${attrs}></label>`;
  }

  function select(label, name, options) {
    return `<label>${label}<select name="${name}" required>${options}</select></label>`;
  }

  function rosterView(context, people) {
    const { esc, state } = context;
    const workers = roster(context, people);
    const currentDate = today();
    const employeeStatus = worker => Object.hasOwn(people.profiles, worker.code) ? people.profiles[worker.code].status || 'active' : 'active';
    const isReady = worker => {
      const profile = Object.hasOwn(people.profiles, worker.code) ? people.profiles[worker.code] : {};
      return Boolean(profile.identityReady && profile.contractReady && (!profile.contractUntil || profile.contractUntil >= currentDate));
    };
    const rows = workers.map(worker => {
      const profile = Object.hasOwn(people.profiles, worker.code) ? people.profiles[worker.code] : {};
      const team = byId(state.teams, teamAt(worker, people, currentDate));
      const status = profileStates[profile.status] || 'Đang làm';
      const selectedStates = Object.entries(profileStates).map(([key, label]) => `<option value="${key}" ${key === (profile.status || 'active') ? 'selected' : ''}>${label}</option>`).join('');
      const edit = form('update-profile', `
        <input type="hidden" name="workerCode" value="${esc(worker.code)}">
        ${select('Trạng thái', 'status', selectedStates)}
        ${input('Ngày vào làm', 'joinedOn', `value="${esc(profile.joinedOn || '')}"`, 'date')}
        ${input('Ngày nghỉ việc', 'leftOn', `value="${esc(profile.leftOn || '')}"`, 'date')}
        ${input('Ngày tái tuyển', 'rehiredOn', `value="${esc(profile.rehiredOn || '')}"`, 'date')}
        ${input('Hạn hợp đồng', 'contractUntil', `value="${esc(profile.contractUntil || '')}"`, 'date')}
        <label class="v2-people-check"><input name="identityReady" type="checkbox" ${profile.identityReady ? 'checked' : ''}> Đã đủ giấy tờ xác minh</label>
        <label class="v2-people-check"><input name="contractReady" type="checkbox" ${profile.contractReady ? 'checked' : ''}> Đã đủ hợp đồng</label>
      `, 'Lưu hồ sơ');
      const history = [...(profile.history || [])].reverse().map(entry => `<li>${formatDate(entry.at.slice(0, 10))} · ${esc(profileStates[entry.status])} · ${esc(entry.by)}</li>`).join('');
      const project = byId(state.projects, team?.projectId);
      return `<tr data-people-row data-name="${esc(worker.name)}" data-code="${esc(worker.code)}" data-status="${esc(employeeStatus(worker))}" data-team="${esc(team?.id || '')}" data-project="${esc(project?.id || '')}">
        <td><strong>${esc(worker.code)}</strong></td><td>${esc(worker.name)}</td><td>${esc(team?.name || 'Chưa có đội')}</td><td>${esc(project?.name || '—')}</td>
        <td><span class="badge ${profile.status === 'left' ? 'badge-danger' : profile.status === 'paused' ? 'badge-warning' : 'badge-success'}">${status}</span></td>
        <td><span class="badge ${isReady(worker) ? 'badge-success' : 'badge-warning'}">${isReady(worker) ? 'Đủ hồ sơ' : profile.contractUntil && profile.contractUntil < currentDate ? 'Hợp đồng hết hạn' : 'Cần rà soát'}</span></td>
        <td><details class="v2-people-edit"><summary>Cập nhật</summary>${edit}${history ? `<details class="v2-people-meta"><summary>Lịch sử cập nhật</summary><ul>${history}</ul></details>` : ''}</details></td></tr>`;
    });
    const statuses = [['', 'Tất cả'], ...Object.entries(profileStates)];
    const options = (items = []) => items.map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('');
    const buttons = `<div class="v2-people-actions"><button class="btn btn-primary" type="button" data-people-add aria-expanded="false" aria-controls="np-people-create">+ Thêm nhân sự</button>
      <button class="btn btn-soft" type="button" data-people-export ${rows.length ? '' : 'disabled'}>Xuất CSV</button></div>`;
    return panel('Quản lý nhân sự', 'Mã nhân sự, tình trạng làm việc và mức độ đầy đủ của hồ sơ.', `
      <div id="np-people-create" class="v2-people-add" hidden>
        ${form('create-worker', input('Mã nhân sự', 'code', 'required maxlength="40"') + input('Họ và tên', 'name', 'required maxlength="120"') + input('Ngày vào làm', 'joinedOn', '', 'date'), 'Tạo hồ sơ')}
      </div>
      <div class="v2-people-statuses" role="group" aria-label="Lọc theo trạng thái">
        ${statuses.map(([value, label]) => `<button type="button" data-people-status="${value}" aria-pressed="${!value}">${label} (${value ? workers.filter(worker => employeeStatus(worker) === value).length : workers.length})</button>`).join('')}
      </div>
      <div class="v2-people-filters v2-table-filters">
        <input type="search" aria-label="Tìm mã hoặc tên nhân sự" placeholder="Tìm theo mã, họ tên…" data-people-filter="search">
        <select aria-label="Lọc theo đội" data-people-filter="team"><option value="">Tất cả đội</option>${options(state.teams)}</select>
        <select aria-label="Lọc theo công trình" data-people-filter="project"><option value="">Tất cả công trình</option>${options(state.projects)}</select>
        <select aria-label="Lọc theo trạng thái" data-people-filter="status">${statuses.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select>
      </div>
      ${table(['Mã NV', 'Họ và tên', 'Đội', 'Công trình', 'Trạng thái', 'Hồ sơ', 'Thao tác'], rows, 'Hồ sơ nhân sự', 'Chưa có hồ sơ nhân sự.', true)}`, buttons);
  }

  function assignmentView(context, people) {
    const { esc, state } = context;
    const workers = roster(context, people);
    const workerOptions = workers.map(w => `<option value="${esc(w.code)}">${esc(w.code)} · ${esc(w.name)}</option>`).join('');
    const teamOptions = (state.teams || []).map(t => `<option value="${esc(t.id)}">${esc(t.name)} · ${esc(byId(state.projects, t.projectId)?.name || t.projectId)}</option>`).join('');
    const rows = [...people.assignments].sort((a,b) => b.start.localeCompare(a.start)).map(a => {
      const worker = workers.find(w => w.code === a.workerCode);
      const team = byId(state.teams, a.teamId);
      const project = byId(state.projects, a.projectId);
      return `<tr><td>${esc(worker?.name || a.workerCode)}</td><td>${esc(team?.name || a.teamId)}</td><td>${esc(project?.name || a.projectId)}</td>
        <td>${formatDate(a.start)} – ${formatDate(a.end)}</td><td>${esc(a.reason || '—')}</td><td>${esc(a.by)}</td></tr>`;
    });
    const fields = select('Nhân sự', 'workerCode', '<option value="">Chọn nhân sự</option>' + workerOptions)
      + select('Đội và công trình', 'teamId', '<option value="">Chọn đội</option>' + teamOptions)
      + input('Từ ngày', 'start', 'required', 'date') + input('Đến hết ngày', 'end', 'required', 'date')
      + input('Lý do', 'reason', 'maxlength="180"');
    return panel('Điều phối theo ngày hiệu lực', 'Mỗi khoảng hiệu lực xác định đội và công trình. Lịch sử phân công được giữ lại.', `
      <details class="v2-people-add"><summary>+ Thêm phân công</summary>${form('assign', fields, 'Lưu phân công')}</details>
      ${table(['Nhân sự', 'Đội', 'Công trình', 'Hiệu lực', 'Lý do', 'Người lập'], rows, 'Phân công theo ngày', 'Chưa có phân công theo ngày. Đội gốc trong hồ sơ vẫn được sử dụng.')}`);
  }

  function scopedLeave(context, people) {
    if (context.role === 'NS') return people.leave;
    const id = identity(context.account);
    if (context.role === 'CN') return people.leave.filter(x => x.requesterId === id);
    if (context.role === 'DT1') return people.leave.filter(x => x.requesterId === id || (x.requesterRole === 'CN' && x.teamId === context.account.teamId));
    return [];
  }

  function actionButton(action, id, label, style) {
    return `<button type="button" class="btn btn-${style} btn-sm" data-np-module="people" data-np-action="${action}" data-np-id="${id}">${label}</button>`;
  }

  function leaveView(context, people) {
    const { esc, state, role } = context;
    const visible = scopedLeave(context, people);
    const id = identity(context.account);
    const requests = [...visible].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    const rows = requests.map(item => {
      const approvable = role === 'NS' && item.status === 'confirmed' && item.requesterId !== id;
      const confirmable = role === 'DT1' && item.status === 'submitted' && item.requesterRole === 'CN' && item.teamId === context.account.teamId;
      let actions = '—';
      if (approvable) actions = actionButton('approve-leave', item.id, 'Duyệt', 'primary') + actionButton('reject-leave', item.id, 'Từ chối', 'soft');
      if (confirmable) actions = actionButton('confirm-leave', item.id, 'Xác nhận', 'primary') + actionButton('reject-leave', item.id, 'Từ chối', 'soft');
      const stateBadge = item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'danger' : 'warning';
      return `<tr><td><strong>${esc(item.requesterName)}</strong></td><td>${esc(byId(state.teams,item.teamId)?.name || item.teamId || '—')}</td>
        <td>${formatDate(item.start)} – ${formatDate(item.end)}</td><td>${esc(item.reason)}</td>
        <td><span class="badge badge-${stateBadge}">${esc(leaveStates[item.status])}</span></td><td><div class="v2-people-actions">${actions}</div></td></tr>`;
    });
    const approved = visible.filter(item => item.status === 'approved').sort((a,b) => a.start.localeCompare(b.start));
    const calendar = approved.map(item => `<tr><td>${formatDate(item.start)} – ${formatDate(item.end)}</td><td>${esc(item.requesterName)}</td>
      <td>${esc(byId(state.teams,item.teamId)?.name || item.teamId || '—')}</td></tr>`);
    const requestForm = role === 'NS' ? '' : `<details class="v2-people-add"><summary>+ Tạo đơn nghỉ của tôi</summary>
      ${form('create-leave', input('Từ ngày', 'start', 'required', 'date') + input('Đến hết ngày', 'end', 'required', 'date') + input('Lý do nghỉ', 'reason', 'required maxlength="240"'), 'Gửi đơn nghỉ')}</details>`;
    const unavailable = role === 'CN' ? '' : `<span>Đang nghỉ hôm nay <strong>${new Set(approved.filter(a => a.start <= today() && a.end >= today()).map(a => a.requesterId)).size}</strong></span>`;
    return panel(role === 'NS' ? 'Quản lý nghỉ phép' : role === 'DT1' ? 'Nghỉ phép của đội' : 'Đơn nghỉ của tôi',
      role === 'NS' ? 'Nhân sự duyệt sau khi đội trưởng xác nhận, rồi cập nhật lịch nghỉ.' : role === 'DT1' ? 'Xác nhận đơn của đội và theo dõi đơn của mình.' : 'Tạo đơn và theo dõi trạng thái xác nhận, duyệt.',
      `${requestForm}
      <div class="v2-people-counter"><span>Đơn theo phạm vi <strong>${visible.length}</strong></span>${unavailable}</div>
      ${table(['Người đề nghị', 'Đội', 'Khoảng nghỉ', 'Lý do', 'Trạng thái', 'Thao tác'], rows, 'Danh sách đơn nghỉ', 'Chưa có đơn nghỉ trong phạm vi của anh/chị.')}
      <h4 class="v2-people-calendar-title">Lịch nghỉ đã duyệt</h4>
      ${table(['Khoảng nghỉ', 'Người nghỉ', 'Đội'], calendar, 'Lịch nghỉ đã duyệt', 'Chưa có kỳ nghỉ được duyệt.')}`);
  }

  function render(tab, context) {
    const role = views.get(tab);
    if (!mayUse(context, role)) {
      return panel('Không có quyền xem', 'Màn hình dành cho vai trò được phân công.', '');
    }
    const people = read(context);
    if (tab === 'ns-workers') return rosterView(context, people);
    if (tab === 'ns-assignments') return assignmentView(context, people);
    return leaveView(context, people);
  }

  function searchKey(value) {
    return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replaceAll('đ', 'd').trim();
  }

  function updateRosterFilters(panel) {
    const filters = Object.fromEntries([...panel.querySelectorAll('[data-people-filter]')].map(field => [field.dataset.peopleFilter, field.value]));
    const query = searchKey(filters.search);
    const rows = [...panel.querySelectorAll('[data-people-row]')];
    for (const row of rows) {
      row.hidden = !searchKey(`${row.dataset.name} ${row.dataset.code}`).includes(query)
        || ['status', 'team', 'project'].some(key => filters[key] && row.dataset[key] !== filters[key]);
    }
    panel.querySelectorAll('[data-people-status]').forEach(button => button.setAttribute('aria-pressed', button.dataset.peopleStatus === filters.status));
    const emptyRow = panel.querySelector('[data-people-empty]');
    if (emptyRow) emptyRow.hidden = rows.some(row => !row.hidden);
    panel.querySelector('[data-people-export]').disabled = !rows.some(row => !row.hidden);
  }

  function exportRoster(panel) {
    const cells = row => [...row.cells].slice(0, -1).map(cell => {
      const text = cell.textContent.trim();
      const safe = /^[=+@\-]/.test(text) ? "'" + text : text;
      return '"' + safe.replaceAll('"', '""') + '"';
    }).join(',');
    const rows = [...panel.querySelectorAll('thead tr, [data-people-row]:not([hidden])')];
    const csv = '\uFEFF' + rows.map(cells).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.download = 'NP-ONE-nhan-su.csv';
    link.href = url;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handle(action, formData, context) {
    const hr = mayUse(context, 'NS');
    const lead = mayUse(context, 'DT1');
    const workerRole = mayUse(context, 'CN');
    if (!hr && !lead && !workerRole) throw new Error('Tài khoản không có quyền thực hiện thao tác này.');

    const people = read(context);
    const actor = normalize(context.account.fullName) || normalize(context.account.username) || 'Người dùng';
    const actorId = identity(context.account);
    if (!actorId) throw new Error('Không nhận diện được tài khoản hiện tại.');
    const workers = roster(context, people);
    const at = new Date().toISOString();
    const requestId = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);

    if (action === 'create-worker' && hr) {
      const code = normalize(formData.get('code')).toUpperCase();
      const name = normalize(formData.get('name'));
      const joinedOn = dateValue(formData.get('joinedOn'));
      if (!/^[A-Z0-9][A-Z0-9._-]{0,39}$/.test(code) || !name || name.length > 120) throw new Error('Nhập họ tên và mã nhân sự hợp lệ.');
      if (formData.get('joinedOn') && !joinedOn) throw new Error('Ngày vào làm không hợp lệ.');
      if ([...workers, ...(context.state.accounts || [])].some(w => [w.code, w.workerCode, w.username].some(v => String(v || '').toUpperCase() === code))) throw new Error('Mã nhân sự đã được sử dụng.');
      people.employees.push({ id: requestId(), code, name });
      people.profiles[code] = { status: 'active', joinedOn, history: [{ at, by: actor, status: 'active' }] };
    } else if (action === 'update-profile' && hr) {
      const code = normalize(formData.get('workerCode'));
      const status = normalize(formData.get('status'));
      if (!workers.some(w => w.code === code) || !Object.hasOwn(profileStates, status)) throw new Error('Hồ sơ nhân sự không hợp lệ.');
      const joinedOn = dateValue(formData.get('joinedOn'));
      const leftOn = dateValue(formData.get('leftOn'));
      const rehiredOn = dateValue(formData.get('rehiredOn'));
      const contractUntil = dateValue(formData.get('contractUntil'));
      const dates = { joinedOn, leftOn, rehiredOn, contractUntil };
      if (Object.entries(dates).some(([field, value]) => formData.get(field) && !value)) throw new Error('Ngày trong hồ sơ không hợp lệ.');
      if (joinedOn && contractUntil && contractUntil < joinedOn) throw new Error('Hạn hợp đồng phải từ ngày vào làm trở đi.');
      if ((leftOn && joinedOn && leftOn < joinedOn) || (rehiredOn && leftOn && rehiredOn < leftOn)) throw new Error('Kiểm tra thứ tự ngày vào làm, nghỉ việc và tái tuyển.');
      const previous = Object.hasOwn(people.profiles, code) ? people.profiles[code] : {};
      people.profiles[code] = {
        status, ...dates, identityReady: formData.has('identityReady'), contractReady: formData.has('contractReady'),
        history: [...(previous.history || []), { at, by: actor, status, ...dates }]
      };
    } else if (action === 'assign' && hr) {
      const workerCode = normalize(formData.get('workerCode'));
      const team = byId(context.state.teams, normalize(formData.get('teamId')));
      const person = workers.find(w => w.code === workerCode);
      const period = range(formData);
      if (!person || !team || !byId(context.state.projects, team.projectId)) throw new Error('Chọn đúng nhân sự, đội và công trình.');
      if (Object.hasOwn(people.profiles, workerCode) && people.profiles[workerCode].status === 'left') throw new Error('Cần cập nhật hồ sơ tái tuyển trước khi phân công.');
      if (people.assignments.some(a => a.workerCode === workerCode && overlaps(a, period))) throw new Error('Khoảng ngày trùng phân công của nhân sự.');
      if (people.leave.some(a => a.workerCode === workerCode && a.status !== 'rejected' && overlaps(a, period))) throw new Error('Nhân sự có đơn nghỉ trùng khoảng hiệu lực.');
      people.assignments.push({ id: requestId(), workerCode, teamId: team.id, projectId: team.projectId, ...period, reason: normalize(formData.get('reason')).slice(0,180), by: actor, at });
    } else if (action === 'create-leave' && (lead || workerRole)) {
      const period = range(formData);
      const reason = normalize(formData.get('reason'));
      const workerCode = normalize(context.account.workerCode || context.account.username);
      const person = workers.find(w => w.code === workerCode);
      const teamId = lead ? context.account.teamId : fixedTeam(person, people, period);
      if (!reason || reason.length > 240) throw new Error('Nhập lý do nghỉ từ 1 đến 240 ký tự.');
      if (!byId(context.state.teams, teamId)) throw new Error('Không xác định được một đội cho cả khoảng xin nghỉ. Hãy chia đơn theo ngày phân công.');
      if (people.leave.some(x => x.requesterId === actorId && x.status !== 'rejected' && overlaps(x, period))) throw new Error('Khoảng ngày trùng với một đơn nghỉ đã có.');
      const status = lead ? 'confirmed' : 'submitted';
      people.leave.push({ id: requestId(), requesterId: actorId, requesterRole: context.role, requesterName: actor, workerCode, teamId, ...period, reason, status, createdAt: at, history: [{ status, by: actor, at }] });
    } else if (['confirm-leave', 'approve-leave', 'reject-leave'].includes(action)) {
      const item = byId(people.leave, normalize(formData.get('id')));
      if (!item || item.requesterId === actorId) throw new Error('Không tìm thấy đơn hoặc không thể tự duyệt đơn.');
      const teamAction = lead && item.requesterRole === 'CN' && item.teamId === context.account.teamId && item.status === 'submitted';
      const hrAction = hr && item.status === 'confirmed';
      let status;
      if (action === 'confirm-leave' && teamAction) status = 'confirmed';
      else if (action === 'approve-leave' && hrAction) status = 'approved';
      else if (action === 'reject-leave' && (teamAction || hrAction)) status = 'rejected';
      else throw new Error('Đơn đã đổi trạng thái hoặc nằm ngoài phạm vi xử lý.');
      item.status = status;
      item.history.push({ status, by: actor, at });
    } else {
      throw new Error('Tài khoản không có quyền thực hiện thao tác này.');
    }

    context.data.people = people;
    context.save();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('input', event => {
      if (!event.target.matches?.('[data-people-filter]')) return;
      updateRosterFilters(event.target.closest('.v2-people'));
    });
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-people-add], [data-people-status], [data-people-export]');
      if (!button) return;
      const panel = button.closest('.v2-people');
      if (button.hasAttribute('data-people-add')) {
        const formPanel = panel.querySelector('#np-people-create');
        formPanel.hidden = !formPanel.hidden;
        button.setAttribute('aria-expanded', !formPanel.hidden);
        if (!formPanel.hidden) formPanel.querySelector('input').focus();
      } else if (button.hasAttribute('data-people-status')) {
        panel.querySelector('[data-people-filter="status"]').value = button.dataset.peopleStatus;
        updateRosterFilters(panel);
      } else {
        exportRoster(panel);
      }
    });
  }

  window.NPPeople = { render, handle };
})();
