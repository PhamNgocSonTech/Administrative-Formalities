export const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  needs_review: 'Cần rà soát',
  pending_approval: 'Chờ duyệt',
  rejected: 'Bị trả lại',
  approved: 'Đã duyệt',
  published: 'Đang công khai',
  superseded: 'Bị thay thế',
  withdrawn: 'Ngừng công khai',
  cancelled: 'Đã hủy',
  extracted: 'Đã tách',
  needs_fix: 'Cần xem lại',
  unused: 'Không dùng',
  proposed: 'Đề xuất',
  confirmed: 'Đã xác nhận',
}

export const FORM_TYPE: Record<string, string> = {
  application: 'Mẫu người nộp',
  result: 'Mẫu kết quả',
  unclassified: 'Chưa phân loại',
}

export const MATCH_LABEL: Record<string, string> = {
  khop: 'Khớp',
  khong_tim_thay: 'Chưa tìm thấy',
  trung_ma: 'Trùng mã',
  xung_dot_qd_chinh: 'Đã có QĐ chính khác',
  da_gan_qd_nay: 'Đã gắn QĐ này',
  dang_cho_duyet: 'Đang chờ duyệt',
  can_tao_ban_nhap: 'Đã ngừng/không có bản nháp',
  dang_cong_khai: 'Đang công khai',
}

/** Màu Tailwind theo trạng thái — dựa trên design system của dự án. */
export function statusClass(status: string): string {
  switch (status) {
    case 'published':
    case 'approved':
    case 'confirmed':
      return 'bg-secondary-container text-on-secondary-container'
    case 'pending_approval':
    case 'needs_review':
    case 'needs_fix':
    case 'proposed':
      return 'bg-tertiary-container text-on-tertiary-container'
    case 'rejected':
    case 'cancelled':
      return 'bg-error-container text-on-error-container'
    case 'superseded':
    case 'withdrawn':
    case 'unused':
      return 'bg-surface-container-high text-on-surface-variant'
    case 'draft':
    case 'extracted':
    default:
      return 'bg-primary-container/60 text-on-primary-container'
  }
}
