// Ứng dụng Quản lý Chấm công, Phân việc, Quân số, Tăng ca & Tính lương 5 Cấp NP ONE — Nguyên Phát HR
// Kiến trúc 5 Giao diện Chuyên biệt theo từng Vị trí & Cây Quản lý Nhân sự (Hệ thiết kế Navy · Cam)
(function () {
  const STORAGE_KEY = 'NP_ONE_HR_STATE_V7';
  const THEME_KEY = 'NP_ONE_THEME_V1';

  let state = loadState();
  let isAuthenticated = false;
  let currentAccountId = null;
  let currentRoleId = 'BGD';
  let currentTab = 'bgd-overview';

  // Bộ lọc dùng cho Kế toán / Giám đốc / Quản lý CT
  let filterProject = 'ALL';
  let filterTeam = 'ALL';
  let filterManager = 'ALL';
  let filterStatus = 'ALL';
  let searchQuery = '';

  let liveStream = null;
  let cameraFacingMode = 'user';
  let deferredInstallPrompt = null;

  let liveGps = {
    hasRealGps: false,
    lat: null,
    lng: null,
    acc: null,
    address: 'Đang lấy vị trí GPS thực tế từ thiết bị...',
    updatedAt: null
  };
  let gpsWatchId = null;
  let lastGeocodedKey = '';

  let sampleImgObj = new Image();
  sampleImgObj.src = 'assets/sample-selfie-worker.png';

  // ================= ĐỊNH NGHĨA MENU & GIAO DIỆN RIÊNG CHO TỪNG VỊ TRÍ (5 CẤP) =================
  const ROLE_CONFIG = {
    BGD: {
      badge: 'CẤP 1 · TỔNG GIÁM ĐỐC / ADMIN',
      shortTitle: 'Tổng Giám Đốc',
      hasPersonalCheckin: false,
      defaultTab: 'bgd-overview',
      tabs: [
        { id: 'bgd-overview', icon: '🏛️', label: 'Tổng quan & Cây Quản lý 5 Cấp', shortLabel: 'Tổng quan' },
        { id: 'bgd-approvals', icon: '✍️', label: 'Phê duyệt Ứng lương & Bảng lương', shortLabel: 'Phê duyệt', badgeKey: 'bgdPending' },
        { id: 'bgd-audit', icon: '🛡️', label: 'Giám sát Công & Lịch sử Sửa công', shortLabel: 'Giám sát' },
        { id: 'phan-quyen', icon: '🔐', label: 'Admin Quản trị & Tạo Tài khoản Vị trí', shortLabel: 'Admin TK' }
      ]
    },
    KT: {
      badge: 'CẤP 2 · HÀNH CHÍNH – KẾ TOÁN',
      shortTitle: 'Hành chính – Kế toán',
      hasPersonalCheckin: false,
      defaultTab: 'kt-attendance',
      tabs: [
        { id: 'kt-attendance', icon: '📋', label: 'Bảng công theo Quản lý CT & Đội trưởng', shortLabel: 'Bảng công' },
        { id: 'kt-advances', icon: '💳', label: 'Kiểm tra & Đối chiếu Ứng lương', shortLabel: 'Ứng lương', badgeKey: 'ktPending' },
        { id: 'kt-payroll', icon: '💰', label: 'Bảng tính Lương & Xuất Excel (.CSV)', shortLabel: 'Tính lương' },
        { id: 'kt-directory', icon: '🌳', label: 'Sơ đồ Nhân sự thuộc Quản lý nào', shortLabel: 'Cây Nhân sự' }
      ]
    },
    QLCT: {
      badge: 'CẤP 3 · QUẢN LÝ CÔNG TRÌNH',
      shortTitle: 'Quản lý Công trình',
      hasPersonalCheckin: false,
      defaultTab: 'qlct-approve',
      tabs: [
        { id: 'qlct-approve', icon: '✅', label: 'Duyệt Công & Quân số Công trình mình', shortLabel: 'Duyệt công', badgeKey: 'qlctPending' },
        { id: 'qlct-tasks', icon: '📌', label: 'Phân việc & Giao khoán cho Đội trưởng', shortLabel: 'Phân việc' },
        { id: 'qlct-staff', icon: '👷', label: 'Đội trưởng & Nhân viên dưới quyền tôi', shortLabel: 'Nhân sự tôi' },
        { id: 'qlct-summary', icon: '📊', label: 'Tổng hợp Công Tuần / Tháng Công trình', shortLabel: 'Tổng hợp' }
      ]
    },
    DT1: {
      badge: 'CẤP 4 · ĐỘI TRƯỞNG THI CÔNG',
      shortTitle: 'Đội trưởng',
      hasPersonalCheckin: true,
      defaultTab: 'dt-checkin',
      tabs: [
        { id: 'dt-checkin', icon: '📸', label: 'Điểm danh Camera GPS Đội của tôi', shortLabel: 'Điểm danh' },
        { id: 'dt-tasks', icon: '🛠️', label: 'Nhận việc từ QLCT & Giao việc / Tăng ca Đội', shortLabel: 'Giao việc Đội' },
        { id: 'dt-members', icon: '👥', label: 'Danh sách Công nhân Đội tôi & Thêm người', shortLabel: 'Đội của tôi' }
      ]
    },
    CN: {
      badge: 'CẤP 5 · CÔNG NHÂN / NHÂN VIÊN',
      shortTitle: 'Công nhân',
      hasPersonalCheckin: true,
      defaultTab: 'cn-home',
      tabs: [
        { id: 'cn-home', icon: '🪪', label: 'Tổng kết Công & Lương của tôi + Điểm danh', shortLabel: 'Công của tôi' },
        { id: 'cn-history', icon: '📅', label: 'Lịch sử Ngày công & Tăng ca của tôi', shortLabel: 'Lịch sử công' },
        { id: 'cn-requests', icon: '📝', label: 'Xin Ứng lương & Xin Nghỉ phép', shortLabel: 'Ứng / Nghỉ' },
        { id: 'cn-payslip', icon: '💵', label: 'Phiếu Lương Cá Nhân của tôi', shortLabel: 'Phiếu lương' }
      ]
    }
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.workers && parsed.workers.length >= 100 && parsed.accounts && parsed.tasks) {
          return parsed;
        }
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(window.NP_SEED));
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      }).catch(() => {});
    } catch (e) {}
  }

  function formatVND(num) {
    return Number(num || 0).toLocaleString('vi-VN') + 'đ';
  }

  function getCurrentAccount() {
    if (!state.accounts || !state.accounts.length) return null;
    return state.accounts.find(a => a.id === currentAccountId) || null;
  }

  function getProject(projectId) {
    return state.projects.find(p => p.id === projectId) || state.projects[0];
  }

  function getTeam(teamId) {
    return state.teams.find(t => t.id === teamId) || state.teams[0];
  }

  // Lấy danh sách công nhân thuộc phạm vi của tài khoản đang đăng nhập
  function getScopedWorkersForCurrentAccount() {
    const acc = getCurrentAccount();
    if (!acc) return [];
    if (acc.roleId === 'BGD' || acc.roleId === 'KT') {
      return state.workers;
    }
    if (acc.roleId === 'QLCT') {
      return state.workers.filter(w =>
        w.projectId === acc.projectId ||
        w.managerUsername === acc.username ||
        w.managerName === acc.fullName
      );
    }
    if (acc.roleId === 'DT1') {
      return state.workers.filter(w =>
        w.teamId === acc.teamId ||
        w.leaderUsername === acc.username ||
        w.leaderName === acc.fullName
      );
    }
    if (acc.roleId === 'CN') {
      const myWorker = state.workers.find(w =>
        w.code.toLowerCase() === (acc.workerCode || acc.username || '').toLowerCase() ||
        w.name.toLowerCase() === (acc.fullName || '').toLowerCase()
      ) || state.workers[32] || state.workers[0];
      return myWorker ? [myWorker] : [];
    }
    return state.workers;
  }

  function getPersonalWorkerRecord() {
    const list = getScopedWorkersForCurrentAccount();
    return list[0] || state.workers[32] || state.workers[0];
  }

  // ================= ĐỔI BỘ MÀU 1 (NAVY & CAM) <-> BỘ MÀU 2 (XANH VỊNH & VÀNG MẬT) =================
  function toggleTheme() {
    const html = document.documentElement;
    if (html.getAttribute('data-theme') === 'bo-2') {
      html.removeAttribute('data-theme');
      localStorage.setItem(THEME_KEY, 'bo-1');
    } else {
      html.setAttribute('data-theme', 'bo-2');
      localStorage.setItem(THEME_KEY, 'bo-2');
    }
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'bo-2') {
      document.documentElement.setAttribute('data-theme', 'bo-2');
    }
  }

  // ================= ĐÓNG / MỞ MENU BÊN TRÁI =================
  function toggleSidebar(forceOpen) {
    const sidebar = document.getElementById('leftSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar || !backdrop) return;
    const isOpen = typeof forceOpen === 'boolean' ? forceOpen : !sidebar.classList.contains('open');
    if (isOpen) {
      sidebar.classList.add('open');
      backdrop.classList.add('open');
    } else {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
    }
  }

  function isAdminAccount() {
    const acc = getCurrentAccount();
    return !!(acc && (acc.roleId === 'BGD' || (acc.perms && acc.perms.adminUsers)));
  }

  // ================= ĐĂNG NHẬP / ĐĂNG XUẤT BẮT BUỘC MÀN HÌNH ĐẦU TIÊN =================
  function openFullLoginScreen() {
    const overlay = document.getElementById('fullLoginOverlay');
    if (!overlay) return;
    const errEl = document.getElementById('fullLoginErr');
    if (errEl) errEl.style.display = 'none';
    overlay.classList.add('open');
  }

  function closeFullLoginScreen() {
    const overlay = document.getElementById('fullLoginOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  function submitFullLogin() {
    const uInput = document.getElementById('fullLoginUser');
    const pInput = document.getElementById('fullLoginPin');
    const errEl = document.getElementById('fullLoginErr');
    const u = ((uInput && uInput.value) || '').trim().toLowerCase();
    const p = ((pInput && pInput.value) || '').trim();

    // 1. Tìm trong danh sách tài khoản đã cấp
    let acc = state.accounts.find(a =>
      a.username.toLowerCase() === u &&
      a.pin === p &&
      a.status === 'ACTIVE'
    );

    // 2. Cho phép toàn bộ 108 Mã công nhân (VD: NV.SME-01 .. NV.SME-108) đăng nhập với PIN 0000 vào giao diện Công nhân của riêng họ
    if (!acc && p === '0000') {
      const workerMatch = state.workers.find(w => w.code.toLowerCase() === u);
      if (workerMatch) {
        acc = {
          id: 'ACC-W-' + workerMatch.code,
          username: workerMatch.code,
          pin: '0000',
          fullName: workerMatch.name,
          positionTitle: `Công nhân ${workerMatch.teamName} (${workerMatch.roleName})`,
          roleId: 'CN',
          level: 5,
          projectId: workerMatch.projectId,
          teamId: workerMatch.teamId,
          workerCode: workerMatch.code,
          managerName: workerMatch.managerName,
          leaderName: workerMatch.leaderName,
          createdBy: workerMatch.createdBy,
          status: 'ACTIVE',
          perms: { checkin: true, inputTeam: false, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
        };
        state.accounts.push(acc);
      }
    }

    if (!acc) {
      if (errEl) errEl.style.display = 'block';
      return;
    }

    activateAccountSession(acc);
    if (pInput) pInput.value = '';
    closeFullLoginScreen();
  }

  function activateAccountSession(acc) {
    isAuthenticated = true;
    currentAccountId = acc.id;
    currentRoleId = acc.roleId;

    // Đặt bộ lọc mặc định theo phạm vi quản lý của tài khoản
    if (acc.roleId === 'QLCT' && acc.projectId !== 'ALL') {
      filterProject = acc.projectId;
      filterTeam = 'ALL';
    } else if (acc.roleId === 'DT1' && acc.teamId !== 'ALL') {
      filterProject = acc.projectId;
      filterTeam = acc.teamId;
    } else {
      filterProject = 'ALL';
      filterTeam = 'ALL';
    }
    filterManager = 'ALL';
    filterStatus = 'ALL';
    searchQuery = '';

    const cfg = ROLE_CONFIG[currentRoleId] || ROLE_CONFIG.BGD;
    currentTab = cfg.defaultTab;

    renderRoleNavigationAndHeader();
    renderRoleHeroSection();
    renderMain();
  }

  function logoutAccount() {
    isAuthenticated = false;
    currentAccountId = null;
    toggleSidebar(false);
    openFullLoginScreen();
  }

  function loginAsAccount(accId) {
    const acc = state.accounts.find(a => a.id === accId);
    if (!acc) return;
    if (acc.status !== 'ACTIVE') {
      alert('Tài khoản này đang bị tạm khóa!');
      return;
    }
    activateAccountSession(acc);
    closeFullLoginScreen();
  }

  // ================= DỰNG MENU, HEADER & THANH ĐÁY RIÊNG THEO VỊ TRÍ ĐĂNG NHẬP =================
  function getBadgeCounts() {
    const acc = getCurrentAccount();
    const bgdPending = state.advances.filter(a => a.status === 'CHO_BGD_DUYET').length + (state.payrollMonthStatus === 'CHO_BGD_DUYET' ? 1 : 0);
    const ktPending = state.advances.filter(a => a.status === 'CHO_KT_KIEM_TRA').length;
    let qlctPending = 0;
    if (acc && acc.roleId === 'QLCT') {
      qlctPending = getScopedWorkersForCurrentAccount().filter(w => w.approvalStatus !== 'DA_DUYET' || w.forgotCheckoutFlag).length;
    }
    return { bgdPending, ktPending, qlctPending };
  }

  function renderRoleNavigationAndHeader() {
    const acc = getCurrentAccount();
    if (!acc) return;
    const cfg = ROLE_CONFIG[acc.roleId] || ROLE_CONFIG.BGD;
    const badges = getBadgeCounts();

    // 1. Cập nhật thông tin tài khoản trong Sidebar
    const roleLvl = document.getElementById('sidebarRoleLevelLabel');
    if (roleLvl) roleLvl.textContent = cfg.badge;
    const sideInfo = document.getElementById('sidebarCurrentAccountInfo');
    if (sideInfo) {
      let scopeLine = '';
      if (acc.roleId === 'QLCT') {
        const prj = getProject(acc.projectId);
        scopeLine = `<div style="font-size:10px; color:var(--ds-accent); margin-top:2px;">Phụ trách: ${prj.name}</div>`;
      } else if (acc.roleId === 'DT1') {
        const tm = getTeam(acc.teamId);
        scopeLine = `<div style="font-size:10px; color:var(--ds-accent); margin-top:2px;">Đội: ${tm.name} · QLCT: ${tm.managerName}</div>`;
      } else if (acc.roleId === 'CN') {
        const w = getPersonalWorkerRecord();
        scopeLine = `<div style="font-size:10px; color:var(--ds-accent); margin-top:2px;">Mã NV: ${w.code} · ${w.teamName} · QLCT: ${w.managerName}</div>`;
      }
      sideInfo.innerHTML = `
        <div style="font-size:12px; font-weight:700; color:#FFFFFF;">${acc.fullName}</div>
        <div style="font-size:10px; color:rgba(255,255,255,0.8);">${acc.positionTitle} (TK: <code>${acc.username}</code>)</div>
        ${scopeLine}
      `;
    }

    // 2. Cập nhật danh sách Menu bên trái theo đúng vai trò
    const sidebarMenu = document.getElementById('sidebarMenu');
    if (sidebarMenu) {
      let html = `<div class="sidebar-group-title">CHỨC NĂNG CỦA ${cfg.shortTitle.toUpperCase()}</div>`;
      cfg.tabs.forEach(t => {
        const bVal = t.badgeKey ? badges[t.badgeKey] : 0;
        const badgeHtml = bVal > 0 ? `<span class="sidebar-badge">${bVal}</span>` : '';
        html += `
          <button class="sidebar-item ${currentTab === t.id ? 'active' : ''}" data-tab="${t.id}" onclick="window.NPApp.selectTab('${t.id}')">
            <span><span class="s-icon">${t.icon}</span> ${t.label}</span>
            ${badgeHtml}
          </button>
        `;
      });

      // Chỉ Đội trưởng và Công nhân mới có nút Chấm công Camera trong menu
      if (cfg.hasPersonalCheckin) {
        html += `
          <div class="sidebar-group-title">CHẤM CÔNG CAMERA + GPS</div>
          <button class="sidebar-item" onclick="window.NPApp.openCameraFromSidebar('VAO')">
            <span><span class="s-icon">📸</span> Chụp Camera Check-in (Vào ca)</span>
            <span class="sidebar-badge">GPS</span>
          </button>
          <button class="sidebar-item" onclick="window.NPApp.openCameraFromSidebar('RA')">
            <span><span class="s-icon">🏁</span> Chụp Camera Check-out (Ra ca)</span>
          </button>
        `;
      }

      html += `
        <div class="sidebar-group-title">HỆ THỐNG</div>
        <button class="sidebar-item" onclick="window.NPApp.toggleTheme()">
          <span><span class="s-icon">🎨</span> Đổi Bộ màu Navy · Cam (Bộ 1 ↔ Bộ 2)</span>
        </button>
        <button class="sidebar-item" onclick="window.NPApp.logoutAccount()">
          <span><span class="s-icon">🚪</span> Đăng xuất / Đổi Tài khoản</span>
        </button>
      `;
      sidebarMenu.innerHTML = html;
    }

    // 3. Cập nhật Header trên cùng (Tổng Giám đốc / Kế toán / Quản lý CT KHÔNG có nút Chấm công)
    const headerRoleBadge = document.getElementById('headerRoleBadge');
    if (headerRoleBadge) headerRoleBadge.textContent = `· ${cfg.shortTitle}`;

    const activeTabObj = cfg.tabs.find(t => t.id === currentTab) || cfg.tabs[0];
    const sub = document.getElementById('currentTabSubtitle');
    if (sub && activeTabObj) {
      sub.textContent = `${acc.fullName} — ${activeTabObj.label}`;
    }

    const headerRight = document.getElementById('headerRightActions');
    if (headerRight) {
      let actionBtnHtml = '';
      if (acc.roleId === 'BGD') {
        actionBtnHtml = `
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.selectTab('phan-quyen')">
            🔐 Tạo Tài khoản Vị trí
          </button>
        `;
      } else if (acc.roleId === 'KT') {
        actionBtnHtml = `
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.exportPayrollCsv()">
            📥 Xuất Excel Lương (.CSV)
          </button>
        `;
      } else if (acc.roleId === 'QLCT') {
        actionBtnHtml = `
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.openAssignTaskModal()">
            📌 Giao việc cho Đội trưởng
          </button>
        `;
      } else if (acc.roleId === 'DT1') {
        actionBtnHtml = `
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.openCameraQuick('VAO', null)">
            📸 Điểm danh Đội (${getScopedWorkersForCurrentAccount().length} người)
          </button>
        `;
      } else if (acc.roleId === 'CN') {
        const myW = getPersonalWorkerRecord();
        actionBtnHtml = `
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.openCameraQuick('VAO', '${myW.id}')">
            📸 Chấm công Cá nhân
          </button>
        `;
      }

      headerRight.innerHTML = `
        <button class="btn btn-outline-dark btn-sm" onclick="window.NPApp.logoutAccount()" title="Đăng xuất để chuyển sang tài khoản khác">
          👤 ${acc.fullName} · Đổi TK
        </button>
        ${actionBtnHtml}
      `;
    }

    // 4. Cập nhật Thanh điều hướng đáy điện thoại (Mobile Bottom Nav) theo đúng vị trí
    const bottomNav = document.getElementById('mobileBottomNav');
    if (bottomNav) {
      bottomNav.innerHTML = cfg.tabs.map(t => `
        <button class="bnav-item ${currentTab === t.id ? 'active' : ''}" data-tab="${t.id}" onclick="window.NPApp.selectTab('${t.id}')">
          <span class="b-icon">${t.icon}</span>
          <span>${t.shortLabel}</span>
        </button>
      `).join('');
    }
  }

  // ================= KHUNG THÔNG TIN ĐẦU TRANG RIÊNG CHO TỪNG VỊ TRÍ =================
  function renderRoleHeroSection() {
    const acc = getCurrentAccount();
    const container = document.getElementById('roleHeroSection');
    if (!acc || !container) return;

    if (acc.roleId === 'BGD') {
      const total = state.workers.length;
      const present = state.workers.filter(w => w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA').length;
      const absent = total - present;
      const pendingAdv = state.advances.filter(a => a.status === 'CHO_BGD_DUYET').length;

      container.innerHTML = `
        <div class="compact-role-strip">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span class="badge badge-navy">CẤP 1 · TỔNG GIÁM ĐỐC</span>
            <strong style="font-size:12px; color:var(--ds-primary);">${acc.fullName}</strong>
            <span style="font-size:11px; color:var(--ds-text-muted);">· Không cần chấm công cá nhân · Giám sát 3 Quản lý Công trình → 6 Đội trưởng → ${total} Công nhân</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <span class="badge badge-success">Đi làm hôm nay: ${present}/${total}</span>
            <span class="badge badge-danger">Vắng/Nghỉ: ${absent}</span>
            <span class="badge badge-orange">Chờ GĐ duyệt: ${pendingAdv} đơn</span>
          </div>
        </div>
        <div class="morning-report-compact">
          <div>
            <span class="kicker" style="color:var(--ds-accent); margin:0;">BÁO CÁO QUÂN SỐ TỰ ĐỘNG 08:30 SÁNG GỬI TỔNG GIÁM ĐỐC</span>
            <div style="font-size:12px; font-weight:700; color:#FFFFFF; margin-top:2px;">
              Toàn công ty Nguyên Phát: ${present}/${total} nhân sự có mặt (${Math.round((present / total) * 100)}%) · 3 Công trình đang thi công
            </div>
          </div>
          <div class="morning-mini-pills">
            ${state.projects.map(p => {
              const pWorkers = state.workers.filter(w => w.projectId === p.id);
              const pPresent = pWorkers.filter(w => w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA').length;
              return `
                <div class="morning-mini-pill">
                  <strong>${p.id} (${p.manager}):</strong> ${pPresent}/${pWorkers.length} có mặt
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
      return;
    }

    if (acc.roleId === 'KT') {
      const approvedWorkers = state.workers.filter(w => w.approvalStatus === 'DA_DUYET').length;
      const pendingKtAdv = state.advances.filter(a => a.status === 'CHO_KT_KIEM_TRA').length;
      container.innerHTML = `
        <div class="compact-role-strip">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span class="badge badge-navy">CẤP 2 · HÀNH CHÍNH – KẾ TOÁN</span>
            <strong style="font-size:12px; color:var(--ds-primary);">${acc.fullName}</strong>
            <span style="font-size:11px; color:var(--ds-text-muted);">· Đối chiếu bảng công theo từng Quản lý Công trình &amp; Đội trưởng · Chỉ tính lương công ĐÃ DUYỆT</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <span class="badge badge-success">Công đã được QLCT duyệt: ${approvedWorkers}/${state.workers.length}</span>
            <span class="badge badge-orange">Đơn ứng chờ KT kiểm tra: ${pendingKtAdv}</span>
          </div>
        </div>
      `;
      return;
    }

    if (acc.roleId === 'QLCT') {
      const prj = getProject(acc.projectId);
      const myTeams = state.teams.filter(t => t.projectId === prj.id);
      const myWorkers = getScopedWorkersForCurrentAccount();
      const present = myWorkers.filter(w => w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA').length;
      const unapproved = myWorkers.filter(w => w.approvalStatus !== 'DA_DUYET').length;

      container.innerHTML = `
        <div class="compact-role-strip">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span class="badge badge-navy">CẤP 3 · QUẢN LÝ CÔNG TRÌNH (${prj.id})</span>
            <strong style="font-size:12px; color:var(--ds-primary);">${acc.fullName}</strong>
            <span style="font-size:11px; color:var(--ds-text-muted);">· Phụ trách: <strong>${prj.name}</strong> · Quản lý ${myTeams.length} Đội trưởng &amp; ${myWorkers.length} Công nhân dưới quyền</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <span class="badge badge-success">Quân số công trình: ${present}/${myWorkers.length}</span>
            <span class="badge badge-orange">Chờ tôi duyệt công: ${unapproved} người</span>
          </div>
        </div>
      `;
      return;
    }

    if (acc.roleId === 'DT1') {
      const tm = getTeam(acc.teamId);
      const prj = getProject(acc.projectId);
      const myTeamWorkers = getScopedWorkersForCurrentAccount();
      const present = myTeamWorkers.filter(w => w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA').length;

      container.innerHTML = `
        <div class="compact-role-strip">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span class="badge badge-orange">CẤP 4 · ĐỘI TRƯỞNG THI CÔNG (${tm.id})</span>
            <strong style="font-size:12px; color:var(--ds-primary);">${acc.fullName}</strong>
            <span style="font-size:11px; color:var(--ds-text-muted);">· Quản lý trực tiếp: <strong>${tm.name} (${myTeamWorkers.length} công nhân)</strong> · Báo cáo cho QLCT: <strong>${tm.managerName}</strong> (${prj.id})</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <span class="badge badge-success">Đội có mặt: ${present}/${myTeamWorkers.length} người</span>
            <span class="badge badge-navy">Không tự duyệt công (Trình ${tm.managerName})</span>
          </div>
        </div>
      `;
      return;
    }

    if (acc.roleId === 'CN') {
      const w = getPersonalWorkerRecord();
      container.innerHTML = `
        <div class="compact-role-strip">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span class="badge badge-navy">CẤP 5 · CỔNG CÁ NHÂN CÔNG NHÂN</span>
            <strong style="font-size:12px; color:var(--ds-primary);">${w.name} (${w.code})</strong>
            <span style="font-size:11px; color:var(--ds-text-muted);">· Thuộc: <strong>${w.teamName}</strong> · Đội trưởng: <strong>${w.leaderName}</strong> · Quản lý CT: <strong>${w.managerName}</strong></span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <span class="badge badge-success">Công đã duyệt tháng này: ${w.daysMonthApproved} công</span>
            <span class="badge badge-orange">Tăng ca: ${w.otHoursMonthApproved} giờ</span>
          </div>
        </div>
      `;
    }
  }

  function selectTab(tabName) {
    const acc = getCurrentAccount();
    if (!acc) return;
    if (tabName === 'phan-quyen' && !isAdminAccount()) {
      alert('Chỉ Tổng Giám Đốc / Admin mới có quyền truy cập trang Quản trị Tài khoản!');
      return;
    }
    currentTab = tabName;
    renderRoleNavigationAndHeader();
    toggleSidebar(false);
    renderMain();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openCameraFromSidebar(actionType) {
    toggleSidebar(false);
    const acc = getCurrentAccount();
    if (acc && acc.roleId === 'CN') {
      const w = getPersonalWorkerRecord();
      openCameraQuick(actionType, w.id);
    } else {
      openCameraQuick(actionType, null);
    }
  }

  // ================= ĐỊNH VỊ GPS THẬT TỪ THIẾT BỊ & DỊCH ĐỊA CHỈ THẬT =================
  async function reverseGeocodeRealGps(lat, lng) {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (key === lastGeocodedKey && liveGps.address && !liveGps.address.startsWith('Đang')) {
      return liveGps.address;
    }
    lastGeocodedKey = key;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(',').map(s => s.trim()).filter(Boolean);
          const cleanAddr = parts.slice(0, 5).join(', ');
          liveGps.address = cleanAddr;
          updateGpsStatusBox();
          drawLivePreviewOnCanvas();
          return cleanAddr;
        }
      }
    } catch (e) {}
    liveGps.address = `Vị trí GPS thực tế (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
    updateGpsStatusBox();
    drawLivePreviewOnCanvas();
    return liveGps.address;
  }

  function updateGpsStatusBox() {
    const el = document.getElementById('gpsLiveStatus');
    if (!el) return;
    if (liveGps.hasRealGps) {
      el.innerHTML = `
        <div style="color:var(--ds-primary); font-weight:700;">Đã định vị GPS thực tế của thiết bị:</div>
        <div style="color:var(--ds-text); margin-top:2px;">📍 <strong>Địa điểm:</strong> ${liveGps.address}</div>
        <div style="color:var(--ds-link); margin-top:2px;">🌐 <strong>Tọa độ:</strong> <code>${liveGps.lat.toFixed(6)}, ${liveGps.lng.toFixed(6)}</code> (Sai số: ±${liveGps.acc}m)</div>
      `;
    } else {
      el.innerHTML = `<span style="color:var(--ds-text-muted);">${liveGps.address}</span>`;
    }
  }

  function refreshRealGps() {
    if (!navigator.geolocation) {
      liveGps.address = 'Thiết bị không hỗ trợ Geolocation API';
      updateGpsStatusBox();
      return;
    }
    liveGps.address = 'Đang bắt tín hiệu vệ tinh GPS độ chính xác cao...';
    updateGpsStatusBox();

    navigator.geolocation.getCurrentPosition(
      pos => {
        liveGps.hasRealGps = true;
        liveGps.lat = Number(pos.coords.latitude.toFixed(6));
        liveGps.lng = Number(pos.coords.longitude.toFixed(6));
        liveGps.acc = Math.max(3, Math.round(pos.coords.accuracy || 12));
        liveGps.updatedAt = new Date();
        updateGpsStatusBox();
        drawLivePreviewOnCanvas();
        reverseGeocodeRealGps(liveGps.lat, liveGps.lng);
      },
      err => {
        liveGps.address = `Định vị GPS Công trình Nguyên Phát (15.998583, 107.988185 · ±10m)`;
        updateGpsStatusBox();
        drawLivePreviewOnCanvas();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // ================= VẼ ẢNH CHẤM CÔNG CÓ ĐÓNG DẤU WATERMARK NAVY · CAM =================
  const photoCache = {};

  function getWorkerStampedPhoto(worker) {
    if (worker.customPhotoDataUrl) return worker.customPhotoDataUrl;
    const cacheKey = `${worker.id}_${worker.checkInTime}_${worker.lat}_${worker.lng}`;
    if (photoCache[cacheKey]) return photoCache[cacheKey];

    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 380;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#071E3E';
    ctx.fillRect(0, 0, 480, 380);

    if (sampleImgObj && sampleImgObj.complete && sampleImgObj.naturalWidth > 0) {
      ctx.drawImage(sampleImgObj, 0, 0, 480, 300);
    }

    ctx.fillStyle = '#0B2D5B';
    ctx.fillRect(0, 0, 480, 38);
    ctx.fillStyle = '#F7931E';
    ctx.font = 'bold 12px "Be Vietnam Pro", sans-serif';
    ctx.fillText('NP ONE · LIVE CAMERA GPS', 12, 23);

    ctx.fillStyle = '#1E7E45';
    ctx.beginPath();
    ctx.roundRect(330, 8, 138, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`GPS ±${worker.acc}m HỢP LỆ`, 344, 23);

    ctx.fillStyle = '#071E3E';
    ctx.fillRect(0, 260, 480, 120);
    ctx.fillStyle = '#F7931E';
    ctx.fillRect(0, 260, 480, 3);

    const prj = getProject(worker.projectId);
    const displayAddress = worker.realAddress || prj.address;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`${worker.name} (${worker.code})`, 14, 284);

    ctx.fillStyle = '#F7931E';
    ctx.font = '600 12px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`${worker.teamName} · QLCT: ${worker.managerName}`, 14, 304);

    ctx.fillStyle = '#E3DFD3';
    ctx.font = '11.5px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`Giờ vào: ${worker.checkInTime} - 22/11/2026 | Ra: ${worker.checkOutTime || 'Đang làm'}`, 14, 324);
    ctx.fillText(`Đ/c: ${String(displayAddress).slice(0, 52)}`, 14, 344);
    ctx.fillStyle = '#F7931E';
    ctx.fillText(`GPS: ${worker.lat}, ${worker.lng} (±${worker.acc}m)`, 14, 364);

    try {
      const url = canvas.toDataURL('image/jpeg', 0.85);
      photoCache[cacheKey] = url;
      return url;
    } catch (e) {
      return 'assets/sample-selfie-worker.png';
    }
  }

  function renderAttendanceBadge(status) {
    if (status === 'DANG_LAM') return `<span class="badge badge-success">● Đang làm</span>`;
    if (status === 'DA_RA') return `<span class="badge badge-navy">✓ Đã ra ca</span>`;
    if (status === 'NGHI_PHEP') return `<span class="badge badge-warning">Nghỉ phép</span>`;
    return `<span class="badge badge-danger">✕ Vắng</span>`;
  }

  function renderApprovalBadge(status) {
    if (status === 'DA_DUYET') return `<span class="badge badge-success">✓ QLCT Đã duyệt</span>`;
    if (status === 'TU_CHOI') return `<span class="badge badge-danger">Từ chối</span>`;
    return `<span class="badge badge-orange">⏳ Chờ QLCT duyệt</span>`;
  }

  // ================= ĐIỀU PHỐI RENDER NỘI DUNG CHÍNH THEO VAI TRÒ & TAB =================
  function renderMain() {
    const main = document.getElementById('appMain');
    if (!main) return;
    const acc = getCurrentAccount();
    if (!acc) return;

    renderRoleHeroSection();

    // 1. GIAO DIỆN TỔNG GIÁM ĐỐC / ADMIN (BGD)
    if (acc.roleId === 'BGD') {
      if (currentTab === 'bgd-overview') main.innerHTML = renderBgdOverview();
      else if (currentTab === 'bgd-approvals') main.innerHTML = renderBgdApprovals();
      else if (currentTab === 'bgd-audit') main.innerHTML = renderBgdAudit();
      else if (currentTab === 'phan-quyen') main.innerHTML = renderAdminAccountsTab();
      else main.innerHTML = renderBgdOverview();
      return;
    }

    // 2. GIAO DIỆN HÀNH CHÍNH - KẾ TOÁN (KT)
    if (acc.roleId === 'KT') {
      if (currentTab === 'kt-attendance') main.innerHTML = renderKtAttendance();
      else if (currentTab === 'kt-advances') main.innerHTML = renderKtAdvances();
      else if (currentTab === 'kt-payroll') main.innerHTML = renderKtPayroll();
      else if (currentTab === 'kt-directory') main.innerHTML = renderKtHierarchyDirectory();
      else main.innerHTML = renderKtAttendance();
      return;
    }

    // 3. GIAO DIỆN QUẢN LÝ CÔNG TRÌNH (QLCT)
    if (acc.roleId === 'QLCT') {
      if (currentTab === 'qlct-approve') main.innerHTML = renderQlctApprove();
      else if (currentTab === 'qlct-tasks') main.innerHTML = renderQlctTasks();
      else if (currentTab === 'qlct-staff') main.innerHTML = renderQlctStaff();
      else if (currentTab === 'qlct-summary') main.innerHTML = renderQlctSummary();
      else main.innerHTML = renderQlctApprove();
      return;
    }

    // 4. GIAO DIỆN ĐỘI TRƯỞNG THI CÔNG (DT1)
    if (acc.roleId === 'DT1') {
      if (currentTab === 'dt-checkin') main.innerHTML = renderDtCheckin();
      else if (currentTab === 'dt-tasks') main.innerHTML = renderDtTasks();
      else if (currentTab === 'dt-members') main.innerHTML = renderDtMembers();
      else main.innerHTML = renderDtCheckin();
      return;
    }

    // 5. GIAO DIỆN CÁ NHÂN CÔNG NHÂN (CN)
    if (acc.roleId === 'CN') {
      if (currentTab === 'cn-home') main.innerHTML = renderCnPersonalHome();
      else if (currentTab === 'cn-history') main.innerHTML = renderCnPersonalHistory();
      else if (currentTab === 'cn-requests') main.innerHTML = renderCnPersonalRequests();
      else if (currentTab === 'cn-payslip') main.innerHTML = renderCnPersonalPayslip();
      else main.innerHTML = renderCnPersonalHome();
    }
  }

  // =================================================================================================
  // I. GIAO DIỆN CẤP 1: TỔNG GIÁM ĐỐC / ADMIN (KHÔNG CHẤM CÔNG CÁ NHÂN - QUẢN TRỊ TOÀN CÔNG TY)
  // =================================================================================================
  function renderBgdOverview() {
    const total = state.workers.length;
    const present = state.workers.filter(w => w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA').length;
    const approvedCount = state.workers.filter(w => w.approvalStatus === 'DA_DUYET').length;
    const totalOtToday = state.workers.reduce((s, w) => s + (w.hoursOtActual || 0), 0);
    const totalMonthPayroll = state.workers.reduce((sum, w) => {
      const hourly = w.dailyWage / 8;
      return sum + (w.daysMonthApproved * w.dailyWage) + Math.round(w.otHoursMonthApproved * hourly * 1.5) + Math.round(w.sundayDaysMonth * w.dailyWage * 2.0);
    }, 0);

    return `
      <!-- KPI TỔNG GIÁM ĐỐC -->
      <div class="kpi-grid-4">
        <div class="kpi-card">
          <div>
            <span class="kpi-label">QUÂN SỐ TOÀN CÔNG TY</span>
            <div class="kpi-value">${present}<span class="unit">/${total} người</span></div>
          </div>
          <div class="kpi-sub">Tỷ lệ đi làm: <strong>${Math.round((present / total) * 100)}%</strong> (3 Công trình · 6 Đội)</div>
        </div>
        <div class="kpi-card">
          <div>
            <span class="kpi-label">CÔNG ĐÃ ĐƯỢC QLCT DUYỆT</span>
            <div class="kpi-value">${approvedCount}<span class="unit">/${total} ca</span></div>
          </div>
          <div class="kpi-sub">Đội trưởng nhập → Quản lý CT kiểm tra &amp; duyệt</div>
        </div>
        <div class="kpi-card">
          <div>
            <span class="kpi-label">TỔNG GIỜ TĂNG CA HÔM NAY</span>
            <div class="kpi-value">${totalOtToday}<span class="unit">giờ OT</span></div>
          </div>
          <div class="kpi-sub">Chốt tự động 17:30 nếu không đăng ký OT</div>
        </div>
        <div class="kpi-card">
          <div>
            <span class="kpi-label">QUỸ LƯƠNG LŨY KẾ THÁNG 11</span>
            <div class="kpi-value">${formatVND(totalMonthPayroll)}</div>
          </div>
          <div class="kpi-sub">Chỉ tính trên ngày công đã duyệt hợp lệ</div>
        </div>
      </div>

      <!-- CÂY PHÂN CẤP QUẢN LÝ: TỔNG GIÁM ĐỐC -> 3 QUẢN LÝ CÔNG TRÌNH -> 6 ĐỘI TRƯỞNG -> 108 CÔNG NHÂN -->
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">SƠ ĐỒ CÂY QUẢN LÝ &amp; PHÂN VIỆC TOÀN CÔNG TY</span>
            <h3>Tổng Giám Đốc Giám Sát 3 Quản Lý Công Trình → 6 Đội Trưởng → 108 Công Nhân</h3>
            <div class="section-desc">Mỗi Quản lý Công trình chịu trách nhiệm giao việc, quản lý các Đội trưởng và duyệt công cho toàn bộ công nhân thuộc công trình mình phụ trách.</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.selectTab('bgd-approvals')">✍️ Duyệt Ứng lương &amp; Bảng lương</button>
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.selectTab('phan-quyen')">🔐 Cấp Tài khoản Vị trí</button>
          </div>
        </div>

        <div class="grid-3">
          ${state.projects.map(p => {
            const pTeams = state.teams.filter(t => t.projectId === p.id);
            const pWorkers = state.workers.filter(w => w.projectId === p.id);
            const pPresent = pWorkers.filter(w => w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA').length;
            const pApproved = pWorkers.filter(w => w.approvalStatus === 'DA_DUYET').length;
            const pTasks = (state.tasks || []).filter(tsk => tsk.projectId === p.id);

            return `
              <div class="hierarchy-card">
                <span class="kicker">${p.code} · BÁN KÍNH GPS ${p.radiusM}M</span>
                <h4>${p.name}</h4>
                <div style="font-size:11px; color:var(--ds-text-muted); margin-top:2px;">📍 ${p.address}</div>

                <div style="margin-top:8px; padding:8px; background:var(--ds-primary); color:#FFFFFF; border-radius:var(--ds-radius-sm);">
                  <div style="font-size:10px; color:var(--ds-accent); font-weight:700;">CẤP 3 · QUẢN LÝ CÔNG TRÌNH PHỤ TRÁCH</div>
                  <div style="font-size:12.5px; font-weight:700; margin-top:2px;">👷 ${p.manager} (TK: <code>${p.managerUsername}</code>)</div>
                  <div style="font-size:10.5px; opacity:0.9; margin-top:2px;">Quân số có mặt: <strong>${pPresent}/${pWorkers.length}</strong> · Đã duyệt: <strong>${pApproved}/${pWorkers.length}</strong></div>
                </div>

                <div style="margin-top:8px;">
                  <div style="font-size:10.5px; font-weight:700; color:var(--ds-primary); margin-bottom:4px;">CÁC ĐỘI TRƯỞNG DƯỚI QUYỀN ${p.manager.toUpperCase()}:</div>
                  ${pTeams.map(tm => {
                    const tmWorkers = pWorkers.filter(w => w.teamId === tm.id);
                    const tmPresent = tmWorkers.filter(w => w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA').length;
                    const tmTask = pTasks.find(x => x.teamId === tm.id);
                    return `
                      <div style="padding:7px 8px; border:1px solid var(--ds-line); border-radius:var(--ds-radius-sm); background:#FFFFFF; margin-bottom:6px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                          <strong style="font-size:11.5px; color:var(--ds-primary);">${tm.name}</strong>
                          <span class="badge badge-success">${tmPresent}/${tmWorkers.length} công nhân</span>
                        </div>
                        <div style="font-size:11px; color:var(--ds-text); margin-top:2px;">Đội trưởng: <strong>${tm.leader}</strong> (<code>${tm.leaderUsername}</code>)</div>
                        <div style="font-size:10.5px; color:var(--ds-text-muted); margin-top:2px;">📌 Việc đang làm: <em>${tmTask ? tmTask.title : tm.dailyTargetTask}</em></div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- TIẾN ĐỘ PHÂN VIỆC & NHIỆM VỤ TRÊN 3 CÔNG TRÌNH -->
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">GIÁM SÁT NHIỆM VỤ THI CÔNG TRONG NGÀY</span>
            <h3>Danh Sách Hạng Mục Quản Lý Công Trình Giao Cho Các Đội Trưởng</h3>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã việc</th>
                <th>Công trình</th>
                <th>Người giao việc (Quản lý CT)</th>
                <th>Đội nhận việc (Đội trưởng)</th>
                <th>Hạng mục công việc trong ngày</th>
                <th>Định biên</th>
                <th>Hạn mức OT</th>
                <th>Tiến độ</th>
              </tr>
            </thead>
            <tbody>
              ${(state.tasks || []).map(tsk => {
                const tm = getTeam(tsk.teamId);
                return `
                  <tr>
                    <td><strong>${tsk.id}</strong></td>
                    <td><span class="badge badge-navy">${tsk.projectId}</span></td>
                    <td><strong style="color:var(--ds-primary);">${tsk.assignedBy}</strong></td>
                    <td><strong>${tm.name}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${tsk.assignedToLeader}</span></td>
                    <td><strong>${tsk.title}</strong></td>
                    <td>${tsk.requiredWorkers} người</td>
                    <td>${tsk.allowOvertimeHours > 0 ? `<span class="badge badge-orange">Cho phép +${tsk.allowOvertimeHours}h OT</span>` : `<span class="badge badge-neutral">0h (Chốt 17:30)</span>`}</td>
                    <td><span class="badge badge-success">${tsk.progressPercent}% Hoàn thành</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderBgdApprovals() {
    const pendingBgdAdvances = state.advances.filter(a => a.status === 'CHO_BGD_DUYET');
    const totalGross = state.workers.reduce((sum, w) => {
      const hourly = w.dailyWage / 8;
      return sum + (w.daysMonthApproved * w.dailyWage) + Math.round(w.otHoursMonthApproved * hourly * 1.5) + Math.round(w.sundayDaysMonth * w.dailyWage * 2.0);
    }, 0);
    const totalAdv = state.advances.filter(a => a.status === 'BGD_DA_DUYET').reduce((s, a) => s + a.amount, 0);

    return `
      <!-- PHÊ DUYỆT BẢNG LƯƠNG THÁNG -->
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">THẨM QUYỀN PHÊ DUYỆT CUỐI CÙNG CỦA TỔNG GIÁM ĐỐC</span>
            <h3>Phê Duyệt Bảng Lương Tháng 11/2026 &amp; Đơn Xin Ứng Lương</h3>
            <div class="section-desc">Kế toán đã kiểm tra công hợp lệ và đối chiếu hạn mức ứng lương trước khi trình Tổng Giám đốc phê duyệt.</div>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            ${state.payrollMonthStatus === 'BGD_DA_DUYET'
              ? `<span class="badge badge-success">✓ TỔNG GIÁM ĐỐC ĐÃ PHÊ DUYỆT BẢNG LƯƠNG THÁNG 11</span>`
              : `<button class="btn btn-primary btn-sm" onclick="window.NPApp.approveMonthlyPayroll()">✍️ Tổng Giám đốc Ký Duyệt Bảng Lương Tháng 11 (${formatVND(totalGross - totalAdv)})</button>`
            }
          </div>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Nhân viên xin ứng</th>
                <th>Thuộc Đội trưởng</th>
                <th>Thuộc Quản lý CT</th>
                <th>Công đã duyệt</th>
                <th>Lương lũy kế</th>
                <th>Số tiền xin ứng</th>
                <th>Kế toán kiểm tra</th>
                <th>Trạng thái</th>
                <th>Thẩm quyền GĐ</th>
              </tr>
            </thead>
            <tbody>
              ${state.advances.map(adv => {
                const w = state.workers.find(x => x.code === adv.workerCode) || state.workers[0];
                let stBadge = '';
                if (adv.status === 'BGD_DA_DUYET') stBadge = `<span class="badge badge-success">✓ GĐ Đã duyệt chi</span>`;
                else if (adv.status === 'CHO_BGD_DUYET') stBadge = `<span class="badge badge-orange">⏳ Chờ GĐ phê duyệt</span>`;
                else stBadge = `<span class="badge badge-warning">Chờ Kế toán kiểm tra</span>`;

                return `
                  <tr>
                    <td><strong>${adv.id}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${adv.date}</span></td>
                    <td><strong>${adv.workerName}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${adv.workerCode}</span></td>
                    <td>${w.leaderName}</td>
                    <td><strong style="color:var(--ds-primary);">${w.managerName}</strong></td>
                    <td><strong>${adv.daysWorkedSoFar} công</strong></td>
                    <td><strong>${formatVND(adv.accruedSalary)}</strong></td>
                    <td><strong style="color:var(--ds-primary); font-size:12.5px;">${formatVND(adv.amount)}</strong><br/><span style="font-size:10px;">${adv.reason}</span></td>
                    <td>${adv.checkedByKt ? `<span class="badge badge-navy">✓ ${adv.checkedByKt}</span>` : `<span class="badge badge-neutral">Chưa KT</span>`}</td>
                    <td>${stBadge}</td>
                    <td>
                      ${adv.status === 'CHO_BGD_DUYET'
                        ? `<button class="btn btn-primary btn-sm" onclick="window.NPApp.advanceStep('${adv.id}', 'BGD')">✍️ Duyệt chi</button>`
                        : adv.status === 'CHO_KT_KIEM_TRA'
                          ? `<button class="btn btn-soft btn-sm" onclick="window.NPApp.advanceStep('${adv.id}', 'BGD')">Duyệt vượt cấp</button>`
                          : `<span style="font-size:10.5px; color:var(--ds-success); font-weight:700;">Đã ký duyệt</span>`
                      }
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderBgdAudit() {
    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">NHẬT KÝ KIỂM TOÁN BẤT BIẾN (AUDIT LOG)</span>
            <h3>Lịch Sử Sửa Giờ Công &amp; Duyệt Công Toàn Hệ Thống</h3>
            <div class="section-desc">Mọi thao tác điều chỉnh giờ vào/ra của Quản lý Công trình đều bắt buộc lưu vết: Ai sửa · Sửa lúc nào · Lý do · Giá trị cũ → Giá trị mới.</div>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã Log</th>
                <th>Thời gian sửa</th>
                <th>Nhân sự được sửa</th>
                <th>Người thực hiện sửa</th>
                <th>Trường dữ liệu</th>
                <th>Giá trị cũ → Mới</th>
                <th>Lý do điều chỉnh bắt buộc</th>
              </tr>
            </thead>
            <tbody>
              ${state.auditLogs.map(log => `
                <tr>
                  <td><strong>${log.id}</strong></td>
                  <td>${log.timestamp}</td>
                  <td><strong>${log.workerName}</strong> (${log.workerCode})</td>
                  <td><span class="badge badge-navy">${log.actorRole}: ${log.actorName}</span></td>
                  <td>${log.field}</td>
                  <td><code style="color:var(--ds-danger);">${log.oldVal}</code> → <code style="color:var(--ds-success); font-weight:700;">${log.newVal}</code></td>
                  <td>${log.reason}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =================================================================================================
  // II. GIAO DIỆN CẤP 2: HÀNH CHÍNH – KẾ TOÁN (BIẾT RÕ NHÂN VIÊN NÀO CỦA QUẢN LÝ NÀO & ĐỘI TRƯỞNG NÀO)
  // =================================================================================================
  function renderKtAttendance() {
    const managers = [
      { username: 'qlct_ct1', name: 'KS. Trần Minh Hoàng', project: 'CT1 - Riverside' },
      { username: 'qlct_ct2', name: 'KS. Phạm Quốc Bảo', project: 'CT2 - NP Tower' },
      { username: 'qlct_ct3', name: 'KS. Đặng Văn Hùng', project: 'CT3 - Nhà máy CNC' }
    ];

    const filtered = state.workers.filter(w => {
      if (filterManager !== 'ALL' && w.managerUsername !== filterManager) return false;
      if (filterProject !== 'ALL' && w.projectId !== filterProject) return false;
      if (filterTeam !== 'ALL' && w.teamId !== filterTeam) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!w.name.toLowerCase().includes(q) && !w.code.toLowerCase().includes(q) && !w.managerName.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    return `
      <!-- THANH LỌC THEO QUẢN LÝ CÔNG TRÌNH CHO KẾ TOÁN -->
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">CỔNG NGHIỆP VỤ HÀNH CHÍNH – KẾ TOÁN</span>
            <h3>Bảng Tổng Hợp Công Theo Từng Quản Lý Công Trình &amp; Đội Trưởng</h3>
            <div class="section-desc">Kế toán kiểm soát rõ từng công nhân do Đội trưởng nào chấm công và thuộc Quản lý Công trình nào tạo ra / phê duyệt.</div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.exportAttendanceCsv()">📥 Xuất Excel Bảng Công (.CSV)</button>
          </div>
        </div>

        <div class="filter-bar" style="margin-bottom:10px;">
          <input type="text" placeholder="🔍 Tìm tên công nhân, mã NV, tên Quản lý..." value="${searchQuery}" oninput="window.NPApp.setSearch(this.value)" />
          <select onchange="window.NPApp.setFilterManager(this.value)">
            <option value="ALL" ${filterManager === 'ALL' ? 'selected' : ''}>Tất cả Quản lý Công trình (3 QLCT)</option>
            ${managers.map(m => `<option value="${m.username}" ${filterManager === m.username ? 'selected' : ''}>Quản lý: ${m.name} (${m.project})</option>`).join('')}
          </select>
          <select onchange="window.NPApp.setFilterTeam(this.value)">
            <option value="ALL" ${filterTeam === 'ALL' ? 'selected' : ''}>Tất cả 6 Đội thi công</option>
            ${state.teams.map(t => `<option value="${t.id}" ${filterTeam === t.id ? 'selected' : ''}>${t.name} — ${t.leader}</option>`).join('')}
          </select>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và Tên Công nhân</th>
                <th>Thuộc Đội trưởng (Người chấm)</th>
                <th>Thuộc Quản lý CT (Người tạo &amp; Duyệt)</th>
                <th>Công trình</th>
                <th>Hôm nay (Vào - Ra)</th>
                <th>Công T11 Đã duyệt</th>
                <th>Giờ OT T11</th>
                <th>Công CN</th>
                <th>Trạng thái QLCT Duyệt</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.slice(0, 45).map(w => `
                <tr>
                  <td><strong>${w.code}</strong></td>
                  <td><strong>${w.name}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${w.roleName}</span></td>
                  <td><strong>${w.leaderName}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${w.teamName}</span></td>
                  <td>
                    <span class="badge badge-navy">👷 ${w.managerName}</span>
                    <div style="font-size:9.5px; color:var(--ds-text-muted); margin-top:2px;">Người tạo: ${w.createdBy}</div>
                  </td>
                  <td><strong>${w.projectId}</strong></td>
                  <td>${w.checkInTime ? `<code>${w.checkInTime}</code> - <code>${w.checkOutTime || 'Đang làm'}</code>` : `<span class="badge badge-danger">Vắng</span>`}</td>
                  <td><strong style="color:var(--ds-primary); font-size:12.5px;">${w.daysMonthApproved} công</strong></td>
                  <td><strong>${w.otHoursMonthApproved}h</strong></td>
                  <td>${w.sundayDaysMonth} công</td>
                  <td>${renderApprovalBadge(w.approvalStatus)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:8px; font-size:10.5px; color:var(--ds-text-muted);">
          Đang hiển thị ${Math.min(45, filtered.length)} / ${filtered.length} nhân sự khớp bộ lọc. Bấm "Xuất Excel Bảng Công (.CSV)" để tải toàn bộ 108 nhân sự kèm cột Quản lý Công trình &amp; Đội trưởng.
        </div>
      </div>
    `;
  }

  function renderKtAdvances() {
    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">BƯỚC 1: KẾ TOÁN KIỂM TRA CÔNG HỢP LỆ TRƯỚC KHI TRÌNH GIÁM ĐỐC</span>
            <h3>Kiểm Tra &amp; Đối Chiếu Đơn Xin Ứng Lương</h3>
            <div class="section-desc">Kế toán kiểm tra số ngày công đã được Quản lý Công trình duyệt của nhân sự đó. Nếu số tiền ứng nằm trong hạn mức lương lũy kế thì bấm xác nhận chuyển Tổng Giám đốc duyệt chi.</div>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Nhân sự xin ứng</th>
                <th>Đội trưởng trực tiếp</th>
                <th>Quản lý CT duyệt công</th>
                <th>Công đã duyệt</th>
                <th>Lương lũy kế hiện có</th>
                <th>Số tiền xin ứng</th>
                <th>Tỷ lệ ứng / Lương</th>
                <th>Trạng thái</th>
                <th>Kế toán thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${state.advances.map(adv => {
                const w = state.workers.find(x => x.code === adv.workerCode) || state.workers[0];
                const ratio = Math.round((adv.amount / Math.max(1, adv.accruedSalary)) * 100);
                return `
                  <tr>
                    <td><strong>${adv.id}</strong><br/><span style="font-size:10px;">${adv.date}</span></td>
                    <td><strong>${adv.workerName}</strong> (${adv.workerCode})</td>
                    <td>${w.leaderName}</td>
                    <td><strong style="color:var(--ds-primary);">${w.managerName}</strong></td>
                    <td><strong>${adv.daysWorkedSoFar} công</strong></td>
                    <td><strong>${formatVND(adv.accruedSalary)}</strong></td>
                    <td><strong style="color:var(--ds-primary);">${formatVND(adv.amount)}</strong><br/><span style="font-size:10px;">${adv.reason}</span></td>
                    <td><span class="badge ${ratio <= 70 ? 'badge-success' : 'badge-warning'}">${ratio}% lương lũy kế</span></td>
                    <td>
                      ${adv.status === 'CHO_KT_KIEM_TRA'
                        ? `<span class="badge badge-orange">⏳ Chờ KT kiểm tra</span>`
                        : adv.status === 'CHO_BGD_DUYET'
                          ? `<span class="badge badge-navy">Đã trình Giám đốc</span>`
                          : `<span class="badge badge-success">✓ Giám đốc đã duyệt</span>`
                      }
                    </td>
                    <td>
                      ${adv.status === 'CHO_KT_KIEM_TRA'
                        ? `<button class="btn btn-primary btn-sm" onclick="window.NPApp.advanceStep('${adv.id}', 'KT')">✓ Xác nhận &amp; Trình GĐ</button>`
                        : `<span style="font-size:10.5px; color:var(--ds-success); font-weight:600;">✓ Đã đối chiếu</span>`
                      }
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderKtPayroll() {
    const filtered = state.workers.filter(w => {
      if (filterManager !== 'ALL' && w.managerUsername !== filterManager) return false;
      return true;
    });

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">Tự ĐỘNG TÍNH LƯƠNG CHỈ TRÊN CÔNG ĐÃ DUYỆT</span>
            <h3>Bảng Tính Lương Tháng 11/2026 (Phân Theo Quản Lý Công Trình)</h3>
            <div class="section-desc">Công thức chuẩn: Lương thực lĩnh = (Ngày công đã duyệt × Đơn giá ngày) + (Giờ OT đã duyệt × Đơn giá giờ × 1.5) + (Công Chủ nhật × 2.0) − Ứng lương đã duyệt.</div>
          </div>
          <div style="display:flex; gap:6px;">
            <select onchange="window.NPApp.setFilterManager(this.value)" style="padding:5px 8px; border-radius:999px; border:1px solid var(--ds-line); font-size:11px;">
              <option value="ALL" ${filterManager === 'ALL' ? 'selected' : ''}>Tất cả 3 Quản lý Công trình</option>
              <option value="qlct_ct1" ${filterManager === 'qlct_ct1' ? 'selected' : ''}>Quản lý CT1: KS. Trần Minh Hoàng</option>
              <option value="qlct_ct2" ${filterManager === 'qlct_ct2' ? 'selected' : ''}>Quản lý CT2: KS. Phạm Quốc Bảo</option>
              <option value="qlct_ct3" ${filterManager === 'qlct_ct3' ? 'selected' : ''}>Quản lý CT3: KS. Đặng Văn Hùng</option>
            </select>
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.exportPayrollCsv()">📥 Xuất Excel Bảng Lương (.CSV)</button>
          </div>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và Tên</th>
                <th>Quản lý CT &amp; Đội trưởng</th>
                <th>Đơn giá ngày</th>
                <th>Công đã duyệt</th>
                <th>Lương chính</th>
                <th>Lương OT (1.5)</th>
                <th>Lương CN (2.0)</th>
                <th>Trừ tạm ứng</th>
                <th>Thực lĩnh</th>
                <th>Phiếu lương</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.slice(0, 40).map(w => {
                const hourly = w.dailyWage / 8;
                const basePay = w.daysMonthApproved * w.dailyWage;
                const otPay = Math.round(w.otHoursMonthApproved * hourly * 1.5);
                const sunPay = Math.round(w.sundayDaysMonth * w.dailyWage * 2.0);
                const gross = basePay + otPay + sunPay;
                const adv = state.advances.filter(a => a.workerCode === w.code && a.status === 'BGD_DA_DUYET').reduce((s, a) => s + a.amount, 0);
                const net = gross - adv;
                return `
                  <tr>
                    <td><strong>${w.code}</strong></td>
                    <td><strong>${w.name}</strong></td>
                    <td>
                      <strong style="color:var(--ds-primary);">${w.managerName}</strong>
                      <div style="font-size:10px; color:var(--ds-text-muted);">${w.leaderName} (${w.teamId})</div>
                    </td>
                    <td>${formatVND(w.dailyWage)}</td>
                    <td><strong>${w.daysMonthApproved} công</strong></td>
                    <td>${formatVND(basePay)}</td>
                    <td>${formatVND(otPay)} (${w.otHoursMonthApproved}h)</td>
                    <td>${formatVND(sunPay)}</td>
                    <td style="color:var(--ds-danger); font-weight:600;">-${formatVND(adv)}</td>
                    <td><strong style="color:var(--ds-primary); font-size:12.5px;">${formatVND(net)}</strong></td>
                    <td><button class="btn btn-soft btn-sm" onclick="window.NPApp.openPayslipModal('${w.id}')">Phiếu</button></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderKtHierarchyDirectory() {
    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">ĐỐI CHIẾU CÂY NHÂN SỰ DÀNH CHO KẾ TOÁN</span>
            <h3>Danh Bạ Phân Quyền: Nhân Viên Nào Thuộc Quản Lý Công Trình &amp; Đội Trưởng Nào</h3>
            <div class="section-desc">Giúp Kế toán nắm rõ đầu mối chịu trách nhiệm khi cần xác minh ngày công, tăng ca hoặc hồ sơ tạm ứng của bất kỳ công nhân nào.</div>
          </div>
        </div>
        <div class="grid-3">
          ${state.projects.map(p => {
            const pTeams = state.teams.filter(t => t.projectId === p.id);
            const pWorkers = state.workers.filter(w => w.projectId === p.id);
            return `
              <div class="hierarchy-card">
                <span class="kicker">QUẢN LÝ CÔNG TRÌNH ${p.id}</span>
                <h4>👷 ${p.manager}</h4>
                <div style="font-size:11px; color:var(--ds-text-muted); margin-bottom:8px;">Công trình: ${p.name} · Tổng số: <strong>${pWorkers.length} nhân sự</strong></div>
                ${pTeams.map(tm => {
                  const tmWorkers = pWorkers.filter(w => w.teamId === tm.id);
                  return `
                    <div style="padding:8px; border:1px solid var(--ds-line); border-radius:var(--ds-radius-sm); background:#FFFFFF; margin-bottom:6px;">
                      <div style="font-weight:700; color:var(--ds-primary); font-size:11.5px;">${tm.name} — ${tm.leader}</div>
                      <div style="font-size:10.5px; color:var(--ds-text-muted); margin:2px 0 4px;">SĐT Đội trưởng: ${tm.phone} · Quân số: ${tmWorkers.length} người</div>
                      <div style="font-size:10px; color:var(--ds-text); line-height:1.4;">
                        Mã NV thuộc đội: <code>${tmWorkers[0]?.code}</code> → <code>${tmWorkers[tmWorkers.length - 1]?.code}</code>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // =================================================================================================
  // III. GIAO DIỆN CẤP 3: QUẢN LÝ CÔNG TRÌNH (CHỈ THẤY CÔNG TRÌNH MÌNH, PHÂN VIỆC & DUYỆT CÔNG)
  // =================================================================================================
  function renderQlctApprove() {
    const acc = getCurrentAccount();
    const prj = getProject(acc.projectId);
    const myWorkers = getScopedWorkersForCurrentAccount();
    const myTeams = state.teams.filter(t => t.projectId === prj.id);

    const present = myWorkers.filter(w => w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA').length;
    const unapproved = myWorkers.filter(w => w.approvalStatus !== 'DA_DUYET').length;
    const forgotList = myWorkers.filter(w => w.forgotCheckoutFlag);

    const filtered = myWorkers.filter(w => {
      if (filterTeam !== 'ALL' && w.teamId !== filterTeam) return false;
      if (filterStatus === 'UNAPPROVED' && w.approvalStatus === 'DA_DUYET') return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!w.name.toLowerCase().includes(q) && !w.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    return `
      <div class="kpi-grid-4">
        <div class="kpi-card">
          <div>
            <span class="kpi-label">QUÂN SỐ ${prj.id} HÔM NAY</span>
            <div class="kpi-value">${present}<span class="unit">/${myWorkers.length} người</span></div>
          </div>
          <div class="kpi-sub">Thuộc ${myTeams.length} Đội dưới quyền ${acc.fullName}</div>
        </div>
        <div class="kpi-card">
          <div>
            <span class="kpi-label">CHỜ TÔI DUYỆT CÔNG</span>
            <div class="kpi-value" style="color:var(--ds-accent);">${unapproved}<span class="unit">ca</span></div>
          </div>
          <div class="kpi-sub">Đội trưởng đã điểm danh và gửi lên</div>
        </div>
        <div class="kpi-card">
          <div>
            <span class="kpi-label">CA QUÊN CHECK-OUT 17:30</span>
            <div class="kpi-value" style="color:var(--ds-danger);">${forgotList.length}<span class="unit">ca</span></div>
          </div>
          <div class="kpi-sub">Cần xác nhận chốt 8h hoặc tính OT</div>
        </div>
        <div class="kpi-card">
          <div>
            <span class="kpi-label">ĐỘI TRƯỞNG DƯỚI QUYỀN</span>
            <div class="kpi-value">${myTeams.length}<span class="unit">Đội trưởng</span></div>
          </div>
          <div class="kpi-sub">${myTeams.map(t => t.leader).join(' · ')}</div>
        </div>
      </div>

      ${forgotList.length > 0 ? `
        <div class="section-card" style="border-color:var(--ds-accent); background:var(--ds-warning-bg);">
          <div class="section-header" style="border-bottom-color:rgba(154,91,0,0.2);">
            <div>
              <span class="kicker">CẢNH BÁO TỰ ĐỘNG SAU 17:30 TẠI ${prj.id}</span>
              <h3>Có ${forgotList.length} Công Nhân Chưa Check-out Lúc 17:30 Cần Quản Lý Xác Nhận</h3>
            </div>
          </div>
          <div style="display:grid; gap:6px;">
            ${forgotList.map(w => `
              <div style="display:flex; justify-content:space-between; align-items:center; background:#FFFFFF; padding:8px 10px; border-radius:var(--ds-radius-sm); border:1px solid var(--ds-line); flex-wrap:wrap; gap:6px;">
                <div>
                  <strong>${w.name} (${w.code})</strong> · ${w.teamName} (Đội trưởng: ${w.leaderName}) · Vào ca: <code>${w.checkInTime}</code>
                </div>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-soft btn-sm" onclick="window.NPApp.confirmForgotCheckout('${w.id}', 0)">Chốt đủ 8h hành chính (0h OT)</button>
                  <button class="btn btn-primary btn-sm" onclick="window.NPApp.confirmForgotCheckout('${w.id}', 2)">Xác nhận có Tăng ca (+2h OT)</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">PHÊ DUYỆT BẢNG CÔNG CÔNG TRÌNH ${prj.name.toUpperCase()}</span>
            <h3>Kiểm Tra Ảnh GPS &amp; Duyệt Công Cho Các Đội Dưới Quyền (${myWorkers.length} Nhân Sự)</h3>
            <div class="section-desc">Đội trưởng chỉ có quyền điểm danh và nhập công. Quản lý Công trình (${acc.fullName}) kiểm tra ảnh GPS, điều chỉnh nếu sai sót và bấm Duyệt công.</div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.approveAllVisible()">✅ Duyệt tất cả công hợp lệ của ${prj.id}</button>
          </div>
        </div>

        <div class="filter-bar" style="margin-bottom:10px;">
          <input type="text" placeholder="🔍 Tìm công nhân thuộc công trình của tôi..." value="${searchQuery}" oninput="window.NPApp.setSearch(this.value)" />
          <select onchange="window.NPApp.setFilterTeam(this.value)">
            <option value="ALL" ${filterTeam === 'ALL' ? 'selected' : ''}>Tất cả Đội thuộc ${prj.id}</option>
            ${myTeams.map(t => `<option value="${t.id}" ${filterTeam === t.id ? 'selected' : ''}>${t.name} — ${t.leader}</option>`).join('')}
          </select>
          <select onchange="window.NPApp.setFilterStatus(this.value)">
            <option value="ALL" ${filterStatus === 'ALL' ? 'selected' : ''}>Tất cả trạng thái duyệt</option>
            <option value="UNAPPROVED" ${filterStatus === 'UNAPPROVED' ? 'selected' : ''}>Chỉ hiện ca Chờ tôi duyệt (${unapproved})</option>
          </select>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ảnh GPS</th>
                <th>Mã NV &amp; Họ tên</th>
                <th>Đội trưởng phụ trách</th>
                <th>Việc được giao hôm nay</th>
                <th>Giờ Vào - Ra</th>
                <th>Công &amp; OT</th>
                <th>Trạng thái</th>
                <th>Thao tác của Quản lý CT</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(w => {
                const thumb = getWorkerStampedPhoto(w);
                return `
                  <tr>
                    <td>
                      <img src="${thumb}" class="photo-thumb" onclick="window.NPApp.openPhotoModal('${w.id}')" title="Xem ảnh GPS phóng to" />
                    </td>
                    <td><strong>${w.name}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${w.code} · ${w.roleName}</span></td>
                    <td><strong>${w.leaderName}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${w.teamName}</span></td>
                    <td><span style="font-size:11px;">${w.assignedTaskToday || 'Thi công theo phân công đội'}</span></td>
                    <td>
                      ${w.checkInTime ? `Vào: <code>${w.checkInTime}</code><br/>Ra: <code>${w.checkOutTime || 'Đang làm'}</code>` : `<span class="badge badge-danger">Vắng mặt</span>`}
                    </td>
                    <td><strong>${w.hoursRegular ? '1.0 công' : '0 công'}</strong><br/><span style="font-size:10px; color:var(--ds-accent);">OT: +${w.hoursOtActual || 0}h</span></td>
                    <td>${renderApprovalBadge(w.approvalStatus)}</td>
                    <td>
                      <div style="display:flex; gap:4px; flex-wrap:wrap;">
                        ${w.approvalStatus !== 'DA_DUYET'
                          ? `<button class="btn btn-primary btn-sm" onclick="window.NPApp.approveSingleWorker('${w.id}')">✓ Duyệt</button>`
                          : `<span class="badge badge-neutral">Đã khóa</span>`
                        }
                        <button class="btn btn-soft btn-sm" onclick="window.NPApp.openAdjustModal('${w.id}')">✏️ Sửa giờ</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderQlctTasks() {
    const acc = getCurrentAccount();
    const prj = getProject(acc.projectId);
    const myTeams = state.teams.filter(t => t.projectId === prj.id);
    const myTasks = (state.tasks || []).filter(tsk => tsk.projectId === prj.id);

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">PHÂN VIỆC &amp; GIAO KHOÁN HẠNG MỤC TẠI ${prj.id}</span>
            <h3>Giao Nhiệm Vụ Ngày &amp; Hạn Mức Tăng Ca Cho Các Đội Trưởng Dưới Quyền</h3>
            <div class="section-desc">Quản lý Công trình (${acc.fullName}) giao hạng mục thi công, định biên quân số và hạn mức giờ tăng ca cho từng Đội trưởng. Đội trưởng sẽ nhận nhiệm vụ này trên màn hình Đội trưởng.</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.openAssignTaskModal()">
            + Giao nhiệm vụ mới cho Đội trưởng
          </button>
        </div>

        <div class="grid-2">
          ${myTeams.map(tm => {
            const tmTasks = myTasks.filter(x => x.teamId === tm.id);
            const tmWorkers = state.workers.filter(w => w.teamId === tm.id);
            return `
              <div class="hierarchy-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span class="kicker">${tm.id} · QUÂN SỐ ${tmWorkers.length} CÔNG NHÂN</span>
                  <span class="badge badge-navy">Đội trưởng: ${tm.leader}</span>
                </div>
                <h4>${tm.name}</h4>
                <div style="font-size:11px; color:var(--ds-text-muted); margin-top:2px;">SĐT Đội trưởng: ${tm.phone} · Tài khoản: <code>${tm.leaderUsername}</code></div>

                <div style="margin-top:8px;">
                  ${tmTasks.map(tsk => `
                    <div style="padding:8px 10px; background:#FFFFFF; border:1px solid var(--ds-line); border-radius:var(--ds-radius-sm); margin-bottom:6px;">
                      <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="color:var(--ds-primary); font-size:12px;">📌 ${tsk.title}</strong>
                        <span class="badge badge-success">${tsk.progressPercent}%</span>
                      </div>
                      <div style="font-size:10.5px; color:var(--ds-text-muted); margin-top:4px;">
                        Yêu cầu: <strong>${tsk.requiredWorkers} công nhân</strong> · Hạn mức OT cho phép: <strong>+${tsk.allowOvertimeHours}h</strong> · Ngày: ${tsk.date}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderQlctStaff() {
    const acc = getCurrentAccount();
    const prj = getProject(acc.projectId);
    const myTeams = state.teams.filter(t => t.projectId === prj.id);
    const myWorkers = getScopedWorkersForCurrentAccount();

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">QUẢN LÝ NHÂN SỰ THUỘC QUYỀN TẠO CỦA ${acc.fullName.toUpperCase()}</span>
            <h3>Danh Sách Đội Trưởng &amp; ${myWorkers.length} Công Nhân Dưới Quyền Quản Lý Của Tôi</h3>
            <div class="section-desc">Mọi nhân viên do Quản lý Công trình (${acc.fullName}) hoặc Đội trưởng dưới quyền tạo ra đều được gắn nhãn Quản lý phụ trách để Kế toán và Tổng Giám đốc theo dõi.</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.openAddWorkerModal()">+ Thêm Nhân viên / Công nhân dưới quyền tôi</button>
          </div>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và Tên</th>
                <th>Chức danh / Tổ đội</th>
                <th>Đội trưởng trực tiếp</th>
                <th>Quản lý CT phụ trách</th>
                <th>Người tạo hồ sơ</th>
                <th>Đơn giá lương ngày</th>
                <th>Công đã làm T11</th>
              </tr>
            </thead>
            <tbody>
              ${myWorkers.map(w => `
                <tr>
                  <td><strong>${w.code}</strong></td>
                  <td><strong>${w.name}</strong></td>
                  <td>${w.roleName} · <strong>${w.teamName}</strong></td>
                  <td>${w.leaderName}</td>
                  <td><span class="badge badge-navy">${w.managerName}</span></td>
                  <td><span class="badge badge-neutral">${w.createdBy}</span></td>
                  <td><strong>${formatVND(w.dailyWage)}</strong>/ngày</td>
                  <td><strong>${w.daysMonthApproved} công</strong> (+${w.otHoursMonthApproved}h OT)</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderQlctSummary() {
    const acc = getCurrentAccount();
    const prj = getProject(acc.projectId);
    const myWorkers = getScopedWorkersForCurrentAccount();

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">BẢNG TỔNG HỢP CÔNG TUẦN &amp; THÁNG TẠI ${prj.id}</span>
            <h3>Tổng Kết Ngày Công Từng Nhân Sự Thuộc ${prj.name}</h3>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và Tên</th>
                <th>Đội thi công</th>
                <th>Thứ 2</th>
                <th>Thứ 3</th>
                <th>Thứ 4</th>
                <th>Thứ 5</th>
                <th>Thứ 6</th>
                <th>Thứ 7</th>
                <th>CN</th>
                <th>Tổng Công T11</th>
                <th>Tổng OT T11</th>
              </tr>
            </thead>
            <tbody>
              ${myWorkers.map(w => `
                <tr>
                  <td><strong>${w.code}</strong></td>
                  <td><strong>${w.name}</strong></td>
                  <td>${w.teamName}</td>
                  ${(w.weekDays || [1, 1, 1, 1, 1, 1, 0]).map(d => `<td style="text-align:center; font-weight:700; color:${d > 0 ? 'var(--ds-success)' : 'var(--ds-text-muted)'};">${d}</td>`).join('')}
                  <td><strong style="color:var(--ds-primary);">${w.daysMonthApproved} công</strong></td>
                  <td><strong>${w.otHoursMonthApproved}h</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =================================================================================================
  // IV. GIAO DIỆN CẤP 4: ĐỘI TRƯỞNG THI CÔNG (CHỈ THẤY ~18-23 NGƯỜI TRONG ĐỘI MÌNH, ĐIỂM DANH & GIAO VIỆC)
  // =================================================================================================
  function renderDtCheckin() {
    const acc = getCurrentAccount();
    const tm = getTeam(acc.teamId);
    const prj = getProject(acc.projectId);
    const teamWorkers = getScopedWorkersForCurrentAccount();
    const present = teamWorkers.filter(w => w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA').length;
    const workingNow = teamWorkers.filter(w => w.attendanceStatus === 'DANG_LAM').length;
    const checkedOut = teamWorkers.filter(w => w.attendanceStatus === 'DA_RA').length;

    return `
      <div class="kpi-grid-4">
        <div class="kpi-card">
          <div>
            <span class="kpi-label">QUÂN SỐ ${tm.name.toUpperCase()}</span>
            <div class="kpi-value">${present}<span class="unit">/${teamWorkers.length} người</span></div>
          </div>
          <div class="kpi-sub">Đội trưởng chỉ quản lý nhân sự thuộc ${tm.id}</div>
        </div>
        <div class="kpi-card">
          <div>
            <span class="kpi-label">ĐANG LÀM VIỆC TRÊN CÔNG TRÌNH</span>
            <div class="kpi-value" style="color:var(--ds-success);">${workingNow}<span class="unit">người</span></div>
          </div>
          <div class="kpi-sub">Đã chụp Camera GPS Check-in hợp lệ</div>
        </div>
        <div class="kpi-card">
          <div>
            <span class="kpi-label">ĐÃ RA CA (CHECK-OUT)</span>
            <div class="kpi-value">${checkedOut}<span class="unit">người</span></div>
          </div>
          <div class="kpi-sub">Giờ chuẩn kết thúc ca chiều: 17:30</div>
        </div>
        <div class="kpi-card">
          <div>
            <span class="kpi-label">QUẢN LÝ CÔNG TRÌNH DUYỆT</span>
            <div class="kpi-value" style="font-size:14px;">${tm.managerName}</div>
          </div>
          <div class="kpi-sub">Đội trưởng nhập công → Trình ${tm.managerName} duyệt</div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">BẢNG ĐIỂM DANH CAMERA GPS RIÊNG CỦA ${tm.name.toUpperCase()}</span>
            <h3>Điểm Danh Vào Ca / Ra Ca Cho ${teamWorkers.length} Công Nhân Trong Đội Của Tôi</h3>
            <div class="section-desc">Đội trưởng (${acc.fullName}) chụp ảnh Camera trực tiếp kèm GPS cho anh em trong đội. Đội trưởng không thấy nhân sự của đội khác và không được tự duyệt công.</div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.openCameraQuick('VAO', null)">📸 Chụp Camera Check-in Đội</button>
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.openCameraQuick('RA', null)">🏁 Chụp Camera Check-out Đội</button>
          </div>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ảnh GPS</th>
                <th>Mã NV &amp; Họ tên</th>
                <th>Vai trò trong đội</th>
                <th>Việc được Đội trưởng giao</th>
                <th>Giờ Vào - Ra hôm nay</th>
                <th>Trạng thái</th>
                <th>Trạng thái QLCT Duyệt</th>
                <th>Điểm danh nhanh</th>
              </tr>
            </thead>
            <tbody>
              ${teamWorkers.map(w => {
                const thumb = getWorkerStampedPhoto(w);
                return `
                  <tr>
                    <td>
                      <img src="${thumb}" class="photo-thumb" onclick="window.NPApp.openPhotoModal('${w.id}')" />
                    </td>
                    <td><strong>${w.name}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${w.code}</span></td>
                    <td>${w.roleName}</td>
                    <td><strong>${w.assignedTaskToday || tm.dailyTargetTask}</strong></td>
                    <td>
                      ${w.checkInTime ? `Vào: <code>${w.checkInTime}</code><br/>Ra: <code>${w.checkOutTime || 'Đang làm'}</code>` : `<span class="badge badge-danger">Chưa điểm danh</span>`}
                    </td>
                    <td>${renderAttendanceBadge(w.attendanceStatus)}</td>
                    <td>${renderApprovalBadge(w.approvalStatus)}</td>
                    <td>
                      <div style="display:flex; gap:4px; flex-wrap:wrap;">
                        <button class="btn btn-primary btn-sm" onclick="window.NPApp.openCameraQuick('VAO', '${w.id}')">📸 Vào</button>
                        <button class="btn btn-soft btn-sm" onclick="window.NPApp.openCameraQuick('RA', '${w.id}')">🏁 Ra</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderDtTasks() {
    const acc = getCurrentAccount();
    const tm = getTeam(acc.teamId);
    const teamWorkers = getScopedWorkersForCurrentAccount();
    const teamTasks = (state.tasks || []).filter(tsk => tsk.teamId === tm.id);

    return `
      <!-- NHIỆM VỤ ĐỘI TRƯỞNG NHẬN TỪ QUẢN LÝ CÔNG TRÌNH -->
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">NHIỆM VỤ NHẬN TỪ QUẢN LÝ CÔNG TRÌNH (${tm.managerName.toUpperCase()})</span>
            <h3>Hạng Mục Thi Công Hôm Nay Của ${tm.name}</h3>
          </div>
        </div>
        ${teamTasks.map(tsk => `
          <div style="padding:10px 12px; background:var(--ds-bg-soft); border:1px solid var(--ds-line); border-left:4px solid var(--ds-accent); border-radius:var(--ds-radius-md); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <div style="font-size:10px; font-weight:700; color:var(--ds-primary);">NGƯỜI GIAO VIỆC: ${tsk.assignedBy.toUpperCase()} · NGÀY ${tsk.date}</div>
              <div style="font-size:13.5px; font-weight:700; color:var(--ds-primary); margin-top:2px;">📌 ${tsk.title}</div>
              <div style="font-size:11px; color:var(--ds-text-muted); margin-top:2px;">
                Yêu cầu quân số: <strong>${tsk.requiredWorkers} người</strong> · Hạn mức tăng ca cho phép: <strong>+${tsk.allowOvertimeHours}h OT</strong>
              </div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <span class="badge badge-success">Tiến độ: ${tsk.progressPercent}%</span>
              <button class="btn btn-primary btn-sm" onclick="window.NPApp.updateTeamTaskProgress('${tsk.id}')">📈 Cập nhật tiến độ báo QLCT</button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- PHÂN VIỆC CỤ THỂ & ĐĂNG KÝ TĂNG CA CHO TỪNG CÔNG NHÂN TRONG ĐỘI -->
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">PHÂN CÔNG CHI TIẾT &amp; ĐĂNG KÝ TĂNG CA TRONG ĐỘI</span>
            <h3>Giao Việc Cụ Thể &amp; Báo Tăng Ca Cho Từng Công Nhân Thuộc ${tm.name}</h3>
            <div class="section-desc">Đội trưởng giao việc hôm nay cho từng anh em trong đội và đăng ký giờ tăng ca (nếu có) trước 17:30 để trình Quản lý Công trình (${tm.managerName}) phê duyệt.</div>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và Tên Công nhân</th>
                <th>Công việc cụ thể hôm nay</th>
                <th>Giờ HC</th>
                <th>Giờ OT đăng ký</th>
                <th>Tổng công tích lũy T11</th>
                <th>Thao tác Đội trưởng</th>
              </tr>
            </thead>
            <tbody>
              ${teamWorkers.map(w => `
                <tr>
                  <td><strong>${w.code}</strong></td>
                  <td><strong>${w.name}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${w.roleName}</span></td>
                  <td><strong>${w.assignedTaskToday || tm.dailyTargetTask}</strong></td>
                  <td>${w.hoursRegular || 8}h</td>
                  <td>${w.hoursOtRegistered > 0 ? `<span class="badge badge-orange">+${w.hoursOtRegistered}h OT</span>` : `<span class="badge badge-neutral">0h</span>`}</td>
                  <td><strong>${w.daysMonthApproved} công</strong> (+${w.otHoursMonthApproved}h OT)</td>
                  <td>
                    <div style="display:flex; gap:4px;">
                      <button class="btn btn-soft btn-sm" onclick="window.NPApp.openWorkerTaskModal('${w.id}')">🛠️ Giao việc</button>
                      <button class="btn btn-primary btn-sm" onclick="window.NPApp.openOtModal('${w.id}')">⏱️ Báo Tăng ca</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderDtMembers() {
    const acc = getCurrentAccount();
    const tm = getTeam(acc.teamId);
    const teamWorkers = getScopedWorkersForCurrentAccount();

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">DANH SÁCH NHÂN SỰ THUỘC ${tm.name.toUpperCase()}</span>
            <h3>Quản Lý ${teamWorkers.length} Công Nhân Trong Đội Của Tôi (Thuộc QLCT: ${tm.managerName})</h3>
            <div class="section-desc">Khi Đội trưởng thêm công nhân mới vào đội, hệ thống tự động gắn công nhân đó vào Đội ${tm.id} và trực thuộc Quản lý Công trình ${tm.managerName}.</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.openAddWorkerModal()">+ Thêm Công nhân mới vào ${tm.name}</button>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã NV (Tài khoản ĐN)</th>
                <th>Họ và Tên Công nhân</th>
                <th>Vai trò</th>
                <th>Số điện thoại</th>
                <th>Người tạo vào đội</th>
                <th>Thuộc Quản lý CT</th>
                <th>Tổng công đã làm T11</th>
              </tr>
            </thead>
            <tbody>
              ${teamWorkers.map(w => `
                <tr>
                  <td><strong>${w.code}</strong><br/><span style="font-size:9.5px; color:var(--ds-text-muted);">PIN mặc định: 0000</span></td>
                  <td><strong>${w.name}</strong></td>
                  <td>${w.roleName}</td>
                  <td>${w.phone}</td>
                  <td><span class="badge badge-neutral">${w.createdBy}</span></td>
                  <td><span class="badge badge-navy">${w.managerName}</span></td>
                  <td><strong style="color:var(--ds-primary);">${w.daysMonthApproved} công</strong> (+${w.otHoursMonthApproved}h OT)</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =================================================================================================
  // V. GIAO DIỆN CẤP 5: CÔNG NHÂN / NHÂN VIÊN (CHỈ THẤY MÌNH TÔI + BẢNG TỔNG KẾT CÔNG & LƯƠNG CÁ NHÂN)
  // =================================================================================================
  function renderCnPersonalHome() {
    const w = getPersonalWorkerRecord();
    const prj = getProject(w.projectId);
    const tm = getTeam(w.teamId);

    const hourly = w.dailyWage / 8;
    const basePay = w.daysMonthApproved * w.dailyWage;
    const otPay = Math.round(w.otHoursMonthApproved * hourly * 1.5);
    const sunPay = Math.round(w.sundayDaysMonth * w.dailyWage * 2.0);
    const grossSalary = basePay + otPay + sunPay;
    const myAdvances = state.advances.filter(a => a.workerCode === w.code);
    const approvedAdvAmount = myAdvances.filter(a => a.status === 'BGD_DA_DUYET').reduce((s, a) => s + a.amount, 0);
    const remainingSalary = grossSalary - approvedAdvAmount;
    const thumb = getWorkerStampedPhoto(w);

    return `
      <!-- KHỐI TỔNG KẾT CÔNG & LƯƠNG CÁ NHÂN NỔI BẬT CHO NHÂN VIÊN -->
      <div class="personal-summary-hero">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
          <div>
            <span class="kicker" style="color:var(--ds-accent); margin-bottom:2px;">BẢNG TỔNG KẾT CÔNG &amp; THU NHẬP CÁ NHÂN THÁNG 11/2026</span>
            <h3>Xin chào, ${w.name} (${w.code})</h3>
            <div style="font-size:11px; opacity:0.9; margin-top:2px;">
              Chức danh: <strong>${w.roleName}</strong> · Đội: <strong>${w.teamName}</strong> · Đội trưởng: <strong>${w.leaderName}</strong> · Quản lý CT: <strong>${w.managerName}</strong>
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.openCameraQuick('VAO', '${w.id}')">📸 Chụp Camera Check-in Vào Ca</button>
            <button class="btn btn-outline-dark btn-sm" onclick="window.NPApp.openCameraQuick('RA', '${w.id}')">🏁 Check-out Ra Ca</button>
          </div>
        </div>

        <div class="personal-stat-grid">
          <div class="personal-stat-box">
            <div class="ps-label">TỔNG CÔNG ĐÃ LÀM TRONG THÁNG</div>
            <div class="ps-val">${w.daysMonthApproved} <span style="font-size:11px; font-weight:500;">ngày công</span></div>
            <div style="font-size:10px; opacity:0.8; margin-top:2px;">Đơn giá: ${formatVND(w.dailyWage)}/ngày</div>
          </div>
          <div class="personal-stat-box">
            <div class="ps-label">TỔNG GIỜ TĂNG CA &amp; CHỦ NHẬT</div>
            <div class="ps-val">${w.otHoursMonthApproved}h OT <span style="font-size:11px; font-weight:500;">· ${w.sundayDaysMonth} CN</span></div>
            <div style="font-size:10px; opacity:0.8; margin-top:2px;">Tiền OT + CN: ${formatVND(otPay + sunPay)}</div>
          </div>
          <div class="personal-stat-box">
            <div class="ps-label">LƯƠNG LŨY KẾ TÍNH ĐẾN HÔM NAY</div>
            <div class="ps-val">${formatVND(grossSalary)}</div>
            <div style="font-size:10px; opacity:0.8; margin-top:2px;">Đã tạm ứng: -${formatVND(approvedAdvAmount)}</div>
          </div>
          <div class="personal-stat-box" style="background:rgba(247,147,30,0.22); border-color:var(--ds-accent);">
            <div class="ps-label">THỰC LĨNH CÒN LẠI CỦA TÔI</div>
            <div class="ps-val" style="color:#FFFFFF;">${formatVND(remainingSalary)}</div>
            <div style="font-size:10px; color:var(--ds-accent); margin-top:2px;">Đã được QLCT ${w.managerName} duyệt</div>
          </div>
        </div>
      </div>

      <!-- NHIỆM VỤ HÔM NAY & TRẠNG THÁI CHẤM CÔNG HÔM NAY CỦA TÔI -->
      <div class="grid-2" style="margin-bottom:10px;">
        <div class="section-card" style="margin-bottom:0;">
          <span class="kicker">NHIỆM VỤ &amp; PHÂN VIỆC HÔM NAY CỦA TÔI (22/11/2026)</span>
          <h3>Công Việc Đội Trưởng ${w.leaderName} Giao Cho Tôi</h3>
          <div style="margin-top:8px; padding:10px 12px; background:var(--ds-bg-soft); border:1px solid var(--ds-line); border-left:4px solid var(--ds-primary); border-radius:var(--ds-radius-sm);">
            <div style="font-size:13px; font-weight:700; color:var(--ds-primary);">🛠️ ${w.assignedTaskToday || tm.dailyTargetTask}</div>
            <div style="font-size:11px; color:var(--ds-text-muted); margin-top:4px;">
              📍 Địa điểm làm việc: <strong>${prj.name}</strong> (${prj.address})
            </div>
            <div style="font-size:11px; color:var(--ds-text-muted); margin-top:2px;">
              👷 Đội trưởng phụ trách trực tiếp: <strong>${w.leaderName}</strong> (${tm.phone})
            </div>
            <div style="font-size:11px; color:var(--ds-text-muted); margin-top:2px;">
              🏛️ Quản lý Công trình duyệt công: <strong>${w.managerName}</strong>
            </div>
          </div>

          <div style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.openPersonalAdvanceModal()">💳 Gửi đơn Xin Ứng lương</button>
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.openPersonalLeaveModal()">📝 Xin Nghỉ phép</button>
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.selectTab('cn-payslip')">💵 Xem Phiếu lương chi tiết</button>
          </div>
        </div>

        <div class="section-card" style="margin-bottom:0;">
          <span class="kicker">TRẠNG THÁI ĐIỂM DANH HÔM NAY CỦA TÔI</span>
          <h3>Bằng Chứng Chấm Công Camera Live + GPS Hôm Nay</h3>
          <div style="display:flex; gap:10px; align-items:center; margin-top:8px;">
            <img src="${thumb}" style="width:110px; height:84px; object-fit:cover; border-radius:var(--ds-radius-sm); border:1px solid var(--ds-line); cursor:pointer;" onclick="window.NPApp.openPhotoModal('${w.id}')" />
            <div style="font-size:11px; line-height:1.45;">
              <div>Trạng thái ca: ${renderAttendanceBadge(w.attendanceStatus)} · ${renderApprovalBadge(w.approvalStatus)}</div>
              <div style="margin-top:3px;">Giờ Vào ca: <strong><code>${w.checkInTime || 'Chưa vào'}</code></strong> · Giờ Ra ca: <strong><code>${w.checkOutTime || 'Đang làm việc'}</code></strong></div>
              <div style="margin-top:3px;">Công hôm nay: <strong>${w.hoursRegular ? '1.0 công (8h)' : '0 công'}</strong> · Tăng ca hôm nay: <strong>+${w.hoursOtActual || 0}h OT</strong></div>
              <div style="margin-top:3px; color:var(--ds-text-muted);">Tọa độ GPS: <code>${w.lat}, ${w.lng}</code> (±${w.acc}m Hợp lệ)</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderCnPersonalHistory() {
    const w = getPersonalWorkerRecord();
    // Tạo danh sách 15 ngày công gần nhất của riêng công nhân này
    const daysList = [];
    for (let d = 22; d >= 8; d--) {
      const isSun = (d === 15 || d === 8);
      const worked = d <= 22;
      const ot = (d % 3 === 0) ? 2 : 0;
      daysList.push({
        date: `${String(d).padStart(2, '0')}/11/2026`,
        dayLabel: isSun ? 'Chủ nhật (Hệ số 2.0)' : 'Ngày thường (Hệ số 1.0)',
        inTime: '06:58:12',
        outTime: ot > 0 ? '19:30:05' : '17:30:00',
        workDay: worked ? 1.0 : 0,
        otHours: ot,
        approvedBy: w.managerName,
        task: w.assignedTaskToday
      });
    }

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">SỔ CHẤM CÔNG CÁ NHÂN CỦA ${w.name.toUpperCase()} (${w.code})</span>
            <h3>Chi Tiết Từng Ngày Công &amp; Giờ Tăng Ca Đã Làm Trong Tháng 11/2026</h3>
            <div class="section-desc">Tổng cộng: <strong>${w.daysMonthApproved} ngày công hành chính</strong> · <strong>${w.otHoursMonthApproved} giờ tăng ca OT</strong> · <strong>${w.sundayDaysMonth} công Chủ nhật</strong>.</div>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Loại ngày công</th>
                <th>Công việc thực hiện</th>
                <th>Giờ Vào - Giờ Ra</th>
                <th>Số công</th>
                <th>Giờ OT</th>
                <th>Người duyệt công (QLCT)</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${daysList.map(item => `
                <tr>
                  <td><strong>${item.date}</strong></td>
                  <td>${item.dayLabel}</td>
                  <td>${item.task}</td>
                  <td><code>${item.inTime}</code> → <code>${item.outTime}</code></td>
                  <td><strong style="color:var(--ds-primary);">${item.workDay} công</strong></td>
                  <td>${item.otHours > 0 ? `<span class="badge badge-orange">+${item.otHours}h OT</span>` : '0h'}</td>
                  <td><strong>${item.approvedBy}</strong></td>
                  <td><span class="badge badge-success">✓ Đã duyệt</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderCnPersonalRequests() {
    const w = getPersonalWorkerRecord();
    const myAdvances = state.advances.filter(a => a.workerCode === w.code);
    const accrued = w.daysMonthApproved * w.dailyWage;

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">ĐƠN TỪ CÁ NHÂN CỦA ${w.name.toUpperCase()} (${w.code})</span>
            <h3>Gửi Đơn Xin Ứng Lương &amp; Xin Nghỉ Phép Của Tôi</h3>
            <div class="section-desc">Công đã duyệt tháng này: <strong>${w.daysMonthApproved} công</strong> · Lương lũy kế hiện có: <strong>${formatVND(accrued)}</strong> · Hạn mức được phép ứng tối đa (70%): <strong>${formatVND(Math.round(accrued * 0.7))}</strong>.</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.openPersonalAdvanceModal()">+ Tạo đơn Xin Ứng lương</button>
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.openPersonalLeaveModal()">+ Tạo đơn Xin Nghỉ phép</button>
          </div>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Ngày gửi</th>
                <th>Công đã làm</th>
                <th>Lương lũy kế</th>
                <th>Số tiền tôi xin ứng</th>
                <th>Lý do</th>
                <th>Kế toán kiểm tra</th>
                <th>Tổng Giám đốc duyệt</th>
              </tr>
            </thead>
            <tbody>
              ${myAdvances.length === 0 ? `
                <tr><td colspan="8" style="text-align:center; padding:16px; color:var(--ds-text-muted);">Bạn chưa có đơn xin ứng lương nào trong tháng này. Bấm "+ Tạo đơn Xin Ứng lương" để gửi yêu cầu.</td></tr>
              ` : myAdvances.map(adv => `
                <tr>
                  <td><strong>${adv.id}</strong></td>
                  <td>${adv.date}</td>
                  <td>${adv.daysWorkedSoFar} công</td>
                  <td>${formatVND(adv.accruedSalary)}</td>
                  <td><strong style="color:var(--ds-primary);">${formatVND(adv.amount)}</strong></td>
                  <td>${adv.reason}</td>
                  <td>${adv.checkedByKt ? `<span class="badge badge-success">✓ ${adv.checkedByKt}</span>` : `<span class="badge badge-warning">Đang chờ KT</span>`}</td>
                  <td>${adv.status === 'BGD_DA_DUYET' ? `<span class="badge badge-success">✓ Đã duyệt chi</span>` : `<span class="badge badge-orange">Chờ GĐ duyệt</span>`}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderCnPersonalPayslip() {
    const w = getPersonalWorkerRecord();
    const hourly = w.dailyWage / 8;
    const basePay = w.daysMonthApproved * w.dailyWage;
    const otPay = Math.round(w.otHoursMonthApproved * hourly * 1.5);
    const sunPay = Math.round(w.sundayDaysMonth * w.dailyWage * 2.0);
    const gross = basePay + otPay + sunPay;
    const approvedAdvance = state.advances
      .filter(a => a.workerCode === w.code && a.status === 'BGD_DA_DUYET')
      .reduce((s, a) => s + a.amount, 0);
    const net = gross - approvedAdvance;

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">PHIẾU LƯƠNG CÁ NHÂN THÁNG 11/2026</span>
            <h3>Chi Tiết Thu Nhập Của ${w.name} (${w.code})</h3>
            <div class="section-desc">Đội: ${w.teamName} · Đội trưởng: ${w.leaderName} · Quản lý Công trình duyệt công: ${w.managerName}</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.print()">🖨️ In / Lưu PDF Phiếu lương của tôi</button>
        </div>

        <table class="data-table">
          <tbody>
            <tr>
              <td>1. Đơn giá ngày công thỏa thuận</td>
              <td style="text-align:right; font-weight:700;">${formatVND(w.dailyWage)} / ngày (8 giờ)</td>
            </tr>
            <tr>
              <td>2. Lương ngày công hành chính đã được QLCT (${w.managerName}) duyệt (${w.daysMonthApproved} công)</td>
              <td style="text-align:right; font-weight:700;">${formatVND(basePay)}</td>
            </tr>
            <tr>
              <td>3. Lương tăng ca OT đã duyệt (${w.otHoursMonthApproved} giờ × hệ số 1.5)</td>
              <td style="text-align:right; font-weight:700;">${formatVND(otPay)}</td>
            </tr>
            <tr>
              <td>4. Lương làm Chủ nhật (${w.sundayDaysMonth} công × hệ số 2.0)</td>
              <td style="text-align:right; font-weight:700;">${formatVND(sunPay)}</td>
            </tr>
            <tr style="background:var(--ds-bg-soft);">
              <td><strong>TỔNG THU NHẬP LŨY KẾ (A)</strong></td>
              <td style="text-align:right; font-weight:700; font-size:13px;">${formatVND(gross)}</td>
            </tr>
            <tr>
              <td style="color:var(--ds-danger);">5. Trừ tiền đã tạm ứng trong tháng (B)</td>
              <td style="text-align:right; color:var(--ds-danger); font-weight:700;">-${formatVND(approvedAdvance)}</td>
            </tr>
            <tr style="background:var(--ds-bg-soft);">
              <td><strong style="color:var(--ds-primary); font-size:13px;">THỰC LĨNH CÒN LẠI NHẬN CUỐI THÁNG (A - B)</strong></td>
              <td style="text-align:right; color:var(--ds-primary); font-family:var(--ds-font-serif); font-size:16px; font-weight:700;">${formatVND(net)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // =================================================================================================
  // VI. TRANG ADMIN QUẢN TRỊ & TẠO TÀI KHOẢN THEO VỊ TRÍ (CHỈ ADMIN / TỔNG GIÁM ĐỐC MỚI THẤY)
  // =================================================================================================
  function renderAdminAccountsTab() {
    if (!isAdminAccount()) return '';
    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">TRUNG TÂM QUẢN TRỊ TÀI KHOẢN &amp; PHÂN QUYỀN 5 CẤP (CHỈ ADMIN THẤY)</span>
            <h3>Danh Sách Tài Khoản Theo Từng Vị Trí &amp; Chuyển Nhanh Giao Diện Để Kiểm Tra</h3>
            <div class="section-desc">Admin / Tổng Giám đốc có thể tạo tài khoản mới cho Quản lý Công trình, Kế toán, Đội trưởng, Công nhân hoặc bấm <strong>"Vào giao diện này"</strong> để xem trực tiếp màn hình làm việc riêng của từng vị trí.</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.openAccountFormModal(null)">
            + Tạo Tài khoản Mới cho Vị trí
          </button>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tên đăng nhập</th>
                <th>PIN</th>
                <th>Họ tên Nhân sự</th>
                <th>Vị trí / Cấp bậc</th>
                <th>Phạm vi Công trình / Đội</th>
                <th>Thuộc Quản lý / Người tạo</th>
                <th>Giao diện Chuyên biệt</th>
                <th>Thao tác Admin</th>
              </tr>
            </thead>
            <tbody>
              ${state.accounts.map(acc => {
                const cfg = ROLE_CONFIG[acc.roleId] || ROLE_CONFIG.CN;
                const isCur = acc.id === currentAccountId;
                return `
                  <tr style="${isCur ? 'background:rgba(247,147,30,0.1);' : ''}">
                    <td><strong><code>${acc.username}</code></strong></td>
                    <td><code>${acc.pin}</code></td>
                    <td><strong>${acc.fullName}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${acc.positionTitle}</span></td>
                    <td><span class="badge badge-navy">${cfg.badge}</span></td>
                    <td>CT: <strong>${acc.projectId}</strong> · Đội: <strong>${acc.teamId}</strong></td>
                    <td>${acc.managerName || acc.createdBy || 'Tổng Giám đốc'}</td>
                    <td>
                      <span style="font-size:10.5px; color:var(--ds-text-muted);">
                        ${cfg.tabs.map(t => t.shortLabel).join(' · ')}
                      </span>
                    </td>
                    <td>
                      <div style="display:flex; gap:4px; flex-wrap:wrap;">
                        ${isCur
                          ? `<span class="badge badge-success">Đang sử dụng</span>`
                          : `<button class="btn btn-primary btn-sm" onclick="window.NPApp.loginAsAccount('${acc.id}')">🚀 Vào giao diện này</button>`
                        }
                        <button class="btn btn-soft btn-sm" onclick="window.NPApp.openAccountFormModal('${acc.id}')">✏️ Sửa</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =================================================================================================
  // VII. CÁC MODAL THAO TÁC NGHIỆP VỤ (CAMERA GPS, GIAO VIỆC, THÊM NHÂN SỰ, TẠO TÀI KHOẢN, ỨNG LƯƠNG)
  // =================================================================================================
  function openPhotoModal(workerId) {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;
    const prj = getProject(w.projectId);
    const imgUrl = getWorkerStampedPhoto(w);

    document.getElementById('photoModalTitle').textContent = `Ảnh Chấm Công GPS — ${w.name} (${w.code})`;
    document.getElementById('photoModalBody').innerHTML = `
      <img src="${imgUrl}" style="width:100%; border-radius:var(--ds-radius-md); border:1px solid var(--ds-line); margin-bottom:10px;" />
      <div style="background:var(--ds-bg-soft); padding:10px; border-radius:var(--ds-radius-sm); border:1px solid var(--ds-line); font-size:11.5px; display:grid; gap:4px;">
        <div><strong>Nhân sự:</strong> ${w.name} (${w.code}) · <strong>Đội:</strong> ${w.teamName} (Đội trưởng: ${w.leaderName})</div>
        <div><strong>Thuộc Quản lý Công trình:</strong> <span style="color:var(--ds-primary); font-weight:700;">${w.managerName}</span> (${prj.name})</div>
        <div><strong>Tọa độ GPS:</strong> <code>${w.lat}, ${w.lng}</code> (Sai số ±${w.acc}m · Hợp lệ trong bán kính ${prj.radiusM}m)</div>
      </div>
    `;
    document.getElementById('photoModal').classList.add('open');
  }

  function openCameraQuick(actionType, workerId) {
    const acc = getCurrentAccount();
    if (!acc) return;

    // Nếu là Tổng Giám đốc / Kế toán / Quản lý CT thì không chấm công cá nhân
    if (acc.roleId === 'BGD' || acc.roleId === 'KT') {
      alert('Tổng Giám đốc và Kế toán làm việc trên Cổng Quản trị / Kế toán, không cần chấm công công trường!');
      return;
    }

    const scopedList = getScopedWorkersForCurrentAccount();
    const selWorker = document.getElementById('camWorkerSelect');
    const selProject = document.getElementById('camProjectSelect');
    const selAction = document.getElementById('camActionType');

    if (selWorker) {
      selWorker.innerHTML = scopedList.map(w =>
        `<option value="${w.id}">${w.code} — ${w.name} (${w.teamName})</option>`
      ).join('');
      if (workerId) selWorker.value = workerId;
      // Nếu là Công nhân thì khóa chỉ cho chọn chính mình
      selWorker.disabled = (acc.roleId === 'CN');
    }

    if (selProject) {
      const allowedProjects = (acc.projectId && acc.projectId !== 'ALL')
        ? state.projects.filter(p => p.id === acc.projectId)
        : state.projects;
      selProject.innerHTML = allowedProjects.map(p =>
        `<option value="${p.id}">${p.name}</option>`
      ).join('');
    }

    if (selAction && actionType) {
      selAction.value = actionType;
    }

    document.getElementById('cameraModalHeaderTitle').textContent =
      actionType === 'RA' ? 'Chụp Camera Check-out (Ra ca)' : 'Chụp Camera Check-in (Vào ca)';
    document.getElementById('cameraModal').classList.add('open');
    startHardwareCamera();
    drawLivePreviewOnCanvas();
  }

  function openCameraModal() {
    openCameraQuick('VAO', null);
  }

  async function startHardwareCamera() {
    stopHardwareCamera();
    const video = document.getElementById('liveVideo');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        liveStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        video.srcObject = liveStream;
        await video.play();
      }
    } catch (e) {}
    drawLivePreviewOnCanvas();
  }

  function stopHardwareCamera() {
    if (liveStream) {
      liveStream.getTracks().forEach(t => t.stop());
      liveStream = null;
    }
  }

  function toggleCameraFacing() {
    cameraFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    startHardwareCamera();
  }

  function closeCameraModal() {
    stopHardwareCamera();
    document.getElementById('cameraModal').classList.remove('open');
  }

  function drawLivePreviewOnCanvas() {
    const canvas = document.getElementById('captureCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const video = document.getElementById('liveVideo');

    const workerId = document.getElementById('camWorkerSelect')?.value;
    const actionType = document.getElementById('camActionType')?.value || 'VAO';
    const w = state.workers.find(x => x.id === workerId) || getPersonalWorkerRecord();
    const prj = getProject(w.projectId);

    ctx.fillStyle = '#071E3E';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (liveStream && video && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, canvas.width, 370);
    } else if (sampleImgObj && sampleImgObj.complete && sampleImgObj.naturalWidth > 0) {
      ctx.drawImage(sampleImgObj, 0, 0, canvas.width, 370);
    }

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    const lat = liveGps.hasRealGps ? liveGps.lat : prj.lat;
    const lng = liveGps.hasRealGps ? liveGps.lng : prj.lng;
    const acc = liveGps.hasRealGps ? liveGps.acc : 8;
    const addr = liveGps.hasRealGps ? liveGps.address : prj.address;

    ctx.fillStyle = '#0B2D5B';
    ctx.fillRect(0, 0, canvas.width, 42);
    ctx.fillStyle = '#F7931E';
    ctx.font = 'bold 14px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`NP ONE LIVE CAMERA · ${actionType === 'VAO' ? 'CHECK-IN VÀO CA' : 'CHECK-OUT RA CA'}`, 16, 26);

    ctx.fillStyle = '#071E3E';
    ctx.fillRect(0, 360, canvas.width, 160);
    ctx.fillStyle = '#F7931E';
    ctx.fillRect(0, 360, canvas.width, 3);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`${w.name} (${w.code})`, 18, 392);

    ctx.fillStyle = '#F7931E';
    ctx.font = '600 13px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`${w.teamName} · Đội trưởng: ${w.leaderName} · QLCT: ${w.managerName}`, 18, 416);

    ctx.fillStyle = '#E3DFD3';
    ctx.font = '12.5px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`Thời gian thực: ${timeStr} - 22/11/2026`, 18, 442);
    ctx.fillText(`Địa điểm: ${String(addr).slice(0, 62)}`, 18, 466);
    ctx.fillStyle = '#F7931E';
    ctx.fillText(`Tọa độ GPS: ${lat}, ${lng} (±${acc}m Hợp lệ)`, 18, 492);
  }

  function snapAndSubmitCheckin() {
    drawLivePreviewOnCanvas();
    const canvas = document.getElementById('captureCanvas');
    const workerId = document.getElementById('camWorkerSelect')?.value;
    const actionType = document.getElementById('camActionType')?.value || 'VAO';
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;

    const nowStr = new Date().toTimeString().slice(0, 8);
    if (actionType === 'VAO') {
      w.checkInTime = nowStr;
      w.attendanceStatus = 'DANG_LAM';
      w.hoursRegular = 8;
    } else {
      w.checkOutTime = nowStr;
      w.attendanceStatus = 'DA_RA';
      w.forgotCheckoutFlag = false;
    }
    if (liveGps.hasRealGps) {
      w.lat = liveGps.lat;
      w.lng = liveGps.lng;
      w.acc = liveGps.acc;
      w.realAddress = liveGps.address;
    }
    try {
      w.customPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.86);
    } catch (e) {}

    saveState();
    closeCameraModal();
    renderMain();
  }

  // MODAL QUẢN LÝ CÔNG TRÌNH GIAO NHIỆM VỤ CHO ĐỘI TRƯỞNG
  function openAssignTaskModal() {
    const acc = getCurrentAccount();
    const prjId = (acc && acc.projectId !== 'ALL') ? acc.projectId : 'CT1';
    const myTeams = state.teams.filter(t => t.projectId === prjId);

    document.getElementById('adjustModalTitle').textContent = `Giao Nhiệm Vụ & Hạn Mức OT Cho Đội Trưởng (${prjId})`;
    document.getElementById('adjustModalBody').innerHTML = `
      <div class="form-group">
        <label>Chọn Đội trưởng nhận nhiệm vụ <span class="req">*</span></label>
        <select id="tskTeamSelect">
          ${myTeams.map(t => `<option value="${t.id}">${t.name} — Đội trưởng: ${t.leader}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Nội dung Hạng mục &amp; Khối lượng giao khoán trong ngày <span class="req">*</span></label>
        <input type="text" id="tskTitleInput" placeholder="VD: Đổ bê tông dầm sàn tầng 5 khu B (95m³)" />
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div class="form-group">
          <label>Định biên quân số yêu cầu (người)</label>
          <input type="number" id="tskWorkersInput" value="18" min="1" max="50" />
        </div>
        <div class="form-group">
          <label>Hạn mức Tăng ca cho phép (giờ OT)</label>
          <input type="number" id="tskOtInput" value="2" min="0" max="6" />
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitAssignTask()">📌 Giao nhiệm vụ cho Đội trưởng</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitAssignTask() {
    const acc = getCurrentAccount();
    const teamId = document.getElementById('tskTeamSelect').value;
    const title = (document.getElementById('tskTitleInput').value || '').trim();
    const reqW = Number(document.getElementById('tskWorkersInput').value || 18);
    const otH = Number(document.getElementById('tskOtInput').value || 0);
    if (!title) {
      alert('Vui lòng nhập nội dung hạng mục công việc!');
      return;
    }
    const tm = getTeam(teamId);
    tm.dailyTargetTask = title;
    state.tasks = state.tasks || [];
    state.tasks.unshift({
      id: 'TSK-0' + (state.tasks.length + 1),
      projectId: tm.projectId,
      teamId: tm.id,
      title,
      assignedBy: `${acc ? acc.fullName : tm.managerName} (Quản lý ${tm.projectId})`,
      assignedToLeader: tm.leader,
      requiredWorkers: reqW,
      allowOvertimeHours: otH,
      status: 'DANG_THUC_HIEN',
      progressPercent: 10,
      date: '22/11/2026'
    });
    saveState();
    closeModal('adjustModal');
    renderMain();
  }

  // ĐỘI TRƯỞNG GIAO VIỆC CỤ THỂ CHO TỪNG CÔNG NHÂN TRONG ĐỘI
  function openWorkerTaskModal(workerId) {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;
    document.getElementById('adjustModalTitle').textContent = `Phân Việc Trong Ngày Cho ${w.name} (${w.code})`;
    document.getElementById('adjustModalBody').innerHTML = `
      <div class="form-group">
        <label>Công việc cụ thể giao cho ${w.name} hôm nay <span class="req">*</span></label>
        <input type="text" id="workerTaskInput" value="${w.assignedTaskToday || ''}" placeholder="Nhập nhiệm vụ cụ thể trong ca..." />
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitWorkerTask('${w.id}')">🛠️ Lưu phân công</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitWorkerTask(workerId) {
    const w = state.workers.find(x => x.id === workerId);
    const val = (document.getElementById('workerTaskInput').value || '').trim();
    if (w && val) {
      w.assignedTaskToday = val;
      saveState();
      renderMain();
    }
    closeModal('adjustModal');
  }

  function updateTeamTaskProgress(taskId) {
    const tsk = (state.tasks || []).find(x => x.id === taskId);
    if (!tsk) return;
    tsk.progressPercent = Math.min(100, (tsk.progressPercent || 50) + 15);
    saveState();
    renderMain();
  }

  // THÊM CÔNG NHÂN MỚI (TỰ ĐỘNG GẮN QUẢN LÝ CÔNG TRÌNH & ĐỘI TRƯỞNG TẠO RA)
  function openAddWorkerModal() {
    const acc = getCurrentAccount();
    let allowedTeams = state.teams;
    if (acc && acc.roleId === 'QLCT') {
      allowedTeams = state.teams.filter(t => t.projectId === acc.projectId);
    } else if (acc && acc.roleId === 'DT1') {
      allowedTeams = state.teams.filter(t => t.id === acc.teamId);
    }

    const nextNum = state.workers.length + 1;
    const suggestedCode = `NV.SME-${nextNum}`;

    document.getElementById('adjustModalTitle').textContent = `Thêm Nhân Sự Mới Dưới Quyền Quản Lý (${acc ? acc.fullName : ''})`;
    document.getElementById('adjustModalBody').innerHTML = `
      <div style="background:var(--ds-bg-soft); border:1px solid var(--ds-line); padding:8px 10px; border-radius:var(--ds-radius-sm); font-size:11px; margin-bottom:8px;">
        Người tạo hồ sơ: <strong style="color:var(--ds-primary);">${acc ? acc.fullName : 'Admin'}</strong>. Nhân sự này sẽ tự động được cấp tài khoản đăng nhập cổng Công nhân với Mã PIN mặc định <code>0000</code>.
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div class="form-group">
          <label>Mã Nhân viên (Tên đăng nhập) <span class="req">*</span></label>
          <input type="text" id="newWCode" value="${suggestedCode}" />
        </div>
        <div class="form-group">
          <label>Họ và Tên Công nhân <span class="req">*</span></label>
          <input type="text" id="newWName" placeholder="VD: NGUYỄN VĂN HẢI" />
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div class="form-group">
          <label>Thuộc Đội thi công <span class="req">*</span></label>
          <select id="newWTeam">
            ${allowedTeams.map(t => `<option value="${t.id}">${t.name} (QLCT: ${t.managerName})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Đơn giá lương ngày (VNĐ) <span class="req">*</span></label>
          <input type="number" id="newWWage" value="480000" step="10000" />
        </div>
      </div>
      <div class="form-group">
        <label>Công việc giao trong ngày</label>
        <input type="text" id="newWTask" placeholder="VD: Thi công lắp dựng cốt thép dầm sàn" />
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitAddWorker()">+ Lưu &amp; Cấp tài khoản Công nhân</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitAddWorker() {
    const acc = getCurrentAccount();
    const code = (document.getElementById('newWCode').value || '').trim();
    const name = (document.getElementById('newWName').value || '').trim().toUpperCase();
    const teamId = document.getElementById('newWTeam').value;
    const wage = Number(document.getElementById('newWWage').value || 450000);
    const task = (document.getElementById('newWTask').value || '').trim();

    if (!code || !name) {
      alert('Vui lòng nhập đầy đủ Mã NV và Họ tên!');
      return;
    }
    const tm = getTeam(teamId);
    const prj = getProject(tm.projectId);

    const newWorker = {
      id: 'W' + (state.workers.length + 1),
      seq: 5000 + state.workers.length + 1,
      code,
      name,
      roleName: 'Công nhân kỹ thuật',
      teamId: tm.id,
      teamName: tm.name,
      leaderName: tm.leader,
      leaderUsername: tm.leaderUsername,
      projectId: prj.id,
      projectName: prj.name,
      managerUsername: tm.managerUsername,
      managerName: tm.managerName,
      createdBy: acc ? acc.fullName : tm.managerName,
      assignedTaskToday: task || tm.dailyTargetTask,
      phone: '0905.888.999',
      dailyWage: wage,
      attendanceStatus: 'DANG_LAM',
      checkInTime: '07:00:00',
      checkOutTime: null,
      lat: prj.lat,
      lng: prj.lng,
      acc: 8,
      distanceM: 12,
      gpsValid: true,
      hoursRegular: 8,
      hoursOtRegistered: 0,
      hoursOtActual: 0,
      otReason: '',
      forgotCheckoutFlag: false,
      approvalStatus: 'CHO_QL_DUYET',
      approvedBy: '',
      weekDays: [1, 1, 1, 1, 1, 1, 0],
      daysMonthApproved: 1,
      otHoursMonthApproved: 0,
      sundayDaysMonth: 0
    };

    state.workers.unshift(newWorker);

    // Tự động tạo tài khoản đăng nhập cho công nhân mới
    state.accounts.push({
      id: 'ACC-W-' + code,
      username: code,
      pin: '0000',
      fullName: name,
      positionTitle: `Công nhân ${tm.name}`,
      roleId: 'CN',
      level: 5,
      projectId: prj.id,
      teamId: tm.id,
      workerCode: code,
      managerName: tm.managerName,
      leaderName: tm.leader,
      createdBy: acc ? acc.fullName : tm.managerName,
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: false, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
    });

    saveState();
    closeModal('adjustModal');
    renderMain();
  }

  // CÔNG NHÂN TỰ GỬI ĐƠN XIN ỨNG LƯƠNG / NGHỈ PHÉP
  function openPersonalAdvanceModal() {
    const w = getPersonalWorkerRecord();
    const accrued = w.daysMonthApproved * w.dailyWage;
    const maxAdv = Math.round(accrued * 0.7);

    document.getElementById('adjustModalTitle').textContent = `Đơn Xin Ứng Lương Cá Nhân — ${w.name} (${w.code})`;
    document.getElementById('adjustModalBody').innerHTML = `
      <div style="background:var(--ds-bg-soft); border:1px solid var(--ds-line); padding:10px; border-radius:var(--ds-radius-sm); font-size:11.5px; margin-bottom:10px;">
        <div>Công đã được QLCT (${w.managerName}) duyệt: <strong>${w.daysMonthApproved} ngày công</strong></div>
        <div>Lương lũy kế hiện có: <strong>${formatVND(accrued)}</strong> · Hạn mức được ứng tối đa (70%): <strong style="color:var(--ds-primary);">${formatVND(maxAdv)}</strong></div>
      </div>
      <div class="form-group">
        <label>Số tiền xin tạm ứng (VNĐ) <span class="req">*</span></label>
        <input type="number" id="personalAdvAmount" value="${Math.min(2000000, maxAdv)}" step="100000" max="${maxAdv}" />
      </div>
      <div class="form-group">
        <label>Lý do xin tạm ứng <span class="req">*</span></label>
        <input type="text" id="personalAdvReason" value="Ứng tiền sinh hoạt gia đình" />
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitPersonalAdvance()">💳 Gửi đơn cho Kế toán &amp; Giám đốc</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitPersonalAdvance() {
    const w = getPersonalWorkerRecord();
    const amount = Number(document.getElementById('personalAdvAmount').value || 0);
    const reason = (document.getElementById('personalAdvReason').value || '').trim();
    const accrued = w.daysMonthApproved * w.dailyWage;

    if (amount <= 0 || amount > accrued) {
      alert('Số tiền xin ứng không hợp lệ hoặc vượt quá lương lũy kế đã làm!');
      return;
    }

    state.advances.unshift({
      id: 'UL-0' + (state.advances.length + 1),
      workerId: w.id,
      workerCode: w.code,
      workerName: w.name,
      teamName: w.teamName,
      projectId: w.projectId,
      amount,
      reason: reason || 'Ứng lương cá nhân',
      daysWorkedSoFar: w.daysMonthApproved,
      accruedSalary: accrued,
      date: '22/11/2026',
      status: 'CHO_KT_KIEM_TRA',
      checkedByKt: '',
      approvedByBgd: ''
    });

    saveState();
    closeModal('adjustModal');
    selectTab('cn-requests');
  }

  function openPersonalLeaveModal() {
    const w = getPersonalWorkerRecord();
    document.getElementById('adjustModalTitle').textContent = `Đơn Xin Nghỉ Phép — ${w.name} (${w.code})`;
    document.getElementById('adjustModalBody').innerHTML = `
      <div class="form-group">
        <label>Ngày xin nghỉ <span class="req">*</span></label>
        <input type="text" id="leaveDateInput" value="23/11/2026" />
      </div>
      <div class="form-group">
        <label>Lý do xin nghỉ phép (Gửi Đội trưởng ${w.leaderName} &amp; QLCT ${w.managerName}) <span class="req">*</span></label>
        <input type="text" id="leaveReasonInput" value="Giải quyết việc gia đình (1 ngày)" />
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.closeModal('adjustModal'); alert('Đã gửi đơn xin nghỉ phép tới Đội trưởng ${w.leaderName} và Quản lý Công trình ${w.managerName}!');">📝 Gửi đơn xin nghỉ</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  // SỬA GIỜ CÔNG CÓ LƯU VẾT AUDIT LOG & ĐĂNG KÝ TĂNG CA
  function openAdjustModal(workerId) {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;
    document.getElementById('adjustModalTitle').textContent = `Điều Chỉnh Giờ Công — ${w.name} (${w.code})`;
    document.getElementById('adjustModalBody').innerHTML = `
      <div class="form-group">
        <label>Giờ Vào ca mới <span class="req">*</span></label>
        <input type="text" id="adjInTime" value="${w.checkInTime || '07:00:00'}" />
      </div>
      <div class="form-group">
        <label>Giờ Ra ca mới</label>
        <input type="text" id="adjOutTime" value="${w.checkOutTime || '17:30:00'}" />
      </div>
      <div class="form-group">
        <label>Lý do điều chỉnh bắt buộc (Lưu vào Nhật ký Kiểm toán Giám đốc) <span class="req">*</span></label>
        <textarea id="adjReason" rows="2" placeholder="Nhập lý do sửa giờ công..."></textarea>
        <div id="adjErr" class="field-error-msg" style="display:none;">Bắt buộc nhập lý do sửa công!</div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitAdjustment('${w.id}')">Lưu &amp; Ghi Audit Log</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitAdjustment(workerId) {
    const w = state.workers.find(x => x.id === workerId);
    const reason = (document.getElementById('adjReason').value || '').trim();
    if (!reason) {
      document.getElementById('adjErr').style.display = 'block';
      return;
    }
    const acc = getCurrentAccount();
    const oldVal = `${w.checkInTime || 'Trống'} - ${w.checkOutTime || 'Trống'}`;
    w.checkInTime = document.getElementById('adjInTime').value.trim();
    w.checkOutTime = document.getElementById('adjOutTime').value.trim();
    w.attendanceStatus = 'DA_RA';
    w.hoursRegular = 8;

    state.auditLogs.unshift({
      id: 'LOG-0' + (state.auditLogs.length + 1),
      timestamp: '22/11/2026 ' + new Date().toTimeString().slice(0, 5),
      workerCode: w.code,
      workerName: w.name,
      actorName: acc ? acc.fullName : w.managerName,
      actorRole: acc ? acc.positionTitle : 'Quản lý Công trình',
      field: 'Giờ vào / Giờ ra',
      oldVal,
      newVal: `${w.checkInTime} - ${w.checkOutTime}`,
      reason
    });

    saveState();
    closeModal('adjustModal');
    renderMain();
  }

  function openOtModal(workerId) {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;
    document.getElementById('adjustModalTitle').textContent = `Đăng Ký Tăng Ca (OT) — ${w.name} (${w.code})`;
    document.getElementById('adjustModalBody').innerHTML = `
      <div class="form-group">
        <label>Số giờ Tăng ca sau 17:30 <span class="req">*</span></label>
        <select id="otHoursSelect">
          <option value="0" ${w.hoursOtRegistered === 0 ? 'selected' : ''}>0 giờ (Chốt 17:30)</option>
          <option value="2" ${w.hoursOtRegistered === 2 ? 'selected' : ''}>+2.0 giờ OT (17:30 → 19:30)</option>
          <option value="3" ${w.hoursOtRegistered === 3 ? 'selected' : ''}>+3.0 giờ OT (17:30 → 20:30)</option>
          <option value="4" ${w.hoursOtRegistered === 4 ? 'selected' : ''}>+4.0 giờ OT (17:30 → 21:30)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Hạng mục tăng ca trình Quản lý (${w.managerName}) duyệt <span class="req">*</span></label>
        <input type="text" id="otReasonInput" value="${w.otReason || w.assignedTaskToday || 'Tăng ca hoàn thiện mẻ bê tông'}" />
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitOtModal('${w.id}')">⏱️ Lưu Đăng ký Tăng ca</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitOtModal(workerId) {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;
    const h = Number(document.getElementById('otHoursSelect').value || 0);
    const r = (document.getElementById('otReasonInput').value || '').trim();
    w.hoursOtRegistered = h;
    w.hoursOtActual = h;
    w.otReason = r;
    w.approvalStatus = 'CHO_QL_DUYET';
    saveState();
    closeModal('adjustModal');
    renderMain();
  }

  // ADMIN TẠO / SỬA TÀI KHOẢN CHO TỪNG VỊ TRÍ
  function openAccountFormModal(accId) {
    if (!isAdminAccount()) return;
    const editing = accId ? state.accounts.find(a => a.id === accId) : null;
    document.getElementById('adjustModalTitle').textContent = editing
      ? `Chỉnh sửa Tài khoản Vị trí — ${editing.fullName}`
      : 'Tạo Tài Khoản Mới Cho Vị Trí (5 Cấp)';

    document.getElementById('adjustModalBody').innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div class="form-group">
          <label>Tên đăng nhập <span class="req">*</span></label>
          <input type="text" id="accFormUser" value="${editing ? editing.username : ''}" placeholder="VD: qlct_ct4 hoặc doitruong7" />
        </div>
        <div class="form-group">
          <label>Mã PIN / Mật khẩu <span class="req">*</span></label>
          <input type="text" id="accFormPin" value="${editing ? editing.pin : '1234'}" />
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div class="form-group">
          <label>Họ và Tên Nhân sự <span class="req">*</span></label>
          <input type="text" id="accFormName" value="${editing ? editing.fullName : ''}" placeholder="VD: KS. Nguyễn Hoàng Long" />
        </div>
        <div class="form-group">
          <label>Vị trí &amp; Giao diện làm việc <span class="req">*</span></label>
          <select id="accFormRole">
            <option value="BGD" ${editing && editing.roleId === 'BGD' ? 'selected' : ''}>Cấp 1 · Tổng Giám Đốc / Admin</option>
            <option value="KT" ${editing && editing.roleId === 'KT' ? 'selected' : ''}>Cấp 2 · Hành chính – Kế toán</option>
            <option value="QLCT" ${!editing || editing.roleId === 'QLCT' ? 'selected' : ''}>Cấp 3 · Quản lý Công trình</option>
            <option value="DT1" ${editing && editing.roleId === 'DT1' ? 'selected' : ''}>Cấp 4 · Đội trưởng Thi công</option>
            <option value="CN" ${editing && editing.roleId === 'CN' ? 'selected' : ''}>Cấp 5 · Công nhân / Nhân viên</option>
          </select>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div class="form-group">
          <label>Phạm vi Công trình phụ trách</label>
          <select id="accFormProject">
            <option value="ALL" ${editing && editing.projectId === 'ALL' ? 'selected' : ''}>Toàn bộ Công trình (ALL)</option>
            ${state.projects.map(p => `<option value="${p.id}" ${editing && editing.projectId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Phạm vi Đội thi công</label>
          <select id="accFormTeam">
            <option value="ALL" ${editing && editing.teamId === 'ALL' ? 'selected' : ''}>Tất cả Đội (ALL)</option>
            ${state.teams.map(t => `<option value="${t.id}" ${editing && editing.teamId === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitAccountForm('${editing ? editing.id : ''}')">💾 Lưu Tài khoản Vị trí</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitAccountForm(editId) {
    const username = (document.getElementById('accFormUser').value || '').trim();
    const pin = (document.getElementById('accFormPin').value || '').trim();
    const fullName = (document.getElementById('accFormName').value || '').trim();
    const roleId = document.getElementById('accFormRole').value;
    const projectId = document.getElementById('accFormProject').value;
    const teamId = document.getElementById('accFormTeam').value;

    if (!username || !pin || !fullName) {
      alert('Vui lòng nhập đầy đủ Tên đăng nhập, Mã PIN và Họ tên!');
      return;
    }

    const cfg = ROLE_CONFIG[roleId] || ROLE_CONFIG.CN;
    const levelMap = { BGD: 1, KT: 2, QLCT: 3, DT1: 4, CN: 5 };

    if (editId) {
      const acc = state.accounts.find(a => a.id === editId);
      if (acc) {
        acc.username = username;
        acc.pin = pin;
        acc.fullName = fullName;
        acc.roleId = roleId;
        acc.level = levelMap[roleId] || 5;
        acc.positionTitle = cfg.shortTitle;
        acc.projectId = projectId;
        acc.teamId = teamId;
      }
    } else {
      state.accounts.push({
        id: 'ACC-' + (state.accounts.length + 1),
        username,
        pin,
        fullName,
        positionTitle: cfg.shortTitle,
        roleId,
        level: levelMap[roleId] || 5,
        projectId,
        teamId,
        createdBy: 'GĐ. Nguyễn Phát',
        status: 'ACTIVE',
        perms: {
          checkin: roleId === 'DT1' || roleId === 'CN',
          inputTeam: roleId === 'QLCT' || roleId === 'DT1',
          approveWork: roleId === 'BGD' || roleId === 'QLCT',
          accounting: roleId === 'BGD' || roleId === 'KT',
          approveDirector: roleId === 'BGD',
          adminUsers: roleId === 'BGD'
        }
      });
    }

    saveState();
    closeModal('adjustModal');
    renderMain();
  }

  // ================= XUẤT FILE EXCEL (.CSV UTF-8 BOM) CÓ CỘT QUẢN LÝ CÔNG TRÌNH & ĐỘI TRƯỞNG =================
  function downloadCsvFile(filename, rows) {
    const bom = '\uFEFF';
    const csvContent = bom + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportAttendanceCsv() {
    const header = ['STT', 'Mã NV', 'Họ và Tên', 'Đội thi công', 'Đội trưởng trực tiếp', 'Thuộc Quản lý Công trình', 'Người tạo hồ sơ', 'Công trình', 'Giờ vào', 'Giờ ra', 'Công T11 Đã duyệt', 'Giờ OT T11', 'Trạng thái duyệt'];
    const rows = state.workers.map((w, i) => [
      i + 1, w.code, w.name, w.teamName, w.leaderName, w.managerName, w.createdBy, w.projectId, w.checkInTime, w.checkOutTime || '', w.daysMonthApproved, w.otHoursMonthApproved, w.approvalStatus
    ]);
    downloadCsvFile('Bang-Cong-NP-ONE-Theo-Quan-Ly-Thang-11-2026.csv', [header, ...rows]);
  }

  function exportPayrollCsv() {
    const header = ['STT', 'Mã NV', 'Họ và Tên', 'Đội thi công', 'Đội trưởng', 'Thuộc Quản lý Công trình', 'Công trình', 'Đơn giá ngày', 'Công đã duyệt', 'Giờ OT', 'Công CN', 'Tổng lương gộp', 'Trừ tạm ứng đã duyệt', 'Thực lĩnh'];
    const rows = state.workers.map((w, i) => {
      const hourly = w.dailyWage / 8;
      const basePay = w.daysMonthApproved * w.dailyWage;
      const otPay = Math.round(w.otHoursMonthApproved * hourly * 1.5);
      const sunPay = Math.round(w.sundayDaysMonth * w.dailyWage * 2.0);
      const gross = basePay + otPay + sunPay;
      const adv = state.advances.filter(a => a.workerCode === w.code && a.status === 'BGD_DA_DUYET').reduce((s, a) => s + a.amount, 0);
      return [i + 1, w.code, w.name, w.teamName, w.leaderName, w.managerName, w.projectId, w.dailyWage, w.daysMonthApproved, w.otHoursMonthApproved, w.sundayDaysMonth, gross, adv, gross - adv];
    });
    downloadCsvFile('Bang-Luong-NP-ONE-Theo-Quan-Ly-Thang-11-2026.csv', [header, ...rows]);
  }

  function confirmForgotCheckout(workerId, otHours) {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;
    w.forgotCheckoutFlag = false;
    w.checkOutTime = otHours > 0 ? '19:30:00' : '17:30:00';
    w.attendanceStatus = 'DA_RA';
    w.hoursRegular = 8;
    w.hoursOtActual = otHours;
    saveState();
    renderMain();
  }

  function approveSingleWorker(workerId) {
    const acc = getCurrentAccount();
    if (!acc || (acc.roleId !== 'QLCT' && acc.roleId !== 'BGD')) {
      alert('Nguyên tắc kiểm soát: Đội trưởng và Công nhân KHÔNG được tự duyệt công!');
      return;
    }
    const w = state.workers.find(x => x.id === workerId);
    if (w) {
      w.approvalStatus = 'DA_DUYET';
      w.approvedBy = acc.fullName;
      saveState();
      renderRoleNavigationAndHeader();
      renderMain();
    }
  }

  function approveAllVisible() {
    const acc = getCurrentAccount();
    if (!acc || (acc.roleId !== 'QLCT' && acc.roleId !== 'BGD')) {
      alert('Nguyên tắc kiểm soát: Chỉ Quản lý Công trình hoặc Tổng Giám đốc mới có quyền duyệt công!');
      return;
    }
    const list = getScopedWorkersForCurrentAccount();
    list.forEach(w => {
      if (w.approvalStatus !== 'DA_DUYET') {
        w.approvalStatus = 'DA_DUYET';
        w.approvedBy = acc.fullName;
      }
    });
    saveState();
    renderRoleNavigationAndHeader();
    renderMain();
  }

  function advanceStep(advId, stepType) {
    const acc = getCurrentAccount();
    const adv = state.advances.find(a => a.id === advId);
    if (!adv) return;

    if (stepType === 'KT') {
      adv.status = 'CHO_BGD_DUYET';
      adv.checkedByKt = acc ? acc.fullName : 'KTT. Lê Thị Thu Thảo';
    } else if (stepType === 'BGD') {
      adv.status = 'BGD_DA_DUYET';
      adv.approvedByBgd = acc ? acc.fullName : 'GĐ. Nguyễn Phát';
    }
    saveState();
    renderRoleNavigationAndHeader();
    renderMain();
  }

  function approveMonthlyPayroll() {
    const acc = getCurrentAccount();
    if (!acc || acc.roleId !== 'BGD') {
      alert('Chỉ Tổng Giám Đốc mới có thẩm quyền Phê duyệt Bảng lương tháng!');
      return;
    }
    state.payrollMonthStatus = 'BGD_DA_DUYET';
    saveState();
    renderRoleNavigationAndHeader();
    renderMain();
  }

  function openPayslipModal(workerId) {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;
    const hourly = w.dailyWage / 8;
    const basePay = w.daysMonthApproved * w.dailyWage;
    const otPay = Math.round(w.otHoursMonthApproved * hourly * 1.5);
    const sunPay = Math.round(w.sundayDaysMonth * w.dailyWage * 2.0);
    const gross = basePay + otPay + sunPay;
    const approvedAdvance = state.advances
      .filter(a => a.workerCode === w.code && a.status === 'BGD_DA_DUYET')
      .reduce((s, a) => s + a.amount, 0);
    const net = gross - approvedAdvance;

    document.getElementById('payslipModalBody').innerHTML = `
      <div style="border:1px solid var(--ds-line); border-radius:var(--ds-radius-md); padding:14px; background:var(--ds-bg);">
        <span class="kicker">CÔNG TY NGUYÊN PHÁT · NP ONE HR</span>
        <div style="font-family:var(--ds-font-serif); font-weight:700; font-size:16px; color:var(--ds-primary); margin-bottom:4px;">
          Phiếu Lương — ${w.name} (${w.code})
        </div>
        <div style="font-size:11px; color:var(--ds-text-muted); margin-bottom:10px;">
          Đội: <strong>${w.teamName}</strong> · Đội trưởng: <strong>${w.leaderName}</strong> · Quản lý CT duyệt công: <strong>${w.managerName}</strong>
        </div>
        <table class="data-table" style="margin-bottom:12px;">
          <tbody>
            <tr><td>Công hành chính đã duyệt (${w.daysMonthApproved} công × ${formatVND(w.dailyWage)})</td><td style="text-align:right; font-weight:700;">${formatVND(basePay)}</td></tr>
            <tr><td>Giờ tăng ca đã duyệt (${w.otHoursMonthApproved}h × 1.5)</td><td style="text-align:right; font-weight:700;">${formatVND(otPay)}</td></tr>
            <tr><td>Công Chủ nhật (${w.sundayDaysMonth} công × 2.0)</td><td style="text-align:right; font-weight:700;">${formatVND(sunPay)}</td></tr>
            <tr style="background:var(--ds-bg-soft);"><td><strong>TỔNG LƯƠNG GỘP</strong></td><td style="text-align:right; font-weight:700;">${formatVND(gross)}</td></tr>
            <tr><td style="color:var(--ds-danger);">Trừ Ứng lương đã duyệt</td><td style="text-align:right; color:var(--ds-danger); font-weight:700;">-${formatVND(approvedAdvance)}</td></tr>
            <tr style="background:var(--ds-bg-soft);"><td><strong style="color:var(--ds-primary);">THỰC LĨNH THANH TOÁN</strong></td><td style="text-align:right; color:var(--ds-primary); font-family:var(--ds-font-serif); font-size:15px; font-weight:700;">${formatVND(net)}</td></tr>
          </tbody>
        </table>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-soft" onclick="window.NPApp.closeModal('payslipModal')">Đóng</button>
          <button class="btn btn-primary" onclick="window.print()">🖨️ In Phiếu lương</button>
        </div>
      </div>
    `;
    document.getElementById('payslipModal').classList.add('open');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  function openInstallModal() {
    toggleSidebar(false);
    document.getElementById('installModal').classList.add('open');
  }

  function triggerNativeInstall() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(() => {
        deferredInstallPrompt = null;
      });
    } else {
      alert('Trên iPhone bấm nút Chia sẻ (Share ⬆️) → Thêm vào MH chính; trên Android bấm dấu ⋮ → Cài đặt ứng dụng.');
    }
  }

  function init() {
    initTheme();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredInstallPrompt = e;
    });

    const camWorkerSelect = document.getElementById('camWorkerSelect');
    const camProjectSelect = document.getElementById('camProjectSelect');
    const camActionType = document.getElementById('camActionType');
    if (camWorkerSelect) camWorkerSelect.addEventListener('change', drawLivePreviewOnCanvas);
    if (camProjectSelect) camProjectSelect.addEventListener('change', drawLivePreviewOnCanvas);
    if (camActionType) camActionType.addEventListener('change', drawLivePreviewOnCanvas);

    sampleImgObj.onload = () => {
      if (isAuthenticated) renderMain();
    };

    // Hỗ trợ tham số ?autologin=<username> phục vụ kiểm thử tự động từng vai trò, mặc định bắt buộc màn hình Đăng nhập đầu tiên
    const params = new URLSearchParams(window.location.search);
    const autoUser = params.get('autologin');
    if (autoUser) {
      const found = state.accounts.find(a => a.username.toLowerCase() === autoUser.toLowerCase());
      if (found) {
        activateAccountSession(found);
        closeFullLoginScreen();
      } else {
        openFullLoginScreen();
      }
    } else {
      openFullLoginScreen();
    }

    setTimeout(refreshRealGps, 400);
  }

  window.NPApp = {
    toggleTheme,
    toggleSidebar,
    selectTab,
    openCameraFromSidebar,
    openCameraQuick,
    openPhotoModal,
    closeModal,
    openCameraModal,
    closeCameraModal,
    startHardwareCamera,
    toggleCameraFacing,
    refreshRealGps,
    snapAndSubmitCheckin,
    openAssignTaskModal,
    submitAssignTask,
    openWorkerTaskModal,
    submitWorkerTask,
    updateTeamTaskProgress,
    openAddWorkerModal,
    submitAddWorker,
    openPersonalAdvanceModal,
    submitPersonalAdvance,
    openPersonalLeaveModal,
    openAdjustModal,
    submitAdjustment,
    openOtModal,
    submitOtModal,
    openAccountFormModal,
    submitAccountForm,
    loginAsAccount,
    logoutAccount,
    openFullLoginScreen,
    closeFullLoginScreen,
    submitFullLogin,
    exportAttendanceCsv,
    exportPayrollCsv,
    confirmForgotCheckout,
    approveSingleWorker,
    approveAllVisible,
    advanceStep,
    approveMonthlyPayroll,
    openPayslipModal,
    openInstallModal,
    triggerNativeInstall,
    setSearch(val) { searchQuery = val; renderMain(); },
    setFilterProject(val) { filterProject = val; renderMain(); },
    setFilterTeam(val) { filterTeam = val; renderMain(); },
    setFilterManager(val) { filterManager = val; renderMain(); },
    setFilterStatus(val) { filterStatus = val; renderMain(); }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
