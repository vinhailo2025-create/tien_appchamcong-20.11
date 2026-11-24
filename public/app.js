// Ứng dụng Quản lý Chấm công, Phân việc, Quân số, Tăng ca & Tính lương 5 Cấp NP ONE — Nguyên Phát HR
// Đầy đủ: Chọn khoảng Ngày/Tháng/Năm (Bảng Lịch), Đổi Mật khẩu đồng bộ lên các cấp, Checkin/Checkout chung 1 Menu (Mọi cấp trừ Giám đốc), Kế toán chấm công Giám đốc thấy & Bảng kê Kế toán, Mọi cấp đều được Ứng lương.
(function () {
  const STORAGE_KEY = 'NP_ONE_HR_STATE_V9';
  const THEME_KEY = 'NP_ONE_THEME_V1';

  let state = loadState();
  let isAuthenticated = false;
  let currentAccountId = null;
  let currentRoleId = 'BGD';
  let currentTab = 'bgd-overview';
  const ROWS_PER_PAGE = 50;
  const listPages = new Map();

  // Bộ lọc khoảng thời gian (Từ ngày ... đến ngày ..., chọn Tháng, chọn Năm)
  let dateRange = {
    month: 11,
    year: 2026,
    startDay: 1,
    endDay: 22,
    selectingStep: 0 // 0: click lần 1 chọn startDay, 1: click lần 2 chọn endDay
  };

  // Bộ lọc dùng cho Kế toán / Giám đốc / Quản lý CT
  let filterProject = 'ALL';
  let filterTeam = 'ALL';
  let filterManager = 'ALL';
  let filterStatus = 'ALL';
  let searchQuery = '';

  // Trạng thái đóng/mở Cây Nhân sự (Click vào Đội trưởng sẽ xổ ra toàn bộ nhân sự dưới quyền Đội trưởng đó)
  let expandedTeams = { D1: true };

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
  // Trừ Tổng Giám đốc (BGD), tất cả các cấp (KT, QLCT, DT1, CN) đều có Chấm công (Check-in/Check-out chung 1 menu), Bảng kê công cá nhân & Xin ứng lương!
  const ROLE_CONFIG = {
    BGD: {
      badge: 'TỔNG GIÁM ĐỐC',
      shortTitle: 'Tổng Giám Đốc',
      hasPersonalCheckin: false,
      defaultTab: 'bgd-overview',
      tabs: [
        { id: 'bgd-overview', icon: '🏠', label: 'Tổng quan', shortLabel: 'Tổng quan' },
        { id: 'bgd-hr-pro', icon: '👥', label: 'Nhân sự', shortLabel: 'Nhân sự' },
        { id: 'bgd-excel-pro', icon: '📊', label: 'Chấm công Excel Pro', shortLabel: 'Excel Pro' },
        { id: 'bgd-finance', icon: '💼', label: 'Thanh toán & Công nợ', shortLabel: 'Tài chính' },
        { id: 'bgd-staff-check', icon: '👔', label: 'Chấm công Cán bộ', shortLabel: 'Cán bộ' },
        { id: 'bgd-approvals', icon: '✍️', label: 'Phê duyệt', shortLabel: 'Phê duyệt', badgeKey: 'bgdPending' },
        { id: 'bgd-audit', icon: '🛡️', label: 'Nhật ký hệ thống', shortLabel: 'Nhật ký' },
        { id: 'phan-quyen', icon: '⚙️', label: 'Tài khoản & Phân quyền', shortLabel: 'Hệ thống' }
      ]
    },
    KT: {
      badge: 'KẾ TOÁN',
      shortTitle: 'Kế toán',
      hasPersonalCheckin: true,
      defaultTab: 'kt-excel-pro',
      tabs: [
        { id: 'kt-excel-pro', icon: '📊', label: 'Bảng công Excel Pro', shortLabel: 'Excel Pro' },
        { id: 'kt-finance', icon: '💼', label: 'Thanh toán & Công nợ', shortLabel: 'Thanh toán' },
        { id: 'kt-my-statement', icon: '🪪', label: 'Bảng kê của tôi', shortLabel: 'Bảng kê' },
        { id: 'kt-attendance', icon: '📋', label: 'Bảng công Công ty', shortLabel: 'Bảng công' },
        { id: 'kt-advances', icon: '💳', label: 'Duyệt Ứng lương', shortLabel: 'Ứng lương', badgeKey: 'ktPending' },
        { id: 'kt-payroll', icon: '💰', label: 'Bảng tính Lương', shortLabel: 'Tính lương' },
        { id: 'kt-directory', icon: '🌳', label: 'Cây Nhân sự', shortLabel: 'Cây NS' }
      ]
    },
    QLCT: {
      badge: 'QUẢN LÝ CÔNG TRÌNH',
      shortTitle: 'Quản lý CT',
      hasPersonalCheckin: true,
      defaultTab: 'qlct-approve',
      tabs: [
        { id: 'qlct-approve', icon: '✅', label: 'Duyệt Chấm công', shortLabel: 'Duyệt công', badgeKey: 'qlctPending' },
        { id: 'qlct-my-statement', icon: '🪪', label: 'Bảng kê của tôi', shortLabel: 'Công tôi' },
        { id: 'qlct-tasks', icon: '📌', label: 'Phân việc Đội', shortLabel: 'Phân việc' },
        { id: 'qlct-staff', icon: '👷', label: 'Nhân sự dưới quyền', shortLabel: 'Nhân sự' },
        { id: 'qlct-summary', icon: '📊', label: 'Tổng hợp Công', shortLabel: 'Tổng hợp' }
      ]
    },
    DT1: {
      badge: 'ĐỘI TRƯỞNG',
      shortTitle: 'Đội trưởng',
      hasPersonalCheckin: true,
      defaultTab: 'dt-checkin',
      tabs: [
        { id: 'dt-checkin', icon: '📸', label: 'Chấm công Đội', shortLabel: 'Chấm công' },
        { id: 'dt-my-statement', icon: '🪪', label: 'Bảng kê của tôi', shortLabel: 'Công tôi' },
        { id: 'dt-tasks', icon: '🛠️', label: 'Công việc & Tăng ca', shortLabel: 'Giao việc' },
        { id: 'dt-members', icon: '👥', label: 'Nhân sự Đội', shortLabel: 'Đội tôi' }
      ]
    },
    CN: {
      badge: 'CÔNG NHÂN',
      shortTitle: 'Công nhân',
      hasPersonalCheckin: true,
      defaultTab: 'cn-home',
      tabs: [
        { id: 'cn-home', icon: '🪪', label: 'Tổng kết & Chấm công', shortLabel: 'Công tôi' },
        { id: 'cn-history', icon: '📅', label: 'Lịch sử Ngày công', shortLabel: 'Lịch sử' },
        { id: 'cn-requests', icon: '💳', label: 'Ứng lương & Nghỉ phép', shortLabel: 'Ứng / Nghỉ' },
        { id: 'cn-payslip', icon: '💵', label: 'Phiếu lương', shortLabel: 'Phiếu lương' }
      ]
    }
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.workers && parsed.workers.length >= 100 && parsed.accounts && parsed.staffAttendance) {
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

  function getDaysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
  }

  function formatDateRangeLabel() {
    const s = String(dateRange.startDay).padStart(2, '0');
    const e = String(dateRange.endDay).padStart(2, '0');
    const m = String(dateRange.month).padStart(2, '0');
    const y = dateRange.year;
    return `${s}/${m}/${y} → ${e}/${m}/${y}`;
  }

  function getRangeRatio() {
    const span = Math.max(1, dateRange.endDay - dateRange.startDay + 1);
    return Math.min(1.2, span / 22);
  }

  function getScaledDaysWorked(baseDays) {
    const span = Math.max(1, dateRange.endDay - dateRange.startDay + 1);
    if (dateRange.startDay === 1 && dateRange.endDay === 22 && dateRange.month === 11 && dateRange.year === 2026) {
      return baseDays;
    }
    return Math.min(span, Math.max(1, Math.round(baseDays * (span / 22))));
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

  // Lấy bản ghi chấm công cá nhân của chính tài khoản đang đăng nhập (Dùng cho Kế toán, Quản lý CT, Đội trưởng, Công nhân)
  function getMyOwnAttendanceRecord() {
    const acc = getCurrentAccount();
    if (!acc) return state.workers[0];

    if (acc.roleId === 'KT' || acc.roleId === 'QLCT' || acc.roleId === 'DT1') {
      state.staffAttendance = state.staffAttendance || [];
      let stf = state.staffAttendance.find(s =>
        s.username.toLowerCase() === acc.username.toLowerCase() ||
        s.code === acc.workerCode
      );
      if (!stf) {
        const prj = getProject(acc.projectId !== 'ALL' ? acc.projectId : 'CT1');
        stf = {
          id: 'STF-' + acc.username,
          seq: 5950,
          code: acc.workerCode || ('NV.' + acc.username.toUpperCase()),
          username: acc.username,
          name: acc.fullName.toUpperCase(),
          roleId: acc.roleId,
          roleName: acc.positionTitle,
          teamId: acc.teamId !== 'ALL' ? acc.teamId : 'VP-HC',
          teamName: acc.roleId === 'KT' ? 'Khối Văn phòng - Kế toán' : (acc.roleId === 'QLCT' ? `Ban Chỉ Huy ${prj.id}` : getTeam(acc.teamId).name),
          leaderName: acc.managerName || 'GĐ. Nguyễn Phát',
          projectId: prj.id,
          projectName: prj.name,
          managerUsername: 'admin',
          managerName: acc.managerName || 'GĐ. Nguyễn Phát (Tổng Giám đốc)',
          createdBy: acc.createdBy || 'GĐ. Nguyễn Phát',
          assignedTaskToday: `Thực hiện nhiệm vụ ${acc.positionTitle}`,
          phone: '0905.888.668',
          dailyWage: acc.dailyWage || (acc.roleId === 'QLCT' ? 750000 : (acc.roleId === 'DT1' ? 600000 : 550000)),
          attendanceStatus: 'DANG_LAM',
          checkInTime: '07:15:00',
          checkOutTime: null,
          date: '22/11/2026',
          lat: prj.lat,
          lng: prj.lng,
          acc: 8,
          hoursRegular: 8,
          hoursOtRegistered: 0,
          hoursOtActual: 0,
          forgotCheckoutFlag: false,
          approvalStatus: 'DA_DUYET',
          approvedBy: 'GĐ. Nguyễn Phát',
          daysMonthApproved: 20,
          otHoursMonthApproved: 10,
          sundayDaysMonth: 1
        };
        state.staffAttendance.push(stf);
      }
      return stf;
    }

    // Nếu là Công nhân (CN)
    return state.workers.find(w =>
      w.code.toLowerCase() === (acc.workerCode || acc.username || '').toLowerCase() ||
      w.name.toLowerCase() === (acc.fullName || '').toLowerCase()
    ) || state.workers[32] || state.workers[0];
  }

  // Tìm bản ghi bất kỳ (trong cả staffAttendance lẫn workers) theo id
  function findAnyPersonById(personId) {
    const stf = (state.staffAttendance || []).find(s => s.id === personId);
    if (stf) return stf;
    return state.workers.find(w => w.id === personId);
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
      const myWorker = getMyOwnAttendanceRecord();
      return myWorker ? [myWorker] : [];
    }
    return state.workers;
  }

  // Lấy Mã PIN/Mật khẩu hiện tại của một công nhân hoặc cán bộ (để cấp trên xem được khi cấp dưới đổi mật khẩu)
  function getAccountPinByUsernameOrCode(usernameOrCode) {
    const key = String(usernameOrCode || '').toLowerCase();
    const acc = state.accounts.find(a =>
      a.username.toLowerCase() === key ||
      (a.workerCode && a.workerCode.toLowerCase() === key)
    );
    return acc ? acc.pin : '0000';
  }

  function formatDateRangeShortLabel() {
    const s = String(dateRange.startDay).padStart(2, '0');
    const e = String(dateRange.endDay).padStart(2, '0');
    const m = String(dateRange.month).padStart(2, '0');
    return `${s}/${m} → ${e}/${m}`;
  }

  // ================= BẢNG LỊCH CHỌN KHOẢNG NGÀY (TỪ NGÀY ... ĐẾN NGÀY ... + CHỌN THÁNG / NĂM) =================
  function renderDateRangeButtonHtml(extraClass) {
    return `
      <button type="button" class="date-range-trigger-btn ${extraClass || ''}" onclick="window.NPApp.openDateRangeModal()" title="Bấm để mở bảng lịch chọn Từ ngày ... đến ngày ..., chọn Tháng & Năm">
        📅 <span class="date-full-txt">${formatDateRangeLabel()}</span><span class="date-short-txt">${formatDateRangeShortLabel()}</span> ▾
      </button>
    `;
  }

  function openDateRangeModal() {
    dateRange.selectingStep = 0;
    renderDateRangeModalContent();
    document.getElementById('datePickerModal').classList.add('open');
  }

  function renderDateRangeModalContent() {
    const body = document.getElementById('datePickerModalBody');
    if (!body) return;

    const maxDays = getDaysInMonth(dateRange.month, dateRange.year);
    if (dateRange.startDay > maxDays) dateRange.startDay = 1;
    if (dateRange.endDay > maxDays) dateRange.endDay = maxDays;

    // Tính thứ của ngày mồng 1 trong tháng (T2=0 .. CN=6)
    const firstDate = new Date(dateRange.year, dateRange.month - 1, 1);
    const firstDow = (firstDate.getDay() + 6) % 7;

    let cellsHtml = '';
    for (let b = 0; b < firstDow; b++) {
      cellsHtml += `<div class="cal-day-cell empty"></div>`;
    }
    for (let d = 1; d <= maxDays; d++) {
      const isEdge = (d === dateRange.startDay || d === dateRange.endDay);
      const inRange = (d > dateRange.startDay && d < dateRange.endDay);
      const cls = isEdge ? 'range-edge' : (inRange ? 'in-range' : '');
      cellsHtml += `
        <button type="button" class="cal-day-cell ${cls}" onclick="window.NPApp.pickCalendarDay(${d})">
          ${d}
        </button>
      `;
    }

    const totalSelectedDays = Math.max(1, dateRange.endDay - dateRange.startDay + 1);

    body.innerHTML = `
      <div style="background:var(--ds-bg-soft); border:1px solid var(--ds-line); border-radius:var(--ds-radius-sm); padding:6px 10px; margin-bottom:8px; font-size:11px;">
        Kỳ đang chọn: <strong style="color:var(--ds-primary);">${String(dateRange.startDay).padStart(2, '0')}/${String(dateRange.month).padStart(2, '0')}/${dateRange.year} → ${String(dateRange.endDay).padStart(2, '0')}/${String(dateRange.month).padStart(2, '0')}/${dateRange.year}</strong> (${totalSelectedDays} ngày)
      </div>

      <!-- CHỌN THÁNG & CHỌN NĂM -->
      <div class="cal-toolbar">
        <div>
          <label style="font-size:10px; font-weight:700; color:var(--ds-primary); display:block; margin-bottom:2px;">Chọn Tháng</label>
          <select class="select-ctl" onchange="window.NPApp.changeCalendarMonthYear(Number(this.value), ${dateRange.year})">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m =>
              `<option value="${m}" ${dateRange.month === m ? 'selected' : ''}>Tháng ${String(m).padStart(2, '0')}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:10px; font-weight:700; color:var(--ds-primary); display:block; margin-bottom:2px;">Chọn Năm</label>
          <select class="select-ctl" onchange="window.NPApp.changeCalendarMonthYear(${dateRange.month}, Number(this.value))">
            ${[2024, 2025, 2026, 2027].map(y =>
              `<option value="${y}" ${dateRange.year === y ? 'selected' : ''}>Năm ${y}</option>`
            ).join('')}
          </select>
        </div>
      </div>

      <!-- CHỌN NHANH TỪ NGÀY -> ĐẾN NGÀY -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
        <div>
          <label style="font-size:10px; font-weight:700; color:var(--ds-primary); display:block; margin-bottom:2px;">Từ ngày</label>
          <select class="select-ctl" onchange="window.NPApp.setStartEndDayManual(Number(this.value), ${dateRange.endDay})">
            ${Array.from({ length: maxDays }, (_, idx) => idx + 1).map(d =>
              `<option value="${d}" ${dateRange.startDay === d ? 'selected' : ''}>Ngày ${String(d).padStart(2, '0')}/${String(dateRange.month).padStart(2, '0')}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:10px; font-weight:700; color:var(--ds-primary); display:block; margin-bottom:2px;">Đến ngày</label>
          <select class="select-ctl" onchange="window.NPApp.setStartEndDayManual(${dateRange.startDay}, Number(this.value))">
            ${Array.from({ length: maxDays }, (_, idx) => idx + 1).map(d =>
              `<option value="${d}" ${dateRange.endDay === d ? 'selected' : ''}>Ngày ${String(d).padStart(2, '0')}/${String(dateRange.month).padStart(2, '0')}</option>`
            ).join('')}
          </select>
        </div>
      </div>

      <!-- NÚT CHỌN NHANH -->
      <div class="cal-quick-presets">
        <button type="button" class="btn btn-soft btn-sm" onclick="window.NPApp.setStartEndDayManual(22, 22)">Hôm nay (22/${dateRange.month})</button>
        <button type="button" class="btn btn-soft btn-sm" onclick="window.NPApp.setStartEndDayManual(16, 22)">7 ngày qua (16→22)</button>
        <button type="button" class="btn btn-soft btn-sm" onclick="window.NPApp.setStartEndDayManual(1, 15)">Nửa đầu tháng (01→15)</button>
        <button type="button" class="btn btn-soft btn-sm" onclick="window.NPApp.setStartEndDayManual(1, ${maxDays})">Cả tháng (01→${maxDays})</button>
      </div>

      <!-- BẢNG LỊCH NGÀY TRỰC QUAN -->
      <div class="cal-grid-header">
        <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div style="color:var(--ds-danger);">CN</div>
      </div>
      <div class="cal-grid-days">
        ${cellsHtml}
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
        <button type="button" class="btn btn-soft" onclick="window.NPApp.closeModal('datePickerModal')">Đóng</button>
        <button type="button" class="btn btn-primary" onclick="window.NPApp.applyDateRangeFilter()">
          ✓ Áp dụng (${formatDateRangeLabel()})
        </button>
      </div>
    `;
  }

  function changeCalendarMonthYear(newMonth, newYear) {
    dateRange.month = newMonth;
    dateRange.year = newYear;
    const maxDays = getDaysInMonth(newMonth, newYear);
    if (dateRange.endDay > maxDays) dateRange.endDay = maxDays;
    if (dateRange.startDay > dateRange.endDay) dateRange.startDay = 1;
    renderDateRangeModalContent();
  }

  function setStartEndDayManual(sDay, eDay) {
    dateRange.startDay = Math.min(sDay, eDay);
    dateRange.endDay = Math.max(sDay, eDay);
    renderDateRangeModalContent();
  }

  function pickCalendarDay(dayNum) {
    if (dateRange.selectingStep === 0) {
      dateRange.startDay = dayNum;
      dateRange.endDay = dayNum;
      dateRange.selectingStep = 1;
    } else {
      if (dayNum < dateRange.startDay) {
        dateRange.endDay = dateRange.startDay;
        dateRange.startDay = dayNum;
      } else {
        dateRange.endDay = dayNum;
      }
      dateRange.selectingStep = 0;
    }
    renderDateRangeModalContent();
  }

  function applyDateRangeFilter() {
    listPages.clear();
    closeModal('datePickerModal');
    renderRoleNavigationAndHeader();
    renderRoleHeroSection();
    renderMain();
  }

  // ================= ĐỔI MẬT KHẨU / MÃ PIN TRONG MỖI TÀI KHOẢN & TỰ ĐỘNG CẬP NHẬT LÊN CÁC CẤP =================
  function openChangeMyPasswordModal() {
    const acc = getCurrentAccount();
    if (!acc) return;
    toggleSidebar(false);

    let syncChainText = 'Hệ thống Admin Tổng Giám đốc';
    if (acc.roleId === 'CN') {
      syncChainText = `Đội trưởng (${acc.leaderName || 'Đội'}) → Quản lý Công trình (${acc.managerName || 'QLCT'}) → Kế toán → Tổng Giám đốc`;
    } else if (acc.roleId === 'DT1') {
      syncChainText = `Quản lý Công trình (${acc.managerName || 'QLCT'}) → Kế toán → Tổng Giám đốc`;
    } else if (acc.roleId === 'QLCT' || acc.roleId === 'KT') {
      syncChainText = `Tổng Giám đốc (GĐ. Nguyễn Phát - Admin)`;
    }

    document.getElementById('adjustModalTitle').textContent = `🔑 Đổi Mật Khẩu / Mã PIN — ${acc.fullName}`;
    document.getElementById('adjustModalBody').innerHTML = `
      <div style="background:var(--ds-bg-soft); border:1px solid var(--ds-line); padding:6px 10px; border-radius:var(--ds-radius-sm); font-size:11px; margin-bottom:8px;">
        Tài khoản: <strong><code>${acc.username}</code></strong> (${acc.positionTitle})
      </div>
      <div class="form-group">
        <label>Mật khẩu / Mã PIN hiện tại <span class="req">*</span></label>
        <input type="text" id="curPinInput" value="${acc.pin}" />
      </div>
      <div class="form-group">
        <label>Mật khẩu / Mã PIN mới <span class="req">*</span></label>
        <input type="text" id="newPinInput" placeholder="Nhập mật khẩu hoặc Mã PIN mới (tối thiểu 4 ký tự)..." />
      </div>
      <div class="form-group">
        <label>Nhập lại Mật khẩu / Mã PIN mới <span class="req">*</span></label>
        <input type="text" id="confirmPinInput" placeholder="Xác nhận mật khẩu / Mã PIN mới..." />
        <div id="changePinErr" class="field-error-msg" style="display:none;">Mật khẩu mới không khớp hoặc ngắn hơn 4 ký tự!</div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitChangeMyPassword()">💾 Lưu &amp; Đồng bộ lên Cấp trên</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitChangeMyPassword() {
    const acc = getCurrentAccount();
    if (!acc) return;
    const curPin = (document.getElementById('curPinInput').value || '').trim();
    const newPin = (document.getElementById('newPinInput').value || '').trim();
    const confirmPin = (document.getElementById('confirmPinInput').value || '').trim();
    const errEl = document.getElementById('changePinErr');

    if (curPin !== acc.pin) {
      errEl.textContent = 'Mật khẩu / Mã PIN hiện tại không đúng!';
      errEl.style.display = 'block';
      return;
    }
    if (!newPin || newPin.length < 4 || newPin !== confirmPin) {
      errEl.textContent = 'Mật khẩu mới phải từ 4 ký tự trở lên và khớp ở cả 2 ô!';
      errEl.style.display = 'block';
      return;
    }

    const oldPin = acc.pin;
    acc.pin = newPin;
    acc.passwordUpdatedAt = '22/11/2026 ' + new Date().toTimeString().slice(0, 5);

    // Đồng bộ vào bản ghi công nhân hoặc cán bộ để Đội trưởng / Quản lý CT / Kế toán / Giám đốc đều thấy ngay mật khẩu mới
    const wMatch = state.workers.find(w =>
      w.code.toLowerCase() === acc.username.toLowerCase() ||
      (acc.workerCode && w.code.toLowerCase() === acc.workerCode.toLowerCase())
    );
    if (wMatch) {
      wMatch.pin = newPin;
    }
    const stfMatch = (state.staffAttendance || []).find(s =>
      s.username.toLowerCase() === acc.username.toLowerCase()
    );
    if (stfMatch) {
      stfMatch.pin = newPin;
    }

    // Ghi vào Nhật ký Giám sát của Tổng Giám đốc & Cấp trên
    state.auditLogs.unshift({
      id: 'LOG-PW-' + (state.auditLogs.length + 1),
      timestamp: '22/11/2026 ' + new Date().toTimeString().slice(0, 5),
      workerCode: acc.username,
      workerName: acc.fullName,
      actorName: acc.fullName,
      actorRole: acc.positionTitle,
      field: 'Đổi Mật khẩu / Mã PIN (Đã đồng bộ lên các cấp)',
      oldVal: `PIN cũ: ${oldPin}`,
      newVal: `PIN mới: ${newPin}`,
      reason: `Nhân sự tự đổi mật khẩu trên ứng dụng — Đã cập nhật lên ${acc.leaderName ? acc.leaderName + ', ' : ''}${acc.managerName ? acc.managerName + ' & ' : ''}Tổng Giám đốc`
    });

    saveState();
    closeModal('adjustModal');
    renderRoleNavigationAndHeader();
    renderMain();
    alert(`Đã đổi mật khẩu thành công sang "${newPin}" và tự động đồng bộ lên các cấp quản lý!`);
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

    // 2. Cho phép toàn bộ 108 Mã công nhân đăng nhập với PIN của họ (mặc định 0000 hoặc PIN mới nếu đã đổi)
    if (!acc) {
      const workerMatch = state.workers.find(w => w.code.toLowerCase() === u);
      const expectedPin = workerMatch ? (workerMatch.pin || '0000') : '0000';
      if (workerMatch && p === expectedPin) {
        acc = {
          id: 'ACC-W-' + workerMatch.code,
          username: workerMatch.code,
          pin: expectedPin,
          fullName: workerMatch.name,
          positionTitle: `Công nhân ${workerMatch.teamName} (${workerMatch.roleName})`,
          roleId: 'CN',
          level: 5,
          projectId: workerMatch.projectId,
          teamId: workerMatch.teamId,
          workerCode: workerMatch.code,
          dailyWage: workerMatch.dailyWage,
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
    listPages.clear();

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
    const pendingDelCount = (state.deleteRequests || []).filter(r => r.status === 'CHO_BGD_DONG_Y').length;
    const bgdPending = state.advances.filter(a => a.status === 'CHO_BGD_DUYET').length + (state.payrollMonthStatus === 'CHO_BGD_DUYET' ? 1 : 0) + pendingDelCount;
    const ktPending = state.advances.filter(a => a.status === 'CHO_KT_KIEM_TRA').length;
    let qlctPending = 0;
    if (acc && acc.roleId === 'QLCT') {
      qlctPending = getScopedWorkersForCurrentAccount().filter(w => w.approvalStatus !== 'DA_DUYET' || w.forgotCheckoutFlag).length;
    }
    return { bgdPending, ktPending, qlctPending, pendingDelCount };
  }

  function renderRoleNavigationAndHeader() {
    const acc = getCurrentAccount();
    if (!acc) return;
    const cfg = ROLE_CONFIG[acc.roleId] || ROLE_CONFIG.BGD;
    const badges = getBadgeCounts();
    document.body.dataset.npRole = acc.roleId;

    // 1. Cập nhật thông tin tài khoản trong Sidebar
    const roleLvl = document.getElementById('sidebarRoleLevelLabel');
    if (roleLvl) roleLvl.textContent = cfg.badge;
    const sideInfo = document.getElementById('sidebarCurrentAccountInfo');
    if (sideInfo) {
      sideInfo.innerHTML = `
        <div style="font-size:12.5px; font-weight:700; color:#FFFFFF;">${acc.fullName}</div>
        <div style="font-size:10px; color:var(--ds-accent); margin-top:2px;">TK: <code>${acc.username}</code></div>
      `;
    }

    // 2. Cập nhật danh sách Menu bên trái (Gọn gàng, không trùng lặp)
    const sidebarMenu = document.getElementById('sidebarMenu');
    if (sidebarMenu) {
      let html = `<div class="sidebar-group-title">CHỨC NĂNG</div>`;
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

      html += `<div class="sidebar-group-title">TÀI KHOẢN</div>`;

      if (cfg.hasPersonalCheckin) {
        html += `
          <button class="sidebar-item" onclick="window.NPApp.openUnifiedCheckinMenu(null)">
            <span><span class="s-icon">📸</span> Chấm công</span>
          </button>
          <button class="sidebar-item" onclick="window.NPApp.openPersonalAdvanceModal()">
            <span><span class="s-icon">💳</span> Ứng lương</span>
          </button>
        `;
      }

      html += `
        <button class="sidebar-item" onclick="window.NPApp.openChangeMyPasswordModal()">
          <span><span class="s-icon">🔑</span> Đổi mật khẩu</span>
        </button>
        <button class="sidebar-item" onclick="window.NPApp.logoutAccount()">
          <span><span class="s-icon">🚪</span> Đăng xuất</span>
        </button>
      `;
      sidebarMenu.innerHTML = html;
    }

    // 3. Cập nhật Header trên cùng (Không lặp lại tên tài khoản, không lặp nút Đổi MK/Đăng xuất)
    const headerRoleBadge = document.getElementById('headerRoleBadge');
    if (headerRoleBadge) headerRoleBadge.textContent = `· ${cfg.shortTitle}`;

    const activeTabObj = cfg.tabs.find(t => t.id === currentTab) || cfg.tabs[0];
    const sub = document.getElementById('currentTabSubtitle');
    if (sub && activeTabObj) {
      sub.textContent = activeTabObj.label;
    }

    const headerRight = document.getElementById('headerRightActions');
    if (headerRight) {
      let primaryBtnHtml = '';
      if (acc.roleId === 'BGD') {
        primaryBtnHtml = `
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.selectTab('bgd-staff-check')">
            👔 <span class="hide-on-mobile">Chấm công Cán bộ</span><span class="show-on-mobile-inline">Cán bộ</span>
          </button>
        `;
      } else {
        primaryBtnHtml = `
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.openUnifiedCheckinMenu(null)">
            📸 Chấm công
          </button>
        `;
      }

      const notices = cfg.tabs.filter(tab => tab.badgeKey && badges[tab.badgeKey] > 0);
      const count = notices.reduce((sum, tab) => sum + badges[tab.badgeKey], 0);
      headerRight.innerHTML = `
        ${renderDateRangeButtonHtml()}
        ${primaryBtnHtml}
        <details class="np-notices">
          <summary aria-label="Thông báo${count ? ', ' + count + ' mục chờ xử lý' : ''}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0"/></svg>
            ${count ? `<span class="np-notices-count" aria-hidden="true">${count}</span>` : ''}
          </summary>
          <div class="np-notices-panel"><strong>Thông báo</strong>
          ${count ? `<ul>${notices.map(tab => `<li><button type="button" onclick="window.NPApp.selectTab('${tab.id}')"><span>${tab.label}</span><b>${badges[tab.badgeKey]}</b></button></li>`).join('')}</ul>` : '<p>Chưa có thông báo mới.</p>'}
          </div>
        </details>
      `;
    }

    // 4. Cập nhật Thanh điều hướng đáy điện thoại (Mobile Bottom Nav: tối đa 5 mục chính trên 1 hàng, không bao giờ xuống 2 dòng hoặc mất góc chữ)
    const bottomNav = document.getElementById('mobileBottomNav');
    if (bottomNav) {
      const mobileTabs = cfg.tabs.slice(0, 5);
      bottomNav.innerHTML = mobileTabs.map(t => `
        <button class="bnav-item ${currentTab === t.id ? 'active' : ''}" data-tab="${t.id}" onclick="window.NPApp.selectTab('${t.id}')">
          <span class="b-icon">${t.icon}</span>
          <span>${t.shortLabel}</span>
        </button>
      `).join('');
    }
  }

  // ================= KHUNG THÔNG TIN ĐẦU TRANG (ĐÃ BỎ ĐỂ TRÁNH TRÙNG LẶP VỚI SIDEBAR & HEADER) =================
  function renderRoleHeroSection() {
    const container = document.getElementById('roleHeroSection');
    if (container) {
      container.innerHTML = '';
      container.style.display = 'none';
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
    const cacheKey = `${worker.id}_${worker.checkInTime}_${worker.checkOutTime}_${worker.lat}_${worker.lng}`;
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
    ctx.fillText(`GPS ±${worker.acc || 8}m HỢP LỆ`, 344, 23);

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
    ctx.fillText(`${worker.teamName || worker.roleName} · Duyệt: ${worker.managerName}`, 14, 304);

    ctx.fillStyle = '#E3DFD3';
    ctx.font = '11.5px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`Giờ vào: ${worker.checkInTime} - 22/11/2026 | Ra: ${worker.checkOutTime || 'Đang làm'}`, 14, 324);
    ctx.fillText(`Đ/c: ${String(displayAddress).slice(0, 52)}`, 14, 344);
    ctx.fillStyle = '#F7931E';
    ctx.fillText(`GPS: ${worker.lat}, ${worker.lng} (±${worker.acc || 8}m)`, 14, 364);

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
    if (status === 'DA_DUYET') return `<span class="badge badge-success">✓ Đã duyệt</span>`;
    if (status === 'TU_CHOI') return `<span class="badge badge-danger">Từ chối</span>`;
    return `<span class="badge badge-orange">⏳ Chờ duyệt</span>`;
  }

  // ================= KHỐI BẢNG KÊ CHẤM CÔNG & ỨNG LƯƠNG CÁ NHÂN DÙNG CHUNG CHO KẾ TOÁN / QUẢN LÝ CT / ĐỘI TRƯỞNG / CÔNG NHÂN =================
  function paginateRows(items, list, teamId) {
    const key = encodeURIComponent(currentTab + ':' + list);
    const total = items.length;
    const pageCount = Math.max(1, Math.ceil(total / ROWS_PER_PAGE));
    const page = Math.min(listPages.get(key) || 1, pageCount);
    const offset = (page - 1) * ROWS_PER_PAGE;
    const rows = items.slice(offset, offset + ROWS_PER_PAGE);
    const destination = teamId ? ` data-team="${encodeURIComponent(teamId)}"` : '';
    const controls = pageCount > 1 ? `
      <nav class="np-pagination" aria-label="Phân trang" data-np-pagination="${key}"${destination}>
        <span class="np-page-range" role="status">${offset + 1}–${offset + rows.length} / ${total} dòng</span>
        <div class="np-page-controls">
          <button type="button" class="btn btn-soft" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>Trước</button>
          <label><span class="np-page-sr">Chọn trang</span><select data-page-picker>
            ${Array.from({ length: pageCount }, (_, index) => {
              const value = index + 1;
              return `<option value="${value}" ${page === value ? 'selected' : ''}>Trang ${value} / ${pageCount}</option>`;
            }).join('')}
          </select></label>
          <button type="button" class="btn btn-soft" data-page="${page + 1}" ${page === pageCount ? 'disabled' : ''}>Sau</button>
        </div>
      </nav>` : '';
    return { rows, controls, offset };
  }

  function changeListPage(control, value) {
    const nav = control.closest('[data-np-pagination]');
    const page = Number(value);
    if (!nav || !getCurrentAccount() || !Number.isInteger(page) || page < 1 || page > nav.querySelector('select').options.length) return;
    const key = nav.dataset.npPagination;
    listPages.set(key, page);
    if (nav.dataset.team) openTeamMembersDetailModal(decodeURIComponent(nav.dataset.team));
    else renderMain();

    const updated = document.querySelector(`[data-np-pagination="${CSS.escape(key)}"]`);
    const range = updated?.querySelector('.np-page-range');
    if (range) {
      range.tabIndex = -1;
      range.focus({ preventScroll: true });
    }
    const content = updated?.previousElementSibling || updated?.parentElement;
    if (content?.classList.contains('table-scroll')) content.scrollTop = 0;
    content?.scrollIntoView({ block: 'start' });
  }

  function renderPersonalStatementBlock(person, roleBadgeText) {
    const prj = getProject(person.projectId);
    const scaledDays = getScaledDaysWorked(person.daysMonthApproved);
    const scaledOt = Math.round(person.otHoursMonthApproved * getRangeRatio());
    const hourly = person.dailyWage / 8;
    const basePay = scaledDays * person.dailyWage;
    const otPay = Math.round(scaledOt * hourly * 1.5);
    const sunPay = Math.round((person.sundayDaysMonth || 0) * person.dailyWage * 2.0);
    const grossSalary = basePay + otPay + sunPay;

    const myAdvances = state.advances.filter(a =>
      a.workerCode.toLowerCase() === person.code.toLowerCase() ||
      (person.username && a.workerCode.toLowerCase() === person.username.toLowerCase())
    );
    const approvedAdvAmount = myAdvances.filter(a => a.status === 'BGD_DA_DUYET').reduce((s, a) => s + a.amount, 0);
    const remainingSalary = grossSalary - approvedAdvAmount;
    const thumb = getWorkerStampedPhoto(person);

    // Sinh bảng kê chi tiết từng ngày trong khoảng ngày đã chọn (dateRange.startDay -> dateRange.endDay)
    const dailyRows = [];
    for (let d = dateRange.endDay; d >= dateRange.startDay; d--) {
      const dateStr = `${String(d).padStart(2, '0')}/${String(dateRange.month).padStart(2, '0')}/${dateRange.year}`;
      const isToday = (d === 22 && dateRange.month === 11 && dateRange.year === 2026);
      const isSun = (new Date(dateRange.year, dateRange.month - 1, d).getDay() === 0);
      const inTime = isToday ? (person.checkInTime || '07:30:00') : '07:30:00';
      const outTime = isToday ? (person.checkOutTime || 'Đang làm việc') : '17:30:00';
      const otH = (d % 4 === 0) ? 2 : 0;
      dailyRows.push({
        dateStr,
        dayType: isSun ? 'Chủ nhật (×2.0)' : 'Ngày thường (×1.0)',
        inTime,
        outTime,
        workDay: 1.0,
        otH,
        dailyAmount: person.dailyWage + Math.round(otH * hourly * 1.5),
        approver: person.managerName
      });
    }

    const advancePage = paginateRows(myAdvances, 'personal-advances');
    const dailyPage = paginateRows(dailyRows, 'personal-days');

    return `
      <!-- BẢNG TỔNG KẾT CÔNG & LƯƠNG CÁ NHÂN THEO KHOẢNG NGÀY ĐÃ CHỌN -->
      <div class="personal-summary-hero">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
          <div>
            <span class="kicker" style="color:var(--ds-accent); margin-bottom:2px;">KỲ: ${formatDateRangeLabel()}</span>
            <h3>${person.name} (${person.code})</h3>
            <div style="font-size:11px; opacity:0.92; margin-top:2px;">
              <strong>${person.roleName}</strong> · <strong>${person.teamName}</strong> · Duyệt: <strong>${person.managerName}</strong>
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.openUnifiedCheckinMenu('${person.id}')">📸 Chấm công</button>
            <button class="btn btn-outline-dark btn-sm" onclick="window.NPApp.openPersonalAdvanceModal()">💳 Ứng lương</button>
          </div>
        </div>

        <div class="personal-stat-grid">
          <div class="personal-stat-box">
            <div class="ps-label">CÔNG ĐÃ LÀM</div>
            <div class="ps-val">${scaledDays} <span style="font-size:11px; font-weight:500;">công</span></div>
            <div style="font-size:10px; opacity:0.85; margin-top:2px;">${formatVND(person.dailyWage)}/ngày</div>
          </div>
          <div class="personal-stat-box">
            <div class="ps-label">TĂNG CA &amp; CN</div>
            <div class="ps-val">${scaledOt}h OT <span style="font-size:11px; font-weight:500;">· ${person.sundayDaysMonth || 0} CN</span></div>
            <div style="font-size:10px; opacity:0.85; margin-top:2px;">${formatVND(otPay + sunPay)}</div>
          </div>
          <div class="personal-stat-box">
            <div class="ps-label">LƯƠNG LŨY KẾ</div>
            <div class="ps-val">${formatVND(grossSalary)}</div>
            <div style="font-size:10px; opacity:0.85; margin-top:2px;">Đã ứng: -${formatVND(approvedAdvAmount)}</div>
          </div>
          <div class="personal-stat-box" style="background:rgba(247,147,30,0.22); border-color:var(--ds-accent);">
            <div class="ps-label">THỰC LĨNH CÒN LẠI</div>
            <div class="ps-val" style="color:#FFFFFF;">${formatVND(remainingSalary)}</div>
            <div style="font-size:10px; color:var(--ds-accent); margin-top:2px;">Duyệt: ${person.managerName}</div>
          </div>
        </div>
      </div>

      <!-- BẰNG CHỨNG CHẤM CÔNG HÔM NAY & ĐƠN ỨNG LƯƠNG CÁ NHÂN -->
      <div class="grid-2" style="margin-bottom:10px;">
        <div class="section-card" style="margin-bottom:0;">
          <span class="kicker">HÔM NAY</span>
          <h3>Chấm Công Hôm Nay</h3>
          <div style="display:flex; gap:10px; align-items:center; margin-top:8px;">
            <img src="${thumb}" style="width:104px; height:80px; object-fit:cover; border-radius:var(--ds-radius-sm); border:1px solid var(--ds-line); cursor:pointer;" onclick="window.NPApp.openPhotoModal('${person.id}')" />
            <div style="font-size:11px; line-height:1.45;">
              <div>${renderAttendanceBadge(person.attendanceStatus)} · ${renderApprovalBadge(person.approvalStatus)}</div>
              <div style="margin-top:3px;">Vào: <strong><code>${person.checkInTime || '--:--'}</code></strong> · Ra: <strong><code>${person.checkOutTime || 'Đang làm'}</code></strong></div>
              <div style="margin-top:3px;">Việc: <strong>${person.assignedTaskToday}</strong></div>
            </div>
          </div>
        </div>

        <div class="section-card" style="margin-bottom:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div>
              <span class="kicker">TẠM ỨNG</span>
              <h3>Đơn Ứng Lương</h3>
            </div>
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.openPersonalAdvanceModal()">+ Ứng lương</button>
          </div>
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Ngày</th>
                  <th>Số tiền</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                ${myAdvances.length === 0 ? `
                  <tr><td colspan="5" style="text-align:center; padding:10px; color:var(--ds-text-muted);">Chưa có đơn ứng lương.</td></tr>
                ` : advancePage.rows.map(adv => `
                  <tr>
                    <td><strong>${adv.id}</strong></td>
                    <td>${adv.date}</td>
                    <td><strong style="color:var(--ds-primary);">${formatVND(adv.amount)}</strong></td>
                    <td>${adv.reason}</td>
                    <td>${adv.status === 'BGD_DA_DUYET' ? `<span class="badge badge-success">✓ Đã duyệt</span>` : `<span class="badge badge-orange">⏳ Chờ duyệt</span>`}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${advancePage.controls}
        </div>
      </div>

      <!-- BẢNG KÊ CHI TIẾT TỪNG NGÀY CÔNG CỦA CÁ NHÂN TRONG KHOẢNG NGÀY ĐÃ CHỌN -->
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">CHI TIẾT NGÀY CÔNG</span>
            <h3>Bảng Kê Ngày Công (${formatDateRangeLabel()})</h3>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Loại ngày</th>
                <th>Giờ Check-in</th>
                <th>Giờ Check-out</th>
                <th>Số công</th>
                <th>Giờ OT</th>
                <th>Thành tiền trong ngày</th>
                <th>Cấp trên duyệt</th>
              </tr>
            </thead>
            <tbody>
              ${dailyPage.rows.map(r => `
                <tr>
                  <td><strong>${r.dateStr}</strong></td>
                  <td>${r.dayType}</td>
                  <td><code>${r.inTime}</code></td>
                  <td><code>${r.outTime}</code></td>
                  <td><strong>${r.workDay} công</strong></td>
                  <td>${r.otH > 0 ? `<span class="badge badge-orange">+${r.otH}h OT</span>` : '0h'}</td>
                  <td><strong style="color:var(--ds-primary);">${formatVND(r.dailyAmount)}</strong></td>
                  <td><span class="badge badge-success">✓ ${r.approver}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${dailyPage.controls}
      </div>
    `;
  }

  // ================= ĐIỀU PHỐI RENDER NỘI DUNG CHÍNH THEO VAI TRÒ & TAB =================
  function renderMain() {
    const main = document.getElementById('appMain');
    if (!main) return;
    const acc = getCurrentAccount();
    if (!acc) return;

    main.dataset.npView = currentTab;
    renderRoleHeroSection();

    // 1. GIAO DIỆN TỔNG GIÁM ĐỐC / ADMIN (BGD)
    if (acc.roleId === 'BGD') {
      if (currentTab === 'bgd-overview') main.innerHTML = renderBgdOverview();
      else if (currentTab === 'bgd-hr-pro') main.innerHTML = renderV2HrManagement();
      else if (currentTab === 'bgd-excel-pro') main.innerHTML = renderV2ExcelProAttendance();
      else if (currentTab === 'bgd-finance') main.innerHTML = renderV2FinancePayables();
      else if (currentTab === 'bgd-staff-check') main.innerHTML = renderBgdStaffCheck();
      else if (currentTab === 'bgd-approvals') main.innerHTML = renderBgdApprovals();
      else if (currentTab === 'bgd-audit') main.innerHTML = renderBgdAudit();
      else if (currentTab === 'phan-quyen') main.innerHTML = renderAdminAccountsTab();
      else main.innerHTML = renderBgdOverview();
      return;
    }

    // 2. GIAO DIỆN HÀNH CHÍNH - KẾ TOÁN (KT)
    if (acc.roleId === 'KT') {
      if (currentTab === 'kt-excel-pro') main.innerHTML = renderV2ExcelProAttendance();
      else if (currentTab === 'kt-finance') main.innerHTML = renderV2FinancePayables();
      else if (currentTab === 'kt-my-statement') main.innerHTML = renderPersonalStatementBlock(getMyOwnAttendanceRecord(), 'BẢNG KÊ CÔNG & LƯƠNG CỦA KẾ TOÁN (GIÁM ĐỐC TRỰC TIẾP GIÁM SÁT)');
      else if (currentTab === 'kt-attendance') main.innerHTML = renderKtAttendance();
      else if (currentTab === 'kt-advances') main.innerHTML = renderKtAdvances();
      else if (currentTab === 'kt-payroll') main.innerHTML = renderKtPayroll();
      else if (currentTab === 'kt-directory') main.innerHTML = renderKtHierarchyDirectory();
      else main.innerHTML = renderV2ExcelProAttendance();
      return;
    }

    // 3. GIAO DIỆN QUẢN LÝ CÔNG TRÌNH (QLCT)
    if (acc.roleId === 'QLCT') {
      if (currentTab === 'qlct-approve') main.innerHTML = renderQlctApprove();
      else if (currentTab === 'qlct-my-statement') main.innerHTML = renderPersonalStatementBlock(getMyOwnAttendanceRecord(), 'BẢNG KÊ CÔNG & LƯƠNG CỦA QUẢN LÝ CÔNG TRÌNH');
      else if (currentTab === 'qlct-tasks') main.innerHTML = renderQlctTasks();
      else if (currentTab === 'qlct-staff') main.innerHTML = renderQlctStaff();
      else if (currentTab === 'qlct-summary') main.innerHTML = renderQlctSummary();
      else main.innerHTML = renderQlctApprove();
      return;
    }

    // 4. GIAO DIỆN ĐỘI TRƯỞNG THI CÔNG (DT1)
    if (acc.roleId === 'DT1') {
      if (currentTab === 'dt-checkin') main.innerHTML = renderDtCheckin();
      else if (currentTab === 'dt-my-statement') main.innerHTML = renderPersonalStatementBlock(getMyOwnAttendanceRecord(), 'BẢNG KÊ CÔNG & LƯƠNG CỦA ĐỘI TRƯỞNG');
      else if (currentTab === 'dt-tasks') main.innerHTML = renderDtTasks();
      else if (currentTab === 'dt-members') main.innerHTML = renderDtMembers();
      else main.innerHTML = renderDtCheckin();
      return;
    }

    // 5. GIAO DIỆN CÁ NHÂN CÔNG NHÂN (CN)
    if (acc.roleId === 'CN') {
      if (currentTab === 'cn-home') main.innerHTML = renderPersonalStatementBlock(getMyOwnAttendanceRecord(), 'BẢNG TỔNG KẾT CÔNG & THU NHẬP CÁ NHÂN CÔNG NHÂN');
      else if (currentTab === 'cn-history') main.innerHTML = renderCnPersonalHistory();
      else if (currentTab === 'cn-requests') main.innerHTML = renderCnPersonalRequests();
      else if (currentTab === 'cn-payslip') main.innerHTML = renderCnPersonalPayslip();
      else main.innerHTML = renderPersonalStatementBlock(getMyOwnAttendanceRecord(), 'BẢNG TỔNG KẾT CÔNG & THU NHẬP CÁ NHÂN CÔNG NHÂN');
    }
  }

  // =================================================================================================
  // I. GIAO DIỆN CẤP 1: TỔNG GIÁM ĐỐC / ADMIN (THẤY CHẤM CÔNG CỦA KẾ TOÁN, QLCT, ĐỘI TRƯỞNG & 108 CÔNG NHÂN)
  // =================================================================================================
  function renderBgdOverview() {
    const total = state.workers.length;
    const present = state.workers.filter(w => w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA').length;
    const leaveCount = total - present;
    const staffList = state.staffAttendance || [];
    const pendingAdv = state.advances.filter(a => a.status !== 'BGD_DA_DUYET').length;
    const pendingDel = (state.deleteRequests || []).filter(r => r.status === 'CHO_BGD_DONG_Y').length;

    return `
      <!-- 1. DẢI 6 KPI ICON MÀU THEO ĐÚNG MẪU DASHBOARD GIÁM ĐỐC NP ONE V2.0 -->
      <div class="v2-kpi-grid cols-6">
        <div class="v2-kpi-card" style="cursor:pointer;" onclick="window.NPApp.selectTab('bgd-hr-pro')">
          <div class="v2-kpi-icon blue">👥</div>
          <div>
            <div class="v2-kpi-title">Quân số hiện tại</div>
            <div class="v2-kpi-num">${total}</div>
            <div class="v2-kpi-trend" style="color:#1E8E3E;">↑ +6 so với kỳ trước</div>
          </div>
        </div>
        <div class="v2-kpi-card" style="cursor:pointer;" onclick="window.NPApp.selectTab('bgd-excel-pro')">
          <div class="v2-kpi-icon green">✓</div>
          <div>
            <div class="v2-kpi-title">Có mặt hôm nay</div>
            <div class="v2-kpi-num">${present}</div>
            <div class="v2-kpi-trend" style="color:#1E8E3E;">(${((present / total) * 100).toFixed(1)}%)</div>
          </div>
        </div>
        <div class="v2-kpi-card">
          <div class="v2-kpi-icon orange">👷</div>
          <div>
            <div class="v2-kpi-title">Đội trưởng</div>
            <div class="v2-kpi-num">${state.teams.length}</div>
            <div class="v2-kpi-trend" style="color:#5B6678;">Nghỉ/Vắng: ${leaveCount} người</div>
          </div>
        </div>
        <div class="v2-kpi-card">
          <div class="v2-kpi-icon purple">🔄</div>
          <div>
            <div class="v2-kpi-title">Điều chuyển</div>
            <div class="v2-kpi-num">3</div>
            <div class="v2-kpi-trend" style="color:#5B6678;">(2,8% quân số)</div>
          </div>
        </div>
        <div class="v2-kpi-card">
          <div class="v2-kpi-icon teal">🏢</div>
          <div>
            <div class="v2-kpi-title">Công trình thi công</div>
            <div class="v2-kpi-num">${state.projects.length}</div>
            <div class="v2-kpi-trend" style="color:#087F91;">3 Quản lý CT phụ trách</div>
          </div>
        </div>
        <div class="v2-kpi-card" style="cursor:pointer;" onclick="window.NPApp.selectTab('bgd-staff-check')">
          <div class="v2-kpi-icon pink">👔</div>
          <div>
            <div class="v2-kpi-title">Kế toán &amp; Cán bộ</div>
            <div class="v2-kpi-num">${staffList.length}/10</div>
            <div class="v2-kpi-trend" style="color:#1E8E3E;">Đã chấm công GPS</div>
          </div>
        </div>
      </div>

      <!-- 2. KHỐI KẾT QUẢ KINH DOANH KỲ (DOANH THU / CHI PHÍ / LỢI NHUẬN) + CƠ CẤU CHI PHÍ + CÔNG VIỆC CHỜ XỬ LÝ -->
      <div class="v2-fin-grid">
        <div class="section-card" style="margin-bottom:0;">
          <div class="section-header">
            <div>
              <span class="kicker">TÌNH HÌNH TÀI CHÍNH KỲ (${formatDateRangeLabel()})</span>
              <h3>Kết Quả Kinh Doanh Kỳ (Tạm Tính)</h3>
            </div>
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.selectTab('bgd-finance')">Chi tiết ▸</button>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(92px, 1fr)); gap:6px;">
            <div class="v2-fin-box rev">
              <div style="font-size:10px; color:#5B6678; font-weight:700;">Doanh thu</div>
              <div style="font-size:12.5px; font-weight:800; color:#1E8E3E; margin-top:3px;">620.000.000đ</div>
              <div style="font-size:9.5px; color:#1E8E3E; font-weight:700; margin-top:2px;">↑ +14%</div>
            </div>
            <div class="v2-fin-box cost">
              <div style="font-size:10px; color:#5B6678; font-weight:700;">Chi phí</div>
              <div style="font-size:12.5px; font-weight:800; color:#C0392B; margin-top:3px;">512.000.000đ</div>
              <div style="font-size:9.5px; color:#C0392B; font-weight:700; margin-top:2px;">Lương &amp; Đội khoán</div>
            </div>
            <div class="v2-fin-box prof">
              <div style="font-size:10px; color:#5B6678; font-weight:700;">Lợi nhuận</div>
              <div style="font-size:12.5px; font-weight:800; color:#1976D2; margin-top:3px;">108.000.000đ</div>
              <div style="font-size:9.5px; color:#1976D2; font-weight:700; margin-top:2px;">(17,4%)</div>
            </div>
          </div>
        </div>

        <div class="section-card" style="margin-bottom:0;">
          <div class="section-header">
            <div>
              <span class="kicker">PHÂN TÍCH CHI PHÍ</span>
              <h3>Cơ Cấu Chi Phí</h3>
            </div>
          </div>
          <div class="v2-donut-wrap">
            <div class="v2-donut-ring">
              <div class="v2-donut-hole">
                <strong style="font-size:14px; color:#102D54;">512</strong>
                <span style="font-size:8.5px; color:#5B6678;">Triệu đồng</span>
              </div>
            </div>
            <div style="font-size:10.5px; display:grid; gap:4px;">
              <div><span style="color:#1976D2;">●</span> Nhân công (74%)</div>
              <div><span style="color:#F7931E;">●</span> Đội khoán (12%)</div>
              <div><span style="color:#1E8E3E;">●</span> Vật tư - CCDC (8%)</div>
              <div><span style="color:#7E57C2;">●</span> Chi phí khác (6%)</div>
            </div>
          </div>
        </div>

        <div class="section-card" style="margin-bottom:0;">
          <div class="section-header">
            <div>
              <span class="kicker">HÀNG CHỜ PHÊ DUYỆT CỦA GIÁM ĐỐC</span>
              <h3>Công Việc Chờ Xử Lý (${3 + pendingAdv + pendingDel})</h3>
            </div>
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.selectTab('bgd-approvals')">Xem tất cả ▸</button>
          </div>
          <div style="display:grid; gap:5px; font-size:11px;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; background:var(--ds-bg-soft); border-radius:6px; cursor:pointer;" onclick="window.NPApp.selectTab('bgd-finance')">
              <span>💳 <strong>3 đề nghị thanh toán đội</strong></span>
              <span class="badge badge-orange">Chờ duyệt ▸</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; background:var(--ds-bg-soft); border-radius:6px; cursor:pointer;" onclick="window.NPApp.selectTab('bgd-excel-pro')">
              <span>📊 <strong>2 bảng công cần đối chiếu</strong></span>
              <span class="badge badge-navy">Kế toán gửi ▸</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; background:var(--ds-bg-soft); border-radius:6px; cursor:pointer;" onclick="window.NPApp.selectTab('bgd-approvals')">
              <span>🗑️ <strong>${pendingDel} yêu cầu xóa nhân sự &amp; ${pendingAdv} đơn ứng</strong></span>
              <span class="badge badge-warning">Cần xác nhận ▸</span>
            </div>
          </div>
        </div>
      </div>

      <!-- CÂY PHÂN CẤP QUẢN LÝ: TỔNG GIÁM ĐỐC -> 3 QUẢN LÝ CÔNG TRÌNH -> 6 ĐỘI TRƯỞNG -> CLICK RA TOÀN BỘ CÔNG NHÂN DƯỚI QUYỀN -->
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">SƠ ĐỒ TỔ CHỨC</span>
            <h3>Cây Nhân Sự Toàn Công Ty</h3>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.expandAllHierarchyTeams(true)">📂 Mở tất cả</button>
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.expandAllHierarchyTeams(false)">📁 Thu gọn</button>
          </div>
        </div>

        <div class="grid-3">
          ${state.projects.map(p => {
            const pTeams = state.teams.filter(t => t.projectId === p.id);
            const pWorkers = state.workers.filter(w => w.projectId === p.id);
            const pPresent = pWorkers.filter(w => w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA').length;
            const pApproved = pWorkers.filter(w => w.approvalStatus === 'DA_DUYET').length;
            const mgrPin = getAccountPinByUsernameOrCode(p.managerUsername);

            return `
              <div class="hierarchy-card">
                <span class="kicker">${p.code}</span>
                <h4>${p.name}</h4>

                <div style="margin-top:6px; padding:7px 9px; background:var(--ds-primary); color:#FFFFFF; border-radius:var(--ds-radius-sm); cursor:pointer;" onclick="window.NPApp.toggleProjectTeams('${p.id}')">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:10px; color:var(--ds-accent); font-weight:700;">QUẢN LÝ CÔNG TRÌNH</span>
                    <span class="badge badge-orange">${pPresent}/${pWorkers.length} có mặt ▾</span>
                  </div>
                  <div style="font-size:12px; font-weight:700; margin-top:2px;">👷 ${p.manager} (<code>${p.managerUsername}</code> · PIN: <code>${mgrPin}</code>)</div>
                </div>

                <div style="margin-top:6px;">
                  ${pTeams.map(tm => {
                    const tmWorkers = pWorkers.filter(w => w.teamId === tm.id);
                    const teamPage = paginateRows(tmWorkers, 'members-' + tm.id);
                    const tmPresent = tmWorkers.filter(w => w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA').length;
                    const dtPin = getAccountPinByUsernameOrCode(tm.leaderUsername);
                    const isOpen = !!expandedTeams[tm.id];
                    return `
                      <div style="border:1.5px solid ${isOpen ? 'var(--ds-accent)' : 'var(--ds-line)'}; border-radius:var(--ds-radius-sm); background:#FFFFFF; margin-bottom:6px; overflow:hidden;">
                        <div style="padding:7px 9px; cursor:pointer; background:${isOpen ? 'var(--ds-bg-soft)' : '#FFFFFF'};" onclick="window.NPApp.toggleTeamHierarchy('${tm.id}')">
                          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                            <strong style="font-size:11.5px; color:var(--ds-primary);">
                              ${isOpen ? '📂' : '📁'} ${tm.name}
                            </strong>
                            <span class="badge ${isOpen ? 'badge-orange' : 'badge-success'}">
                              ${tmPresent}/${tmWorkers.length} ${isOpen ? '▴' : '▾'}
                            </span>
                          </div>
                          <div style="font-size:10.5px; color:var(--ds-text); margin-top:2px;">
                            <strong>${tm.leader}</strong> (<code>${tm.leaderUsername}</code> · PIN: <code>${dtPin}</code>)
                          </div>
                        </div>

                        ${isOpen ? `
                          <div style="border-top:1px solid var(--ds-line); padding:5px 7px; background:#FFFFFF;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                              <span style="font-size:10px; font-weight:700; color:var(--ds-primary);">
                                ${tmWorkers.length} nhân sự:
                              </span>
                              <button class="btn btn-primary btn-sm" onclick="window.NPApp.openTeamMembersDetailModal('${tm.id}')">
                                🔍 Mở rộng
                              </button>
                            </div>
                            <div style="max-height:285px; overflow-y:auto; border:1px solid var(--ds-line); border-radius:var(--ds-radius-sm);">
                              <table class="data-table" style="font-size:10px;">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Mã NV &amp; PIN</th>
                                    <th>Họ tên &amp; Vai trò</th>
                                    <th>Vào/Ra</th>
                                    <th>Công</th>
                                    <th>Xóa</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${teamPage.rows.map((w, idx) => {
                                    const wPin = getAccountPinByUsernameOrCode(w.code);
                                    const sDays = getScaledDaysWorked(w.daysMonthApproved);
                                    return `
                                      <tr>
                                        <td>${teamPage.offset + idx + 1}</td>
                                        <td><strong><code>${w.code}</code></strong><br/><span style="font-size:9px; color:var(--ds-primary);">PIN: <code>${wPin}</code></span></td>
                                        <td>
                                          <strong style="cursor:pointer; color:var(--ds-primary);" onclick="window.NPApp.openPhotoModal('${w.id}')" title="Bấm xem ảnh GPS chấm công">${w.name}</strong>
                                          <div style="font-size:9px; color:var(--ds-text-muted);">${w.roleName}</div>
                                        </td>
                                        <td>
                                          ${w.checkInTime && w.checkInTime !== '--:--:--'
                                            ? `<span style="color:var(--ds-success); font-weight:700;">${w.checkInTime.slice(0, 5)}</span>`
                                            : `<span style="color:var(--ds-danger);">Vắng</span>`
                                          }
                                        </td>
                                        <td><strong>${sDays}c</strong></td>
                                        <td>
                                          <button class="btn btn-danger btn-sm" style="min-height:20px; padding:1px 6px; font-size:9px;" onclick="window.NPApp.openDeleteConfirmModal('WORKER', '${w.id}')" title="Xóa nhân sự này">🗑️</button>
                                        </td>
                                      </tr>
                                    `;
                                  }).join('')}
                                </tbody>
                              </table>
                            </div>
                            ${teamPage.controls}
                          </div>
                        ` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // =================================================================================================
  // CÁC MÀN HÌNH NP ONE V2.0 (2. QUẢN LÝ NHÂN SỰ · 3. CHẤM CÔNG EXCEL PRO · 4. THANH TOÁN & CÔNG NỢ)
  // =================================================================================================
  function renderV2HrManagement() {
    const total = state.workers.length;
    const workingCount = state.workers.filter(w => w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA').length;
    const leaveCount = total - workingCount;

    const filtered = state.workers.filter(w => {
      if (filterProject !== 'ALL' && w.projectId !== filterProject) return false;
      if (filterTeam !== 'ALL' && w.teamId !== filterTeam) return false;
      if (filterStatus === 'WORKING' && w.attendanceStatus !== 'DANG_LAM' && w.attendanceStatus !== 'DA_RA') return false;
      if (filterStatus === 'LEAVE' && (w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA')) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!w.name.toLowerCase().includes(q) && !w.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const workerPage = paginateRows(filtered, 'personnel');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">NHÂN SỰ</span>
            <h3>Quản Lý Nhân Sự (${total})</h3>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.openAddWorkerModal()">+ Thêm nhân sự</button>
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.exportAttendanceCsv()">📥 Xuất Excel</button>
          </div>
        </div>

        <div class="v2-filter-pills">
          <button class="v2-pill-tab ${filterStatus === 'ALL' ? 'active' : ''}" onclick="window.NPApp.setFilterStatus('ALL')">Tất cả (${total})</button>
          <button class="v2-pill-tab ${filterStatus === 'WORKING' ? 'active' : ''}" onclick="window.NPApp.setFilterStatus('WORKING')">Đang làm (${workingCount})</button>
          <button class="v2-pill-tab ${filterStatus === 'LEAVE' ? 'active' : ''}" onclick="window.NPApp.setFilterStatus('LEAVE')">Nghỉ việc / Tạm nghỉ (${leaveCount})</button>
          <button class="v2-pill-tab" onclick="window.NPApp.setFilterStatus('ALL')">Tái tuyển (3)</button>
        </div>

        <div class="filter-bar" style="margin-bottom:10px;">
          <input type="text" placeholder="🔍 Tìm theo mã, họ tên..." value="${searchQuery}" oninput="window.NPApp.setSearch(this.value)" />
          <select onchange="window.NPApp.setFilterTeam(this.value)">
            <option value="ALL" ${filterTeam === 'ALL' ? 'selected' : ''}>Đội: Tất cả 6 Đội</option>
            ${state.teams.map(t => `<option value="${t.id}" ${filterTeam === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
          </select>
          <select onchange="window.NPApp.setFilterProject(this.value)">
            <option value="ALL" ${filterProject === 'ALL' ? 'selected' : ''}>Công trình: Tất cả</option>
            ${state.projects.map(p => `<option value="${p.id}" ${filterProject === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>Mã NV</th>
                <th>Mật khẩu / PIN</th>
                <th>Họ và tên</th>
                <th>Đội</th>
                <th>Công trình</th>
                <th>Quản lý CT phụ trách</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${workerPage.rows.map(w => {
                const isWorking = (w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA');
                const pin = getAccountPinByUsernameOrCode(w.code);
                return `
                  <tr>
                    <td><input type="checkbox" /></td>
                    <td><strong><code>${w.code}</code></strong></td>
                    <td><code>${pin}</code></td>
                    <td>
                      <div style="display:flex; align-items:center; gap:7px;">
                        <span style="width:24px; height:24px; border-radius:50%; background:#EAF4FF; color:#1976D2; display:inline-flex; align-items:center; justify-content:center; font-weight:700; font-size:11px;">👷</span>
                        <div>
                          <strong>${w.name}</strong>
                          <div style="font-size:9.5px; color:var(--ds-text-muted);">${w.roleName}</div>
                        </div>
                      </div>
                    </td>
                    <td><strong>${w.teamName}</strong><br/><span style="font-size:9.5px; color:var(--ds-text-muted);">${w.leaderName}</span></td>
                    <td><strong>${w.projectId}</strong></td>
                    <td><span class="badge badge-navy">${w.managerName}</span></td>
                    <td>
                      ${isWorking
                        ? `<span class="badge badge-success">Đang làm</span>`
                        : `<span class="badge badge-danger">Nghỉ việc</span>`
                      }
                    </td>
                    <td>
                      <div style="display:flex; gap:4px;">
                        <button class="btn btn-soft btn-sm" onclick="window.NPApp.openPhotoModal('${w.id}')">👁️</button>
                        <button class="btn btn-danger btn-sm" onclick="window.NPApp.openDeleteConfirmModal('WORKER', '${w.id}')">🗑️</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${workerPage.controls}
      </div>
    `;
  }

  function renderV2ExcelProAttendance() {
    const filtered = state.workers.filter(w => {
      if (filterProject !== 'ALL' && w.projectId !== filterProject) return false;
      if (filterTeam !== 'ALL' && w.teamId !== filterTeam) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!w.name.toLowerCase().includes(q) && !w.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const daysCols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    const attendancePage = paginateRows(filtered, 'excel-attendance');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">CHẤM CÔNG EXCEL PRO</span>
            <h3>Bảng Công Kỳ (${formatDateRangeLabel()})</h3>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-soft btn-sm" onclick="alert('Sẵn sàng nhận dữ liệu bảng công Excel!')">📥 Nhập Excel</button>
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.exportAttendanceCsv()">📤 Xuất Excel</button>
            <button class="btn btn-primary btn-sm" onclick="alert('Đã Khóa kỳ công ${formatDateRangeLabel()}!')">🔒 Khóa kỳ</button>
          </div>
        </div>

        <div class="filter-bar" style="margin-bottom:10px;">
          <select onchange="window.NPApp.setFilterProject(this.value)">
            <option value="ALL" ${filterProject === 'ALL' ? 'selected' : ''}>Công trình: Tất cả 3 Công trình</option>
            ${state.projects.map(p => `<option value="${p.id}" ${filterProject === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
          <select onchange="window.NPApp.setFilterTeam(this.value)">
            <option value="ALL" ${filterTeam === 'ALL' ? 'selected' : ''}>Đội: Tất cả 6 Đội</option>
            ${state.teams.map(t => `<option value="${t.id}" ${filterTeam === t.id ? 'selected' : ''}>${t.name} (${t.leader})</option>`).join('')}
          </select>
          <input type="text" placeholder="🔍 Tìm mã NV, họ tên..." value="${searchQuery}" oninput="window.NPApp.setSearch(this.value)" />
        </div>

        <div class="table-scroll np-excel-scroll" tabindex="0" role="region" aria-label="Bảng công theo ngày">
          <table class="data-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã NV</th>
                <th>Họ và tên</th>
                <th>Đội</th>
                ${daysCols.map(d => `<th style="text-align:center;">${String(d).padStart(2, '0')}</th>`).join('')}
                <th style="text-align:center;">Tổng giờ HC</th>
                <th style="text-align:center;">TC (giờ)</th>
              </tr>
            </thead>
            <tbody>
              ${attendancePage.rows.map((w, idx) => {
                let totalHours = 0;
                const cells = daysCols.map(d => {
                  const seed = (attendancePage.offset + idx + d * 3) % 13;
                  if (seed === 5) return `<td class="excel-cell excel-N">N</td>`;
                  if (seed === 9) { totalHours += 8; return `<td class="excel-cell excel-TC">TC</td>`; }
                  if (seed === 11) return `<td class="excel-cell excel-P">P</td>`;
                  totalHours += 8;
                  return `<td class="excel-cell excel-8">8</td>`;
                }).join('');
                return `
                  <tr>
                    <td>${attendancePage.offset + idx + 1}</td>
                    <td><strong><code>${w.code}</code></strong></td>
                    <td><strong>${w.name}</strong></td>
                    <td>${w.teamId}</td>
                    ${cells}
                    <td style="text-align:center; font-weight:800; color:#102D54;">${totalHours}</td>
                    <td style="text-align:center; font-weight:800; color:#F7931E;">${w.otHoursMonthApproved || 8}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${attendancePage.controls}

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; padding-top:8px; border-top:1px solid var(--ds-line); font-size:10.5px;">
          <span><strong class="excel-cell excel-8" style="display:inline-block; padding:1px 6px;">8</strong> : Công thường (8h)</span>
          <span><strong class="excel-cell excel-TC" style="display:inline-block; padding:1px 6px;">TC</strong> : Tăng ca</span>
          <span><strong class="excel-cell excel-N" style="display:inline-block; padding:1px 6px;">N</strong> : Nghỉ</span>
          <span><strong class="excel-cell excel-P" style="display:inline-block; padding:1px 6px;">P</strong> : Nghỉ phép</span>
          <span><strong class="excel-cell excel-Om" style="display:inline-block; padding:1px 6px;">Ôm</strong> : Nghỉ ốm</span>
        </div>
      </div>
    `;
  }

  function renderV2FinancePayables() {
    const paymentList = [
      { id: 1, team: 'Đội 01 – Riverside (ĐT1. Nguyễn Văn Sơn)', content: `Thanh toán kỳ ${formatDateRangeShortLabel()}`, amount: 167000000, status: 'Chờ duyệt' },
      { id: 2, team: 'Đội 02 – Riverside (ĐT2. Lê Hoàng Nam)', content: `Thanh toán kỳ ${formatDateRangeShortLabel()}`, amount: 145000000, status: 'Chờ duyệt' },
      { id: 3, team: 'Đội 03 – NP Tower (ĐT3. Vũ Đình Trọng)', content: 'Tạm ứng thi công M&E đợt 2', amount: 75000000, status: 'Chờ duyệt' },
      { id: 4, team: 'Đội 04 – NP Tower (ĐT4. Phan Thanh Hải)', content: `Thanh toán kỳ ${formatDateRangeShortLabel()}`, amount: 125000000, status: 'Đã duyệt' }
    ];

    const paymentPage = paginateRows(paymentList, 'payables');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">TÀI CHÍNH</span>
            <h3>Thanh Toán &amp; Công Nợ (${formatDateRangeLabel()})</h3>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.exportPayrollCsv()">📥 Xuất Excel</button>
          </div>
        </div>

        <div class="kpi-grid-4" style="margin-bottom:10px;">
          <div class="kpi-card" style="background:#EAF4FF; border-color:#C2DDFB;">
            <span class="kpi-label" style="color:#1976D2;">GIÁ TRỊ ĐỐI TÁC NGHIỆM THU</span>
            <div class="kpi-value" style="color:#1976D2;">620.000.000đ</div>
          </div>
          <div class="kpi-card" style="background:#FFF3E0; border-color:#FFE0B2;">
            <span class="kpi-label" style="color:#E65100;">CHI PHÍ ĐỘI THI CÔNG</span>
            <div class="kpi-value" style="color:#E65100;">512.000.000đ</div>
          </div>
          <div class="kpi-card" style="background:#F3E8FF; border-color:#E9D5FF;">
            <span class="kpi-label" style="color:#6B21A8;">ĐÃ TẠM ỨNG TRONG KỲ</span>
            <div class="kpi-value" style="color:#6B21A8;">75.000.000đ</div>
          </div>
          <div class="kpi-card" style="background:#EBF7EE; border-color:#C6E9CE;">
            <span class="kpi-label" style="color:#1E8E3E;">CÒN PHẢI TRẢ ĐỘI</span>
            <div class="kpi-value" style="color:#1E8E3E;">437.000.000đ</div>
          </div>
        </div>

        <div class="v2-filter-pills">
          <button class="v2-pill-tab active">Đề nghị thanh toán (3)</button>
          <button class="v2-pill-tab">Đã duyệt (8)</button>
          <button class="v2-pill-tab">Đã chuyển tiền (8)</button>
          <button class="v2-pill-tab">Công nợ (2)</button>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Đội / Công trình</th>
                <th>Nội dung</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${paymentPage.rows.map(item => `
                <tr>
                  <td><strong>${item.id}</strong></td>
                  <td><strong>${item.team}</strong></td>
                  <td>${item.content}</td>
                  <td><strong style="color:var(--ds-primary); font-size:12.5px;">${formatVND(item.amount)}</strong></td>
                  <td>
                    ${item.status === 'Chờ duyệt'
                      ? `<span class="badge badge-warning">Chờ duyệt</span>`
                      : `<span class="badge badge-success">✓ Đã duyệt</span>`
                    }
                  </td>
                  <td>
                    <div style="display:flex; gap:4px;">
                      <button class="btn btn-primary btn-sm" onclick="alert('Đã phê duyệt đề nghị thanh toán ${formatVND(item.amount)} cho ${item.team}!')">✓ Duyệt chi</button>
                      <button class="btn btn-soft btn-sm" onclick="window.NPApp.selectTab('${currentRoleId === 'BGD' ? 'bgd-approvals' : 'kt-advances'}')">👁️</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${paymentPage.controls}
      </div>
    `;
  }

  function renderBgdStaffCheck() {
    const staffList = state.staffAttendance || [];
    const staffPage = paginateRows(staffList, 'staff-time');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">CHẤM CÔNG CÁN BỘ</span>
            <h3>Kế Toán · Quản Lý CT · Đội Trưởng (${formatDateRangeLabel()})</h3>
          </div>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ảnh GPS</th>
                <th>Họ tên</th>
                <th>Vị trí</th>
                <th>Tài khoản &amp; PIN</th>
                <th>Giờ Vào / Ra</th>
                <th>Công kỳ</th>
                <th>Lương lũy kế</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${staffPage.rows.map(stf => {
                const thumb = getWorkerStampedPhoto(stf);
                const curPin = getAccountPinByUsernameOrCode(stf.username);
                const scaledDays = getScaledDaysWorked(stf.daysMonthApproved);
                const gross = scaledDays * stf.dailyWage + Math.round(stf.otHoursMonthApproved * (stf.dailyWage / 8) * 1.5);
                return `
                  <tr>
                    <td><img src="${thumb}" class="photo-thumb" loading="lazy" decoding="async" onclick="window.NPApp.openPhotoModal('${stf.id}')" /></td>
                    <td><strong>${stf.name}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${stf.code} · ${stf.teamName}</span></td>
                    <td><span class="badge ${stf.roleId === 'KT' ? 'badge-orange' : 'badge-navy'}">${stf.roleName}</span></td>
                    <td><code>${stf.username}</code> · PIN: <strong style="color:var(--ds-primary);"><code>${curPin}</code></strong></td>
                    <td><code>${stf.checkInTime}</code> - <code>${stf.checkOutTime || 'Đang làm'}</code></td>
                    <td><strong>${scaledDays} công</strong> (+${stf.otHoursMonthApproved}h)</td>
                    <td><strong style="color:var(--ds-primary);">${formatVND(gross)}</strong></td>
                    <td>${renderApprovalBadge(stf.approvalStatus)}</td>
                    <td>
                      <div style="display:flex; gap:4px;">
                        <button class="btn btn-primary btn-sm" onclick="window.NPApp.approveSingleWorker('${stf.id}')">✓ Duyệt</button>
                        <button class="btn btn-soft btn-sm" onclick="window.NPApp.openAdjustModal('${stf.id}')">✏️</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${staffPage.controls}
      </div>
    `;
  }

  function renderBgdApprovals() {
    const totalGross = state.workers.reduce((sum, w) => {
      const hourly = w.dailyWage / 8;
      return sum + (getScaledDaysWorked(w.daysMonthApproved) * w.dailyWage) + Math.round(w.otHoursMonthApproved * hourly * 1.5);
    }, 0);
    const totalAdv = state.advances.filter(a => a.status === 'BGD_DA_DUYET').reduce((s, a) => s + a.amount, 0);
    const delRequests = state.deleteRequests || [];

    const deletePage = paginateRows(delRequests, 'deletion-requests');
    const advancePage = paginateRows(state.advances, 'director-advances');

    return `
      <!-- PHÊ DUYỆT YÊU CẦU XÓA TÀI KHOẢN / NHÂN SỰ -->
      <section class="section-card np-approval np-approval-delete">
        <div class="section-header">
          <div>
            <h3>Yêu cầu xóa (${delRequests.filter(r => r.status === 'CHO_BGD_DONG_Y').length} chờ duyệt)</h3>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã YC</th>
                <th>Thời gian</th>
                <th>Loại</th>
                <th>Đối tượng xóa</th>
                <th>Chức vụ / Đội</th>
                <th>Người đề xuất</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${delRequests.length === 0 ? `
                <tr><td colspan="9" style="text-align:center; padding:14px; color:var(--ds-text-muted);">Không có yêu cầu xóa nào.</td></tr>
              ` : deletePage.rows.map(req => `
                <tr>
                  <td><strong>${req.id}</strong></td>
                  <td>${req.createdAt}</td>
                  <td><span class="badge ${req.targetType === 'ACCOUNT' ? 'badge-navy' : 'badge-orange'}">${req.targetType === 'ACCOUNT' ? 'Tài khoản' : 'Nhân sự'}</span></td>
                  <td><strong style="color:var(--ds-danger);">${req.targetName}</strong><br/><code>${req.targetCode}</code></td>
                  <td>${req.targetRole}</td>
                  <td><strong>${req.requestedBy}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${req.requestedRole}</span></td>
                  <td>${req.reason}</td>
                  <td>
                    ${req.status === 'CHO_BGD_DONG_Y'
                      ? `<span class="badge badge-warning">⏳ Chờ GĐ duyệt</span>`
                      : req.status === 'DA_XOA'
                        ? `<span class="badge badge-danger">✓ Đã xóa</span>`
                        : `<span class="badge badge-neutral">✕ Từ chối</span>`
                    }
                  </td>
                  <td>
                    ${req.status === 'CHO_BGD_DONG_Y' ? `
                      <div style="display:flex; gap:4px; flex-wrap:wrap;">
                        <button class="btn btn-danger btn-sm" onclick="window.NPApp.directorApproveDeleteRequest('${req.id}')">✓ Đồng ý</button>
                        <button class="btn btn-soft btn-sm" onclick="window.NPApp.directorRejectDeleteRequest('${req.id}')">✕ Từ chối</button>
                      </div>
                    ` : `<span style="font-size:10px; color:var(--ds-text-muted);">Đã xử lý</span>`}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${deletePage.controls}
      </section>

      <section class="section-card np-approval np-approval-payroll">
        <div class="section-header">
          <div>
            <h3>Tạm ứng &amp; bảng lương</h3><p class="np-approval-period">${formatDateRangeLabel()}</p>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            ${state.payrollMonthStatus === 'BGD_DA_DUYET'
              ? `<span class="badge badge-success">✓ ĐÃ DUYỆT BẢNG LƯƠNG</span>`
              : `<button class="btn btn-primary btn-sm" onclick="window.NPApp.approveMonthlyPayroll()">✍️ Duyệt Bảng Lương (${formatVND(totalGross - totalAdv)})</button>`
            }
          </div>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Người xin ứng</th>
                <th>Bộ phận</th>
                <th>Quản lý</th>
                <th>Công</th>
                <th>Lương lũy kế</th>
                <th>Số tiền ứng</th>
                <th>Kế toán</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${advancePage.rows.map(adv => {
                const person = state.workers.find(x => x.code === adv.workerCode) ||
                               (state.staffAttendance || []).find(s => s.code === adv.workerCode || s.username === adv.workerCode) ||
                               state.workers[0];
                let stBadge = '';
                if (adv.status === 'BGD_DA_DUYET') stBadge = `<span class="badge badge-success">✓ Đã duyệt</span>`;
                else if (adv.status === 'CHO_BGD_DUYET') stBadge = `<span class="badge badge-orange">⏳ Chờ GĐ</span>`;
                else stBadge = `<span class="badge badge-warning">Chờ KT</span>`;

                return `
                  <tr>
                    <td><strong>${adv.id}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${adv.date}</span></td>
                    <td><strong>${adv.workerName}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${adv.workerCode}</span></td>
                    <td>${adv.teamName || person.teamName}</td>
                    <td><strong style="color:var(--ds-primary);">${person.managerName || 'GĐ. Nguyễn Phát'}</strong></td>
                    <td><strong>${adv.daysWorkedSoFar || getScaledDaysWorked(person.daysMonthApproved)}c</strong></td>
                    <td><strong>${formatVND(adv.accruedSalary || adv.accruedSalaryAtRequest || (getScaledDaysWorked(person.daysMonthApproved) * person.dailyWage))}</strong></td>
                    <td><strong style="color:var(--ds-primary); font-size:12.5px;">${formatVND(adv.amount)}</strong><br/><span style="font-size:10px;">${adv.reason}</span></td>
                    <td>${adv.checkedByKt ? `<span class="badge badge-navy">✓ ${adv.checkedByKt}</span>` : `<span class="badge badge-neutral">Chưa KT</span>`}</td>
                    <td>${stBadge}</td>
                    <td>
                      ${adv.status !== 'BGD_DA_DUYET'
                        ? `<button class="btn btn-primary btn-sm" onclick="window.NPApp.advanceStep('${adv.id}', 'BGD')">✍️ Duyệt</button>`
                        : `<span style="font-size:10.5px; color:var(--ds-success); font-weight:700;">Đã duyệt</span>`
                      }
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${advancePage.controls}
      </section>
    `;
  }

  function renderBgdAudit() {
    const auditPage = paginateRows(state.auditLogs, 'audit');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">NHẬT KÝ HỆ THỐNG</span>
            <h3>Lịch Sử Sửa Giờ Công &amp; Đổi Mật Khẩu</h3>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã Log</th>
                <th>Thời gian</th>
                <th>Nhân sự</th>
                <th>Người thực hiện</th>
                <th>Hạng mục</th>
                <th>Cũ → Mới</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              ${auditPage.rows.map(log => `
                <tr>
                  <td><strong>${log.id}</strong></td>
                  <td>${log.timestamp}</td>
                  <td><strong>${log.workerName}</strong> (${log.workerCode})</td>
                  <td><span class="badge badge-navy">${log.actorRole || log.actor || ''}: ${log.actorName || ''}</span></td>
                  <td>${log.field}</td>
                  <td><code style="color:var(--ds-danger);">${log.oldVal || log.oldValue}</code> → <code style="color:var(--ds-success); font-weight:700;">${log.newVal || log.newValue}</code></td>
                  <td>${log.reason}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${auditPage.controls}
      </div>
    `;
  }

  // =================================================================================================
  // II. GIAO DIỆN CẤP 2: HÀNH CHÍNH – KẾ TOÁN (CÓ CHẤM CÔNG, CÓ BẢNG KÊ RIÊNG, CHECK CÔNG TOÀN CÔNG TY)
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

    const attendancePage = paginateRows(filtered, 'company-attendance');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">BẢNG CÔNG TOÀN CÔNG TY</span>
            <h3>Chấm Công Theo Quản Lý &amp; Đội (${formatDateRangeLabel()})</h3>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.exportAttendanceCsv()">📥 Xuất Excel (.CSV)</button>
          </div>
        </div>

        <div class="filter-bar" style="margin-bottom:10px;">
          <input type="text" placeholder="🔍 Tìm tên, mã NV, quản lý..." value="${searchQuery}" oninput="window.NPApp.setSearch(this.value)" />
          <select onchange="window.NPApp.setFilterManager(this.value)">
            <option value="ALL" ${filterManager === 'ALL' ? 'selected' : ''}>Tất cả Quản lý CT</option>
            ${managers.map(m => `<option value="${m.username}" ${filterManager === m.username ? 'selected' : ''}>${m.name} (${m.project})</option>`).join('')}
          </select>
          <select onchange="window.NPApp.setFilterTeam(this.value)">
            <option value="ALL" ${filterTeam === 'ALL' ? 'selected' : ''}>Tất cả Đội</option>
            ${state.teams.map(t => `<option value="${t.id}" ${filterTeam === t.id ? 'selected' : ''}>${t.name} — ${t.leader}</option>`).join('')}
          </select>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ảnh GPS</th>
                <th>Mã NV</th>
                <th>Họ và Tên</th>
                <th>Đội trưởng</th>
                <th>Quản lý CT</th>
                <th>Giờ Vào - Ra</th>
                <th>Công kỳ</th>
                <th>OT</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${attendancePage.rows.map(w => {
                const thumb = getWorkerStampedPhoto(w);
                const scaledD = getScaledDaysWorked(w.daysMonthApproved);
                return `
                  <tr>
                    <td><img src="${thumb}" class="photo-thumb" loading="lazy" decoding="async" onclick="window.NPApp.openPhotoModal('${w.id}')" /></td>
                    <td><strong>${w.code}</strong></td>
                    <td><strong>${w.name}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${w.roleName}</span></td>
                    <td><strong>${w.leaderName}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${w.teamName}</span></td>
                    <td><span class="badge badge-navy">${w.managerName}</span></td>
                    <td>${w.checkInTime ? `<code>${w.checkInTime}</code> - <code>${w.checkOutTime || 'Đang làm'}</code>` : `<span class="badge badge-danger">Vắng</span>`}</td>
                    <td><strong style="color:var(--ds-primary); font-size:12.5px;">${scaledD} công</strong></td>
                    <td><strong>${w.otHoursMonthApproved}h</strong></td>
                    <td>${renderApprovalBadge(w.approvalStatus)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${attendancePage.controls}
      </div>
    `;
  }

  function renderKtAdvances() {
    const advancePage = paginateRows(state.advances, 'accounting-advances');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">QUẢN LÝ TẠM ỨNG</span>
            <h3>Đơn Xin Ứng Lương</h3>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.openPersonalAdvanceModal()">💳 + Ứng lương</button>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Người xin ứng</th>
                <th>Bộ phận</th>
                <th>Quản lý</th>
                <th>Công</th>
                <th>Lương lũy kế</th>
                <th>Số tiền ứng</th>
                <th>Tỷ lệ</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${advancePage.rows.map(adv => {
                const w = state.workers.find(x => x.code === adv.workerCode) ||
                          (state.staffAttendance || []).find(s => s.code === adv.workerCode || s.username === adv.workerCode) ||
                          state.workers[0];
                const accSal = adv.accruedSalary || adv.accruedSalaryAtRequest || (getScaledDaysWorked(w.daysMonthApproved) * w.dailyWage);
                const daysW = adv.daysWorkedSoFar || getScaledDaysWorked(w.daysMonthApproved);
                const ratio = Math.round((adv.amount / Math.max(1, accSal)) * 100);
                return `
                  <tr>
                    <td><strong>${adv.id}</strong><br/><span style="font-size:10px;">${adv.date}</span></td>
                    <td><strong>${adv.workerName}</strong> (${adv.workerCode})</td>
                    <td>${adv.teamName || w.teamName}</td>
                    <td><strong style="color:var(--ds-primary);">${w.managerName}</strong></td>
                    <td><strong>${daysW}c</strong></td>
                    <td><strong>${formatVND(accSal)}</strong></td>
                    <td><strong style="color:var(--ds-primary);">${formatVND(adv.amount)}</strong><br/><span style="font-size:10px;">${adv.reason}</span></td>
                    <td><span class="badge ${ratio <= 70 ? 'badge-success' : 'badge-warning'}">${ratio}%</span></td>
                    <td>
                      ${adv.status === 'CHO_KT_KIEM_TRA'
                        ? `<span class="badge badge-orange">⏳ Chờ KT</span>`
                        : adv.status === 'CHO_BGD_DUYET'
                          ? `<span class="badge badge-navy">Trình GĐ</span>`
                          : `<span class="badge badge-success">✓ Đã duyệt</span>`
                      }
                    </td>
                    <td>
                      ${adv.status === 'CHO_KT_KIEM_TRA'
                        ? `<button class="btn btn-primary btn-sm" onclick="window.NPApp.advanceStep('${adv.id}', 'KT')">✓ Trình GĐ</button>`
                        : `<span style="font-size:10.5px; color:var(--ds-success); font-weight:600;">✓ Đã duyệt</span>`
                      }
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${advancePage.controls}
      </div>
    `;
  }

  function renderKtPayroll() {
    const filtered = state.workers.filter(w => {
      if (filterManager !== 'ALL' && w.managerUsername !== filterManager) return false;
      return true;
    });

    const payrollPage = paginateRows(filtered, 'payroll');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">BẢNG LƯƠNG (${formatDateRangeLabel()})</span>
            <h3>Tổng Hợp Tính Lương</h3>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <select onchange="window.NPApp.setFilterManager(this.value)" style="padding:4px 8px; border-radius:999px; border:1px solid var(--ds-line); font-size:11px;">
              <option value="ALL" ${filterManager === 'ALL' ? 'selected' : ''}>Tất cả Quản lý CT</option>
              <option value="qlct_ct1" ${filterManager === 'qlct_ct1' ? 'selected' : ''}>CT1: KS. Trần Minh Hoàng</option>
              <option value="qlct_ct2" ${filterManager === 'qlct_ct2' ? 'selected' : ''}>CT2: KS. Phạm Quốc Bảo</option>
              <option value="qlct_ct3" ${filterManager === 'qlct_ct3' ? 'selected' : ''}>CT3: KS. Đặng Văn Hùng</option>
            </select>
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.exportPayrollCsv()">📥 Xuất Excel (.CSV)</button>
          </div>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và Tên</th>
                <th>Quản lý &amp; Đội</th>
                <th>Đơn giá</th>
                <th>Công kỳ</th>
                <th>Lương chính</th>
                <th>Lương OT</th>
                <th>Tạm ứng</th>
                <th>Thực lĩnh</th>
                <th>Phiếu</th>
              </tr>
            </thead>
            <tbody>
              ${payrollPage.rows.map(w => {
                const scaledD = getScaledDaysWorked(w.daysMonthApproved);
                const hourly = w.dailyWage / 8;
                const basePay = scaledD * w.dailyWage;
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
                    <td><strong>${scaledD} công</strong></td>
                    <td>${formatVND(basePay)}</td>
                    <td>${formatVND(otPay)} (${w.otHoursMonthApproved}h)</td>
                    <td style="color:var(--ds-danger); font-weight:600;">-${formatVND(adv)}</td>
                    <td><strong style="color:var(--ds-primary); font-size:12.5px;">${formatVND(net)}</strong></td>
                    <td><button class="btn btn-soft btn-sm" onclick="window.NPApp.openPayslipModal('${w.id}')">Phiếu</button></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${payrollPage.controls}
      </div>
    `;
  }

  function renderKtHierarchyDirectory() {
    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">SƠ ĐỒ TỔ CHỨC</span>
            <h3>Cây Nhân Sự Công Trình &amp; Tổ Đội</h3>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.expandAllHierarchyTeams(true)">📂 Mở tất cả</button>
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.expandAllHierarchyTeams(false)">📁 Thu gọn</button>
          </div>
        </div>
        <div class="grid-3">
          ${state.projects.map(p => {
            const pTeams = state.teams.filter(t => t.projectId === p.id);
            const pWorkers = state.workers.filter(w => w.projectId === p.id);
            const mgrPin = getAccountPinByUsernameOrCode(p.managerUsername);
            return `
              <div class="hierarchy-card">
                <span class="kicker">${p.id} · ${pWorkers.length} NHÂN SỰ</span>
                <h4>👷 ${p.manager} (<code>${p.managerUsername}</code> · PIN: <code>${mgrPin}</code>)</h4>
                <div style="font-size:11px; color:var(--ds-text-muted); margin-bottom:8px;">${p.name}</div>
                ${pTeams.map(tm => {
                  const tmWorkers = pWorkers.filter(w => w.teamId === tm.id);
                  const teamPage = paginateRows(tmWorkers, 'members-' + tm.id);
                  const dtPin = getAccountPinByUsernameOrCode(tm.leaderUsername);
                  const isOpen = !!expandedTeams[tm.id];
                  return `
                    <div style="border:1.5px solid ${isOpen ? 'var(--ds-accent)' : 'var(--ds-line)'}; border-radius:var(--ds-radius-sm); background:#FFFFFF; margin-bottom:6px; overflow:hidden;">
                      <div style="padding:8px; cursor:pointer; background:${isOpen ? 'var(--ds-bg-soft)' : '#FFFFFF'};" onclick="window.NPApp.toggleTeamHierarchy('${tm.id}')">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                          <div style="font-weight:700; color:var(--ds-primary); font-size:11.5px;">${isOpen ? '📂' : '📁'} ${tm.name} — ${tm.leader}</div>
                          <span class="badge ${isOpen ? 'badge-orange' : 'badge-navy'}">${tmWorkers.length} ${isOpen ? '▴' : '▾'}</span>
                        </div>
                        <div style="font-size:10.5px; color:var(--ds-text-muted); margin:2px 0;">TK: <code>${tm.leaderUsername}</code> · PIN: <code>${dtPin}</code></div>
                      </div>
                      ${isOpen ? `
                        <div style="border-top:1px solid var(--ds-line); padding:6px; max-height:240px; overflow-y:auto;">
                          <table class="data-table" style="font-size:10px;">
                            <thead>
                              <tr><th>#</th><th>Mã &amp; PIN</th><th>Họ tên</th><th>Công</th></tr>
                            </thead>
                            <tbody>
                              ${teamPage.rows.map((w, idx) => `
                                <tr>
                                  <td>${teamPage.offset + idx + 1}</td>
                                  <td><code>${w.code}</code> · <code>${getAccountPinByUsernameOrCode(w.code)}</code></td>
                                  <td><strong>${w.name}</strong></td>
                                  <td><strong>${getScaledDaysWorked(w.daysMonthApproved)}c</strong></td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>
                        </div>
                        ${teamPage.controls}
                      ` : ''}
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
  // III. GIAO DIỆN CẤP 3: QUẢN LÝ CÔNG TRÌNH (CHECK & DUYỆT CÔNG, CHẤM CÔNG CỦA MÌNH, ỨNG LƯƠNG, XEM MK CẤP DƯỚI)
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

    const approvalPage = paginateRows(filtered, 'attendance-approval');

    const forgotPage = paginateRows(forgotList, 'checkout-alerts');

    return `
      <div class="kpi-grid-4">
        <div class="kpi-card">
          <div>
            <span class="kpi-label">QUÂN SỐ ${prj.id}</span>
            <div class="kpi-value">${present}<span class="unit">/${myWorkers.length}</span></div>
          </div>
          <div class="kpi-sub">${myTeams.length} Đội thi công</div>
        </div>
        <div class="kpi-card">
          <div>
            <span class="kpi-label">CHỜ DUYỆT CÔNG</span>
            <div class="kpi-value" style="color:var(--ds-accent);">${unapproved}<span class="unit">ca</span></div>
          </div>
          <div class="kpi-sub">Đội trưởng đã gửi</div>
        </div>
        <div class="kpi-card">
          <div>
            <span class="kpi-label">KỲ LỌC NGÀY</span>
            <div class="kpi-value" style="font-size:13.5px;">${formatDateRangeLabel()}</div>
          </div>
          <div class="kpi-sub">${prj.name}</div>
        </div>
        <div class="kpi-card">
          <div>
            <span class="kpi-label">ĐỘI TRƯỞNG</span>
            <div class="kpi-value">${myTeams.length}<span class="unit">đội</span></div>
          </div>
          <div class="kpi-sub">${myTeams.map(t => t.leader).join(' · ')}</div>
        </div>
      </div>

      ${forgotList.length > 0 ? `
        <div class="section-card" style="border-color:var(--ds-accent); background:var(--ds-warning-bg);">
          <div class="section-header" style="border-bottom-color:rgba(154,91,0,0.2);">
            <div>
              <span class="kicker">CẢNH BÁO QUÊN CHECK-OUT</span>
              <h3>${forgotList.length} Công Nhân Chưa Check-out Lúc 17:30</h3>
            </div>
          </div>
          <div style="display:grid; gap:6px;">
            ${forgotPage.rows.map(w => `
              <div style="display:flex; justify-content:space-between; align-items:center; background:#FFFFFF; padding:8px 10px; border-radius:var(--ds-radius-sm); border:1px solid var(--ds-line); flex-wrap:wrap; gap:6px;">
                <div style="min-width:0; word-break:break-word;">
                  <strong>${w.name} (${w.code})</strong> · ${w.teamName} · Vào: <code>${w.checkInTime}</code>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                  <button class="btn btn-soft btn-sm" onclick="window.NPApp.confirmForgotCheckout('${w.id}', 0)">Chốt 8h (0h OT)</button>
                  <button class="btn btn-primary btn-sm" onclick="window.NPApp.confirmForgotCheckout('${w.id}', 2)">Tăng ca (+2h OT)</button>
                </div>
              </div>
            `).join('')}
          </div>
          ${forgotPage.controls}
        </div>
      ` : ''}

      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">DUYỆT CHẤM CÔNG · ${prj.name.toUpperCase()}</span>
            <h3>Bảng Duyệt Công (${myWorkers.length} Nhân Sự)</h3>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.approveAllVisible()">✅ Duyệt tất cả</button>
          </div>
        </div>

        <div class="filter-bar" style="margin-bottom:10px;">
          <input type="text" placeholder="🔍 Tìm công nhân..." value="${searchQuery}" oninput="window.NPApp.setSearch(this.value)" />
          <select onchange="window.NPApp.setFilterTeam(this.value)">
            <option value="ALL" ${filterTeam === 'ALL' ? 'selected' : ''}>Tất cả Đội (${prj.id})</option>
            ${myTeams.map(t => `<option value="${t.id}" ${filterTeam === t.id ? 'selected' : ''}>${t.name} — ${t.leader}</option>`).join('')}
          </select>
          <select onchange="window.NPApp.setFilterStatus(this.value)">
            <option value="ALL" ${filterStatus === 'ALL' ? 'selected' : ''}>Tất cả trạng thái</option>
            <option value="UNAPPROVED" ${filterStatus === 'UNAPPROVED' ? 'selected' : ''}>Chờ duyệt (${unapproved})</option>
          </select>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ảnh GPS</th>
                <th>Họ tên</th>
                <th>Đội trưởng</th>
                <th>Công việc</th>
                <th>Giờ Vào - Ra</th>
                <th>Công kỳ</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${approvalPage.rows.map(w => {
                const thumb = getWorkerStampedPhoto(w);
                const scaledD = getScaledDaysWorked(w.daysMonthApproved);
                return `
                  <tr>
                    <td>
                      <img src="${thumb}" class="photo-thumb" loading="lazy" decoding="async" onclick="window.NPApp.openPhotoModal('${w.id}')" />
                    </td>
                    <td><strong>${w.name}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${w.code} · ${w.roleName}</span></td>
                    <td><strong>${w.leaderName}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${w.teamName}</span></td>
                    <td><span style="font-size:11px;">${w.assignedTaskToday || 'Thi công theo đội'}</span></td>
                    <td>
                      ${w.checkInTime ? `<code>${w.checkInTime}</code> - <code>${w.checkOutTime || 'Đang làm'}</code>` : `<span class="badge badge-danger">Vắng</span>`}
                    </td>
                    <td><strong>${scaledD} công</strong><br/><span style="font-size:10px; color:var(--ds-accent);">OT: +${w.hoursOtActual || 0}h</span></td>
                    <td>${renderApprovalBadge(w.approvalStatus)}</td>
                    <td>
                      <div style="display:flex; gap:4px; flex-wrap:wrap;">
                        ${w.approvalStatus !== 'DA_DUYET'
                          ? `<button class="btn btn-primary btn-sm" onclick="window.NPApp.approveSingleWorker('${w.id}')">✓ Duyệt</button>`
                          : `<span class="badge badge-neutral">Đã khóa</span>`
                        }
                        <button class="btn btn-soft btn-sm" onclick="window.NPApp.openAdjustModal('${w.id}')">✏️</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${approvalPage.controls}
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
            <span class="kicker">PHÂN VIỆC · ${prj.id}</span>
            <h3>Giao Nhiệm Vụ Cho Đội Trưởng</h3>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.openAssignTaskModal()">
            + Giao nhiệm vụ
          </button>
        </div>

        <div class="grid-2">
          ${myTeams.map(tm => {
            const tmTasks = myTasks.filter(x => x.teamId === tm.id);
            const taskPage = paginateRows(tmTasks, 'project-tasks-' + tm.id);
            const tmWorkers = state.workers.filter(w => w.teamId === tm.id);
            const dtPin = getAccountPinByUsernameOrCode(tm.leaderUsername);
            return `
              <div class="hierarchy-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span class="kicker">${tm.id} · ${tmWorkers.length} NGƯỜI</span>
                  <span class="badge badge-navy">${tm.leader}</span>
                </div>
                <h4>${tm.name}</h4>
                <div style="font-size:11px; color:var(--ds-text-muted); margin-top:2px;">SĐT: ${tm.phone} · TK: <code>${tm.leaderUsername}</code> · PIN: <code>${dtPin}</code></div>

                <div style="margin-top:8px;">
                  ${taskPage.rows.map(tsk => `
                    <div style="padding:8px 10px; background:#FFFFFF; border:1px solid var(--ds-line); border-radius:var(--ds-radius-sm); margin-bottom:6px;">
                      <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="color:var(--ds-primary); font-size:12px;">📌 ${tsk.title}</strong>
                        <span class="badge badge-success">${tsk.progressPercent}%</span>
                      </div>
                      <div style="font-size:10.5px; color:var(--ds-text-muted); margin-top:4px;">
                        Quân số: <strong>${tsk.requiredWorkers} người</strong> · OT: <strong>+${tsk.allowOvertimeHours}h</strong> · ${tsk.date}
                      </div>
                    </div>
                  `).join('')}
                </div>
                ${taskPage.controls}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderQlctStaff() {
    const acc = getCurrentAccount();
    const myWorkers = getScopedWorkersForCurrentAccount();

    const staffPage = paginateRows(myWorkers, 'project-personnel');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">NHÂN SỰ CÔNG TRÌNH</span>
            <h3>Danh Sách Nhân Sự Dưới Quyền (${myWorkers.length})</h3>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.openAddWorkerModal()">+ Thêm nhân sự</button>
          </div>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>PIN</th>
                <th>Họ và Tên</th>
                <th>Tổ đội</th>
                <th>Đội trưởng</th>
                <th>Lương ngày</th>
                <th>Công kỳ</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${staffPage.rows.map(w => {
                const pin = getAccountPinByUsernameOrCode(w.code);
                const scaledD = getScaledDaysWorked(w.daysMonthApproved);
                const pendingDel = (state.deleteRequests || []).find(r => r.targetCode === w.code && r.status === 'CHO_BGD_DONG_Y');
                return `
                  <tr>
                    <td><strong><code>${w.code}</code></strong></td>
                    <td><strong style="color:var(--ds-primary);"><code>${pin}</code></strong></td>
                    <td><strong>${w.name}</strong></td>
                    <td>${w.roleName} · <strong>${w.teamName}</strong></td>
                    <td>${w.leaderName}</td>
                    <td><strong>${formatVND(w.dailyWage)}</strong></td>
                    <td><strong>${scaledD} công</strong> (+${w.otHoursMonthApproved}h)</td>
                    <td>
                      ${pendingDel
                        ? `<span class="badge badge-warning">⏳ Chờ GĐ</span>`
                        : `<button class="btn btn-danger btn-sm" onclick="window.NPApp.openDeleteConfirmModal('WORKER', '${w.id}')">🗑️ Xóa</button>`
                      }
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${staffPage.controls}
      </div>
    `;
  }

  function renderQlctSummary() {
    const acc = getCurrentAccount();
    const prj = getProject(acc.projectId);
    const myWorkers = getScopedWorkersForCurrentAccount();

    const summaryPage = paginateRows(myWorkers, 'project-summary');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">TỔNG KẾT CÔNG · ${prj.id}</span>
            <h3>Tổng Kết Ngày Công (${formatDateRangeLabel()})</h3>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và Tên</th>
                <th>Đội</th>
                <th>T2</th>
                <th>T3</th>
                <th>T4</th>
                <th>T5</th>
                <th>T6</th>
                <th>T7</th>
                <th>CN</th>
                <th>Tổng Công</th>
                <th>Tổng OT</th>
              </tr>
            </thead>
            <tbody>
              ${summaryPage.rows.map(w => `
                <tr>
                  <td><strong>${w.code}</strong></td>
                  <td><strong>${w.name}</strong></td>
                  <td>${w.teamName}</td>
                  ${(w.weekDays || [1, 1, 1, 1, 1, 1, 0]).map(d => `<td style="text-align:center; font-weight:700; color:${d > 0 ? 'var(--ds-success)' : 'var(--ds-text-muted)'};">${d}</td>`).join('')}
                  <td><strong style="color:var(--ds-primary);">${getScaledDaysWorked(w.daysMonthApproved)} công</strong></td>
                  <td><strong>${w.otHoursMonthApproved}h</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${summaryPage.controls}
      </div>
    `;
  }

  // =================================================================================================
  // IV. GIAO DIỆN CẤP 4: ĐỘI TRƯỞNG THI CÔNG (CHECK & ĐIỂM DANH ĐỘI, BẢNG KÊ RIÊNG, ỨNG LƯƠNG, XEM MK ĐỘI)
  // =================================================================================================
  function renderDtCheckin() {
    const acc = getCurrentAccount();
    const tm = getTeam(acc.teamId);
    const teamWorkers = getScopedWorkersForCurrentAccount();
    const present = teamWorkers.filter(w => w.attendanceStatus === 'DANG_LAM' || w.attendanceStatus === 'DA_RA').length;
    const leaveCount = teamWorkers.length - present;
    const otCount = teamWorkers.filter(w => (w.hoursOtRegistered || 0) > 0).length;

    const workerPage = paginateRows(teamWorkers, 'team-checkin');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">ĐỘI TRƯỞNG · ${tm.projectId}</span>
            <h3>${tm.name} (${teamWorkers.length} công nhân)</h3>
          </div>
        </div>

        <div class="dt-quick-grid-6">
          <div class="dt-quick-tile" onclick="window.NPApp.openUnifiedCheckinMenu(null)">
            <div class="tile-ico">📅</div>
            <span>Chấm công</span>
          </div>
          <div class="dt-quick-tile" onclick="window.NPApp.selectTab('dt-members')">
            <div class="tile-ico">👥</div>
            <span>Nhân sự (${teamWorkers.length})</span>
          </div>
          <div class="dt-quick-tile" onclick="window.NPApp.selectTab('dt-tasks')">
            <div class="tile-ico">📋</div>
            <span>Hiện trường</span>
          </div>
          <div class="dt-quick-tile" onclick="window.NPApp.openPersonalAdvanceModal()">
            <div class="tile-ico">💳</div>
            <span>Tạm ứng</span>
          </div>
          <div class="dt-quick-tile" onclick="window.NPApp.selectTab('dt-tasks')">
            <div class="tile-ico">📦</div>
            <span>Khối lượng</span>
          </div>
          <div class="dt-quick-tile" onclick="window.NPApp.selectTab('dt-my-statement')">
            <div class="tile-ico">☑️</div>
            <span>Đối chiếu</span>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; text-align:center; background:var(--ds-bg-soft); padding:8px; border-radius:8px; border:1px solid var(--ds-line);">
          <div>
            <div style="font-size:16px; font-weight:800; color:#1E8E3E;">${present}</div>
            <div style="font-size:10px; font-weight:600; color:#5B6678;">🟢 Có mặt</div>
          </div>
          <div>
            <div style="font-size:16px; font-weight:800; color:#C0392B;">${leaveCount}</div>
            <div style="font-size:10px; font-weight:600; color:#5B6678;">🔴 Nghỉ</div>
          </div>
          <div>
            <div style="font-size:16px; font-weight:800; color:#7E57C2;">${otCount}</div>
            <div style="font-size:10px; font-weight:600; color:#5B6678;">🟣 Tăng ca</div>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">CHẤM CÔNG ĐỘI</span>
            <h3>Danh Sách ${teamWorkers.length} Công Nhân</h3>
          </div>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ảnh GPS</th>
                <th>Họ tên</th>
                <th>Vai trò</th>
                <th>Công việc</th>
                <th>Giờ Vào - Ra</th>
                <th>Công kỳ</th>
                <th>Trạng thái</th>
                <th>Chấm công</th>
              </tr>
            </thead>
            <tbody>
              ${workerPage.rows.map(w => {
                const thumb = getWorkerStampedPhoto(w);
                return `
                  <tr>
                    <td>
                      <img src="${thumb}" class="photo-thumb" loading="lazy" decoding="async" onclick="window.NPApp.openPhotoModal('${w.id}')" />
                    </td>
                    <td><strong>${w.name}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${w.code}</span></td>
                    <td>${w.roleName}</td>
                    <td><strong>${w.assignedTaskToday || tm.dailyTargetTask}</strong></td>
                    <td>
                      ${w.checkInTime ? `<code>${w.checkInTime}</code> - <code>${w.checkOutTime || 'Đang làm'}</code>` : `<span class="badge badge-danger">Chưa điểm danh</span>`}
                    </td>
                    <td><strong>${getScaledDaysWorked(w.daysMonthApproved)} công</strong></td>
                    <td>${renderApprovalBadge(w.approvalStatus)}</td>
                    <td>
                      <button class="btn btn-primary btn-sm" onclick="window.NPApp.openUnifiedCheckinMenu('${w.id}')">📸 Chấm công</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${workerPage.controls}
      </div>
    `;
  }

  function renderDtTasks() {
    const acc = getCurrentAccount();
    const tm = getTeam(acc.teamId);
    const teamWorkers = getScopedWorkersForCurrentAccount();
    const teamTasks = (state.tasks || []).filter(tsk => tsk.teamId === tm.id);

    const workerPage = paginateRows(teamWorkers, 'team-work');

    const taskPage = paginateRows(teamTasks, 'team-tasks');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">NHIỆM VỤ ĐỘI</span>
            <h3>Hạng Mục Thi Công — ${tm.name}</h3>
          </div>
        </div>
        <div>
          ${taskPage.rows.map(tsk => `
          <div style="padding:10px 12px; background:var(--ds-bg-soft); border:1px solid var(--ds-line); border-left:4px solid var(--ds-accent); border-radius:var(--ds-radius-md); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <div style="font-size:10px; font-weight:700; color:var(--ds-primary);">${tsk.assignedBy.toUpperCase()} · ${tsk.date}</div>
              <div style="font-size:13.5px; font-weight:700; color:var(--ds-primary); margin-top:2px;">📌 ${tsk.title}</div>
              <div style="font-size:11px; color:var(--ds-text-muted); margin-top:2px;">
                Quân số: <strong>${tsk.requiredWorkers} người</strong> · OT tối đa: <strong>+${tsk.allowOvertimeHours}h</strong>
              </div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <span class="badge badge-success">${tsk.progressPercent}%</span>
              <button class="btn btn-primary btn-sm" onclick="window.NPApp.updateTeamTaskProgress('${tsk.id}')">📈 Cập nhật tiến độ</button>
            </div>
          </div>
          `).join('')}
        </div>
        ${taskPage.controls}
      </div>

      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">PHÂN CÔNG &amp; TĂNG CA</span>
            <h3>Giao Việc &amp; Báo Tăng Ca</h3>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và Tên</th>
                <th>Công việc</th>
                <th>Giờ HC</th>
                <th>OT</th>
                <th>Công tích lũy</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${workerPage.rows.map(w => `
                <tr>
                  <td><strong>${w.code}</strong></td>
                  <td><strong>${w.name}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${w.roleName}</span></td>
                  <td><strong>${w.assignedTaskToday || tm.dailyTargetTask}</strong></td>
                  <td>${w.hoursRegular || 8}h</td>
                  <td>${w.hoursOtRegistered > 0 ? `<span class="badge badge-orange">+${w.hoursOtRegistered}h</span>` : `<span class="badge badge-neutral">0h</span>`}</td>
                  <td><strong>${getScaledDaysWorked(w.daysMonthApproved)} công</strong> (+${w.otHoursMonthApproved}h)</td>
                  <td>
                    <div style="display:flex; gap:4px;">
                      <button class="btn btn-soft btn-sm" onclick="window.NPApp.openWorkerTaskModal('${w.id}')">🛠️ Giao việc</button>
                      <button class="btn btn-primary btn-sm" onclick="window.NPApp.openOtModal('${w.id}')">⏱️ Tăng ca</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${workerPage.controls}
      </div>
    `;
  }

  function renderDtMembers() {
    const acc = getCurrentAccount();
    const tm = getTeam(acc.teamId);
    const teamWorkers = getScopedWorkersForCurrentAccount();

    const workerPage = paginateRows(teamWorkers, 'team-members');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">NHÂN SỰ ĐỘI · ${tm.name.toUpperCase()}</span>
            <h3>Danh Sách ${teamWorkers.length} Công Nhân</h3>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.openAddWorkerModal()">+ Thêm công nhân</button>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>PIN</th>
                <th>Họ và Tên</th>
                <th>Vai trò</th>
                <th>SĐT</th>
                <th>Quản lý CT</th>
                <th>Công kỳ</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${workerPage.rows.map(w => {
                const pin = getAccountPinByUsernameOrCode(w.code);
                const pendingDel = (state.deleteRequests || []).find(r => r.targetCode === w.code && r.status === 'CHO_BGD_DONG_Y');
                return `
                  <tr>
                    <td><strong><code>${w.code}</code></strong></td>
                    <td><strong style="color:var(--ds-primary);"><code>${pin}</code></strong></td>
                    <td><strong>${w.name}</strong></td>
                    <td>${w.roleName}</td>
                    <td>${w.phone}</td>
                    <td><span class="badge badge-navy">${w.managerName}</span></td>
                    <td><strong style="color:var(--ds-primary);">${getScaledDaysWorked(w.daysMonthApproved)} công</strong> (+${w.otHoursMonthApproved}h)</td>
                    <td>
                      ${pendingDel
                        ? `<span class="badge badge-warning">⏳ Chờ GĐ</span>`
                        : `<button class="btn btn-danger btn-sm" onclick="window.NPApp.openDeleteConfirmModal('WORKER', '${w.id}')">🗑️ Xóa</button>`
                      }
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${workerPage.controls}
      </div>
    `;
  }

  function renderCnPersonalHistory() {
    const w = getMyOwnAttendanceRecord();
    const daysList = [];
    for (let d = dateRange.endDay; d >= dateRange.startDay; d--) {
      const isSun = (new Date(dateRange.year, dateRange.month - 1, d).getDay() === 0);
      const ot = (d % 3 === 0) ? 2 : 0;
      daysList.push({
        date: `${String(d).padStart(2, '0')}/${String(dateRange.month).padStart(2, '0')}/${dateRange.year}`,
        dayLabel: isSun ? 'Chủ nhật (x2.0)' : 'Ngày thường (x1.0)',
        inTime: '06:58:12',
        outTime: ot > 0 ? '19:30:05' : '17:30:00',
        workDay: 1.0,
        otHours: ot,
        approvedBy: w.managerName,
        task: w.assignedTaskToday
      });
    }

    const historyPage = paginateRows(daysList, 'personal-history');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">NHẬT KÝ CHẤM CÔNG · ${w.code}</span>
            <h3>Chi Tiết Ngày Công (${formatDateRangeLabel()})</h3>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Loại công</th>
                <th>Công việc</th>
                <th>Vào - Ra</th>
                <th>Số công</th>
                <th>OT</th>
                <th>Người duyệt</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${historyPage.rows.map(item => `
                <tr>
                  <td><strong>${item.date}</strong></td>
                  <td>${item.dayLabel}</td>
                  <td>${item.task}</td>
                  <td><code>${item.inTime}</code> → <code>${item.outTime}</code></td>
                  <td><strong style="color:var(--ds-primary);">${item.workDay} công</strong></td>
                  <td>${item.otHours > 0 ? `<span class="badge badge-orange">+${item.otHours}h</span>` : '0h'}</td>
                  <td><strong>${item.approvedBy}</strong></td>
                  <td><span class="badge badge-success">✓ Đã duyệt</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${historyPage.controls}
      </div>
    `;
  }

  function renderCnPersonalRequests() {
    const w = getMyOwnAttendanceRecord();
    const myAdvances = state.advances.filter(a => a.workerCode === w.code);

    const advancePage = paginateRows(myAdvances, 'worker-advances');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">ĐƠN TỪ CÁ NHÂN · ${w.code}</span>
            <h3>Ứng Lương &amp; Nghỉ Phép</h3>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.openPersonalAdvanceModal()">+ Ứng lương</button>
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.openPersonalLeaveModal()">+ Nghỉ phép</button>
          </div>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Ngày</th>
                <th>Công</th>
                <th>Lương lũy kế</th>
                <th>Số tiền ứng</th>
                <th>Lý do</th>
                <th>Kế toán</th>
                <th>Giám đốc</th>
              </tr>
            </thead>
            <tbody>
              ${myAdvances.length === 0 ? `
                <tr><td colspan="8" style="text-align:center; padding:16px; color:var(--ds-text-muted);">Chưa có đơn ứng lương.</td></tr>
              ` : advancePage.rows.map(adv => `
                <tr>
                  <td><strong>${adv.id}</strong></td>
                  <td>${adv.date}</td>
                  <td>${adv.daysWorkedSoFar} công</td>
                  <td>${formatVND(adv.accruedSalary)}</td>
                  <td><strong style="color:var(--ds-primary);">${formatVND(adv.amount)}</strong></td>
                  <td>${adv.reason}</td>
                  <td>${adv.checkedByKt ? `<span class="badge badge-success">✓ ${adv.checkedByKt}</span>` : `<span class="badge badge-warning">Chờ KT</span>`}</td>
                  <td>${adv.status === 'BGD_DA_DUYET' ? `<span class="badge badge-success">✓ Đã duyệt</span>` : `<span class="badge badge-orange">Chờ GĐ</span>`}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${advancePage.controls}
      </div>
    `;
  }

  function renderCnPersonalPayslip() {
    const w = getMyOwnAttendanceRecord();
    const scaledD = getScaledDaysWorked(w.daysMonthApproved);
    const hourly = w.dailyWage / 8;
    const basePay = scaledD * w.dailyWage;
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
            <span class="kicker">PHIẾU LƯƠNG (${formatDateRangeLabel()})</span>
            <h3>${w.name} (${w.code})</h3>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="window.print()">🖨️ In / PDF</button>
          </div>
        </div>

        <table class="data-table">
          <tbody>
            <tr>
              <td>1. Đơn giá ngày công</td>
              <td style="text-align:right; font-weight:700;">${formatVND(w.dailyWage)} / ngày</td>
            </tr>
            <tr>
              <td>2. Lương công hành chính (${scaledD} công)</td>
              <td style="text-align:right; font-weight:700;">${formatVND(basePay)}</td>
            </tr>
            <tr>
              <td>3. Lương tăng ca OT (${w.otHoursMonthApproved}h × 1.5)</td>
              <td style="text-align:right; font-weight:700;">${formatVND(otPay)}</td>
            </tr>
            <tr>
              <td>4. Lương Chủ nhật (${w.sundayDaysMonth} công × 2.0)</td>
              <td style="text-align:right; font-weight:700;">${formatVND(sunPay)}</td>
            </tr>
            <tr style="background:var(--ds-bg-soft);">
              <td><strong>TỔNG THU NHẬP (A)</strong></td>
              <td style="text-align:right; font-weight:700; font-size:13px;">${formatVND(gross)}</td>
            </tr>
            <tr>
              <td style="color:var(--ds-danger);">5. Trừ tạm ứng (B)</td>
              <td style="text-align:right; color:var(--ds-danger); font-weight:700;">-${formatVND(approvedAdvance)}</td>
            </tr>
            <tr style="background:var(--ds-bg-soft);">
              <td><strong style="color:var(--ds-primary); font-size:13px;">THỰC LĨNH (A - B)</strong></td>
              <td style="text-align:right; color:var(--ds-primary); font-family:var(--ds-font-serif); font-size:16px; font-weight:700;">${formatVND(net)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  function renderAdminAccountsTab() {
    if (!isAdminAccount()) return '';
    const accountPage = paginateRows(state.accounts, 'accounts');

    return `
      <div class="section-card">
        <div class="section-header">
          <div>
            <span class="kicker">QUẢN TRỊ TÀI KHOẢN</span>
            <h3>Danh Sách Tài Khoản Hệ Thống</h3>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.openAccountFormModal(null)">
            + Tạo Tài khoản
          </button>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tài khoản</th>
                <th>Mật khẩu / PIN</th>
                <th>Họ tên</th>
                <th>Vị trí</th>
                <th>Phạm vi</th>
                <th>Quản lý</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${accountPage.rows.map(acc => {
                const cfg = ROLE_CONFIG[acc.roleId] || ROLE_CONFIG.CN;
                const isCur = acc.id === currentAccountId;
                return `
                  <tr style="${isCur ? 'background:rgba(247,147,30,0.1);' : ''}">
                    <td><strong><code>${acc.username}</code></strong></td>
                    <td>
                      <strong style="color:var(--ds-primary);"><code>${acc.pin}</code></strong>
                      ${acc.passwordUpdatedAt ? `<div style="font-size:9px; color:var(--ds-success);">${acc.passwordUpdatedAt}</div>` : ''}
                    </td>
                    <td><strong>${acc.fullName}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${acc.positionTitle}</span></td>
                    <td><span class="badge badge-navy">${cfg.badge}</span></td>
                    <td>CT: <strong>${acc.projectId}</strong> · Đội: <strong>${acc.teamId}</strong></td>
                    <td>${acc.managerName || acc.createdBy || 'Tổng Giám đốc'}</td>
                    <td>
                      <div style="display:flex; gap:4px; flex-wrap:wrap;">
                        ${isCur
                          ? `<span class="badge badge-success">Đang dùng</span>`
                          : `<button class="btn btn-primary btn-sm" onclick="window.NPApp.loginAsAccount('${acc.id}')">🚀 Vào</button>`
                        }
                        <button class="btn btn-soft btn-sm" onclick="window.NPApp.openAccountFormModal('${acc.id}')">✏️ Sửa</button>
                        ${acc.username !== 'admin'
                          ? `<button class="btn btn-danger btn-sm" onclick="window.NPApp.openDeleteConfirmModal('ACCOUNT', '${acc.id}')">🗑️ Xóa</button>`
                          : ''
                        }
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${accountPage.controls}
      </div>
    `;
  }

  // =================================================================================================
  // VII. MENU CHẤM CÔNG GỘP CHUNG CHECK-IN / CHECK-OUT (CHO MỌI CẤP TRỪ GIÁM ĐỐC)
  // =================================================================================================
  function openUnifiedCheckinMenu(personId) {
    const acc = getCurrentAccount();
    if (!acc) return;
    toggleSidebar(false);

    if (acc.roleId === 'BGD') {
      alert('Tổng Giám đốc không cần chấm công cá nhân! Giám đốc kiểm tra chấm công của Kế toán, Quản lý Công trình và các Đội tại mục "Check Cán bộ".');
      return;
    }

    // Tạo danh sách người được phép chấm công trong dropdown:
    // - Kế toán (KT): chấm công cho chính Kế toán
    // - Quản lý CT (QLCT): chấm công cho chính Quản lý CT hoặc nhân sự trong công trình mình
    // - Đội trưởng (DT1): chấm công cho chính Đội trưởng hoặc công nhân trong đội mình
    // - Công nhân (CN): chấm công cho chính mình
    const myOwn = getMyOwnAttendanceRecord();
    let selectableList = [myOwn];
    if (acc.roleId === 'DT1' || acc.roleId === 'QLCT') {
      const subWorkers = getScopedWorkersForCurrentAccount();
      selectableList = [myOwn, ...subWorkers.filter(w => w.id !== myOwn.id)];
    }

    const selWorker = document.getElementById('camWorkerSelect');
    const selProject = document.getElementById('camProjectSelect');

    if (selWorker) {
      selWorker.innerHTML = selectableList.map(p =>
        `<option value="${p.id}">${p.code} — ${p.name} (${p.roleName || p.teamName})</option>`
      ).join('');
      if (personId && selectableList.some(p => p.id === personId)) {
        selWorker.value = personId;
      } else {
        selWorker.value = myOwn.id;
      }
      selWorker.disabled = (acc.roleId === 'CN' || acc.roleId === 'KT');
    }

    if (selProject) {
      const allowedProjects = (acc.projectId && acc.projectId !== 'ALL')
        ? state.projects.filter(p => p.id === acc.projectId)
        : state.projects;
      selProject.innerHTML = allowedProjects.map(p =>
        `<option value="${p.id}">${p.name}</option>`
      ).join('');
    }

    setCameraActionMode('VAO');
    document.getElementById('cameraModal').classList.add('open');
    startHardwareCamera();
    drawLivePreviewOnCanvas();
  }

  function setCameraActionMode(mode) {
    const hiddenInput = document.getElementById('camActionType');
    if (hiddenInput) hiddenInput.value = mode;

    const btnIn = document.getElementById('btnModeCheckin');
    const btnOut = document.getElementById('btnModeCheckout');
    if (btnIn) btnIn.classList.toggle('active', mode === 'VAO');
    if (btnOut) btnOut.classList.toggle('active', mode === 'RA');

    const titleEl = document.getElementById('cameraModalHeaderTitle');
    if (titleEl) {
      titleEl.textContent = mode === 'RA'
        ? '📸 Chấm công Camera GPS — Đang chọn: CHECK-OUT (Ra ca)'
        : '📸 Chấm công Camera GPS — Đang chọn: CHECK-IN (Vào ca)';
    }
    const submitBtn = document.getElementById('btnSnapSubmit');
    if (submitBtn) {
      submitBtn.innerHTML = mode === 'RA'
        ? '🏁 Chụp &amp; Xác nhận Check-out (Ra ca)'
        : '📸 Chụp &amp; Xác nhận Check-in (Vào ca)';
    }
    drawLivePreviewOnCanvas();
  }

  function openCameraQuick(actionType, workerId) {
    openUnifiedCheckinMenu(workerId);
    if (actionType === 'RA' || actionType === 'VAO') {
      setCameraActionMode(actionType);
    }
  }

  function openCameraFromSidebar(actionType) {
    openUnifiedCheckinMenu(null);
    if (actionType) setCameraActionMode(actionType);
  }

  function openCameraModal() {
    openUnifiedCheckinMenu(null);
  }

  function openPhotoModal(workerId) {
    const w = findAnyPersonById(workerId);
    if (!w) return;
    const prj = getProject(w.projectId);
    const imgUrl = getWorkerStampedPhoto(w);

    document.getElementById('photoModalTitle').textContent = `Ảnh Chấm Công GPS — ${w.name} (${w.code})`;
    document.getElementById('photoModalBody').innerHTML = `
      <img src="${imgUrl}" style="width:100%; border-radius:var(--ds-radius-md); border:1px solid var(--ds-line); margin-bottom:10px;" />
      <div style="background:var(--ds-bg-soft); padding:10px; border-radius:var(--ds-radius-sm); border:1px solid var(--ds-line); font-size:11.5px; display:grid; gap:4px;">
        <div><strong>Nhân sự:</strong> ${w.name} (${w.code}) · <strong>Bộ phận:</strong> ${w.teamName || w.roleName}</div>
        <div><strong>Cấp trên trực tiếp thấy &amp; duyệt công:</strong> <span style="color:var(--ds-primary); font-weight:700;">${w.managerName}</span> (${prj.name})</div>
        <div><strong>Tọa độ GPS:</strong> <code>${w.lat}, ${w.lng}</code> (Sai số ±${w.acc || 8}m · Hợp lệ trong bán kính ${prj.radiusM}m)</div>
      </div>
    `;
    document.getElementById('photoModal').classList.add('open');
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
    const w = findAnyPersonById(workerId) || getMyOwnAttendanceRecord();
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
    ctx.fillText(`${w.teamName || w.roleName} · Cấp trên duyệt: ${w.managerName}`, 18, 416);

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
    const w = findAnyPersonById(workerId);
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
    renderRoleNavigationAndHeader();
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

  // ================= XÓA TÀI KHOẢN / NHÂN SỰ (BẮT BUỘC XÁC NHẬN & ĐƯỢC TỔNG GIÁM ĐỐC ĐỒNG Ý) =================
  function openDeleteConfirmModal(targetType, targetId) {
    const acc = getCurrentAccount();
    if (!acc) return;

    let targetCode = '';
    let targetName = '';
    let targetRole = '';

    if (targetType === 'ACCOUNT') {
      const targetAcc = state.accounts.find(a => a.id === targetId);
      if (!targetAcc) return;
      if (targetAcc.username === 'admin') {
        alert('Không thể xóa tài khoản Tổng Giám Đốc (admin)!');
        return;
      }
      targetCode = targetAcc.username;
      targetName = targetAcc.fullName;
      targetRole = targetAcc.positionTitle;
    } else {
      const targetWorker = findAnyPersonById(targetId);
      if (!targetWorker) return;
      targetCode = targetWorker.code;
      targetName = targetWorker.name;
      targetRole = `${targetWorker.roleName} · ${targetWorker.teamName}`;
    }

    const isDirector = (acc.roleId === 'BGD');
    const directorAccount = state.accounts.find(a => a.roleId === 'BGD') || { pin: '9999', fullName: 'GĐ. Nguyễn Phát' };

    document.getElementById('adjustModalTitle').textContent = `🗑️ Xác Nhận Xóa ${targetType === 'ACCOUNT' ? 'Tài Khoản' : 'Nhân Sự'}`;
    document.getElementById('adjustModalBody').innerHTML = `
      <div style="background:var(--ds-bg-soft); border:1px solid var(--ds-line); border-radius:var(--ds-radius-sm); padding:8px 10px; margin-bottom:8px; font-size:11.5px;">
        <div>Xóa: <strong style="color:var(--ds-danger);">${targetName}</strong> (<code>${targetCode}</code> · ${targetRole})</div>
      </div>

      <div class="form-group">
        <label>Lý do xóa <span class="req">*</span></label>
        <input type="text" id="delReasonInput" value="Nghỉ việc / Kết thúc hợp đồng" placeholder="Nhập lý do xóa..." />
      </div>

      <div class="form-group" style="background:var(--ds-bg-soft); border:1px solid var(--ds-line); padding:7px 9px; border-radius:var(--ds-radius-sm);">
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer; margin:0; color:var(--ds-danger);">
          <input type="checkbox" id="delConfirmCheckbox" style="width:15px; height:15px; min-height:15px;" />
          <span>Xác nhận xóa <strong>${targetName} (${targetCode})</strong></span>
        </label>
      </div>

      <div class="form-group">
        <label>Mã PIN Tổng Giám Đốc (${directorAccount.fullName}):</label>
        ${isDirector ? `
          <input type="password" id="delDirectorPinInput" value="${directorAccount.pin}" placeholder="Nhập PIN Giám đốc..." />
        ` : `
          <input type="password" id="delDirectorPinInput" placeholder="Để trống để trình Giám đốc duyệt (hoặc nhập PIN Giám đốc)" />
        `}
        <div id="delErrMsg" class="field-error-msg" style="display:none;">Vui lòng tích xác nhận và nhập lý do!</div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-danger" onclick="window.NPApp.submitDeleteOrRequest('${targetType}', '${targetId}')">
          ${isDirector ? '🗑️ Đồng ý & Xóa ngay' : '📤 Trình Giám đốc duyệt'}
        </button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function executeHardDelete(targetType, targetId, targetCode, targetName, reason, actorLabel) {
    // Xóa trong danh sách tài khoản
    state.accounts = state.accounts.filter(a =>
      a.id !== targetId &&
      a.username.toLowerCase() !== String(targetCode).toLowerCase() &&
      (!a.workerCode || a.workerCode.toLowerCase() !== String(targetCode).toLowerCase())
    );
    // Xóa trong danh sách công nhân
    state.workers = state.workers.filter(w =>
      w.id !== targetId &&
      w.code.toLowerCase() !== String(targetCode).toLowerCase()
    );
    // Xóa trong danh sách cán bộ chấm công
    if (state.staffAttendance) {
      state.staffAttendance = state.staffAttendance.filter(s =>
        s.id !== targetId &&
        s.code.toLowerCase() !== String(targetCode).toLowerCase() &&
        s.username.toLowerCase() !== String(targetCode).toLowerCase()
      );
    }

    state.auditLogs.unshift({
      id: 'LOG-DEL-' + (state.auditLogs.length + 1),
      timestamp: '22/11/2026 ' + new Date().toTimeString().slice(0, 5),
      workerCode: targetCode,
      workerName: targetName,
      actorName: actorLabel,
      actorRole: 'Đã được Tổng Giám đốc đồng ý xóa',
      field: targetType === 'ACCOUNT' ? 'Xóa Tài khoản & Hồ sơ' : 'Xóa Hồ sơ Nhân sự & Tài khoản',
      oldVal: `Đang hoạt động (${targetName})`,
      newVal: 'ĐÃ XÓA VĨNH VIỄN (GĐ ĐỒNG Ý)',
      reason
    });
  }

  function submitDeleteOrRequest(targetType, targetId) {
    const acc = getCurrentAccount();
    if (!acc) return;

    const checked = document.getElementById('delConfirmCheckbox')?.checked;
    const reason = (document.getElementById('delReasonInput')?.value || '').trim();
    const enteredDirectorPin = (document.getElementById('delDirectorPinInput')?.value || '').trim();
    const errEl = document.getElementById('delErrMsg');

    if (!checked || !reason) {
      if (errEl) {
        errEl.textContent = 'Bắt buộc phải tích chọn ô Xác nhận xóa và nhập Lý do xóa!';
        errEl.style.display = 'block';
      }
      return;
    }

    let targetCode = '';
    let targetName = '';
    let targetRole = '';
    if (targetType === 'ACCOUNT') {
      const tAcc = state.accounts.find(a => a.id === targetId);
      if (!tAcc) return;
      targetCode = tAcc.username;
      targetName = tAcc.fullName;
      targetRole = tAcc.positionTitle;
    } else {
      const tW = findAnyPersonById(targetId);
      if (!tW) return;
      targetCode = tW.code;
      targetName = tW.name;
      targetRole = `${tW.roleName} · ${tW.teamName}`;
    }

    const directorAcc = state.accounts.find(a => a.roleId === 'BGD') || { pin: '9999', fullName: 'GĐ. Nguyễn Phát' };

    // Trường hợp 1: Đang là Tổng Giám đốc hoặc đã nhập đúng PIN đồng ý trực tiếp của Tổng Giám đốc
    if (acc.roleId === 'BGD' || (enteredDirectorPin && enteredDirectorPin === directorAcc.pin)) {
      executeHardDelete(targetType, targetId, targetCode, targetName, reason, `${acc.fullName} (Được ${directorAcc.fullName} đồng ý)`);
      saveState();
      closeModal('adjustModal');
      renderRoleNavigationAndHeader();
      renderMain();
      alert(`Đã xác nhận đồng ý của Tổng Giám đốc và xóa hoàn tất "${targetName} (${targetCode})" khỏi hệ thống!`);
      return;
    }

    if (enteredDirectorPin && enteredDirectorPin !== directorAcc.pin) {
      if (errEl) {
        errEl.textContent = 'Mã PIN Tổng Giám đốc không đúng! Hãy để trống ô PIN để gửi Yêu cầu trình Giám đốc phê duyệt.';
        errEl.style.display = 'block';
      }
      return;
    }

    // Trường hợp 2: Cấp dưới (Quản lý CT / Đội trưởng / Kế toán) gửi yêu cầu xóa trình lên Tổng Giám đốc đồng ý
    state.deleteRequests = state.deleteRequests || [];
    state.deleteRequests.unshift({
      id: 'DEL-0' + (state.deleteRequests.length + 1),
      targetType,
      targetId,
      targetCode,
      targetName,
      targetRole,
      requestedBy: acc.fullName,
      requestedRole: acc.positionTitle,
      reason,
      createdAt: '22/11/2026 ' + new Date().toTimeString().slice(0, 5),
      status: 'CHO_BGD_DONG_Y'
    });

    saveState();
    closeModal('adjustModal');
    renderRoleNavigationAndHeader();
    renderMain();
    alert(`Đã xác nhận và gửi yêu cầu xóa "${targetName} (${targetCode})" lên Tổng Giám đốc (${directorAcc.fullName}). Nhân sự/Tài khoản sẽ được xóa ngay khi Giám đốc bấm Đồng ý!`);
  }

  function directorApproveDeleteRequest(reqId) {
    const acc = getCurrentAccount();
    if (!acc || acc.roleId !== 'BGD') {
      alert('Chỉ Tổng Giám Đốc mới có thẩm quyền đồng ý phê duyệt xóa tài khoản / nhân sự!');
      return;
    }
    const req = (state.deleteRequests || []).find(r => r.id === reqId);
    if (!req) return;

    executeHardDelete(req.targetType, req.targetId, req.targetCode, req.targetName, req.reason, `${req.requestedBy} (Tổng Giám đốc ${acc.fullName} đồng ý xóa)`);
    req.status = 'DA_XOA';
    saveState();
    renderRoleNavigationAndHeader();
    renderMain();
    alert(`Tổng Giám đốc đã đồng ý! Đã xóa "${req.targetName} (${req.targetCode})" khỏi hệ thống.`);
  }

  function directorRejectDeleteRequest(reqId) {
    const acc = getCurrentAccount();
    if (!acc || acc.roleId !== 'BGD') return;
    const req = (state.deleteRequests || []).find(r => r.id === reqId);
    if (!req) return;
    req.status = 'TU_CHOI';
    saveState();
    renderRoleNavigationAndHeader();
    renderMain();
  }

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

  // THÊM CÔNG NHÂN MỚI
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

    document.getElementById('adjustModalTitle').textContent = `Thêm Nhân Sự Mới`;
    document.getElementById('adjustModalBody').innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div class="form-group">
          <label>Mã NV (Tài khoản) <span class="req">*</span></label>
          <input type="text" id="newWCode" value="${suggestedCode}" />
        </div>
        <div class="form-group">
          <label>Mật khẩu / PIN <span class="req">*</span></label>
          <input type="text" id="newWPin" value="0000" />
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div class="form-group">
          <label>Họ và Tên <span class="req">*</span></label>
          <input type="text" id="newWName" placeholder="VD: NGUYỄN VĂN HẢI" />
        </div>
        <div class="form-group">
          <label>Đội thi công <span class="req">*</span></label>
          <select id="newWTeam">
            ${allowedTeams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div class="form-group">
          <label>Đơn giá ngày (VNĐ) <span class="req">*</span></label>
          <input type="number" id="newWWage" value="480000" step="10000" />
        </div>
        <div class="form-group">
          <label>Công việc</label>
          <input type="text" id="newWTask" placeholder="VD: Lắp dựng cốt thép" />
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitAddWorker()">+ Lưu</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitAddWorker() {
    const acc = getCurrentAccount();
    const code = (document.getElementById('newWCode').value || '').trim();
    const pin = (document.getElementById('newWPin').value || '0000').trim();
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
      pin,
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

    state.accounts.push({
      id: 'ACC-W-' + code,
      username: code,
      pin,
      fullName: name,
      positionTitle: `Công nhân ${tm.name}`,
      roleId: 'CN',
      level: 5,
      projectId: prj.id,
      teamId: tm.id,
      workerCode: code,
      dailyWage: wage,
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

  // MỌI CẤP ĐỀU CÓ THỂ GỬI ĐƠN XIN ỨNG LƯƠNG
  function openPersonalAdvanceModal() {
    const acc = getCurrentAccount();
    const myRec = getMyOwnAttendanceRecord();
    const scaledDays = getScaledDaysWorked(myRec.daysMonthApproved);
    const accrued = scaledDays * myRec.dailyWage;
    const maxAdv = Math.round(accrued * 0.7);

    document.getElementById('adjustModalTitle').textContent = `💳 Đơn Ứng Lương — ${myRec.name}`;
    document.getElementById('adjustModalBody').innerHTML = `
      <div style="background:var(--ds-bg-soft); border:1px solid var(--ds-line); padding:8px 10px; border-radius:var(--ds-radius-sm); font-size:11.5px; margin-bottom:8px;">
        <div><strong>${myRec.name} (${myRec.code})</strong> · Công kỳ: <strong>${scaledDays} công</strong></div>
        <div>Lương lũy kế: <strong>${formatVND(accrued)}</strong> · Tối đa (70%): <strong style="color:var(--ds-primary);">${formatVND(maxAdv)}</strong></div>
      </div>
      <div class="form-group">
        <label>Số tiền ứng (VNĐ) <span class="req">*</span></label>
        <input type="number" id="personalAdvAmount" value="${Math.min(3000000, maxAdv)}" step="100000" max="${maxAdv}" />
      </div>
      <div class="form-group">
        <label>Lý do <span class="req">*</span></label>
        <input type="text" id="personalAdvReason" value="Tạm ứng lương trong kỳ" />
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitPersonalAdvance()">💳 Gửi đơn</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitPersonalAdvance() {
    const acc = getCurrentAccount();
    const myRec = getMyOwnAttendanceRecord();
    const amount = Number(document.getElementById('personalAdvAmount').value || 0);
    const reason = (document.getElementById('personalAdvReason').value || '').trim();
    const scaledDays = getScaledDaysWorked(myRec.daysMonthApproved);
    const accrued = scaledDays * myRec.dailyWage;

    if (amount <= 0 || amount > accrued) {
      alert('Số tiền xin ứng không hợp lệ hoặc vượt quá lương lũy kế đã làm!');
      return;
    }

    // Nếu chính Kế toán xin ứng lương thì tự động đánh dấu Kế toán đã kiểm tra và trình thẳng Tổng Giám đốc duyệt
    const isKtSelf = (acc && acc.roleId === 'KT');

    state.advances.unshift({
      id: 'UL-0' + (state.advances.length + 1),
      workerId: myRec.id,
      workerCode: myRec.code,
      workerName: `${myRec.name} (${acc ? acc.positionTitle : myRec.roleName})`,
      teamName: myRec.teamName,
      projectId: myRec.projectId,
      amount,
      reason: reason || 'Ứng lương cá nhân',
      daysWorkedSoFar: scaledDays,
      accruedSalary: accrued,
      date: '22/11/2026',
      status: isKtSelf ? 'CHO_BGD_DUYET' : 'CHO_KT_KIEM_TRA',
      checkedByKt: isKtSelf ? acc.fullName : '',
      approvedByBgd: ''
    });

    saveState();
    closeModal('adjustModal');
    renderRoleNavigationAndHeader();
    renderMain();
    alert(`Đã gửi đơn xin ứng lương ${formatVND(amount)} của ${myRec.name} thành công!`);
  }

  function openPersonalLeaveModal() {
    const w = getMyOwnAttendanceRecord();
    document.getElementById('adjustModalTitle').textContent = `Đơn Xin Nghỉ Phép — ${w.name} (${w.code})`;
    document.getElementById('adjustModalBody').innerHTML = `
      <div class="form-group">
        <label>Ngày xin nghỉ <span class="req">*</span></label>
        <input type="text" id="leaveDateInput" value="23/11/2026" />
      </div>
      <div class="form-group">
        <label>Lý do xin nghỉ phép (Gửi cấp trên ${w.managerName}) <span class="req">*</span></label>
        <input type="text" id="leaveReasonInput" value="Giải quyết việc gia đình (1 ngày)" />
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.closeModal('adjustModal'); alert('Đã gửi đơn xin nghỉ phép tới cấp trên ${w.managerName}!');">📝 Gửi đơn xin nghỉ</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  // SỬA GIỜ CÔNG CÓ LƯU VẾT AUDIT LOG & ĐĂNG KÝ TĂNG CA
  function openAdjustModal(workerId) {
    const w = findAnyPersonById(workerId);
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
    const w = findAnyPersonById(workerId);
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
    const w = findAnyPersonById(workerId);
    if (!w) return;
    document.getElementById('adjustModalTitle').textContent = `Đăng Ký Tăng Ca (OT) — ${w.name}`;
    document.getElementById('adjustModalBody').innerHTML = `
      <div class="form-group">
        <label>Số giờ Tăng ca <span class="req">*</span></label>
        <select id="otHoursSelect">
          <option value="0" ${w.hoursOtRegistered === 0 ? 'selected' : ''}>0 giờ (Chốt 17:30)</option>
          <option value="2" ${w.hoursOtRegistered === 2 ? 'selected' : ''}>+2.0 giờ OT (17:30 → 19:30)</option>
          <option value="3" ${w.hoursOtRegistered === 3 ? 'selected' : ''}>+3.0 giờ OT (17:30 → 20:30)</option>
          <option value="4" ${w.hoursOtRegistered === 4 ? 'selected' : ''}>+4.0 giờ OT (17:30 → 21:30)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Hạng mục tăng ca <span class="req">*</span></label>
        <input type="text" id="otReasonInput" value="${w.otReason || w.assignedTaskToday || 'Tăng ca hoàn thiện mẻ bê tông'}" />
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitOtModal('${w.id}')">⏱️ Lưu</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitOtModal(workerId) {
    const w = findAnyPersonById(workerId);
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
      ? `Chỉnh sửa Tài khoản & Mật khẩu Vị trí — ${editing.fullName}`
      : 'Tạo Tài Khoản Mới Cho Vị Trí (5 Cấp)';

    document.getElementById('adjustModalBody').innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div class="form-group">
          <label>Tên đăng nhập <span class="req">*</span></label>
          <input type="text" id="accFormUser" value="${editing ? editing.username : ''}" placeholder="VD: qlct_ct4" />
        </div>
        <div class="form-group">
          <label>Mã PIN / Mật khẩu <span class="req">*</span></label>
          <input type="text" id="accFormPin" value="${editing ? editing.pin : '1234'}" />
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div class="form-group">
          <label>Họ và Tên <span class="req">*</span></label>
          <input type="text" id="accFormName" value="${editing ? editing.fullName : ''}" placeholder="VD: KS. Nguyễn Hoàng Long" />
        </div>
        <div class="form-group">
          <label>Vị trí <span class="req">*</span></label>
          <select id="accFormRole">
            <option value="BGD" ${editing && editing.roleId === 'BGD' ? 'selected' : ''}>Tổng Giám Đốc / Admin</option>
            <option value="KT" ${editing && editing.roleId === 'KT' ? 'selected' : ''}>Hành chính – Kế toán</option>
            <option value="QLCT" ${!editing || editing.roleId === 'QLCT' ? 'selected' : ''}>Quản lý Công trình</option>
            <option value="DT1" ${editing && editing.roleId === 'DT1' ? 'selected' : ''}>Đội trưởng Thi công</option>
            <option value="CN" ${editing && editing.roleId === 'CN' ? 'selected' : ''}>Công nhân / Nhân viên</option>
          </select>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div class="form-group">
          <label>Công trình</label>
          <select id="accFormProject">
            <option value="ALL" ${editing && editing.projectId === 'ALL' ? 'selected' : ''}>Toàn bộ (ALL)</option>
            ${state.projects.map(p => `<option value="${p.id}" ${editing && editing.projectId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Đội thi công</label>
          <select id="accFormTeam">
            <option value="ALL" ${editing && editing.teamId === 'ALL' ? 'selected' : ''}>Tất cả Đội (ALL)</option>
            ${state.teams.map(t => `<option value="${t.id}" ${editing && editing.teamId === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitAccountForm('${editing ? editing.id : ''}')">💾 Lưu</button>
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
          checkin: roleId !== 'BGD',
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

  // ================= XUẤT FILE EXCEL (.CSV UTF-8 BOM) =================
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
    const header = ['STT', 'Kỳ lọc ngày', 'Mã NV', 'Họ và Tên', 'Đội thi công', 'Đội trưởng trực tiếp', 'Thuộc Quản lý Công trình', 'Công trình', 'Giờ vào', 'Giờ ra', 'Công đã duyệt trong kỳ', 'Giờ OT', 'Trạng thái duyệt'];
    const rows = state.workers.map((w, i) => [
      i + 1, formatDateRangeLabel(), w.code, w.name, w.teamName, w.leaderName, w.managerName, w.projectId, w.checkInTime, w.checkOutTime || '', getScaledDaysWorked(w.daysMonthApproved), w.otHoursMonthApproved, w.approvalStatus
    ]);
    downloadCsvFile(`Bang-Cong-NP-ONE-Thang-${dateRange.month}-${dateRange.year}.csv`, [header, ...rows]);
  }

  function exportPayrollCsv() {
    const header = ['STT', 'Kỳ lọc ngày', 'Mã NV', 'Họ và Tên', 'Đội thi công', 'Đội trưởng', 'Thuộc Quản lý Công trình', 'Công trình', 'Đơn giá ngày', 'Công trong kỳ', 'Giờ OT', 'Công CN', 'Tổng lương gộp', 'Trừ tạm ứng đã duyệt', 'Thực lĩnh'];
    const rows = state.workers.map((w, i) => {
      const scaledD = getScaledDaysWorked(w.daysMonthApproved);
      const hourly = w.dailyWage / 8;
      const basePay = scaledD * w.dailyWage;
      const otPay = Math.round(w.otHoursMonthApproved * hourly * 1.5);
      const sunPay = Math.round(w.sundayDaysMonth * w.dailyWage * 2.0);
      const gross = basePay + otPay + sunPay;
      const adv = state.advances.filter(a => a.workerCode === w.code && a.status === 'BGD_DA_DUYET').reduce((s, a) => s + a.amount, 0);
      return [i + 1, formatDateRangeLabel(), w.code, w.name, w.teamName, w.leaderName, w.managerName, w.projectId, w.dailyWage, scaledD, w.otHoursMonthApproved, w.sundayDaysMonth, gross, adv, gross - adv];
    });
    downloadCsvFile(`Bang-Luong-NP-ONE-Thang-${dateRange.month}-${dateRange.year}.csv`, [header, ...rows]);
  }

  function confirmForgotCheckout(workerId, otHours) {
    const w = findAnyPersonById(workerId);
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
    const w = findAnyPersonById(workerId);
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
    const w = findAnyPersonById(workerId);
    if (!w) return;
    const scaledD = getScaledDaysWorked(w.daysMonthApproved);
    const hourly = w.dailyWage / 8;
    const basePay = scaledD * w.dailyWage;
    const otPay = Math.round(w.otHoursMonthApproved * hourly * 1.5);
    const sunPay = Math.round(w.sundayDaysMonth * w.dailyWage * 2.0);
    const gross = basePay + otPay + sunPay;
    const approvedAdvance = state.advances
      .filter(a => a.workerCode === w.code && a.status === 'BGD_DA_DUYET')
      .reduce((s, a) => s + a.amount, 0);
    const net = gross - approvedAdvance;

    document.getElementById('payslipModalBody').innerHTML = `
      <div style="border:1px solid var(--ds-line); border-radius:var(--ds-radius-md); padding:14px; background:var(--ds-bg);">
        <span class="kicker">CÔNG TY NGUYÊN PHÁT · NP ONE HR (${formatDateRangeLabel()})</span>
        <div style="font-family:var(--ds-font-serif); font-weight:700; font-size:16px; color:var(--ds-primary); margin-bottom:4px;">
          Phiếu Lương — ${w.name} (${w.code})
        </div>
        <div style="font-size:11px; color:var(--ds-text-muted); margin-bottom:10px;">
          Đội: <strong>${w.teamName}</strong> · Đội trưởng: <strong>${w.leaderName}</strong> · Quản lý CT duyệt công: <strong>${w.managerName}</strong>
        </div>
        <table class="data-table" style="margin-bottom:12px;">
          <tbody>
            <tr><td>Công hành chính đã duyệt (${scaledD} công × ${formatVND(w.dailyWage)})</td><td style="text-align:right; font-weight:700;">${formatVND(basePay)}</td></tr>
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

  // ================= ĐÓNG / MỞ CÂY NHÂN SỰ KHI CLICK VÀO ĐỘI TRƯỞNG =================
  function toggleTeamHierarchy(teamId) {
    expandedTeams[teamId] = !expandedTeams[teamId];
    renderMain();
  }

  function toggleProjectTeams(projectId) {
    const pTeams = state.teams.filter(t => t.projectId === projectId);
    const anyClosed = pTeams.some(t => !expandedTeams[t.id]);
    pTeams.forEach(t => {
      expandedTeams[t.id] = anyClosed;
    });
    renderMain();
  }

  function expandAllHierarchyTeams(openAll) {
    state.teams.forEach(t => {
      expandedTeams[t.id] = !!openAll;
    });
    renderMain();
  }

  function openTeamMembersDetailModal(teamId) {
    const tm = getTeam(teamId);
    const prj = getProject(tm.projectId);
    const tmWorkers = state.workers.filter(w => w.teamId === tm.id);
    const teamPage = paginateRows(tmWorkers, 'members-' + tm.id, tm.id);
    const dtPin = getAccountPinByUsernameOrCode(tm.leaderUsername);

    document.getElementById('adjustModalTitle').textContent = `🌳 Cây Nhân Sự: ${tm.name} — Đội trưởng ${tm.leader} (${tmWorkers.length} người)`;
    document.getElementById('adjustModalBody').innerHTML = `
      <div style="background:var(--ds-bg-soft); border:1px solid var(--ds-line); border-left:3px solid var(--ds-primary); padding:8px 10px; border-radius:var(--ds-radius-sm); font-size:11px; margin-bottom:8px;">
        <div><strong>Quản lý Công trình cấp trên:</strong> ${tm.managerName} (${prj.name})</div>
        <div style="margin-top:2px;"><strong>Đội trưởng trực tiếp:</strong> ${tm.leader} (Tài khoản: <code>${tm.leaderUsername}</code> · Mật khẩu/PIN: <code>${dtPin}</code> · SĐT: ${tm.phone})</div>
      </div>
      <div style="max-height:55vh; overflow-y:auto;" class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Ảnh GPS</th>
              <th>Mã NV &amp; PIN</th>
              <th>Họ và Tên Công nhân</th>
              <th>Giờ Vào - Ra</th>
              <th>Công kỳ</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${teamPage.rows.map((w, idx) => {
              const thumb = getWorkerStampedPhoto(w);
              const wPin = getAccountPinByUsernameOrCode(w.code);
              return `
                <tr>
                  <td>${teamPage.offset + idx + 1}</td>
                  <td><img src="${thumb}" class="photo-thumb" loading="lazy" decoding="async" style="width:42px; height:32px;" onclick="window.NPApp.openPhotoModal('${w.id}')" /></td>
                  <td><strong><code>${w.code}</code></strong><br/><span style="font-size:9.5px; color:var(--ds-primary);">PIN: <code>${wPin}</code></span></td>
                  <td><strong>${w.name}</strong><br/><span style="font-size:10px; color:var(--ds-text-muted);">${w.roleName}</span></td>
                  <td>${w.checkInTime ? `<code>${w.checkInTime}</code>` : `<span class="badge badge-danger">Vắng</span>`}</td>
                  <td><strong>${getScaledDaysWorked(w.daysMonthApproved)} công</strong></td>
                  <td>
                    <button class="btn btn-danger btn-sm" onclick="window.NPApp.openDeleteConfirmModal('WORKER', '${w.id}')">🗑️ Xóa</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${teamPage.controls}
      <div style="display:flex; justify-content:flex-end; margin-top:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Đóng</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function init() {
    initTheme();
    document.addEventListener('click', event => {
      const control = event.target.closest('[data-np-pagination] button[data-page]');
      if (control) changeListPage(control, control.dataset.page);
    });
    document.addEventListener('change', event => {
      if (event.target.matches('[data-np-pagination] select[data-page-picker]')) changeListPage(event.target, event.target.value);
    });
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredInstallPrompt = e;
    });

    const camWorkerSelect = document.getElementById('camWorkerSelect');
    const camProjectSelect = document.getElementById('camProjectSelect');
    if (camWorkerSelect) camWorkerSelect.addEventListener('change', drawLivePreviewOnCanvas);
    if (camProjectSelect) camProjectSelect.addEventListener('change', drawLivePreviewOnCanvas);

    sampleImgObj.onload = () => {
      if (isAuthenticated) renderMain();
    };

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

    if (params.get('tab')) {
      selectTab(params.get('tab'));
    }
    if (params.get('openmodal') === 'date') {
      openDateRangeModal();
    } else if (params.get('openmodal') === 'checkin') {
      openUnifiedCheckinMenu(null);
    } else if (params.get('openmodal') === 'password') {
      openChangeMyPasswordModal();
    } else if (params.get('openmodal') === 'delete') {
      openDeleteConfirmModal('WORKER', 'W1');
    }

    setTimeout(refreshRealGps, 400);
  }

  window.NPApp = {
    toggleTheme,
    toggleSidebar,
    selectTab,
    toggleTeamHierarchy,
    toggleProjectTeams,
    expandAllHierarchyTeams,
    openTeamMembersDetailModal,
    openDateRangeModal,
    changeCalendarMonthYear,
    setStartEndDayManual,
    pickCalendarDay,
    applyDateRangeFilter,
    openChangeMyPasswordModal,
    submitChangeMyPassword,
    openDeleteConfirmModal,
    submitDeleteOrRequest,
    directorApproveDeleteRequest,
    directorRejectDeleteRequest,
    openUnifiedCheckinMenu,
    setCameraActionMode,
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
    setSearch(val) { searchQuery = val; listPages.clear(); renderMain(); },
    setFilterProject(val) { filterProject = val; listPages.clear(); renderMain(); },
    setFilterTeam(val) { filterTeam = val; listPages.clear(); renderMain(); },
    setFilterManager(val) { filterManager = val; listPages.clear(); renderMain(); },
    setFilterStatus(val) { filterStatus = val; listPages.clear(); renderMain(); }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
