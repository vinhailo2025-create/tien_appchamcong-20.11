// Dữ liệu mẫu khởi tạo cho Hệ thống NP ONE - Nguyên Phát Human Resources (108 Công nhân, 3 Công trình, 6 Đội)
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
      manager: 'KS. Trần Minh Hoàng',
      managerRole: 'Quản lý công trình CT1'
    },
    {
      id: 'CT2',
      code: 'CT-NP02',
      name: 'CT2 - Tổ Hợp Thương Mại & Căn Hộ NP Tower',
      address: 'Nguyễn Văn Linh, Q. Sơn Trà, TP. Đà Nẵng',
      lat: 15.999330,
      lng: 107.987220,
      radiusM: 200,
      manager: 'KS. Phạm Quốc Bảo',
      managerRole: 'Quản lý công trình CT2'
    },
    {
      id: 'CT3',
      code: 'CT-NP03',
      name: 'CT3 - Nhà Máy Công Nghệ Cao Nguyên Phát',
      address: 'KCN Hòa Khánh, Q. Liên Chiểu, TP. Đà Nẵng',
      lat: 15.997490,
      lng: 107.988550,
      radiusM: 250,
      manager: 'KS. Đặng Văn Hùng',
      managerRole: 'Quản lý công trình CT3'
    }
  ];

  const TEAMS = [
    { id: 'D1', name: 'Đội 1 (Kết cấu Bê tông)', leader: 'Đội trưởng 1 - Nguyễn Văn Sơn', projectId: 'CT1', phone: '0905.112.201' },
    { id: 'D2', name: 'Đội 2 (Xây trát & Hoàn thiện)', leader: 'Đội trưởng 2 - Lê Hoàng Nam', projectId: 'CT1', phone: '0905.112.202' },
    { id: 'D3', name: 'Đội 3 (Cơ điện M&E)', leader: 'Đội trưởng 3 - Vũ Đình Trọng', projectId: 'CT2', phone: '0905.112.203' },
    { id: 'D4', name: 'Đội 4 (Cốt pha & Cốt thép)', leader: 'Đội trưởng 4 - Phan Thanh Hải', projectId: 'CT2', phone: '0905.112.204' },
    { id: 'D5', name: 'Đội 5 (Kết cấu Thép)', leader: 'Đội trưởng 5 - Bùi Văn Kiên', projectId: 'CT3', phone: '0905.112.205' },
    { id: 'D6', name: 'Đội 6 (Hạ tầng & Cảnh quan)', leader: 'Đội trưởng 6 - Đỗ Minh Tuấn', projectId: 'CT3', phone: '0905.112.206' }
  ];

  const ROLES = [
    {
      id: 'BGD',
      level: 1,
      title: 'Ban Giám Đốc (Cấp 1)',
      personName: 'GĐ. Nguyễn Phát',
      pin: '9999',
      badgeColor: '#0f766e',
      permissions: ['Xem báo cáo 08:30', 'Kiểm soát toàn bộ công trình', 'Phê duyệt Ứng lương', 'Phê duyệt Bảng lương & Thanh toán', 'Mở khóa điều chỉnh đặc biệt']
    },
    {
      id: 'KT',
      level: 2,
      title: 'Hành Chính – Kế Toán (Cấp 2)',
      personName: 'KTT. Lê Thị Thu Thảo',
      pin: '8888',
      badgeColor: '#1e4e79',
      permissions: ['Tổng hợp công Ngày/Tuần/Tháng', 'Kiểm tra đề xuất Ứng lương', 'Tính lương trên bảng công ĐÃ DUYỆT', 'Xuất Phiếu lương & Excel']
    },
    {
      id: 'QLCT',
      level: 3,
      title: 'Quản Lý Công Trình (Cấp 3)',
      personName: 'KS. Trần Minh Hoàng',
      pin: '7777',
      badgeColor: '#2c6293',
      permissions: ['Đối chiếu quân số & ảnh định vị GPS', 'Duyệt bảng công ngày/tuần (Khóa bảng công)', 'Duyệt phiếu đăng ký tăng ca', 'Điều chỉnh có lưu lý do (Audit Log)']
    },
    {
      id: 'DT1',
      level: 4,
      title: 'Đội Trưởng Đội 1 (Cấp 4)',
      personName: 'ĐT1. Nguyễn Văn Sơn',
      teamId: 'D1',
      pin: '1111',
      badgeColor: '#b45309',
      permissions: ['Chấm công đội (Đi làm/Nghỉ phép/KP/Đi muộn)', 'Chụp Camera trực tiếp điểm danh hộ', 'Đăng ký tăng ca', 'Xác nhận giờ ra ca quên Check-out', 'KHÔNG được tự duyệt công']
    },
    {
      id: 'CN',
      level: 5,
      title: 'Công Nhân (Cấp 5)',
      personName: 'CN. Hồ Văn Tham (NV.SME-33)',
      workerCode: 'NV.SME-33',
      pin: '0000',
      badgeColor: '#15803d',
      permissions: ['Chụp Camera trực tiếp GPS điểm danh', 'Báo nghỉ phép', 'Gửi yêu cầu xin ứng lương', 'Kiểm tra số công & phiếu lương cá nhân']
    }
  ];

  // 13 công nhân đầu tiên khớp 100% với ảnh chụp màn hình SME thực tế của bạn
  const TOP_WORKERS = [
    { seq: 4950, time: '08:15:44', date: '18/10/2026', code: 'CN.DTC.08-002', name: 'LÊ TRẦN LONG', lat: 15.99962, lng: 107.98710, acc: 40, teamId: 'D1', projectId: 'CT1', dailyWage: 480000, skill: 'Thợ chính Kết cấu', status: 'DANG_LAM', lateMin: 15 },
    { seq: 4949, time: '08:13:17', date: '18/10/2026', code: 'NV.SME-30', name: 'CÁI VĂN TIN', lat: 15.99749, lng: 107.98855, acc: 100, teamId: 'D1', projectId: 'CT1', dailyWage: 460000, skill: 'Thợ sắt', status: 'DANG_LAM', lateMin: 13 },
    { seq: 4948, time: '08:11:15', date: '18/10/2026', code: 'NV.SME-26', name: 'LƯU THANH TUẤN', lat: 15.99985, lng: 107.98813, acc: 14, teamId: 'D1', projectId: 'CT1', dailyWage: 450000, skill: 'Thợ bê tông', status: 'DANG_LAM', lateMin: 11 },
    { seq: 4947, time: '08:09:03', date: '18/10/2026', code: 'NV.SME-33', name: 'HỒ VĂN THAM', lat: 15.99858, lng: 107.98818, acc: 100, teamId: 'D1', projectId: 'CT1', dailyWage: 500000, skill: 'Tổ phó thi công', status: 'DANG_LAM', lateMin: 9, useRealSamplePhoto: true },
    { seq: 4946, time: '08:08:27', date: '18/10/2026', code: 'CN.DTC.01-19', name: 'PHẠM THANH ĐẠI', lat: 15.99989, lng: 107.98811, acc: 91, teamId: 'D2', projectId: 'CT1', dailyWage: 450000, skill: 'Thợ xây trát', status: 'DANG_LAM', lateMin: 8 },
    { seq: 4945, time: '08:08:05', date: '18/10/2026', code: 'CN.DTC.02-014', name: 'Nguyễn Lâm Vũ', lat: 15.99835, lng: 107.98569, acc: 57, teamId: 'D2', projectId: 'CT1', dailyWage: 440000, skill: 'Thợ hoàn thiện', status: 'DANG_LAM', lateMin: 0 },
    { seq: 4944, time: '08:07:55', date: '18/10/2026', code: 'NV.SME-35', name: 'NGUYỄN QUỐC TUẤN', lat: 15.99933, lng: 107.98722, acc: 25, teamId: 'D3', projectId: 'CT2', dailyWage: 520000, skill: 'Thợ điện M&E', status: 'DANG_LAM', lateMin: 0 },
    { seq: 4943, time: '08:07:40', date: '18/10/2026', code: 'NV.SME-20', name: 'TRẦN THANH TÌNH', lat: 15.99826, lng: 107.98769, acc: 23, teamId: 'D3', projectId: 'CT2', dailyWage: 480000, skill: 'Thợ nước M&E', status: 'DANG_LAM', lateMin: 0 },
    { seq: 4942, time: '08:07:35', date: '18/10/2026', code: 'CN.DTC.01-20', name: 'HỒ VĂN HỘI', lat: 15.99823, lng: 107.98818, acc: 100, teamId: 'D4', projectId: 'CT2', dailyWage: 450000, skill: 'Thợ cốt pha', status: 'DANG_LAM', lateMin: 0 },
    { seq: 4941, time: '08:07:31', date: '18/10/2026', code: 'CN.DTC.01-07', name: 'TRÀ TẤN TÀI', lat: 15.99989, lng: 107.98811, acc: 25, teamId: 'D4', projectId: 'CT2', dailyWage: 450000, skill: 'Thợ cốt thép', status: 'DANG_LAM', lateMin: 0 },
    { seq: 4940, time: '08:06:35', date: '18/10/2026', code: 'CN.DTC.02-01', name: 'VÕ TUẤN KIỆT', lat: 15.99889, lng: 107.98841, acc: 90, teamId: 'D5', projectId: 'CT3', dailyWage: 500000, skill: 'Thợ hàn kết cấu', status: 'DANG_LAM', lateMin: 0 },
    { seq: 4939, time: '08:06:34', date: '18/10/2026', code: 'NV.SME-045', name: 'Nguyễn Nhật Tiến', lat: 15.99901, lng: 107.98792, acc: 9, teamId: 'D5', projectId: 'CT3', dailyWage: 470000, skill: 'Thợ lắp dựng', status: 'DANG_LAM', lateMin: 0 },
    { seq: 4938, time: '08:06:14', date: '18/10/2026', code: 'NV.SME-37', name: 'KHƯU VĂN TUẤN', lat: 15.99916, lng: 107.98726, acc: 40, teamId: 'D6', projectId: 'CT3', dailyWage: 460000, skill: 'Thợ hạ tầng', status: 'DANG_LAM', lateMin: 0 }
  ];

  const FIRST_NAMES = ['NGUYỄN', 'TRẦN', 'LÊ', 'PHẠM', 'HOÀNG', 'HUỲNH', 'PHAN', 'VŨ', 'VÕ', 'ĐẶNG', 'BÙI', 'ĐỖ', 'HỒ', 'NGÔ', 'DƯƠNG', 'LÝ'];
  const MID_NAMES = ['VĂN', 'THANH', 'MINH', 'QUỐC', 'HỮU', 'ĐỨC', 'ĐÌNH', 'XUÂN', 'NGỌC', 'HOÀNG', 'TRỌNG', 'BÁ'];
  const LAST_NAMES = ['HÙNG', 'DŨNG', 'NAM', 'HẢI', 'SƠN', 'THẮNG', 'CƯỜNG', 'BÌNH', 'PHÚC', 'LỘC', 'THỌ', 'TÂM', 'TÀI', 'ĐẠT', 'KIÊN', 'KHOA', 'LONG', 'PHONG', 'QUÂN', 'VINH'];
  const SKILLS = ['Thợ chính Xây dựng', 'Thợ Cốt thép', 'Thợ Cốt pha', 'Thợ Cơ điện M&E', 'Thợ Hàn 3G', 'Thợ Hoàn thiện', 'Phụ hồ / Lao động'];

  function buildAll108Workers() {
    const list = [];
    // Phân bổ 108 công nhân: CT1 = 45 (40 có mặt, 3 phép, 2 KP), CT2 = 37 (32 có mặt, 3 phép, 2 KP? Tổng toàn công ty: 94 có mặt [trong đó 5 đi muộn], 6 nghỉ phép, 3 nghỉ không phép, 5 đã check-out/ca đêm = 108!)
    // Để khớp chính xác câu báo cáo 08:30:
    // Tổng = 108 công nhân:
    // - Có mặt (Đang làm): 94 người (CT1: 40 | CT2: 32 | CT3: 22), trong đó có 5 người Đi muộn
    // - Nghỉ phép: 6 người
    // - Nghỉ không phép: 3 người
    // - Đã hoàn thành ca sớm / Điều chuyển ca: 5 người (hoặc tổng 103 + 5 = 108)
    // Hãy chia đúng 108 công nhân sao cho:
    // Có mặt = 94 (CT1: 40, CT2: 32, CT3: 22), Nghỉ phép = 6, Nghỉ không phép = 3, Trực kho/Bảo trì = 5 (hoặc tổng 108)!

    let seqCounter = 4937;
    const teamDistribution = [
      { teamId: 'D1', projectId: 'CT1', presentTarget: 20, leaveTarget: 2, unexcusedTarget: 1 },
      { teamId: 'D2', projectId: 'CT1', presentTarget: 20, leaveTarget: 2, unexcusedTarget: 0 },
      { teamId: 'D3', projectId: 'CT2', presentTarget: 16, leaveTarget: 1, unexcusedTarget: 1 },
      { teamId: 'D4', projectId: 'CT2', presentTarget: 16, leaveTarget: 1, unexcusedTarget: 0 },
      { teamId: 'D5', projectId: 'CT3', presentTarget: 11, leaveTarget: 0, unexcusedTarget: 1 },
      { teamId: 'D6', projectId: 'CT3', presentTarget: 11, leaveTarget: 0, unexcusedTarget: 0 }
    ];
    // Tổng presentTarget = 40 + 32 + 22 = 94!
    // Tổng leaveTarget = 6!
    // Tổng unexcusedTarget = 3!
    // Còn 5 người ở trạng thái "CA_CHIEU" (Ca chiều / Điều động) để tròn đúng 108 công nhân!

    const counts = {};
    teamDistribution.forEach(t => {
      counts[t.teamId] = { present: 0, leave: 0, unexcused: 0, shift2: 0 };
    });

    // Đưa 13 người đầu tiên vào
    TOP_WORKERS.forEach((w, idx) => {
      counts[w.teamId].present++;
      list.push({
        id: 'W' + (idx + 1),
        seq: w.seq,
        code: w.code,
        name: w.name,
        teamId: w.teamId,
        projectId: w.projectId,
        skill: w.skill,
        dailyWage: w.dailyWage,
        checkInTime: w.time,
        checkOutTime: null,
        date: w.date,
        lat: w.lat,
        lng: w.lng,
        acc: w.acc,
        attendanceStatus: 'DANG_LAM', // DANG_LAM, DA_RA, NGHI_PHEP, NGHI_KP, CA_CHIEU
        isLate: idx < 5, // 5 người đầu đi muộn sau 08:08
        lateMin: idx < 5 ? w.lateMin : 0,
        hoursRegular: 8,
        hoursOtRegistered: idx % 3 === 0 ? 2 : 0,
        hoursOtActual: idx % 3 === 0 ? 2 : 0,
        forgotCheckoutFlag: idx === 1 || idx === 4, // 2 trường hợp quên check-out hôm trước/sau 17:30 để test
        approvalStatus: idx < 6 ? 'CHO_DUYET' : 'DA_DUYET', // Quản lý công trình duyệt
        approvedBy: idx < 6 ? null : 'KS. Trần Minh Hoàng',
        daysMonthApproved: 22 - (idx % 4),
        otHoursMonthApproved: 14 + (idx % 5) * 2,
        sundayDaysMonth: idx % 2 === 0 ? 2 : 1,
        useRealSamplePhoto: !!w.useRealSamplePhoto,
        avatarSeed: idx + 1
      });
    });

    // Sinh tiếp cho đủ 108 người
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
        list.push({
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
          date: '18/10/2026',
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
        });
      }

      // Nghỉ phép
      while (counts[td.teamId].leave < td.leaveTarget) {
        const i = workerIdx++;
        counts[td.teamId].leave++;
        const fn = FIRST_NAMES[(i + 2) % FIRST_NAMES.length];
        const mn = MID_NAMES[(i * 5) % MID_NAMES.length];
        const ln = LAST_NAMES[(i * 3) % LAST_NAMES.length];
        list.push({
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
          date: '18/10/2026',
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
        });
      }

      // Nghỉ không phép
      while (counts[td.teamId].unexcused < td.unexcusedTarget) {
        const i = workerIdx++;
        counts[td.teamId].unexcused++;
        const fn = FIRST_NAMES[(i + 4) % FIRST_NAMES.length];
        const mn = MID_NAMES[(i * 2) % MID_NAMES.length];
        const ln = LAST_NAMES[(i * 9) % LAST_NAMES.length];
        list.push({
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
          date: '18/10/2026',
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
        });
      }
    });

    // Thêm 5 công nhân Đã hoàn thành ca / Ca trực đêm để tổng tròn đúng 108 công nhân
    while (list.length < 108) {
      const i = workerIdx++;
      const tIndex = i % 6;
      const team = TEAMS[tIndex];
      const proj = PROJECTS.find(p => p.id === team.projectId);
      const fn = FIRST_NAMES[(i + 6) % FIRST_NAMES.length];
      const mn = MID_NAMES[(i * 4) % MID_NAMES.length];
      const ln = LAST_NAMES[(i * 11) % LAST_NAMES.length];
      list.push({
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
        date: '18/10/2026',
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
      });
    }

    return list;
  }

  // Danh sách Ứng lương (Mọi khoản ứng lương đều phải được duyệt)
  const ADVANCES = [
    {
      id: 'ADV-01',
      workerCode: 'NV.SME-33',
      workerName: 'HỒ VĂN THAM',
      teamId: 'D1',
      projectId: 'CT1',
      date: '15/10/2026',
      amount: 3000000,
      reason: 'Ứng lương giữa tháng gửi về gia đình',
      accruedSalaryAtRequest: 9500000,
      status: 'BGD_DA_DUYET', // CHO_KT_KIEM_TRA -> CHO_BGD_DUYET -> BGD_DA_DUYET -> TU_CHOI
      checkedByKt: 'KTT. Lê Thị Thu Thảo',
      approvedByBgd: 'GĐ. Nguyễn Phát'
    },
    {
      id: 'ADV-02',
      workerCode: 'CN.DTC.08-002',
      workerName: 'LÊ TRẦN LONG',
      teamId: 'D1',
      projectId: 'CT1',
      date: '16/10/2026',
      amount: 2500000,
      reason: 'Ứng tiền sinh hoạt tổ đội',
      accruedSalaryAtRequest: 8800000,
      status: 'BGD_DA_DUYET',
      checkedByKt: 'KTT. Lê Thị Thu Thảo',
      approvedByBgd: 'GĐ. Nguyễn Phát'
    },
    {
      id: 'ADV-03',
      workerCode: 'NV.SME-35',
      workerName: 'NGUYỄN QUỐC TUẤN',
      teamId: 'D3',
      projectId: 'CT2',
      date: '18/10/2026',
      amount: 4000000,
      reason: 'Xin ứng lương đợt 2 tháng 10',
      accruedSalaryAtRequest: 10400000,
      status: 'CHO_BGD_DUYET',
      checkedByKt: 'KTT. Lê Thị Thu Thảo (Đã đối chiếu 20 công đã duyệt)',
      approvedByBgd: null
    },
    {
      id: 'ADV-04',
      workerCode: 'CN.DTC.01-19',
      workerName: 'PHẠM THANH ĐẠI',
      teamId: 'D2',
      projectId: 'CT1',
      date: '18/10/2026',
      amount: 2000000,
      reason: 'Xin ứng tiền sửa xe đi làm',
      accruedSalaryAtRequest: 8100000,
      status: 'CHO_KT_KIEM_TRA',
      checkedByKt: null,
      approvedByBgd: null
    },
    {
      id: 'ADV-05',
      workerCode: 'CN.DTC.02-01',
      workerName: 'VÕ TUẤN KIỆT',
      teamId: 'D5',
      projectId: 'CT3',
      date: '14/10/2026',
      amount: 3500000,
      reason: 'Ứng lương tuần 2',
      accruedSalaryAtRequest: 9200000,
      status: 'BGD_DA_DUYET',
      checkedByKt: 'KTT. Lê Thị Thu Thảo',
      approvedByBgd: 'GĐ. Nguyễn Phát'
    }
  ];

  // Lịch sử điều chỉnh công (Audit Log - Bảng công đã duyệt không tự ý sửa, mọi điều chỉnh phải có lý do)
  const AUDIT_LOGS = [
    {
      id: 'LOG-102',
      timestamp: '18/10/2026 09:12:05',
      workerCode: 'NV.SME-26',
      workerName: 'LƯU THANH TUẤN',
      actor: 'KS. Trần Minh Hoàng (Quản lý CT1)',
      field: 'Giờ tăng ca ngày 17/10',
      oldValue: '0 giờ (Quá 17:30 quên Check-out, hệ thống tự khóa 8h HC)',
      newValue: '2.0 giờ tăng ca đổ bê tông sàn tầng 4',
      reason: 'Đội trưởng 1 đã bổ sung biên bản xác nhận đổ bê tông tối 17/10 có chữ ký Giám sát.'
    },
    {
      id: 'LOG-101',
      timestamp: '17/10/2026 18:05:22',
      workerCode: 'CN.DTC.01-20',
      workerName: 'HỒ VĂN HỘI',
      actor: 'KS. Phạm Quốc Bảo (Quản lý CT2)',
      field: 'Trạng thái công ngày 17/10',
      oldValue: 'Nghỉ không phép (KP)',
      newValue: 'Nghỉ phép (P)',
      reason: 'Công nhân bị sốt có giấy khám bệnh gửi bổ sung lúc chiều.'
    }
  ];

  // Danh sách Tài khoản Hệ thống theo từng vị trí (Admin có thể Tạo mới / Sửa / Khóa / Phân quyền)
  const ACCOUNTS = [
    {
      id: 'ACC-01',
      username: 'admin',
      pin: '9999',
      fullName: 'GĐ. Nguyễn Phát (Admin Tổng)',
      positionTitle: 'Admin & Ban Giám Đốc',
      roleId: 'BGD',
      level: 1,
      projectId: 'ALL',
      teamId: 'ALL',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: true, accounting: true, approveDirector: true, adminUsers: true }
    },
    {
      id: 'ACC-02',
      username: 'ketoan01',
      pin: '8888',
      fullName: 'KTT. Lê Thị Thu Thảo',
      positionTitle: 'Hành Chính – Kế Toán',
      roleId: 'KT',
      level: 2,
      projectId: 'ALL',
      teamId: 'ALL',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: false, approveWork: false, accounting: true, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-03',
      username: 'qlct_ct1',
      pin: '7771',
      fullName: 'KS. Trần Minh Hoàng',
      positionTitle: 'Quản lý Công trình CT1',
      roleId: 'QLCT',
      level: 3,
      projectId: 'CT1',
      teamId: 'ALL',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: true, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-04',
      username: 'qlct_ct2',
      pin: '7772',
      fullName: 'KS. Phạm Quốc Bảo',
      positionTitle: 'Quản lý Công trình CT2',
      roleId: 'QLCT',
      level: 3,
      projectId: 'CT2',
      teamId: 'ALL',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: true, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-05',
      username: 'qlct_ct3',
      pin: '7773',
      fullName: 'KS. Đặng Văn Hùng',
      positionTitle: 'Quản lý Công trình CT3',
      roleId: 'QLCT',
      level: 3,
      projectId: 'CT3',
      teamId: 'ALL',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: true, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-06',
      username: 'doitruong1',
      pin: '1111',
      fullName: 'ĐT1. Nguyễn Văn Sơn',
      positionTitle: 'Đội trưởng Đội 1 (Kết cấu)',
      roleId: 'DT1',
      level: 4,
      projectId: 'CT1',
      teamId: 'D1',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-07',
      username: 'doitruong2',
      pin: '2222',
      fullName: 'ĐT2. Lê Hoàng Nam',
      positionTitle: 'Đội trưởng Đội 2 (Hoàn thiện)',
      roleId: 'DT1',
      level: 4,
      projectId: 'CT1',
      teamId: 'D2',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-08',
      username: 'doitruong3',
      pin: '3333',
      fullName: 'ĐT3. Vũ Đình Trọng',
      positionTitle: 'Đội trưởng Đội 3 (Cơ điện M&E)',
      roleId: 'DT1',
      level: 4,
      projectId: 'CT2',
      teamId: 'D3',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-09',
      username: 'doitruong4',
      pin: '4444',
      fullName: 'ĐT4. Phan Thanh Hải',
      positionTitle: 'Đội trưởng Đội 4 (Cốt pha)',
      roleId: 'DT1',
      level: 4,
      projectId: 'CT2',
      teamId: 'D4',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-10',
      username: 'doitruong5',
      pin: '5555',
      fullName: 'ĐT5. Bùi Văn Kiên',
      positionTitle: 'Đội trưởng Đội 5 (Kết cấu thép)',
      roleId: 'DT1',
      level: 4,
      projectId: 'CT3',
      teamId: 'D5',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-11',
      username: 'doitruong6',
      pin: '6666',
      fullName: 'ĐT6. Đỗ Minh Tuấn',
      positionTitle: 'Đội trưởng Đội 6 (Hạ tầng)',
      roleId: 'DT1',
      level: 4,
      projectId: 'CT3',
      teamId: 'D6',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: true, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
    },
    {
      id: 'ACC-12',
      username: 'NV.SME-33',
      pin: '0000',
      fullName: 'CN. Hồ Văn Tham',
      positionTitle: 'Công nhân Đội 1',
      roleId: 'CN',
      level: 5,
      projectId: 'CT1',
      teamId: 'D1',
      workerCode: 'NV.SME-33',
      status: 'ACTIVE',
      perms: { checkin: true, inputTeam: false, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
    }
  ];

  return {
    projects: PROJECTS,
    teams: TEAMS,
    roles: ROLES,
    accounts: ACCOUNTS,
    workers: buildAll108Workers(),
    advances: ADVANCES,
    auditLogs: AUDIT_LOGS,
    payrollMonthStatus: 'CHO_BGD_DUYET', // CHO_BGD_DUYET | BGD_DA_DUYET
    cutoffTimeStandard: '17:30'
  };
})();
