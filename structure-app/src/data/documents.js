/** Legal / policy / compliance document categories. */
export const documentCategories = [
  {
    id: 'policies',
    title: 'Quy Chế Nội Bộ',
    documents: [
      {
        label: 'Sổ Tay Nhân Viên (PDF, 170KB)',
        path: '/public/files/company_policies/so_tay_nhan_vien.pdf',
      },
      {
        label: 'Quy Tắc Ứng Xử (PDF, 137KB)',
        path: '/public/files/company_policies/bo_quy_tac_ung_xu.pdf',
      },
      {
        label: 'Làm Việc Từ Xa (PDF, 140KB)',
        path: '/public/files/company_policies/chinh_sach_lam_viec_tu_xa.pdf',
      },
      {
        label: 'Chính Sách Nghỉ Phép (PDF, 163KB)',
        path: '/public/files/company_policies/chinh_sach_nghi_co_luong.pdf',
      },
    ],
  },
  {
    id: 'legal',
    title: 'Chứng Chỉ Pháp Lý',
    documents: [
      {
        label:
          'Giấy Chứng Nhận Đăng Ký Hoạt Động Khoa Học & Công Nghệ (PDF, 3.4MB)',
        path: '/public/files/legal_documents/dang_ki_hoat_dong_khcn.pdf',
      },
      {
        label: 'Chính Sách Bảo Mật (PDF, 138KB)',
        path: '/public/files/legal_documents/chinh_sach_quyen_rieng_tu.pdf',
      },
      {
        label: 'Điều Khoản Dịch Vụ (PDF, 164KB)',
        path: '/public/files/legal_documents/dieu_kien_dieu_khoan.pdf',
      },
      {
        label: 'Chính Sách Bảo Vệ Dữ Liệu (PDF, 157KB)',
        path: '/public/files/legal_documents/chinh_sach_bao_ve_du_lieu.pdf',
      },
    ],
  },
  {
    id: 'benefits',
    title: 'Phúc Lợi & Bồi Thường',
    documents: [
      {
        label: 'Hướng Dẫn Phúc Lợi (PDF, 152KB)',
        path: '/public/files/benefits_compensation/huong_dan_phuc_loi.pdf',
      },
      {
        label: 'Kế Hoạch Hưu Trí (PDF, 172KB)',
        path: '/public/files/benefits_compensation/ke_hoach_huu_tri.pdf',
      },
      {
        label: 'Lựa Chọn Bảo Hiểm Y Tế (PDF, 134KB)',
        path: '/public/files/benefits_compensation/cac_goi_bao_hiem_y _te.pdf',
      },
      {
        label: 'Kế Hoạch Tùy Chọn Cổ Phiếu (PDF, 173KB)',
        path: '/public/files/benefits_compensation/chuong_trinh_chon_mua_co_phieu_cho_nhan_vien.pdf',
      },
    ],
  },
  {
    id: 'compliance',
    title: 'Tuân Thủ',
    documents: [
      {
        label: 'Sổ Tay An Toàn (PDF, 126KB)',
        path: '/public/files/compliance/so_tay_an_toan.pdf',
      },
      {
        label: 'Tiêu Chuẩn Chất Lượng (PDF, 138KB)',
        path: '/public/files/compliance/tieu_chuan_chat_luong.pdf',
      },
      {
        label: 'Báo Cáo Kiểm Toán Hàng Năm (PDF, 129KB)',
        path: '/public/files/compliance/bao_cao_kiem_toan_hang_nam.pdf',
      },
      {
        label: 'Danh Sách Kiểm Tra Tuân Thủ (PDF, 152KB)',
        path: '/public/files/compliance/danh_sach_kiem_tra_tuan_thu.pdf',
      },
    ],
  },
]

export function downloadDocument(filePath) {
  if (!filePath) return
  const link = document.createElement('a')
  link.href = filePath
  link.download = filePath.split('/').pop()
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
