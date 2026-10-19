const COPY = {
  vi: {
    sidebar: 'Liên hệ nhanh', collapseSidebar: 'Thu gọn thanh liên hệ', expandSidebar: 'Mở rộng thanh liên hệ',
    collapseMascot: 'Thu gọn linh vật', expandMascot: 'Hiện linh vật',
    automatic: 'Tự động', autoCollapse: 'Tự động thu gọn', keepExpanded: 'Luôn mở rộng',
  },
  en: {
    sidebar: 'Quick contact', collapseSidebar: 'Collapse contact sidebar', expandSidebar: 'Expand contact sidebar',
    collapseMascot: 'Collapse mascot', expandMascot: 'Show mascot',
    automatic: 'Auto', autoCollapse: 'Collapse automatically', keepExpanded: 'Keep expanded',
  },
  de: {
    sidebar: 'Schnellkontakt', collapseSidebar: 'Kontaktleiste einklappen', expandSidebar: 'Kontaktleiste ausklappen',
    collapseMascot: 'Maskottchen einklappen', expandMascot: 'Maskottchen anzeigen',
    automatic: 'Auto', autoCollapse: 'Automatisch einklappen', keepExpanded: 'Ausgeklappt lassen',
  },
  fr: {
    sidebar: 'Contact rapide', collapseSidebar: 'Réduire la barre de contact', expandSidebar: 'Développer la barre de contact',
    collapseMascot: 'Réduire la mascotte', expandMascot: 'Afficher la mascotte',
    automatic: 'Auto', autoCollapse: 'Réduire automatiquement', keepExpanded: 'Garder ouvert',
  },
  ko: {
    sidebar: '빠른 연락', collapseSidebar: '연락처 사이드바 접기', expandSidebar: '연락처 사이드바 펼치기',
    collapseMascot: '마스코트 접기', expandMascot: '마스코트 표시',
    automatic: '자동', autoCollapse: '자동으로 접기', keepExpanded: '펼친 상태 유지',
  },
  ja: {
    sidebar: 'お問い合わせ', collapseSidebar: '連絡先バーを折りたたむ', expandSidebar: '連絡先バーを展開する',
    collapseMascot: 'マスコットを折りたたむ', expandMascot: 'マスコットを表示',
    automatic: '自動', autoCollapse: '自動で折りたたむ', keepExpanded: '展開したままにする',
  },
}

export function floatingCollapseCopy(locale) {
  return COPY[String(locale).toLowerCase().split('-')[0]] || COPY.en
}
