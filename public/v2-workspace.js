(function () {
  const icons = {
    home: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2m1-15a3 3 0 0 1 0 6m4 9v-2a5 5 0 0 0-3-4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    list: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2m-6 6h6m-6 4h6m-6 4h3"/>',
    money: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="m9 12 2 2 4-4"/>',
    chart: '<path d="M4 3v17h17M8 16v-4m5 4V7m5 9v-6"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    back: '<path d="m14 6-6 6 6 6M8 12h13"/>',
    arrow: '<path d="m9 18 6-6-6-6"/>',
    filter: '<path d="M4 7h16M7 12h10m-7 5h4"/>',
    'arrow-down': '<path d="M12 4v15m-5-5 5 5 5-5"/>',
    'arrow-up': '<path d="M12 20V5m-5 5 5-5 5 5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8m-3 3 2 2m-5 1 2 2"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2m-6 9 2 2 4-4"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4m8-4v4M8 15h2m4 0h2"/>',
    building: '<path d="M4 21V6h7V3h9v18M2 21h20M7 10h1m-1 4h1m6-7h3m-3 4h3m-3 4h3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m6 14 5-5-5-5m5 5H9"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    user: '<circle cx="12" cy="8" r="3"/><path d="M5 21v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3"/>'
  };

  const icon = key => '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (icons[key] || icons.list) + '</svg>';
  const tab = (id, shortLabel, iconName, mobileLabel = shortLabel) => ({ id, label: shortLabel, shortLabel, iconName, mobileLabel });

  const roles = {
    BGD: {
      shortTitle: 'Giám đốc',
      defaultTab: 'bgd-overview',
      tabs: [tab('bgd-overview', 'Tổng quan', 'home'), tab('v2-projects', 'Công trình', 'building'), tab('v2-director-people', 'Nhân sự', 'people'), tab('v2-director-assignments', 'Điều phối', 'calendar'), tab('bgd-staff-check', 'Chấm công', 'clock'), tab('v2-director-acceptance', 'Nghiệm thu', 'list'), tab('v2-director-quotes', 'Hợp đồng & Đơn giá', 'folder'), tab('v2-director-payments', 'Tài chính', 'money'), tab('bgd-audit', 'Báo cáo', 'chart'), tab('v2-admin-roles', 'Hệ thống', 'shield')],
      mobileTabs: ['bgd-overview', 'v2-projects', 'bgd-approvals', 'v2-director-payments']
    },
    KD: {
      shortTitle: 'Kinh doanh',
      defaultTab: 'kd-clients',
      tabs: [tab('kd-clients', 'Khách hàng & cơ hội', 'people', 'Khách hàng'), tab('kd-quotes', 'Báo giá', 'list'), tab('kd-contracts', 'Hợp đồng', 'folder'), tab('kd-prices', 'Đơn giá A/B', 'chart'), tab('kd-acceptance', 'Nghiệm thu & công nợ', 'money', 'Nghiệm thu')],
      mobileTabs: ['kd-clients', 'kd-quotes', 'kd-contracts', 'kd-acceptance']
    },
    NS: {
      shortTitle: 'Nhân sự',
      defaultTab: 'ns-workers',
      tabs: [tab('ns-workers', 'Hồ sơ nhân sự', 'people', 'Nhân sự'), tab('ns-assignments', 'Điều phối', 'calendar'), tab('ns-leave', 'Nghỉ phép', 'list')],
      mobileTabs: ['ns-workers', 'ns-assignments', 'ns-leave']
    },
    KT: {
      shortTitle: 'Kế toán',
      defaultTab: 'v2-finance-attendance',
      tabs: [tab('v2-finance-attendance', 'Chấm công Excel Pro', 'calendar', 'Chấm công'), tab('kt-payroll', 'Bảng lương', 'list'), tab('kt-advances', 'Tạm ứng', 'money'), tab('v2-finance-payments', 'Thanh toán & công nợ', 'money', 'Thanh toán')],
      mobileTabs: ['v2-finance-attendance', 'kt-payroll', 'kt-advances', 'v2-finance-payments']
    },
    DT1: {
      shortTitle: 'Quản lý đội',
      defaultTab: 'dt-checkin',
      tabs: [tab('dt-checkin', 'Tổng quan đội', 'home', 'Trang chủ'), tab('v2-team-attendance', 'Chấm công đội', 'clock', 'Chấm công'), tab('dt-members', 'Nhân sự đội', 'people'), tab('dt-tasks', 'Công việc & hiện trường', 'folder', 'Công việc'), tab('v2-team-leave', 'Nghỉ phép', 'calendar'), tab('dt-my-statement', 'Công cá nhân', 'money')],
      mobileTabs: ['dt-checkin', 'dt-tasks', 'v2-notifications']
    },
    CN: {
      shortTitle: 'Công nhân',
      defaultTab: 'cn-home',
      tabs: [tab('cn-home', 'Trang chủ', 'home'), tab('cn-history', 'Công và lịch làm', 'calendar', 'Lịch làm'), tab('cn-payslip', 'Phiếu lương', 'money'), tab('v2-worker-leave', 'Xin nghỉ phép', 'list', 'Đơn nghỉ'), tab('cn-requests', 'Tạm ứng & yêu cầu cá nhân', 'folder', 'Yêu cầu')],
      mobileTabs: ['cn-home', 'cn-history', 'cn-payslip', 'v2-worker-leave']
    }
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const date = value => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
  const department = { BGD: 'Ban giám đốc', KD: 'Kinh doanh', NS: 'Nhân sự', KT: 'Kế toán', DT1: 'Vận hành', CN: 'Thi công' };
  const delegable = ['KD', 'NS', 'KT', 'DT1'];
  const profileTab = tab('v2-profile', 'Tài khoản', 'user');
  for (const role of Object.values(roles)) role.tabs.push(profileTab);
  roles.BGD.tabs.push(tab('bgd-approvals', 'Phê duyệt nội bộ', 'shield', 'Phê duyệt'));

  function adminStore(context) {
    return context.data.admin ||= { grants: [], log: [] };
  }

  const accountPageSize = 50;
  const accountPages = new Map();
  const accountLevels = { BGD: 1, KD: 2, NS: 2, KT: 2, DT1: 4, CN: 5 };

  function availableWorkers(state) {
    const linked = new Set(state.accounts.filter(item => item.demoLogin && item.roleId === 'CN').map(item => item.workerCode));
    return state.workers.filter(worker => !linked.has(worker.code));
  }

  function accountForm(state) {
    const projects = new Map(state.projects.map(project => [project.id, project.name]));
    return `<details class="np-admin-create">
      <summary class="btn btn-primary">+ Tạo tài khoản</summary>
      <form class="np-admin-form np-admin-create-form" data-np-module="admin" data-np-action="create-account">
        <label>Vai trò<select name="roleId" required>
          <option value="">Chọn vai trò</option>
          ${Object.entries(roles).map(([id, role]) => `<option value="${id}">${esc(role.shortTitle)}</option>`).join('')}
        </select></label>
        <label>Tên đăng nhập<input name="username" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" minlength="3" maxlength="40" required></label>
        <label data-account-field="name">Họ và tên<input name="fullName" autocomplete="off" maxlength="80" required></label>
        <label>Mã PIN demo<input name="pin" type="password" inputmode="numeric" autocomplete="new-password" pattern="[0-9]{4,8}" maxlength="8" title="Nhập từ 4 đến 8 chữ số" required></label>
        <label data-account-field="team" hidden>Đội thi công<select name="teamId" disabled>
          <option value="">Chọn đội</option>
          ${state.teams.map(team => `<option value="${esc(team.id)}">${esc(team.name)} · ${esc(projects.get(team.projectId))}</option>`).join('')}
        </select></label>
        <label data-account-field="worker" hidden>Hồ sơ công nhân<select name="workerCode" disabled>
          <option value="">Chọn công nhân</option>
          ${availableWorkers(state).map(worker => `<option value="${esc(worker.code)}">${esc(worker.code)} · ${esc(worker.name)}</option>`).join('')}
        </select></label>
        <p class="np-admin-create-note">Tài khoản demo chỉ lưu trong trình duyệt này.</p>
        <button class="btn btn-primary" type="submit">Lưu tài khoản</button>
      </form>
    </details>`;
  }

  document.addEventListener('change', event => {
    if (!event.target.matches('.np-admin-create-form [name="roleId"]')) return;
    const select = event.target;
    const role = select.value;
    for (const [field, show] of Object.entries({ name: role !== 'CN', team: role === 'DT1', worker: role === 'CN' })) {
      const label = select.form.querySelector(`[data-account-field="${field}"]`);
      label.hidden = !show;
      const input = label.querySelector('input, select');
      input.disabled = !show;
      input.required = show;
    }
  });

  function createDemoAccount(values, context) {
    const { state, account } = context;
    const read = name => String(values.get(name) || '').trim();
    const roleId = read('roleId');
    const username = read('username').toLowerCase();
    const pin = read('pin');
    const worker = roleId === 'CN' ? availableWorkers(state).find(item => item.code === read('workerCode')) : null;
    const teamId = roleId === 'DT1' ? read('teamId') : worker?.teamId;
    const team = state.teams.find(item => item.id === teamId);
    const fullName = worker?.name || read('fullName');
    if (!Object.hasOwn(accountLevels, roleId)) throw new Error('Chọn vai trò hợp lệ.');
    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) throw new Error('Tên đăng nhập cần từ 3 đến 40 ký tự, gồm chữ không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới.');
    if (state.accounts.some(item => [item.username, item.demoLogin].some(login => login?.toLowerCase() === username))) {
      throw new Error('Tên đăng nhập đã được sử dụng.');
    }
    if (!/^\d{4,8}$/.test(pin)) throw new Error('Mã PIN demo cần từ 4 đến 8 chữ số.');
    if (!worker && roleId === 'CN') throw new Error('Chọn hồ sơ công nhân chưa có tài khoản demo.');
    if (!team && roleId === 'DT1') throw new Error('Chọn đội thi công cho tài khoản quản lý đội.');
    if (!fullName || fullName.length > 80 || /[<>]/.test(fullName)) throw new Error('Nhập họ và tên hợp lệ, tối đa 80 ký tự.');
    const projectId = team?.projectId || worker?.projectId || 'ALL';
    const project = state.projects.find(item => item.id === projectId);
    const isDirector = roleId === 'BGD';
    const positionTitle = roles[roleId].shortTitle;
    return {
      id: crypto.randomUUID(), username, demoLogin: username, pin, fullName, roleId, positionTitle,
      level: accountLevels[roleId], projectId, teamId: team?.id || 'ALL',
      workerCode: worker?.code || 'NV.' + username.toUpperCase(),
      managerName: worker?.managerName || project?.manager || account.fullName,
      leaderName: worker?.leaderName,
      dailyWage: worker?.dailyWage,
      createdBy: account.fullName, status: 'ACTIVE',
      perms: {
        checkin: !isDirector, inputTeam: roleId === 'DT1', approveWork: isDirector,
        accounting: isDirector || roleId === 'KT', approveDirector: isDirector, adminUsers: isDirector
      }
    };
  }

  function admin(tabId, context) {
    const { account, state } = context;
    if (tabId === 'dt-members' && context.role === 'DT1') {
      const rows = state.workers.filter(worker => worker.teamId === account.teamId).map(worker => `<tr><td>${esc(worker.code)}</td><td><strong>${esc(worker.name)}</strong></td><td>${esc(worker.roleName)}</td><td>${esc(worker.teamName)}</td><td>${esc(worker.projectName)}</td></tr>`).join('');
      return `<section class="np-work-card"><h2>Nhân sự đội</h2><div class="table-scroll"><table class="data-table"><thead><tr><th>Mã NV</th><th>Họ và tên</th><th>Vị trí</th><th>Đội</th><th>Công trình</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Đội chưa có nhân sự.</td></tr>'}</tbody></table></div></section>`;
    }
    if (context.role !== 'BGD') return '';
    const access = adminStore(context);
    if (tabId === 'v2-director-assignments') {
      const active = context.data.people?.assignments || [];
      const rows = active.map(item => {
        const worker = state.workers.find(worker => worker.id === item.workerId || worker.code === item.workerId);
        const project = state.projects.find(project => project.id === item.projectId);
        const team = state.teams.find(team => team.id === item.teamId);
        return `<tr><td>${esc(worker?.name || item.workerCode || item.workerId)}</td><td>${esc(project?.name || item.projectId)}</td><td>${esc(team?.name || item.teamId)}</td><td>${esc(item.startDate || item.from || item.start)}</td><td>${esc(item.endDate || item.to || item.end || '—')}</td></tr>`;
      }).join('');
      return `<section class="np-work-card"><h2>Điều phối nhân lực</h2><div class="table-scroll"><table class="data-table"><thead><tr><th>Công nhân</th><th>Công trình</th><th>Đội</th><th>Từ ngày</th><th>Đến ngày</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Chưa có điều chuyển do Nhân sự ghi nhận.</td></tr>'}</tbody></table></div></section>`;
    }

    if (tabId === 'v2-director-acceptance') {
      const business = context.data.business;
      const rows = (business?.acceptance || []).map(item => {
        const contract = business.contracts.find(contract => contract.id === item.contractId);
        return `<tr><td>${esc(item.reference || item.id)}</td><td>${esc(contract?.number)}</td><td>${esc(item.date)}</td><td>${esc(item.performed)}</td><td>${esc(item.accepted)}</td><td>${esc(item.approver)}</td></tr>`;
      }).join('');
      return `<section class="np-work-card"><h2>Nghiệm thu khách hàng</h2><div class="table-scroll"><table class="data-table"><thead><tr><th>Biên bản</th><th>Hợp đồng</th><th>Ngày</th><th>Thực hiện</th><th>Chấp nhận</th><th>Xác nhận</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Chưa có biên bản nghiệm thu.</td></tr>'}</tbody></table></div></section>`;
    }

    if (tabId === 'bgd-audit') {
      const auditRows = access.log.map(entry => `<tr><td>${esc(new Date(entry.at).toLocaleString('vi-VN'))}</td><td>${esc(entry.actor)}</td><td>${esc(entry.event)}</td></tr>`).join('');
      return `<section class="np-work-card"><h2>Báo cáo & kiểm toán</h2><div class="table-scroll"><table class="data-table"><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Nội dung</th></tr></thead><tbody>${auditRows || '<tr><td colspan="3">Chưa phát sinh sự kiện phân quyền.</td></tr>'}</tbody></table></div></section>`;
    }
    const accounts = state.accounts.filter(item => item.demoLogin);
    const pageCount = Math.max(1, Math.ceil(accounts.length / accountPageSize));
    const page = Math.min(accountPages.get(account.id) || 1, pageCount);
    const start = (page - 1) * accountPageSize;
    const pager = pageCount > 1 ? `<nav class="np-admin-account-pages" aria-label="Phân trang tài khoản">
      <span role="status">${start + 1}–${Math.min(start + accountPageSize, accounts.length)} / ${accounts.length}</span>
      <button type="button" class="btn btn-soft" data-np-module="admin" data-np-action="account-page" data-np-id="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Trước</button>
      <button type="button" class="btn btn-soft" data-np-module="admin" data-np-action="account-page" data-np-id="${page + 1}" ${page >= pageCount ? 'disabled' : ''}>Sau</button>
    </nav>` : '';
    const rows = [...accounts].reverse().slice(start, start + accountPageSize).map(item => `<tr><td><strong>${esc(item.fullName)}</strong></td><td>${esc(item.demoLogin)}</td><td>${esc(department[item.roleId])}</td><td>${esc(roles[item.roleId].shortTitle)}</td><td>${esc(item.projectId === 'ALL' ? 'Toàn công ty' : state.projects.find(project => project.id === item.projectId)?.name)}</td><td><span class="badge badge-success">Đang hoạt động</span></td></tr>`).join('');
    const now = new Date();
    const grants = access.grants.map(grant => {
      const assignee = accounts.find(item => item.id === grant.accountId);
      const active = !grant.revoked && new Date(grant.until + 'T23:59:59') >= now;
      return `<tr><td>${esc(assignee?.fullName)}</td><td>${esc(roles[grant.role]?.shortTitle)}</td><td>${esc(state.projects.find(project => project.id === grant.projectId)?.name)}</td><td>${esc(date(grant.until + 'T00:00:00'))}</td><td>${grant.revoked ? 'Đã thu hồi' : active ? 'Đang hiệu lực' : 'Hết hạn'}</td><td>${active ? `<button class="btn btn-soft btn-sm" data-np-module="admin" data-np-action="revoke" data-np-id="${esc(grant.id)}">Thu hồi</button>` : '—'}</td></tr>`;
    }).join('');
    const history = access.log.map(entry => `<li><strong>${esc(entry.actor)}</strong> ${esc(entry.event)} <small>${esc(new Date(entry.at).toLocaleString('vi-VN'))}</small></li>`).join('');
    return `<div class="np-admin">
      <section class="np-work-card"><h2>Tổ chức & phân quyền</h2>${accountForm(state)}<p role="status" id="npAdminAccountFeedback" tabindex="-1"></p><div class="table-scroll"><table class="data-table"><thead><tr><th>Người dùng</th><th>Tài khoản</th><th>Phòng ban</th><th>Vai trò</th><th>Phạm vi</th><th>Trạng thái</th></tr></thead><tbody>${rows}</tbody></table></div>${pager}</section>
      <section class="np-work-card"><h2>Ủy quyền theo công trình</h2><form class="np-admin-form" data-np-module="admin" data-np-action="grant">
        <label>Người nhận<select name="accountId" required>${accounts.filter(item => item.roleId !== 'BGD').map(item => `<option value="${esc(item.id)}">${esc(item.fullName)}</option>`).join('')}</select></label>
        <label>Vai trò<select name="role" required>${delegable.map(role => `<option value="${role}">${roles[role].shortTitle}</option>`).join('')}</select></label>
        <label>Công trình<select name="projectId" required>${state.projects.map(project => `<option value="${esc(project.id)}">${esc(project.name)}</option>`).join('')}</select></label>
        <label>Có hiệu lực đến<input type="date" name="until" required></label>
        <button class="btn btn-primary" type="submit">Tạo ủy quyền mẫu</button>
      </form><div class="table-scroll"><table class="data-table"><thead><tr><th>Người nhận</th><th>Vai trò</th><th>Công trình</th><th>Đến ngày</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${grants || '<tr><td colspan="6">Chưa có bản ghi ủy quyền.</td></tr>'}</tbody></table></div></section>
      <section class="np-work-card"><h2>Nhật ký phân quyền</h2><ul class="np-admin-log">${history || '<li>Chưa phát sinh thay đổi.</li>'}</ul></section>
    </div>`;
  }

  function handleAdmin(action, values, context) {
    if (context.role !== 'BGD') throw new Error('Tài khoản này chưa được cấp quyền quản trị.');
    const access = adminStore(context);
    const record = (event) => access.log.unshift({ event, actor: context.account.fullName, at: new Date().toISOString() });
    if (action === 'account-page') {
      const page = Number(values.get('id'));
      if (!Number.isSafeInteger(page) || page < 1) return;
      accountPages.set(context.account.id, page);
      context.refresh();
      return;
    }
    if (action === 'create-account') {
      const created = createDemoAccount(values, context);
      context.state.accounts.push(created);
      accountPages.delete(context.account.id);
      record('tạo tài khoản ' + created.username + ' với vai trò ' + created.positionTitle + '.');
      context.save();
      const feedback = document.getElementById('npAdminAccountFeedback');
      if (feedback) {
        feedback.textContent = 'Đã tạo tài khoản ' + created.username + ' · ' + created.positionTitle + '.';
        feedback.focus();
      }
      return;
    }
    if (action === 'grant') {
      const account = context.state.accounts.find(item => item.id === values.get('accountId') && item.demoLogin && item.roleId !== 'BGD');
      const project = context.state.projects.find(item => item.id === values.get('projectId'));
      const role = values.get('role');
      const until = values.get('until');
      const expiry = new Date(until + 'T23:59:59');
      if (!account || !project || !delegable.includes(role) || !/^\d{4}-\d{2}-\d{2}$/.test(until) || Number.isNaN(+expiry) || expiry < new Date()) throw new Error('Chọn tài khoản, phạm vi và ngày hết hạn hợp lệ.');
      if (access.grants.some(item => !item.revoked && item.accountId === account.id && item.projectId === project.id && item.role === role && new Date(item.until + 'T23:59:59') >= new Date())) throw new Error('Ủy quyền tương ứng đang còn hiệu lực.');
      access.grants.push({ id: crypto.randomUUID(), accountId: account.id, projectId: project.id, role, until, revoked: false });
      record('tạo ủy quyền ' + roles[role].shortTitle + ' cho ' + account.fullName + ' tại ' + project.name + '.');
    } else if (action === 'revoke') {
      const grant = access.grants.find(item => item.id === values.get('id') && !item.revoked);
      if (!grant) throw new Error('Ủy quyền đã thay đổi. Anh/chị tải lại và thử lại.');
      grant.revoked = true;
      record('thu hồi một ủy quyền ' + roles[grant.role].shortTitle + '.');
    } else {
      return;
    }
    context.save();
  }

  function profileView(_activeTab, context) {
    const { account, data, state, role } = context;
    const workspace = roles[role];
    const profile = data.profiles?.[account.id] || {};
    const name = profile.displayName || account.fullName;
    const project = state.projects.find(item => item.id === account.projectId);
    const team = state.teams.find(item => item.id === account.teamId);
    return `<div class="np-profile">
      <section class="np-work-card np-profile-intro">
        <div class="np-profile-avatar" aria-hidden="true">${esc(initialsOf(name))}</div>
        <div><h1>${esc(name)}</h1><p>${workspace.shortTitle} · ${esc(team?.name || project?.name || department[role])}</p></div>
      </section>
      <section class="np-work-card np-profile-card">
        <h2>Hồ sơ cá nhân</h2>
        <form class="np-profile-form" data-np-module="profile" data-np-action="update">
          <label>Tên hiển thị<input name="displayName" value="${esc(name)}" autocomplete="name" maxlength="80" required /></label>
          <label>Số điện thoại<input type="tel" name="phone" value="${esc(profile.phone)}" autocomplete="tel" maxlength="24" /></label>
          <label>Email<input type="email" name="email" value="${esc(profile.email)}" autocomplete="email" maxlength="120" /></label>
          <dl class="np-profile-account"><dt>Tên đăng nhập</dt><dd>${esc(account.demoLogin || account.username)}</dd><dt>Vai trò</dt><dd>${workspace.shortTitle}</dd></dl>
          ${profile.updated ? '<p class="np-profile-success" role="status">Đã lưu hồ sơ trên thiết bị này.</p>' : ''}
          <button class="btn btn-primary" type="submit">Lưu thay đổi</button>
        </form>
      </section>
      <section class="np-profile-actions">
        <button class="btn btn-soft" type="button" onclick="window.NPApp.openChangeMyPasswordModal()">${icon('key')} Đổi mật khẩu</button>
        <button class="btn btn-soft" type="button" onclick="window.NPApp.openInstallModal()">${icon('folder')} Cài app</button>
        <button class="btn btn-soft" type="button" onclick="window.NPApp.logoutAccount()">${icon('logout')} Đăng xuất</button>
      </section>
    </div>`;
  }

  const initialsOf = name => name.trim().split(/ +/).slice(-2).map(part => part[0]).join('').toUpperCase();

  function handleProfile(action, values, context) {
    if (action !== 'update' || !context.account) return;
    const displayName = String(values.get('displayName') || '').trim();
    const phone = String(values.get('phone') || '').trim();
    const email = String(values.get('email') || '').trim();
    if (!displayName || displayName.length > 80) throw new Error('Nhập tên hiển thị từ 1 đến 80 ký tự.');
    if (phone && (phone.length > 24 || !/^\+?[0-9() .-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7)) throw new Error('Số điện thoại chưa hợp lệ.');
    if (email && (email.length > 120 || !/^[^@\s]+@[^@\s]+$/.test(email))) throw new Error('Email chưa hợp lệ.');
    const profiles = context.data.profiles ||= {};
    profiles[context.account.id] = { displayName, phone, email, updated: true };
    context.save();
  }

  function notifications(account, state, badges) {
    const { roleId, teamId } = account;
    const workspace = state.workspace || {};
    const leave = workspace.people?.leave || [];
    const items = [];
    const add = (count, label, target, iconName) => { if (count) items.push({ count, label, target, iconName }); };

    if (roleId === 'BGD') {
      add(badges.advances, 'đơn tạm ứng chờ duyệt', 'bgd-approvals', 'money');
      add(badges.payroll, 'bảng lương chờ duyệt', 'bgd-approvals', 'calendar');
      add(badges.pendingDelCount, 'yêu cầu xóa chờ duyệt', 'bgd-approvals', 'shield');
      add(workspace.business?.quotes.filter(item => item.status === 'pending').length, 'báo giá chờ duyệt', 'v2-director-quotes', 'folder');
      add(workspace.finance?.rows.filter(item => item.status === 'pending').length, 'đề nghị thanh toán chờ duyệt', 'v2-director-payments', 'money');
    }
    if (roleId === 'KT') {
      add(badges.ktPending, 'đơn tạm ứng cần đối chiếu', 'kt-advances', 'money');
      add(Object.values(workspace.attendance?.periods || {}).filter(item => item.status === 'submitted').length, 'bảng công cần đối chiếu', 'v2-finance-attendance', 'calendar');
    }
    if (roleId === 'NS') add(leave.filter(item => item.status === 'confirmed').length, 'đơn nghỉ chờ duyệt', 'ns-leave', 'calendar');
    if (roleId === 'DT1') add(leave.filter(item => item.status === 'submitted' && item.teamId === teamId).length, 'đơn nghỉ cần xác nhận', 'v2-team-leave', 'calendar');
    return items;
  }

  function toggleNotifications() {
    const popup = document.getElementById('npNotificationsPopup');
    if (!popup) return;
    popup.open = !popup.open;
    if (popup.open) popup.querySelector('summary').focus({ preventScroll: true });
  }

  function decorateMobileTables(main) {
    for (const table of main.querySelectorAll('table:not([data-np-responsive])')) {
      if (table.closest('.np-attendance-table')) continue;
      const header = table.tHead?.rows;
      if (header?.length !== 1 || [...header[0].cells].some(cell => cell.colSpan !== 1)) continue;
      const labels = [...header[0].cells].map(cell => cell.textContent.trim());
      if (!labels.length) continue;
      table.dataset.npResponsive = '';
      for (const row of [...table.tBodies].flatMap(body => [...body.rows])) {
        if (row.cells.length !== labels.length) continue;
        for (const [index, cell] of [...row.cells].entries()) {
          if (labels[index]) cell.dataset.npLabel = labels[index];
        }
      }
    }
  }

  const profileModule = { render: profileView, handle: handleProfile };
  function teamView(_activeTab, context) {
    if (context.role !== 'DT1') return '';
    const { account, data, state } = context;
    const team = state.teams.find(item => item.id === account.teamId);
    if (!team) return '<section class="np-work-card"><h2>Chưa được phân đội</h2></section>';
    const project = state.projects.find(item => item.id === team.projectId);
    const picture = '<img class="np-crew-avatar" src="assets/np-demo-crew.webp" width="52" height="52" alt="" decoding="async">';
    const now = new Date();
    const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
    const workers = state.workers.filter(worker => worker.teamId === team.id);
    const absent = workers.filter(worker => !['DANG_LAM', 'DA_RA'].includes(worker.attendanceStatus)).length;
    const overtime = workers.filter(worker => Number(worker.hoursOtRegistered) > 0).length;
    const shortcuts = [
      ['calendar', 'Chấm công', 'v2-team-attendance'],
      ['people', 'Nhân sự đội', 'dt-members'],
      ['folder', 'Công việc', 'dt-tasks'],
      ['money', 'Đề nghị tạm ứng', 'advance'],
      ['list', 'Nghỉ phép', 'v2-team-leave'],
      ['clipboard', 'Đối chiếu kỳ', 'v2-team-attendance']
    ];
    return `<section class="np-team-home np-work-card">
      <div class="np-team-greeting">${picture}<div><h1>Xin chào, ${esc(data.profiles?.[account.id]?.displayName || account.fullName)}!</h1><p>${esc(team.name)} · ${esc(project?.name)}</p><time datetime="${day}">${icon('calendar')}${esc(new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'}).format(now))}</time></div></div>
      <div class="np-team-shortcuts">${shortcuts.map(([symbol,label,target],index) => `<button type="button" ${target === 'advance' ? 'onclick="window.NPApp.openPersonalAdvanceModal()"' : `data-np-target="${target}"${index === 5 ? ' data-np-period="true"' : ''}`}>${icon(symbol)}<span>${label}</span></button>`).join('')}</div>
      <div class="np-team-summary"><h2>Tình hình hôm nay</h2><div>
        ${[['people',workers.length,'Công nhân'],['user',absent,'Nghỉ'],['clock',overtime,'Tăng ca']].map(([symbol,count,label])=>`<section>${icon(symbol)} <strong>${count}</strong><span>${label}</span></section>`).join('')}
      </div></div>
      <button class="btn btn-primary np-team-primary" type="button" data-np-target="v2-team-attendance">Cập nhật chấm công</button>
    </section>`;
  }

  const teamModule = { render: teamView };
  const adminModule = { render: admin, handle: handleAdmin };
  const registry = {
    admin: () => adminModule,
    approvals: () => window.NPApprovals,
    projects: () => window.NPProjects,
    profile: () => profileModule,
    team: () => teamModule,
    business: () => window.NPBusiness,
    people: () => window.NPPeople,
    finance: () => window.NPFinance,
    attendance: () => window.NPAttendance,
    director: () => window.NPDirector && window.NPBusiness && window.NPFinance && {
      render: (_tab, context) => {
        if (!context.data.business) window.NPBusiness.render('v2-director-quotes', context);
        return window.NPDirector.render(context);
      }
    }
  };

  const loading = new Map();

  function loadAsset(url, type) {
    if (loading.has(url)) return loading.get(url);
    const promise = new Promise((resolve, reject) => {
      const element = document.createElement(type);
      if (type === 'link') {
        element.rel = 'stylesheet';
        element.href = url;
        element.dataset.npModuleStyle = url.slice(3, -4);
      } else {
        element.src = url;
      }
      element.onload = resolve;
      element.onerror = () => {
        element.remove();
        loading.delete(url);
        reject(new Error('Không tải được ' + url));
      };
      document.head.append(element);
    });
    loading.set(url, promise);
    return promise;
  }

  function loadModule(key) {
    return Promise.all([
      loadAsset('v2-' + key + '.css', 'link'),
      loadAsset('v2-' + key + '.js', 'script'),
      ...(key === 'projects' ? [loadModule('people')] : []),
      ...(key === 'director' ? ['business', 'finance'].map(name => loadAsset('v2-' + name + '.js', 'script')) : [])
    ]);
  }

  function moduleNamed(key) {
    return Object.hasOwn(registry, key) ? registry[key]() : null;
  }

  function moduleForTab(tabId) {
    if (tabId === 'dt-checkin') return 'team';
    if (tabId === 'v2-profile') return 'profile';
    if (tabId === 'bgd-approvals') return 'approvals';
    if (tabId === 'v2-projects') return 'projects';
    if (tabId === 'v2-director-people') return 'people';
    if (tabId === 'bgd-overview') return 'director';
    if (['v2-admin-roles', 'v2-director-assignments', 'v2-director-acceptance', 'bgd-audit', 'dt-members'].includes(tabId)) return 'admin';
    if (tabId.startsWith('kd-') || tabId === 'v2-director-quotes') return 'business';
    if (tabId.startsWith('ns-') || tabId.endsWith('-leave')) return 'people';
    if (tabId.endsWith('-payments')) return 'finance';
    if (tabId.startsWith('v2-') && tabId.endsWith('-attendance')) return 'attendance';
    return null;
  }

  function isReady(key) {
    return key === 'admin' || key === 'profile' || key === 'team' || document.querySelector('link[data-np-module-style="' + key + '"]')?.sheet;
  }

  function navigation(account, activeTab, range, notices, profile) {
    const role = roles[account.roleId];
    const tabItem = role.tabs.find(item => item.id === activeTab);
    const menu = document.getElementById('sidebarMenu');
    const mobile = document.getElementById('mobileBottomNav');
    const roleBadge = document.getElementById('headerRoleBadge');
    const subtitle = document.getElementById('currentTabSubtitle');
    const header = document.getElementById('headerRightActions');
    const displayName = profile?.displayName || account.fullName;
    const initials = initialsOf(displayName);
    const back = document.getElementById('npMobileBack');
    const title = document.getElementById('npMobileTitle');
    const home = activeTab === role.defaultTab;
    back.hidden = home;
    back.innerHTML = icon('back');
    back.dataset.npTarget = role.defaultTab;
    title.hidden = home;
    title.textContent = tabItem?.shortLabel || '';
    document.body.toggleAttribute('data-np-mobile-home', home);
    document.body.classList.toggle('np-mobile-attendance', activeTab === 'v2-team-attendance');
    const current = item => item.id === activeTab ? ' active' : '';
    const aria = item => item.id === activeTab ? ' aria-current="page"' : '';

    const sidebarTabs = role.tabs.filter(item => item.id !== 'v2-profile');
    menu.innerHTML = `<div class="np-sidebar-person"><strong>${esc(displayName)}</strong><span>${role.shortTitle}</span></div>
    <div class="np-sidebar-navigation"><p class="np-sidebar-section-label">Chức năng</p>${sidebarTabs.map(item => `
      <button class="sidebar-item np-sidebar-item${current(item)}" data-np-target="${item.id}"${aria(item)}>${icon(item.iconName)}<span>${item.shortLabel}</span></button>
    `).join('')}</div>
    <div class="np-sidebar-account"><p class="np-sidebar-section-label">Tài khoản</p>
      <button class="sidebar-item np-sidebar-item${current(profileTab)}" data-np-target="v2-profile"${aria(profileTab)}>${icon('user')}<span>Hồ sơ</span></button>
      <button class="sidebar-item np-sidebar-item" type="button" onclick="window.NPApp.openChangeMyPasswordModal()">${icon('key')}<span>Đổi mật khẩu</span></button>
      <button class="sidebar-item np-sidebar-item" type="button" onclick="window.NPApp.openInstallModal()">${icon('folder')}<span>Cài app</span></button>
      <button class="sidebar-item np-sidebar-item" type="button" onclick="window.NPApp.logoutAccount()">${icon('logout')}<span>Đăng xuất</span></button>
    </div>`;

    mobile.innerHTML = [...role.mobileTabs, 'v2-profile'].map(id => {
      if (id === 'v2-notifications') return `<button type="button" class="bnav-item np-bottom-notice" data-np-notifications-toggle aria-controls="npNotificationsPopup" aria-expanded="false">${icon('bell')}<span>Thông báo</span></button>`;
      const item = role.tabs.find(entry => entry.id === id);
      return `<button class="bnav-item${current(item)}" data-np-target="${id}"${aria(item)}>${icon(item.iconName)}<span>${item.mobileLabel}</span></button>`;
    }).join('');

    roleBadge.textContent = role.shortTitle;
    subtitle.textContent = tabItem ? ' · ' + tabItem.shortLabel : '';
    const count = notices.reduce((sum, item) => sum + item.count, 0);
    const items = notices.map(item => `<li><button type="button" data-np-target="${item.target}" data-notice-icon="${item.iconName}" aria-label="${item.count} ${item.label}">
      <span class="np-notice-icon">${icon(item.iconName)}</span><span class="np-notice-label">${item.label}</span>
      <span class="np-notice-count">${item.count}</span>${icon('arrow')}
    </button></li>`).join('');
    header.innerHTML = `<div class="np-header-search" role="search">
      <div class="np-search-box">${icon('search')}<input id="npMenuSearch" type="search" placeholder="Tìm chức năng..." aria-label="Tìm chức năng" autocomplete="off" /></div>
      <div id="npMenuMatches" class="np-header-popover np-search-results" hidden></div>
    </div>
    <button class="np-header-period" type="button" onclick="window.NPApp.openDateRangeModal()">${icon('calendar')}<span>Kỳ: ${esc(range)}</span></button>
    <details id="npNotificationsPopup" class="np-header-details np-notices">
      <summary class="np-header-icon" aria-label="${count ? 'Thông báo, ' + count + ' công việc cần xử lý' : 'Thông báo'}">${icon('bell')}${count ? `<span class="np-alert-count" aria-hidden="true">${count}</span>` : ''}</summary>
      <div class="np-header-popover np-notices-panel">
        <div class="np-notices-heading"><strong>Thông báo</strong>${count ? `<span>${count} cần xử lý</span>` : ''}</div>
        ${items ? `<ul>${items}</ul>` : '<p class="np-notices-empty">Chưa có thông báo mới.</p>'}
      </div>
    </details>
    <button type="button" class="np-account-summary np-account-desktop" data-np-target="v2-profile" aria-label="Tài khoản"><span class="np-account-avatar">${esc(initials)}</span><span class="np-account-title"><strong>${esc(displayName)}</strong><small>${role.shortTitle}</small></span></button>`;
    const popup = header.querySelector('#npNotificationsPopup');
    popup.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !popup.open) return;
      popup.open = false;
      popup.querySelector('summary').focus();
    });
    popup.addEventListener('toggle', () => {
      mobile.querySelector('[data-np-notifications-toggle]')?.setAttribute('aria-expanded', String(popup.open));
    });
    const search = header.querySelector('#npMenuSearch');
    const matches = header.querySelector('#npMenuMatches');
    const compare = text => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll('đ', 'd');
    function displayResults() {
      const query = compare(search.value.trim());
      const found = role.tabs.filter(item => compare(item.shortLabel).includes(query));
      matches.innerHTML = found.length ? found.map(item => `<button data-np-target="${item.id}">${icon(item.iconName)}${item.shortLabel}</button>`).join('') : '<p>Không tìm thấy chức năng.</p>';
      matches.hidden = false;
    }
    search.addEventListener('input', displayResults);
    search.addEventListener('focus', displayResults);
    search.addEventListener('keydown', event => {
      if (event.key === 'Escape') matches.hidden = true;
      if (event.key === 'Enter') matches.querySelector('button')?.click();
    });
    search.parentElement.parentElement.addEventListener('focusout', event => {
      if (!event.currentTarget.contains(event.relatedTarget)) matches.hidden = true;
    });
  }

  window.NPWorkspace = { roles, icon, esc, navigation, notifications, toggleNotifications, decorateMobileTables, moduleForTab, moduleNamed, loadModule, isReady };
})();
