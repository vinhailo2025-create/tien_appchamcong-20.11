// Dữ liệu khởi tạo Hệ thống NP ONE - Nguyên Phát Human Resources
// Kiến trúc 5 Giao diện Chuyên biệt theo Vai trò + Cây Quản lý (Nhân viên -> Đội trưởng -> Quản lý Công trình -> Kế toán -> Tổng Giám đốc)
window.NP_SEED = (function () {
  const PROJECTS = [
    {
      id: 'CT1',
      code: 'CT-NP01',
      name: 'CT1 - KĐT Nguyên Phát Riverside',
      address: 'Đường 2/9, Q. Hải Châu, TP. Đà Nẵng',
      lat: 15.998583,
      lng: 107.988185,
      radiusM: 200,
      managerUsername: 'qlct_ct1',
      manager: 'KS. Trần Minh Hoàng',
      managerRole: 'Quản lý Công trình CT1'
    },
    {
      id: 'CT2',
      code: 'CT-NP02',
      name: 'CT2 - Tổ Hợp Thương Mại & Căn Hộ NP Tower',
      address: 'Nguyễn Văn Linh, Q. Sơn Trà, TP. Đà Nẵng',
      lat: 15.999330,
      lng: 107.987220,
      radiusM: 200,
      managerUsername: 'qlct_ct2',
      manager: 'KS. Phạm Quốc Bảo',
      managerRole: 'Quản lý Công trình CT2'
    },
    {
      id: 'CT3',
      code: 'CT-NP03',
      name: 'CT3 - Nhà Máy Công Nghệ Cao Nguyên Phát',
      address: 'KCN Hòa Khánh, Q. Liên Chiểu, TP. Đà Nẵng',
      lat: 15.997490,
      lng: 107.988550,
      radiusM: 250,
      managerUsername: 'qlct_ct3',
      manager: 'KS. Đặng Văn Hùng',
      managerRole: 'Quản lý Công trình CT3'
    }
  ];

  const TEAMS = [
    {
      id: 'D1',
      name: 'Đội 1 (Kết cấu Bê tông)',
      leader: 'ĐT1. Nguyễn Văn Sơn',
      leaderUsername: 'doitruong1',
      projectId: 'CT1',
      managerUsername: 'qlct_ct1',
      managerName: 'KS. Trần Minh Hoàng',
      phone: '0905.112.201',
      dailyTargetTask: 'Đổ bê tông dầm sàn tầng 4 & bảo dưỡng cột trục A-D'
    },
    {
      id: 'D2',
      name: 'Đội 2 (Xây trát & Hoàn thiện)',
      leader: 'ĐT2. Lê Hoàng Nam',
      leaderUsername: 'doitruong2',
      projectId: 'CT1',
      managerUsername: 'qlct_ct1',
      managerName: 'KS. Trần Minh Hoàng',
      phone: '0905.112.202',
      dailyTargetTask: 'Xây tường ngăn căn hộ tầng 3 & trát mặt ngoài trục Bắc'
    },
    {
      id: 'D3',
      name: 'Đội 3 (Cơ điện M&E)',
      leader: 'ĐT3. Vũ Đình Trọng',
      leaderUsername: 'doitruong3',
      projectId: 'CT2',
      managerUsername: 'qlct_ct2',
      managerName: 'KS. Phạm Quốc Bảo',
      phone: '0905.112.203',
      dailyTargetTask: 'Đi ống luồn dây điện âm sàn tầng 5 & lắp trục cấp thoát nước'
    },
    {
      id: 'D4',
      name: 'Đội 4 (Cốt pha & Cốt thép)',
      leader: 'ĐT4. Phan Thanh Hải',
      leaderUsername: 'doitruong4',
      projectId: 'CT2',
      managerUsername: 'qlct_ct2',
      managerName: 'KS. Phạm Quốc Bảo',
      phone: '0905.112.204',
      dailyTargetTask: 'Gia công lắp dựng cốt thép dầm sàn tầng 6 khu B'
    },
    {
      id: 'D5',
      name: 'Đội 5 (Kết cấu Thép)',
      leader: 'ĐT5. Bùi Văn Kiên',
      leaderUsername: 'doitruong5',
      projectId: 'CT3',
      managerUsername: 'qlct_ct3',
      managerName: 'KS. Đặng Văn Hùng',
      phone: '0905.112.205',
      dailyTargetTask: 'Lắp dựng khung kèo thép xưởng A2 & hàn bản mã chân cột'
    },
    {
      id: 'D6',
      name: 'Đội 6 (Hạ tầng & Cảnh quan)',
      leader: 'ĐT6. Đỗ Minh Tuấn',
      leaderUsername: 'doitruong6',
      projectId: 'CT3',
      managerUsername: 'qlct_ct3',
      managerName: 'KS. Đặng Văn Hùng',
      phone: '0905.112.206',
      dailyTargetTask: 'Thi công cống thoát nước nội bộ & lu lèn nền đường trục chính'
    }
  ];

  // Danh sách Nhiệm vụ / Phân việc giữa Quản lý Công trình -> Đội trưởng -> Công nhân
  const TASKS = [
    {
      id: 'TSK-01',
      projectId: 'CT1',
      teamId: 'D1',
      title: 'Đổ bê tông sàn tầng 4 Khu A (Khối lượng 120m³)',
      assignedBy: 'KS. Trần Minh Hoàng (Quản lý CT1)',
      assignedToLeader: 'ĐT1. Nguyễn Văn Sơn',
      requiredWorkers: 20,
      allowOvertimeHours: 2,
      status: 'DANG_THUC_HIEN',
      progressPercent: 75,
      date: '22/11/2026'
    },
    {
      id: 'TSK-02',
      projectId: 'CT1',
      teamId: 'D2',
      title: 'Xây tường ngăn & trát hoàn thiện tầng 3 (450m²)',
      assignedBy: 'KS. Trần Minh Hoàng (Quản lý CT1)',
      assignedToLeader: 'ĐT2. Lê Hoàng Nam',
      requiredWorkers: 20,
      allowOvertimeHours: 0,
      status: 'DANG_THUC_HIEN',
      progressPercent: 80,
      date: '22/11/2026'
    },
    {
      id: 'TSK-03',
      projectId: 'CT2',
      teamId: 'D3',
      title: 'Lắp đặt hệ thống tủ điện & ống cứu hỏa PCCC tầng 5',
      assignedBy: 'KS. Phạm Quốc Bảo (Quản lý CT2)',
      assignedToLeader: 'ĐT3. Vũ Đình Trọng',
      requiredWorkers: 16,
      allowOvertimeHours: 2,
      status: 'DANG_THUC_HIEN',
      progressPercent: 65,
      date: '22/11/2026'
    },
    {
      id: 'TSK-04',
      projectId: 'CT2',
      teamId: 'D4',
      title: 'Lắp dựng cốt pha, cốt thép sàn tầng 6 tháp Bắc',
      assignedBy: 'KS. Phạm Quốc Bảo (Quản lý CT2)',
      assignedToLeader: 'ĐT4. Phan Thanh Hải',
      requiredWorkers: 16,
      allowOvertimeHours: 2,
      status: 'DANG_THUC_HIEN',
      progressPercent: 90,
      date: '22/11/2026'
    },
    {
      id: 'TSK-05',
      projectId: 'CT3',
      teamId: 'D5',
      title: 'Cẩu lắp vì kèo thép nhịp 24m Nhà xưởng số 2',
      assignedBy: 'KS. Đặng Văn Hùng (Quản lý CT3)',
      assignedToLeader: 'ĐT5. Bùi Văn Kiên',
      requiredWorkers: 11,
      allowOvertimeHours: 1.5,
      status: 'DANG_THUC_HIEN',
      progressPercent: 70,
      date: '22/11/2026'
    },
    {
      id: 'TSK-06',
      projectId: 'CT3',
      teamId: 'D6',
      title: 'Lắp đặt hố ga thoát nước mưa & bó vỉa đường nội bộ',
      assignedBy: 'KS. Đặng Văn Hùng (Quản lý CT3)',
      assignedToLeader: 'ĐT6. Đỗ Minh Tuấn',
      requiredWorkers: 11,
      allowOvertimeHours: 0,
      status: 'DANG_THUC_HIEN',
      progressPercent: 85,
      date: '22/11/2026'
    }
  ];

  const ROLES = [
    {
      id: 'BGD',
      level: 1,
      title: 'Tổng Giám Đốc / Ban Giám Đốc',
      personName: 'GĐ. Nguyễn Phát',
      pin: '9999'
    },
    {
      id: 'KT',
      level: 2,
      title: 'Hành Chính – Kế Toán',
      personName: 'KTT. Lê Thị Thu Thảo',
      pin: '8888'
    },
    {
      id: 'QLCT',
      level: 3,
      title: 'Quản Lý Công Trình',
      personName: 'KS. Trần Minh Hoàng',
      pin: '7771'
    },
    {
      id: 'DT1',
      level: 4,
      title: 'Đội Trưởng Thi Công',
      personName: 'ĐT1. Nguyễn Văn Sơn',
      teamId: 'D1',
      pin: '1111'
    },
    {
      id: 'CN',
      level: 5,
      title: 'Công Nhân',
      personName: 'CN. Hồ Văn Tham (NV.SME-33)',
      workerCode: 'NV.SME-33',
      pin: '0000'
    }
  ];

  const TOP_WORKERS = [
    { seq: 4950, time: '08:15:44', date: '22/11/2026', code: 'CN.DTC.08-002', name: 'LÊ TRẦN LONG', lat: 15.99962, lng: 107.98710, acc: 40, teamId: 'D1', projectId: 'CT1', dailyWage: 480000, skill: 'Thợ chính Kết cấu', task: 'Đầm dùi bê tông sàn tầng 4 trục A1-A5', lateMin: 15 },
    { seq: 4949, time: '08:13:17', date: '22/11/2026', code: 'NV.SME-30', name: 'CÁI VĂN TIN', lat: 15.99749, lng: 107.98855, acc: 100, teamId: 'D1', projectId: 'CT1', dailyWage: 460000, skill: 'Thợ sắt', task: 'Gia cố thép chờ cột tầng 4', lateMin: 13 },
    { seq: 4948, time: '08:11:15', date: '22/11/2026', code: 'NV.SME-26', name: 'LƯU THANH TUẤN', lat: 15.99985, lng: 107.98813, acc: 14, teamId: 'D1', projectId: 'CT1', dailyWage: 450000, skill: 'Thợ bê tông', task: 'San phẳng & cán mặt bê tông sàn tầng 4', lateMin: 11 },
    { seq: 4947, time: '08:09:03', date: '22/11/2026', code: 'NV.SME-33', name: 'HỒ VĂN THAM', lat: 15.99858, lng: 107.98818, acc: 100, teamId: 'D1', projectId: 'CT1', dailyWage: 500000, skill: 'Tổ phó thi công', task: 'Phụ trách tổ đầm & kiểm tra cao độ sàn tầng 4', lateMin: 9, useRealSamplePhoto: true },
    { seq: 4946, time: '08:08:27', date: '22/11/2026', code: 'CN.DTC.01-19', name: 'PHẠM THANH ĐẠI', lat: 15.99989, lng: 107.98811, acc: 91, teamId: 'D2', projectId: 'CT1', dailyWage: 450000, skill: 'Thợ xây trát', task: 'Xây tường ngăn căn hộ B3.04 tầng 3', lateMin: 8 },
    { seq: 4945, time: '08:08:05', date: '22/11/2026', code: 'CN.DTC.02-014', name: 'Nguyễn Lâm Vũ', lat: 15.99835, lng: 107.98569, acc: 57, teamId: 'D2', projectId: 'CT1', dailyWage: 440000, skill: 'Thợ hoàn thiện', task: 'Trát tường trong căn hộ B3.02 tầng 3', lateMin: 0 },
    { seq: 4944, time: '08:07:55', date: '22/11/2026', code: 'NV.SME-35', name: 'NGUYỄN QUỐC TUẤN', lat: 15.99933, lng: 107.98722, acc: 25, teamId: 'D3', projectId: 'CT2', dailyWage: 520000, skill: 'Thợ điện M&E', task: 'Kéo cáp nguồn trục chính tầng 5 & đấu tủ điện', lateMin: 0 },
    { seq: 4943, time: '08:07:40', date: '22/11/2026', code: 'NV.SME-20', name: 'TRẦN THANH TÌNH', lat: 15.99826, lng: 107.98769, acc: 23, teamId: 'D3', projectId: 'CT2', dailyWage: 480000, skill: 'Thợ nước M&E', task: 'Lắp ống cấp thoát nước trục kỹ thuật tầng 5', lateMin: 0 },
    { seq: 4942, time: '08:07:35', date: '22/11/2026', code: 'CN.DTC.01-20', name: 'HỒ VĂN HỘI', lat: 15.99823, lng: 107.98818, acc: 100, teamId: 'D4', projectId: 'CT2', dailyWage: 450000, skill: 'Thợ cốt pha', task: 'Đóng cốp pha dầm biên tầng 6 khu B', lateMin: 0 },
    { seq: 4941, time: '08:07:31', date: '22/11/2026', code: 'CN.DTC.01-07', name: 'TRÀ TẤN TÀI', lat: 15.99989, lng: 107.98811, acc: 25, teamId: 'D4', projectId: 'CT2', dailyWage: 450000, skill: 'Thợ cốt thép', task: 'Buộc sắt sàn tầng 6 tháp Bắc', lateMin: 0 },
    { seq: 4940, time: '08:06:35', date: '22/11/2026', code: 'CN.DTC.02-01', name: 'VÕ TUẤN KIỆT', lat: 15.99889, lng: 107.98841, acc: 90, teamId: 'D5', projectId: 'CT3', dailyWage: 500000, skill: 'Thợ hàn kết cấu', task: 'Hàn liên kết dầm kèo thép trục K1-K4', lateMin: 0 },
    { seq: 4939, time: '08:06:34', date: '22/11/2026', code: 'NV.SME-045', name: 'Nguyễn Nhật Tiến', lat: 15.99901, lng: 107.98792, acc: 9, teamId: 'D5', projectId: 'CT3', dailyWage: 470000, skill: 'Thợ lắp dựng', task: 'Siết bu lông cường độ cao khung kèo A2', lateMin: 0 },
    { seq: 4938, time: '08:06:14', date: '22/11/2026', code: 'NV.SME-37', name: 'KHƯU VĂN TUẤN', lat: 15.99916, lng: 107.98726, acc: 40, teamId: 'D6', projectId: 'CT3', dailyWage: 460000, skill: 'Thợ hạ tầng', task: 'Lắp đặt cống thoát nước D600 đoạn tuyến số 2', lateMin: 0 }
  ];

  const FIRST_NAMES = ['NGUYỄN', 'TRẦN', 'LÊ', 'PHẠM', 'HOÀNG', 'HUỲNH', 'PHAN', 'VŨ', 'VÕ', 'ĐẶNG', 'BÙI', 'ĐỖ', 'HỒ', 'NGÔ', 'DƯƠNG', 'LÝ'];
  const MID_NAMES = ['VĂN', 'THANH', 'MINH', 'QUỐC', 'HỮU', 'ĐỨC', 'ĐÌNH', 'XUÂN', 'NGỌC', 'HOÀNG', 'TRỌNG', 'BÁ'];
  const LAST_NAMES = ['HÙNG', 'DŨNG', 'NAM', 'HẢI', 'SƠN', 'THẮNG', 'CƯỜNG', 'BÌNH', 'PHÚC', 'LỘC', 'THỌ', 'TÂM', 'TÀI', 'ĐẠT', 'KIÊN', 'KHOA', 'LONG', 'PHONG', 'QUÂN', 'VINH'];
  const SKILLS = ['Thợ chính Xây dựng', 'Thợ Cốt thép', 'Thợ Cốt pha', 'Thợ Cơ điện M&E', 'Thợ Hàn 3G', 'Thợ Hoàn thiện', 'Phụ hồ / Lao động'];

  function enrichOwnership(w) {
    const team = TEAMS.find(t => t.id === w.teamId) || TEAMS[0];
    const proj = PROJECTS.find(p => p.id === w.projectId) || PROJECTS[0];
    w.teamName = team.name;
    w.projectName = proj.name;
    w.roleName = w.roleName || w.skill || 'Thợ chính thi công';
    w.phone = w.phone || `0905.${String(100 + (w.seq % 899))}.${String(100 + ((w.seq * 7) % 899))}`;
    w.leaderName = team.leader;
    w.leaderUsername = team.leaderUsername;
    w.managerName = proj.manager;
    w.managerUsername = proj.managerUsername;
    w.createdBy = `${proj.manager} (${proj.id})`;
    if (!w.assignedTaskToday) {
      w.assignedTaskToday = team.dailyTargetTask;
    }
    w.joinDate = w.joinDate || `${String(1 + (w.seq % 12)).padStart(2, '0')}/11/2026`;
    w.partnerRate = w.partnerRate || 700000;
    w.daysPendingMonth = w.approvalStatus === 'DA_DUYET' ? 1 : 2;
    return w;
  }

  function buildAll108Workers() {
    const list = [];
    let seqCounter = 4937;
    const teamDistribution = [
      { teamId: 'D1', projectId: 'CT1', presentTarget: 20, leaveTarget: 2, unexcusedTarget: 1 },
      { teamId: 'D2', projectId: 'CT1', presentTarget: 20, leaveTarget: 2, unexcusedTarget: 0 },
      { teamId: 'D3', projectId: 'CT2', presentTarget: 16, leaveTarget: 1, unexcusedTarget: 1 },
      { teamId: 'D4', projectId: 'CT2', presentTarget: 16, leaveTarget: 1, unexcusedTarget: 0 },
      { teamId: 'D5', projectId: 'CT3', presentTarget: 11, leaveTarget: 0, unexcusedTarget: 1 },
      { teamId: 'D6', projectId: 'CT3', presentTarget: 11, leaveTarget: 0, unexcusedTarget: 0 }
    ];

    const counts = {};
    teamDistribution.forEach(t => {
      counts[t.teamId] = { present: 0, leave: 0, unexcused: 0 };
    });

    TOP_WORKERS.forEach((w, idx) => {
      counts[w.teamId].present++;
      const proj = PROJECTS.find(p => p.id === w.projectId);
      list.push(enrichOwnership({
        id: 'W' + (idx + 1),
        seq: w.seq,
        code: w.code,
        name: w.name,
        teamId: w.teamId,
        projectId: w.projectId,
        skill: w.skill,
        assignedTaskToday: w.task,
        dailyWage: w.dailyWage,
        checkInTime: w.time,
        checkOutTime: null,
        date: w.date,
        lat: w.lat,
        lng: w.lng,
        acc: w.acc,
        attendanceStatus: 'DANG_LAM',
        isLate: idx < 5,
        lateMin: idx < 5 ? w.lateMin : 0,
        hoursRegular: 8,
        hoursOtRegistered: idx % 3 === 0 ? 2 : 0,
        hoursOtActual: idx % 3 === 0 ? 2 : 0,
        forgotCheckoutFlag: idx === 1 || idx === 4,
        approvalStatus: idx < 6 ? 'CHO_DUYET' : 'DA_DUYET',
        approvedBy: idx < 6 ? null : proj.manager,
        daysMonthApproved: 22 - (idx % 4),
        otHoursMonthApproved: 14 + (idx % 5) * 2,
        sundayDaysMonth: idx % 2 === 0 ? 2 : 1,
        useRealSamplePhoto: !!w.useRealSamplePhoto,
        avatarSeed: idx + 1
      }));
    });

    let workerIdx = list.length + 1;
    teamDistribution.forEach((td, tIndex) => {
      const proj = PROJECTS.find(p => p.id === td.projectId);
      while (counts[td.teamId].present < td.presentTarget) {
        const i = workerIdx++;
        counts[td.teamId].present++;
        const fn = FIRST_NAMES[i % FIRST_NAMES.length];
        const mn = MID_NAMES[(i * 3) % MID_NAMES.length];
        const ln = LAST_NAMES[(i * 7) % LAST_NAMES.length];
        const min = String(Math.max(0, 59 - (i % 45))).padStart(2, '0');
        const sec = String((i * 13) % 60).padStart(2, '0');
        list.push(enrichOwnership({
          id: 'W' + i,
          seq: seqCounter--,
          code: i % 2 === 0 ? `NV.NP-${String(i).padStart(3, '0')}` : `CN.DTC.0${tIndex + 1}-${String(i).padStart(3, '0')}`,
          name: `${fn} ${mn} ${ln}`,
          teamId: td.teamId,
          projectId: td.projectId,
          skill: SKILLS[i % SKILLS.length],
          dailyWage: 420000 + (i % 5) * 20000,
          checkInTime: `07:${min}:${sec}`,
          checkOutTime: null,
          date: '22/11/2026',
          lat: Number((proj.lat + ((i % 9) - 4) * 0.00012).toFixed(5)),
          lng: Number((proj.lng + ((i % 7) - 3) * 0.00012).toFixed(5)),
          acc: 12 + (i % 65),
          attendanceStatus: 'DANG_LAM',
          isLate: false,
          lateMin: 0,
          hoursRegular: 8,
          hoursOtRegistered: i % 4 === 0 ? 2 : 0,
          hoursOtActual: i % 4 === 0 ? 2 : 0,
          forgotCheckoutFlag: i === 18 || i === 27,
          approvalStatus: i % 3 === 0 ? 'CHO_DUYET' : 'DA_DUYET',
          approvedBy: i % 3 === 0 ? null : proj.manager,
          daysMonthApproved: 20 + (i % 6),
          otHoursMonthApproved: (i % 6) * 3,
          sundayDaysMonth: i % 3 === 0 ? 2 : 1,
          useRealSamplePhoto: false,
          avatarSeed: i
        }));
      }

      while (counts[td.teamId].leave < td.leaveTarget) {
        const i = workerIdx++;
        counts[td.teamId].leave++;
        const fn = FIRST_NAMES[(i + 2) % FIRST_NAMES.length];
        const mn = MID_NAMES[(i * 5) % MID_NAMES.length];
        const ln = LAST_NAMES[(i * 3) % LAST_NAMES.length];
        list.push(enrichOwnership({
          id: 'W' + i,
          seq: seqCounter--,
          code: `CN.DTC.0${tIndex + 1}-${String(i).padStart(3, '0')}`,
          name: `${fn} ${mn} ${ln}`,
          teamId: td.teamId,
          projectId: td.projectId,
          skill: SKILLS[i % SKILLS.length],
          dailyWage: 440000,
          checkInTime: '--:--:--',
          checkOutTime: null,
          date: '22/11/2026',
          lat: proj.lat,
          lng: proj.lng,
          acc: 0,
          attendanceStatus: 'NGHI_PHEP',
          leaveReason: 'Xin nghỉ phép việc gia đình (Đã báo Đội trưởng)',
          isLate: false,
          lateMin: 0,
          hoursRegular: 0,
          hoursOtRegistered: 0,
          hoursOtActual: 0,
          forgotCheckoutFlag: false,
          approvalStatus: 'DA_DUYET',
          approvedBy: proj.manager,
          daysMonthApproved: 19,
          otHoursMonthApproved: 8,
          sundayDaysMonth: 1,
          useRealSamplePhoto: false,
          avatarSeed: i
        }));
      }

      while (counts[td.teamId].unexcused < td.unexcusedTarget) {
        const i = workerIdx++;
        counts[td.teamId].unexcused++;
        const fn = FIRST_NAMES[(i + 4) % FIRST_NAMES.length];
        const mn = MID_NAMES[(i * 2) % MID_NAMES.length];
        const ln = LAST_NAMES[(i * 9) % LAST_NAMES.length];
        list.push(enrichOwnership({
          id: 'W' + i,
          seq: seqCounter--,
          code: `CN.DTC.0${tIndex + 1}-${String(i).padStart(3, '0')}`,
          name: `${fn} ${mn} ${ln}`,
          teamId: td.teamId,
          projectId: td.projectId,
          skill: SKILLS[i % SKILLS.length],
          dailyWage: 420000,
          checkInTime: '--:--:--',
          checkOutTime: null,
          date: '22/11/2026',
          lat: proj.lat,
          lng: proj.lng,
          acc: 0,
          attendanceStatus: 'NGHI_KP',
          leaveReason: 'Vắng không lý do (Đội trưởng đã ghi nhận KP)',
          isLate: false,
          lateMin: 0,
          hoursRegular: 0,
          hoursOtRegistered: 0,
          hoursOtActual: 0,
          forgotCheckoutFlag: false,
          approvalStatus: 'CHO_DUYET',
          approvedBy: null,
          daysMonthApproved: 16,
          otHoursMonthApproved: 4,
          sundayDaysMonth: 0,
          useRealSamplePhoto: false,
          avatarSeed: i
        }));
      }
    });

    while (list.length < 108) {
      const i = workerIdx++;
      const tIndex = i % 6;
      const team = TEAMS[tIndex];
      const proj = PROJECTS.find(p => p.id === team.projectId);
      const fn = FIRST_NAMES[(i + 6) % FIRST_NAMES.length];
      const mn = MID_NAMES[(i * 4) % MID_NAMES.length];
      const ln = LAST_NAMES[(i * 11) % LAST_NAMES.length];
      list.push(enrichOwnership({
        id: 'W' + i,
        seq: seqCounter--,
        code: `NV.NP-${String(i).padStart(3, '0')}`,
        name: `${fn} ${mn} ${ln}`,
        teamId: team.id,
        projectId: proj.id,
        skill: 'Trực vật tư & An toàn ca',
        dailyWage: 450000,
        checkInTime: '06:30:10',
        checkOutTime: '14:30:00',
        date: '22/11/2026',
        lat: proj.lat,
        lng: proj.lng,
        acc: 15,
        attendanceStatus: 'DA_RA',
        isLate: false,
        lateMin: 0,
        hoursRegular: 8,
        hoursOtRegistered: 0,
        hoursOtActual: 0,
        forgotCheckoutFlag: false,
        approvalStatus: 'DA_DUYET',
        approvedBy: proj.manager,
        daysMonthApproved: 24,
        otHoursMonthApproved: 12,
        sundayDaysMonth: 2,
        useRealSamplePhoto: false,
        avatarSeed: i
      }));
    }

    return list;
  }

  const ADVANCES = [
    {
      id: 'ADV-01',
      workerCode: 'NV.SME-33',
      workerName: 'HỒ VĂN THAM',
      teamId: 'D1',
      projectId: 'CT1',
      managerName: 'KS. Trần Minh Hoàng',
      leaderName: 'ĐT1. Nguyễn Văn Sơn',
      date: '15/11/2026',
      amount: 3000000,
      reason: 'Ứng lương giữa tháng gửi về gia đình',
      approvalTier: 'BGD',
      accruedSalaryAtRequest: 9500000,
      status: 'BGD_DA_DUYET',
      checkedByKt: 'KTT. Lê Thị Thu Thảo',
      approvedByBgd: 'GĐ. Nguyễn Phát'
    },
    {
      id: 'ADV-02',
      workerCode: 'CN.DTC.08-002',
      workerName: 'LÊ TRẦN LONG',
      teamId: 'D1',
      projectId: 'CT1',
      managerName: 'KS. Trần Minh Hoàng',
      leaderName: 'ĐT1. Nguyễn Văn Sơn',
      date: '16/11/2026',
      amount: 1500000,
      reason: 'Ứng tiền sinh hoạt tổ đội (≤ 2tr Đội trưởng duyệt)',
      approvalTier: 'DT',
      accruedSalaryAtRequest: 8800000,
      status: 'DT_DA_DUYET',
      checkedByKt: 'KTT. Lê Thị Thu Thảo',
      approvedByBgd: 'ĐT1. Nguyễn Văn Sơn'
    },
    {
      id: 'ADV-03',
      workerCode: 'NV.SME-35',
      workerName: 'NGUYỄN QUỐC TUẤN',
      teamId: 'D3',
      projectId: 'CT2',
      managerName: 'KS. Phạm Quốc Bảo',
      leaderName: 'ĐT3. Vũ Đình Trọng',
      date: '22/11/2026',
      amount: 4000000,
      reason: 'Xin ứng lương đợt 2 tháng 11 (> 2tr trình Giám đốc)',
      approvalTier: 'BGD',
      accruedSalaryAtRequest: 10400000,
      status: 'CHO_BGD_DUYET',
      checkedByKt: 'KTT. Lê Thị Thu Thảo',
      approvedByBgd: null
    },
    {
      id: 'ADV-04',
      workerCode: 'CN.DTC.01-19',
      workerName: 'PHẠM THANH ĐẠI',
      teamId: 'D2',
      projectId: 'CT1',
      managerName: 'KS. Trần Minh Hoàng',
      leaderName: 'ĐT2. Lê Hoàng Nam',
      date: '22/11/2026',
      amount: 1800000,
      reason: 'Xin ứng tiền sửa xe đi làm (≤ 2tr Đội trưởng duyệt)',
      approvalTier: 'DT',
      accruedSalaryAtRequest: 8100000,
      status: 'CHO_DT_DUYET',
      checkedByKt: null,
      approvedByBgd: null
    },
    {
      id: 'ADV-05',
      workerCode: 'CN.DTC.02-01',
      workerName: 'VÕ TUẤN KIỆT',
      teamId: 'D5',
      projectId: 'CT3',
      managerName: 'KS. Đặng Văn Hùng',
      leaderName: 'ĐT5. Bùi Văn Kiên',
      date: '14/11/2026',
      amount: 3500000,
      reason: 'Ứng lương tuần 2 (> 2tr Giám đốc duyệt)',
      approvalTier: 'BGD',
      accruedSalaryAtRequest: 9200000,
      status: 'BGD_DA_DUYET',
      checkedByKt: 'KTT. Lê Thị Thu Thảo',
      approvedByBgd: 'GĐ. Nguyễn Phát'
    }
  ];

  // Danh sách Đơn Xin Nghỉ / Xếp Nghỉ (1 ngày = 0 công, Nửa ngày = 0.5 công, có lý do, Quản lý CT hoặc Giám đốc duyệt)
  const LEAVE_REQUESTS = [
    {
      id: 'NP-01',
      workerId: 'W2',
      workerCode: 'NV.SME-30',
      workerName: 'CÁI VĂN TIN',
      teamId: 'D1',
      teamName: 'Đội 1 (Kết cấu Bê tông)',
      projectId: 'CT1',
      managerName: 'KS. Trần Minh Hoàng',
      date: '23/11/2026',
      leaveType: 'NGHI_1_NGAY',
      leaveTypeLabel: 'Nghỉ 1 ngày (0 công)',
      workCredit: 0,
      reason: 'Về quê giải quyết việc gia đình',
      status: 'CHO_DUYET',
      approvedBy: ''
    },
    {
      id: 'NP-02',
      workerId: 'W3',
      workerCode: 'NV.SME-26',
      workerName: 'LƯU THANH TUẤN',
      teamId: 'D1',
      teamName: 'Đội 1 (Kết cấu Bê tông)',
      projectId: 'CT1',
      managerName: 'KS. Trần Minh Hoàng',
      date: '22/11/2026',
      leaveType: 'NGHI_NUA_NGAY',
      leaveTypeLabel: 'Nghỉ nửa ngày (0.5 công)',
      workCredit: 0.5,
      reason: 'Đi khám răng buổi chiều, sáng vẫn làm đủ',
      status: 'DA_DUYET',
      approvedBy: 'KS. Trần Minh Hoàng'
    },
    {
      id: 'NP-03',
      workerId: 'W7',
      workerCode: 'NV.SME-35',
      workerName: 'NGUYỄN QUỐC TUẤN',
      teamId: 'D3',
      teamName: 'Đội 3 (Cơ điện M&E)',
      projectId: 'CT2',
      managerName: 'KS. Phạm Quốc Bảo',
      date: '23/11/2026',
      leaveType: 'NGHI_1_NGAY',
      leaveTypeLabel: 'Nghỉ 1 ngày (0 công)',
      workCredit: 0,
      reason: 'Đưa con đi khám bệnh',
      status: 'CHO_DUYET',
      approvedBy: ''
    }
  ];

  const AUDIT_LOGS = [
    {
      id: 'LOG-102',
      timestamp: '22/11/2026 09:12:05',
      workerCode: 'NV.SME-26',
      workerName: 'LƯU THANH TUẤN',
      actor: 'KS. Trần Minh Hoàng (Quản lý CT1)',
      field: 'Giờ tăng ca ngày 21/11',
      oldValue: '0 giờ (Quá 17:30 quên Check-out, hệ thống tự khóa 8h HC)',
      newValue: '2.0 giờ tăng ca đổ bê tông sàn tầng 4',
      reason: 'Đội trưởng 1 đã bổ sung biên bản xác nhận đổ bê tông tối 21/11 có chữ ký Giám sát.'
    },
    {
      id: 'LOG-101',
      timestamp: '21/11/2026 18:05:22',
      workerCode: 'CN.DTC.01-20',
      workerName: 'HỒ VĂN HỘI',
      actor: 'KS. Phạm Quốc Bảo (Quản lý CT2)',
      field: 'Trạng thái công ngày 21/11',
      oldValue: 'Nghỉ không phép (KP)',
      newValue: 'Nghỉ phép (P)',
      reason: 'Công nhân bị sốt có giấy khám bệnh gửi bổ sung lúc chiều.'
    }
  ];

  const ACCOUNTS = [
    {
      id: 'ACC-01',
      username: 'admin',
      pin: '9999',
      fullName: 'GĐ. Nguyễn Phát',
      positionTitle: 'Tổng Giám Đốc (Admin)',
      roleId: 'BGD',
      level: 1,
      projectId: 'ALL',
      teamId: 'ALL',
      dailyWage: 0,
      createdBy: 'Hệ thống',
      status: 'ACTIVE',
      perms: { checkin: false, inputTeam: false, approveWork: true, accounting: true, approveDirector: true, adminUsers: true }
    },
    {
      id: 'ACC-02',
      username: 'ketoan01',
      pin: '8888',
      fullName: 'KTT. Lê Thị Thu Thảo',
      positionTitle: 'Kế Toán Trưởng (Hành chính - Kế toán)',
      roleId: 'KT',
      level: 2,
      projectId: 'CT1',
      teamId: 'VP-HC',
      workerCode: 'NV.KT-01',
      dailyWage: 550000,
      managerName: 'GĐ. Nguyễn Phát',
      createdBy: 'GĐ. Nguyễn Phát',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: false, approveWork: false, accounting: true, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-03',
      username: 'qlct_ct1',
      pin: '7771',
      fullName: 'KS. Trần Minh Hoàng',
      positionTitle: 'Quản lý Công trình CT1 (Riverside)',
      roleId: 'QLCT',
      level: 3,
      projectId: 'CT1',
      teamId: 'BCH-CT1',
      workerCode: 'NV.QLCT-01',
      dailyWage: 750000,
      managerName: 'GĐ. Nguyễn Phát',
      createdBy: 'GĐ. Nguyễn Phát',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: true, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-04',
      username: 'qlct_ct2',
      pin: '7772',
      fullName: 'KS. Phạm Quốc Bảo',
      positionTitle: 'Quản lý Công trình CT2 (NP Tower)',
      roleId: 'QLCT',
      level: 3,
      projectId: 'CT2',
      teamId: 'BCH-CT2',
      workerCode: 'NV.QLCT-02',
      dailyWage: 750000,
      managerName: 'GĐ. Nguyễn Phát',
      createdBy: 'GĐ. Nguyễn Phát',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: true, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-05',
      username: 'qlct_ct3',
      pin: '7773',
      fullName: 'KS. Đặng Văn Hùng',
      positionTitle: 'Quản lý Công trình CT3 (Nhà máy CNC)',
      roleId: 'QLCT',
      level: 3,
      projectId: 'CT3',
      teamId: 'BCH-CT3',
      workerCode: 'NV.QLCT-03',
      dailyWage: 750000,
      managerName: 'GĐ. Nguyễn Phát',
      createdBy: 'GĐ. Nguyễn Phát',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: true, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-06',
      username: 'doitruong1',
      pin: '1111',
      fullName: 'ĐT1. Nguyễn Văn Sơn',
      positionTitle: 'Đội trưởng Đội 1 (Thuộc KS. Trần Minh Hoàng)',
      roleId: 'DT1',
      level: 4,
      projectId: 'CT1',
      teamId: 'D1',
      workerCode: 'NV.DT-01',
      dailyWage: 600000,
      managerName: 'KS. Trần Minh Hoàng',
      createdBy: 'KS. Trần Minh Hoàng',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-07',
      username: 'doitruong2',
      pin: '2222',
      fullName: 'ĐT2. Lê Hoàng Nam',
      positionTitle: 'Đội trưởng Đội 2 (Thuộc KS. Trần Minh Hoàng)',
      roleId: 'DT1',
      level: 4,
      projectId: 'CT1',
      teamId: 'D2',
      workerCode: 'NV.DT-02',
      dailyWage: 600000,
      managerName: 'KS. Trần Minh Hoàng',
      createdBy: 'KS. Trần Minh Hoàng',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-08',
      username: 'doitruong3',
      pin: '3333',
      fullName: 'ĐT3. Vũ Đình Trọng',
      positionTitle: 'Đội trưởng Đội 3 (Thuộc KS. Phạm Quốc Bảo)',
      roleId: 'DT1',
      level: 4,
      projectId: 'CT2',
      teamId: 'D3',
      workerCode: 'NV.DT-03',
      dailyWage: 600000,
      managerName: 'KS. Phạm Quốc Bảo',
      createdBy: 'KS. Phạm Quốc Bảo',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-09',
      username: 'doitruong4',
      pin: '4444',
      fullName: 'ĐT4. Phan Thanh Hải',
      positionTitle: 'Đội trưởng Đội 4 (Thuộc KS. Phạm Quốc Bảo)',
      roleId: 'DT1',
      level: 4,
      projectId: 'CT2',
      teamId: 'D4',
      workerCode: 'NV.DT-04',
      dailyWage: 600000,
      managerName: 'KS. Phạm Quốc Bảo',
      createdBy: 'KS. Phạm Quốc Bảo',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-10',
      username: 'doitruong5',
      pin: '5555',
      fullName: 'ĐT5. Bùi Văn Kiên',
      positionTitle: 'Đội trưởng Đội 5 (Thuộc KS. Đặng Văn Hùng)',
      roleId: 'DT1',
      level: 4,
      projectId: 'CT3',
      teamId: 'D5',
      workerCode: 'NV.DT-05',
      dailyWage: 600000,
      managerName: 'KS. Đặng Văn Hùng',
      createdBy: 'KS. Đặng Văn Hùng',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-11',
      username: 'doitruong6',
      pin: '6666',
      fullName: 'ĐT6. Đỗ Minh Tuấn',
      positionTitle: 'Đội trưởng Đội 6 (Thuộc KS. Đặng Văn Hùng)',
      roleId: 'DT1',
      level: 4,
      projectId: 'CT3',
      teamId: 'D6',
      workerCode: 'NV.DT-06',
      dailyWage: 600000,
      managerName: 'KS. Đặng Văn Hùng',
      createdBy: 'KS. Đặng Văn Hùng',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-12',
      username: 'NV.SME-33',
      pin: '0000',
      fullName: 'HỒ VĂN THAM',
      positionTitle: 'Công nhân Đội 1 (Tổ phó thi công)',
      roleId: 'CN',
      level: 5,
      projectId: 'CT1',
      teamId: 'D1',
      workerCode: 'NV.SME-33',
      dailyWage: 500000,
      managerName: 'KS. Trần Minh Hoàng',
      leaderName: 'ĐT1. Nguyễn Văn Sơn',
      createdBy: 'ĐT1. Nguyễn Văn Sơn',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: false, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
    }
  ];

  // Hồ sơ chấm công của Cán bộ Văn phòng / Kế toán / Quản lý Công trình / Đội trưởng (Trừ Giám đốc) để Giám đốc & Kế toán kiểm tra
  const STAFF_ATTENDANCE = [
    {
      id: 'STF-KT01',
      seq: 5901,
      code: 'NV.KT-01',
      username: 'ketoan01',
      name: 'KTT. LÊ THỊ THU THẢO',
      roleId: 'KT',
      roleName: 'Kế Toán Trưởng (Hành chính - Kế toán)',
      teamId: 'VP-HC',
      teamName: 'Khối Văn phòng - Kế toán',
      leaderName: 'GĐ. Nguyễn Phát',
      leaderUsername: 'admin',
      projectId: 'CT1',
      projectName: 'Văn phòng Điều hành & CT1 Riverside',
      managerUsername: 'admin',
      managerName: 'GĐ. Nguyễn Phát (Tổng Giám đốc)',
      createdBy: 'GĐ. Nguyễn Phát',
      assignedTaskToday: 'Đối chiếu bảng công 6 Đội thi công, kiểm tra đơn ứng lương & lập bảng lương T11',
      phone: '0905.888.101',
      dailyWage: 550000,
      attendanceStatus: 'DANG_LAM',
      checkInTime: '07:45:10',
      checkOutTime: null,
      date: '22/11/2026',
      lat: 15.998583,
      lng: 107.988185,
      acc: 8,
      hoursRegular: 8,
      hoursOtRegistered: 0,
      hoursOtActual: 0,
      forgotCheckoutFlag: false,
      approvalStatus: 'DA_DUYET',
      approvedBy: 'GĐ. Nguyễn Phát',
      daysMonthApproved: 20,
      otHoursMonthApproved: 6,
      sundayDaysMonth: 0
    },
    {
      id: 'STF-QLCT1',
      seq: 5902,
      code: 'NV.QLCT-01',
      username: 'qlct_ct1',
      name: 'KS. TRẦN MINH HOÀNG',
      roleId: 'QLCT',
      roleName: 'Quản lý Công trình CT1 (Riverside)',
      teamId: 'BCH-CT1',
      teamName: 'Ban Chỉ Huy Công trình CT1',
      leaderName: 'GĐ. Nguyễn Phát',
      leaderUsername: 'admin',
      projectId: 'CT1',
      projectName: 'CT1 - KĐT Nguyên Phát Riverside',
      managerUsername: 'admin',
      managerName: 'GĐ. Nguyễn Phát (Tổng Giám đốc)',
      createdBy: 'GĐ. Nguyễn Phát',
      assignedTaskToday: 'Chỉ đạo Đội 1 & Đội 2 đổ bê tông sàn tầng 4, nghiệm thu cốt thép & duyệt công CT1',
      phone: '0905.777.101',
      dailyWage: 750000,
      attendanceStatus: 'DANG_LAM',
      checkInTime: '06:50:15',
      checkOutTime: null,
      date: '22/11/2026',
      lat: 15.998583,
      lng: 107.988185,
      acc: 9,
      hoursRegular: 8,
      hoursOtRegistered: 2,
      hoursOtActual: 2,
      forgotCheckoutFlag: false,
      approvalStatus: 'DA_DUYET',
      approvedBy: 'GĐ. Nguyễn Phát',
      daysMonthApproved: 21,
      otHoursMonthApproved: 14,
      sundayDaysMonth: 1
    },
    {
      id: 'STF-QLCT2',
      seq: 5903,
      code: 'NV.QLCT-02',
      username: 'qlct_ct2',
      name: 'KS. PHẠM QUỐC BẢO',
      roleId: 'QLCT',
      roleName: 'Quản lý Công trình CT2 (NP Tower)',
      teamId: 'BCH-CT2',
      teamName: 'Ban Chỉ Huy Công trình CT2',
      leaderName: 'GĐ. Nguyễn Phát',
      leaderUsername: 'admin',
      projectId: 'CT2',
      projectName: 'CT2 - Tổ Hợp Thương Mại & Căn Hộ NP Tower',
      managerUsername: 'admin',
      managerName: 'GĐ. Nguyễn Phát (Tổng Giám đốc)',
      createdBy: 'GĐ. Nguyễn Phát',
      assignedTaskToday: 'Điều phối Đội 3 M&E & Đội 4 Cốt pha thi công tầng 5-6 tháp Bắc, duyệt bảng công CT2',
      phone: '0905.777.202',
      dailyWage: 750000,
      attendanceStatus: 'DANG_LAM',
      checkInTime: '06:55:20',
      checkOutTime: null,
      date: '22/11/2026',
      lat: 15.999330,
      lng: 107.987220,
      acc: 10,
      hoursRegular: 8,
      hoursOtRegistered: 2,
      hoursOtActual: 2,
      forgotCheckoutFlag: false,
      approvalStatus: 'DA_DUYET',
      approvedBy: 'GĐ. Nguyễn Phát',
      daysMonthApproved: 21,
      otHoursMonthApproved: 12,
      sundayDaysMonth: 1
    },
    {
      id: 'STF-QLCT3',
      seq: 5904,
      code: 'NV.QLCT-03',
      username: 'qlct_ct3',
      name: 'KS. ĐẶNG VĂN HÙNG',
      roleId: 'QLCT',
      roleName: 'Quản lý Công trình CT3 (Nhà máy CNC)',
      teamId: 'BCH-CT3',
      teamName: 'Ban Chỉ Huy Công trình CT3',
      leaderName: 'GĐ. Nguyễn Phát',
      leaderUsername: 'admin',
      projectId: 'CT3',
      projectName: 'CT3 - Nhà Máy Công Nghệ Cao Nguyên Phát',
      managerUsername: 'admin',
      managerName: 'GĐ. Nguyễn Phát (Tổng Giám đốc)',
      createdBy: 'GĐ. Nguyễn Phát',
      assignedTaskToday: 'Giám sát lắp dựng kèo thép xưởng A2 & hạ tầng thoát nước Đội 5 - Đội 6',
      phone: '0905.777.303',
      dailyWage: 750000,
      attendanceStatus: 'DANG_LAM',
      checkInTime: '06:52:40',
      checkOutTime: null,
      date: '22/11/2026',
      lat: 15.997490,
      lng: 107.988550,
      acc: 11,
      hoursRegular: 8,
      hoursOtRegistered: 0,
      hoursOtActual: 0,
      forgotCheckoutFlag: false,
      approvalStatus: 'DA_DUYET',
      approvedBy: 'GĐ. Nguyễn Phát',
      daysMonthApproved: 20,
      otHoursMonthApproved: 10,
      sundayDaysMonth: 1
    },
    {
      id: 'STF-DT01',
      seq: 5905,
      code: 'NV.DT-01',
      username: 'doitruong1',
      name: 'ĐT1. NGUYỄN VĂN SƠN',
      roleId: 'DT1',
      roleName: 'Đội trưởng Đội 1 (Kết cấu Bê tông)',
      teamId: 'D1',
      teamName: 'Đội 1 (Kết cấu Bê tông)',
      leaderName: 'KS. Trần Minh Hoàng',
      leaderUsername: 'qlct_ct1',
      projectId: 'CT1',
      projectName: 'CT1 - KĐT Nguyên Phát Riverside',
      managerUsername: 'qlct_ct1',
      managerName: 'KS. Trần Minh Hoàng',
      createdBy: 'KS. Trần Minh Hoàng',
      assignedTaskToday: 'Chỉ huy 24 công nhân Đội 1 đổ bê tông sàn tầng 4 & điểm danh GPS toàn đội',
      phone: '0905.112.201',
      dailyWage: 600000,
      attendanceStatus: 'DANG_LAM',
      checkInTime: '06:45:00',
      checkOutTime: null,
      date: '22/11/2026',
      lat: 15.998583,
      lng: 107.988185,
      acc: 7,
      hoursRegular: 8,
      hoursOtRegistered: 2,
      hoursOtActual: 2,
      forgotCheckoutFlag: false,
      approvalStatus: 'DA_DUYET',
      approvedBy: 'KS. Trần Minh Hoàng',
      daysMonthApproved: 21,
      otHoursMonthApproved: 18,
      sundayDaysMonth: 2
    },
    {
      id: 'STF-DT02',
      seq: 5906,
      code: 'NV.DT-02',
      username: 'doitruong2',
      name: 'ĐT2. LÊ HOÀNG NAM',
      roleId: 'DT1',
      roleName: 'Đội trưởng Đội 2 (Xây trát & Hoàn thiện)',
      teamId: 'D2',
      teamName: 'Đội 2 (Xây trát & Hoàn thiện)',
      leaderName: 'KS. Trần Minh Hoàng',
      leaderUsername: 'qlct_ct1',
      projectId: 'CT1',
      projectName: 'CT1 - KĐT Nguyên Phát Riverside',
      managerUsername: 'qlct_ct1',
      managerName: 'KS. Trần Minh Hoàng',
      createdBy: 'KS. Trần Minh Hoàng',
      assignedTaskToday: 'Chỉ huy Đội 2 xây tường ngăn tầng 3 & nghiệm thu phẳng mặt trát',
      phone: '0905.112.202',
      dailyWage: 600000,
      attendanceStatus: 'DANG_LAM',
      checkInTime: '06:48:12',
      checkOutTime: null,
      date: '22/11/2026',
      lat: 15.998583,
      lng: 107.988185,
      acc: 9,
      hoursRegular: 8,
      hoursOtRegistered: 0,
      hoursOtActual: 0,
      forgotCheckoutFlag: false,
      approvalStatus: 'DA_DUYET',
      approvedBy: 'KS. Trần Minh Hoàng',
      daysMonthApproved: 20,
      otHoursMonthApproved: 12,
      sundayDaysMonth: 1
    },
    {
      id: 'STF-DT03',
      seq: 5907,
      code: 'NV.DT-03',
      username: 'doitruong3',
      name: 'ĐT3. VŨ ĐÌNH TRỌNG',
      roleId: 'DT1',
      roleName: 'Đội trưởng Đội 3 (Cơ điện M&E)',
      teamId: 'D3',
      teamName: 'Đội 3 (Cơ điện M&E)',
      leaderName: 'KS. Phạm Quốc Bảo',
      leaderUsername: 'qlct_ct2',
      projectId: 'CT2',
      projectName: 'CT2 - Tổ Hợp Thương Mại & Căn Hộ NP Tower',
      managerUsername: 'qlct_ct2',
      managerName: 'KS. Phạm Quốc Bảo',
      createdBy: 'KS. Phạm Quốc Bảo',
      assignedTaskToday: 'Chỉ huy Đội 3 lắp trục điện & ống PCCC tầng 5',
      phone: '0905.112.203',
      dailyWage: 600000,
      attendanceStatus: 'DANG_LAM',
      checkInTime: '06:51:05',
      checkOutTime: null,
      date: '22/11/2026',
      lat: 15.999330,
      lng: 107.987220,
      acc: 8,
      hoursRegular: 8,
      hoursOtRegistered: 2,
      hoursOtActual: 2,
      forgotCheckoutFlag: false,
      approvalStatus: 'DA_DUYET',
      approvedBy: 'KS. Phạm Quốc Bảo',
      daysMonthApproved: 21,
      otHoursMonthApproved: 16,
      sundayDaysMonth: 1
    },
    {
      id: 'STF-DT04',
      seq: 5908,
      code: 'NV.DT-04',
      username: 'doitruong4',
      name: 'ĐT4. PHAN THANH HẢI',
      roleId: 'DT1',
      roleName: 'Đội trưởng Đội 4 (Cốt pha & Cốt thép)',
      teamId: 'D4',
      teamName: 'Đội 4 (Cốt pha & Cốt thép)',
      leaderName: 'KS. Phạm Quốc Bảo',
      leaderUsername: 'qlct_ct2',
      projectId: 'CT2',
      projectName: 'CT2 - Tổ Hợp Thương Mại & Căn Hộ NP Tower',
      managerUsername: 'qlct_ct2',
      managerName: 'KS. Phạm Quốc Bảo',
      createdBy: 'KS. Phạm Quốc Bảo',
      assignedTaskToday: 'Chỉ huy Đội 4 lắp cốt thép dầm sàn tầng 6 khu B',
      phone: '0905.112.204',
      dailyWage: 600000,
      attendanceStatus: 'DANG_LAM',
      checkInTime: '06:49:33',
      checkOutTime: null,
      date: '22/11/2026',
      lat: 15.999330,
      lng: 107.987220,
      acc: 10,
      hoursRegular: 8,
      hoursOtRegistered: 2,
      hoursOtActual: 2,
      forgotCheckoutFlag: false,
      approvalStatus: 'DA_DUYET',
      approvedBy: 'KS. Phạm Quốc Bảo',
      daysMonthApproved: 21,
      otHoursMonthApproved: 14,
      sundayDaysMonth: 1
    },
    {
      id: 'STF-DT05',
      seq: 5909,
      code: 'NV.DT-05',
      username: 'doitruong5',
      name: 'ĐT5. BÙI VĂN KIÊN',
      roleId: 'DT1',
      roleName: 'Đội trưởng Đội 5 (Kết cấu Thép)',
      teamId: 'D5',
      teamName: 'Đội 5 (Kết cấu Thép)',
      leaderName: 'KS. Đặng Văn Hùng',
      leaderUsername: 'qlct_ct3',
      projectId: 'CT3',
      projectName: 'CT3 - Nhà Máy Công Nghệ Cao Nguyên Phát',
      managerUsername: 'qlct_ct3',
      managerName: 'KS. Đặng Văn Hùng',
      createdBy: 'KS. Đặng Văn Hùng',
      assignedTaskToday: 'Chỉ huy Đội 5 cẩu lắp vì kèo thép nhịp 24m xưởng A2',
      phone: '0905.112.205',
      dailyWage: 600000,
      attendanceStatus: 'DANG_LAM',
      checkInTime: '06:47:19',
      checkOutTime: null,
      date: '22/11/2026',
      lat: 15.997490,
      lng: 107.988550,
      acc: 9,
      hoursRegular: 8,
      hoursOtRegistered: 1.5,
      hoursOtActual: 1.5,
      forgotCheckoutFlag: false,
      approvalStatus: 'DA_DUYET',
      approvedBy: 'KS. Đặng Văn Hùng',
      daysMonthApproved: 20,
      otHoursMonthApproved: 15,
      sundayDaysMonth: 1
    },
    {
      id: 'STF-DT06',
      seq: 5910,
      code: 'NV.DT-06',
      username: 'doitruong6',
      name: 'ĐT6. ĐỖ MINH TUẤN',
      roleId: 'DT1',
      roleName: 'Đội trưởng Đội 6 (Hạ tầng & Cảnh quan)',
      teamId: 'D6',
      teamName: 'Đội 6 (Hạ tầng & Cảnh quan)',
      leaderName: 'KS. Đặng Văn Hùng',
      leaderUsername: 'qlct_ct3',
      projectId: 'CT3',
      projectName: 'CT3 - Nhà Máy Công Nghệ Cao Nguyên Phát',
      managerUsername: 'qlct_ct3',
      managerName: 'KS. Đặng Văn Hùng',
      createdBy: 'KS. Đặng Văn Hùng',
      assignedTaskToday: 'Chỉ huy Đội 6 thi công cống thoát nước & lu nền đường nội bộ',
      phone: '0905.112.206',
      dailyWage: 600000,
      attendanceStatus: 'DANG_LAM',
      checkInTime: '06:53:45',
      checkOutTime: null,
      date: '22/11/2026',
      lat: 15.997490,
      lng: 107.988550,
      acc: 8,
      hoursRegular: 8,
      hoursOtRegistered: 0,
      hoursOtActual: 0,
      forgotCheckoutFlag: false,
      approvalStatus: 'DA_DUYET',
      approvedBy: 'KS. Đặng Văn Hùng',
      daysMonthApproved: 20,
      otHoursMonthApproved: 10,
      sundayDaysMonth: 1
    }
  ];

  // Danh sách Yêu cầu Xóa Tài khoản / Nhân sự (Cần xác nhận & Được sự đồng ý phê duyệt của Tổng Giám đốc trước khi xóa)
  const DELETE_REQUESTS = [
    {
      id: 'DEL-01',
      targetType: 'WORKER',
      targetId: 'W108',
      targetCode: 'NV.NP-108',
      targetName: 'LÝ HOÀNG VINH',
      targetRole: 'Công nhân Đội 6 (CT3)',
      requestedBy: 'KS. Đặng Văn Hùng',
      requestedRole: 'Quản lý Công trình CT3',
      reason: 'Công nhân đã kết thúc hợp đồng thời vụ và bàn giao đủ đồ bảo hộ lao động.',
      createdAt: '22/11/2026 08:20',
      status: 'CHO_BGD_DONG_Y'
    }
  ];

  ACCOUNTS.forEach((a, idx) => {
    a.joinDate = a.joinDate || `0${1 + (idx % 8)}/11/2026`;
    a.partnerRate = a.partnerRate || (a.roleId === 'QLCT' ? 950000 : (a.roleId === 'DT1' ? 800000 : 700000));
  });

  return {
    projects: PROJECTS,
    teams: TEAMS,
    tasks: TASKS,
    roles: ROLES,
    accounts: ACCOUNTS,
    staffAttendance: STAFF_ATTENDANCE,
    deleteRequests: DELETE_REQUESTS,
    leaveRequests: LEAVE_REQUESTS,
    allowAccountantSeePartnerPrice: false,
    workers: buildAll108Workers(),
    advances: ADVANCES,
    auditLogs: AUDIT_LOGS,
    payrollMonthStatus: 'CHO_BGD_DUYET',
    cutoffTimeStandard: '17:30'
  };
})();
