// Search vocabulary for facts whose answer text comes directly from site content.
// Keep the order aligned across locales. No generated answer prose lives here.
export const SITE_TOPICS = {
  vi: {
    about_icue: ['Giới thiệu ICUE', 'ICUE là gì', 'viện làm gì', 'giới thiệu về viện'],
    institute_history: ['Lịch sử thành lập', 'ICUE thành lập khi nào', 'viện thành lập năm nào'],
    research_activities: ['Hoạt động nghiên cứu', 'ICUE nghiên cứu những gì', 'nghiên cứu khoa học'],
    technology_transfer: ['Chuyển giao công nghệ', 'hội nghị và hội thảo', 'chuyển đổi xanh'],
    project: 'Cho tôi biết về dự án {name}',
    person: '{name} là ai',
    job: 'Yêu cầu vị trí {name}',
  },
  en: {
    about_icue: ['About ICUE', 'what is ICUE', 'what does the institute do', 'tell me about ICUE'],
    institute_history: ['Institute history', 'when was ICUE founded', 'when was the institute established'],
    research_activities: ['Research activities', 'what does ICUE research', 'scientific research'],
    technology_transfer: ['Technology transfer', 'conferences and workshops', 'green transition'],
    project: 'Tell me about the {name} project',
    person: 'Who is {name}',
    job: 'Requirements for the {name} role',
  },
  de: {
    about_icue: ['Über ICUE', 'was ist ICUE', 'was macht das Institut'],
    institute_history: ['Geschichte des Instituts', 'wann wurde ICUE gegründet', 'Gründungsjahr'],
    research_activities: ['Forschungsaktivitäten', 'was erforscht ICUE', 'wissenschaftliche Forschung'],
    technology_transfer: ['Technologietransfer', 'Konferenzen und Workshops', 'grüner Wandel'],
    project: 'Informationen zum Projekt {name}',
    person: 'Wer ist {name}',
    job: 'Anforderungen für die Stelle {name}',
  },
  fr: {
    about_icue: ['À propos d’ICUE', 'qu’est-ce que ICUE', 'que fait l’institut'],
    institute_history: ['Histoire de l’institut', 'quand ICUE a été fondé', 'date de création'],
    research_activities: ['Activités de recherche', 'quelles recherches mène ICUE', 'recherche scientifique'],
    technology_transfer: ['Transfert de technologie', 'conférences et ateliers', 'transition écologique'],
    project: 'Parlez-moi du projet {name}',
    person: 'Qui est {name}',
    job: 'Exigences du poste {name}',
  },
  ko: {
    about_icue: ['ICUE 소개', 'ICUE는 무엇인가요', '어떤 연구소인가요'],
    institute_history: ['연구소 연혁', 'ICUE는 언제 설립되었나요', '설립 연도'],
    research_activities: ['연구 활동', 'ICUE는 어떤 연구를 하나요', '과학 연구'],
    technology_transfer: ['기술 이전', '컨퍼런스 및 워크숍', '녹색 전환'],
    project: '{name} 프로젝트에 대해 알려 주세요',
    person: '{name} 누구인가요',
    job: '{name} 직무의 자격 요건',
  },
  ja: {
    about_icue: ['ICUEについて', 'ICUEとは何ですか', 'どのような研究所ですか'],
    institute_history: ['研究所の沿革', 'ICUEはいつ設立されましたか', '設立年'],
    research_activities: ['研究活動', 'ICUEはどのような研究をしていますか', '科学研究'],
    technology_transfer: ['技術移転', '会議とワークショップ', 'グリーン転換'],
    project: '{name}プロジェクトについて教えてください',
    person: '{name}は誰ですか',
    job: '{name}の応募要件',
  },
}

// Proper names are useful in every language, without indexing a shared city
// name as an exact alias for several different projects.
export const PROJECT_NAMES = {
  laoCai: ['Lào Cai', 'Lao Cai master plan'],
  hopThanh: ['Hợp Thành', 'Hop Thanh'],
  subdivision6b: ['Phân khu 6B', 'Subdivision 6B', 'Nguyễn Ái Quốc'],
  cocSan: ['Cốc San', 'Coc San'],
  dongYen: ['Đông Yên', 'Đồng Yên', 'Dong Yen'],
  naChi: ['Nà Chì', 'Na Chi'],
  tanBac: ['Tân Bắc', 'Tan Bac'],
  namDong: ['Nam Đồng', 'Nam Dong', 'Subdivision 5A'],
  xuanAn: ['Park City Xuân An', 'Xuân An', 'Xuan An'],
}
