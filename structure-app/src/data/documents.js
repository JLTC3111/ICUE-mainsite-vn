/** Legal / policy / compliance document categories. Labels via i18n. */
export const documentCategories = [
  {
    id: 'policies',
    documents: [
      {
        id: 'so_tay_nhan_vien',
        path: '/public/files/company_policies/so_tay_nhan_vien.pdf',
      },
      {
        id: 'quy_tac_ung_xu',
        path: '/public/files/company_policies/bo_quy_tac_ung_xu.pdf',
      },
      {
        id: 'lam_viec_tu_xa',
        path: '/public/files/company_policies/chinh_sach_lam_viec_tu_xa.pdf',
      },
      {
        id: 'nghi_phep',
        path: '/public/files/company_policies/chinh_sach_nghi_co_luong.pdf',
      },
    ],
  },
  {
    id: 'legal',
    documents: [
      {
        id: 'dang_ki_khcn',
        path: '/public/files/legal_documents/dang_ki_hoat_dong_khcn.pdf',
      },
      {
        id: 'bao_mat',
        path: '/public/files/legal_documents/chinh_sach_quyen_rieng_tu.pdf',
      },
      {
        id: 'dieu_khoan',
        path: '/public/files/legal_documents/dieu_kien_dieu_khoan.pdf',
      },
      {
        id: 'bao_ve_du_lieu',
        path: '/public/files/legal_documents/chinh_sach_bao_ve_du_lieu.pdf',
      },
    ],
  },
  {
    id: 'benefits',
    documents: [
      {
        id: 'huong_dan_phuc_loi',
        path: '/public/files/benefits_compensation/huong_dan_phuc_loi.pdf',
      },
      {
        id: 'ke_hoach_huu_tri',
        path: '/public/files/benefits_compensation/ke_hoach_huu_tri.pdf',
      },
      {
        id: 'bao_hiem_y_te',
        path: '/public/files/benefits_compensation/cac_goi_bao_hiem_y _te.pdf',
      },
      {
        id: 'co_phieu',
        path: '/public/files/benefits_compensation/chuong_trinh_chon_mua_co_phieu_cho_nhan_vien.pdf',
      },
    ],
  },
  {
    id: 'compliance',
    documents: [
      {
        id: 'so_tay_an_toan',
        path: '/public/files/compliance/so_tay_an_toan.pdf',
      },
      {
        id: 'tieu_chuan_chat_luong',
        path: '/public/files/compliance/tieu_chuan_chat_luong.pdf',
      },
      {
        id: 'bao_cao_kiem_toan',
        path: '/public/files/compliance/bao_cao_kiem_toan_hang_nam.pdf',
      },
      {
        id: 'danh_sach_tuan_thu',
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
