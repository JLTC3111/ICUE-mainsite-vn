/**
 * Open positions.
 *
 * Migrated from the `jobPositions` array in src/script.js:3175-3197, which held
 * Vietnamese only. Each posting now carries all six locales together rather
 * than being split across six files: there are only ever a handful of postings,
 * and when you add one you want every language of it in front of you at once.
 *
 * `meta` is the locale-independent half — it is what the JobPosting structured
 * data in RecruitmentPage.jsx is built from, so it uses schema.org vocabulary
 * (`employmentType`) and ISO values rather than display strings.
 */

/** Display order. */
export const JOB_IDS = ['techAssistant', 'researchIntern', 'dataAnalyst']

const JOBS = {
  techAssistant: {
    meta: {
      employmentType: 'FULL_TIME',
      locality: 'Hà Nội',
      region: 'Hà Nội',
      country: 'VN',
      datePosted: '2026-08-01',
    },
    vi: {
      title: 'Trợ lý trưởng phòng công nghệ',
      department: 'Công nghệ',
      location: 'Hà Nội, Việt Nam',
      description:
        'Chúng tôi đang tìm một chuyên gia am hiểu công nghệ, tổ chức tốt để hỗ trợ CTO và đội ngũ lãnh đạo công nghệ. Giúp quản lý dự án, tối ưu quy trình làm việc và đảm bảo các nhóm kỹ thuật vận hành trơn tru.',
      tags: [
        'JavaScript',
        'Giao tiếp và tổ chức tốt',
        'Chủ động, tư duy giải quyết vấn đề',
        'Toàn thời gian',
      ],
    },
    en: {
      title: 'Assistant to the Head of Technology',
      department: 'Technology',
      location: 'Hanoi, Vietnam',
      description:
        'We are looking for a technically fluent, well-organised colleague to support the CTO and the technology leadership. You will help run projects, sharpen how we work, and keep the engineering teams moving.',
      tags: [
        'JavaScript',
        'Strong communication and organisation',
        'Proactive, problem-solving mindset',
        'Full time',
      ],
    },
    de: {
      title: 'Assistenz der Technologieleitung',
      department: 'Technologie',
      location: 'Hanoi, Vietnam',
      description:
        'Wir suchen eine technisch versierte, gut organisierte Person zur Unterstützung des CTO und der Technologieleitung. Sie begleiten Projekte, verbessern unsere Arbeitsabläufe und halten den Entwicklungsteams den Rücken frei.',
      tags: [
        'JavaScript',
        'Ausgeprägte Kommunikations- und Organisationsstärke',
        'Eigeninitiative und Problemlösungsdenken',
        'Vollzeit',
      ],
    },
    fr: {
      title: 'Assistant·e du responsable technologie',
      department: 'Technologie',
      location: 'Hanoï, Vietnam',
      description:
        'Nous cherchons une personne à l’aise avec la technique et bien organisée pour épauler le CTO et la direction technique. Vous aiderez à piloter les projets, à affiner nos méthodes et à garder les équipes techniques en mouvement.',
      tags: [
        'JavaScript',
        'Excellentes qualités de communication et d’organisation',
        'Sens de l’initiative et goût de la résolution de problèmes',
        'Temps plein',
      ],
    },
    ko: {
      title: '기술부문장 어시스턴트',
      department: '기술',
      location: '하노이, 베트남',
      description:
        'CTO와 기술 리더십을 지원할, 기술에 밝고 체계적인 동료를 찾습니다. 프로젝트 운영을 돕고 업무 방식을 개선하며 엔지니어링 팀이 원활히 움직이도록 지원합니다.',
      tags: ['JavaScript', '뛰어난 커뮤니케이션과 조직력', '주도적인 문제 해결 성향', '정규직'],
    },
    ja: {
      title: '技術部門長アシスタント',
      department: '技術',
      location: 'ハノイ、ベトナム',
      description:
        'CTO および技術部門のリーダーシップを支える、技術に明るく段取りの良い方を募集します。プロジェクトの運営を助け、業務の進め方を整え、エンジニアリングチームが滞りなく動けるようにする役割です。',
      tags: ['JavaScript', '高いコミュニケーション力と段取り力', '主体的な課題解決志向', '正社員'],
    },
  },

  researchIntern: {
    meta: {
      employmentType: 'INTERN',
      locality: 'Hà Nội',
      region: 'Hà Nội',
      country: 'VN',
      datePosted: '2026-08-01',
    },
    vi: {
      title: 'Thực tập sinh nghiên cứu',
      department: 'Hành chính',
      location: 'Hà Nội, Việt Nam',
      description:
        'Tham gia cùng chúng tôi để khám phá công nghệ mới, hỗ trợ các dự án sáng tạo và học hỏi từ các chuyên gia hàng đầu trong lĩnh vực.',
      tags: [
        'Tò mò và đam mê nghiên cứu',
        'Kỹ năng phân tích và giải quyết vấn đề tốt',
        'Sẵn sàng học hỏi và đóng góp',
      ],
    },
    en: {
      title: 'Research Intern',
      department: 'Administration',
      location: 'Hanoi, Vietnam',
      description:
        'Join us to explore new technology, support projects that break new ground, and learn alongside some of the field’s most experienced practitioners.',
      tags: [
        'Curious, with a real appetite for research',
        'Strong analytical and problem-solving skills',
        'Ready to learn and to contribute',
      ],
    },
    de: {
      title: 'Praktikant·in Forschung',
      department: 'Verwaltung',
      location: 'Hanoi, Vietnam',
      description:
        'Kommen Sie zu uns, um neue Technologien zu erkunden, wegweisende Projekte zu begleiten und von erfahrenen Fachleuten des Gebiets zu lernen.',
      tags: [
        'Neugier und echte Freude an Forschung',
        'Gutes analytisches und lösungsorientiertes Denken',
        'Bereitschaft zu lernen und beizutragen',
      ],
    },
    fr: {
      title: 'Stagiaire recherche',
      department: 'Administration',
      location: 'Hanoï, Vietnam',
      description:
        'Rejoignez-nous pour explorer de nouvelles technologies, contribuer à des projets innovants et apprendre auprès de praticiens parmi les plus expérimentés du domaine.',
      tags: [
        'Curiosité et vrai goût pour la recherche',
        'Solides capacités d’analyse et de résolution de problèmes',
        'Envie d’apprendre et de contribuer',
      ],
    },
    ko: {
      title: '연구 인턴',
      department: '행정',
      location: '하노이, 베트남',
      description:
        '새로운 기술을 탐색하고, 앞서가는 프로젝트를 지원하며, 분야에서 가장 경험 많은 전문가들과 함께 배우실 분을 찾습니다.',
      tags: ['호기심과 연구에 대한 진정한 열의', '뛰어난 분석력과 문제 해결 능력', '배우고 기여할 준비'],
    },
    ja: {
      title: '研究インターン',
      department: '管理',
      location: 'ハノイ、ベトナム',
      description:
        '新しい技術に触れ、先進的なプロジェクトを支えながら、この分野で最も経験豊かな実務者とともに学んでいただく機会です。',
      tags: ['好奇心と研究への確かな意欲', '高い分析力と課題解決力', '学び、貢献する姿勢'],
    },
  },

  dataAnalyst: {
    meta: {
      employmentType: 'FULL_TIME',
      locality: 'Thành phố Hồ Chí Minh',
      region: 'Hồ Chí Minh',
      country: 'VN',
      datePosted: '2026-08-01',
    },
    vi: {
      title: 'Chuyên viên phân tích dữ liệu',
      department: 'Dữ liệu & Phân tích',
      location: 'TP. Hồ Chí Minh, Việt Nam',
      description:
        'Phân tích dữ liệu năng lượng để tối ưu hiệu suất và dự đoán xu hướng. Sử dụng Python, SQL và các công cụ học máy.',
      tags: ['Python', 'SQL', 'Machine Learning', 'Phân tích', 'Toàn thời gian'],
    },
    en: {
      title: 'Data Analyst',
      department: 'Data & Analytics',
      location: 'Ho Chi Minh City, Vietnam',
      description:
        'Analyse energy data to improve performance and forecast trends, working in Python, SQL and machine-learning tooling.',
      tags: ['Python', 'SQL', 'Machine learning', 'Analytics', 'Full time'],
    },
    de: {
      title: 'Datenanalyst·in',
      department: 'Daten & Analytik',
      location: 'Ho-Chi-Minh-Stadt, Vietnam',
      description:
        'Energiedaten auswerten, um die Leistung zu verbessern und Trends vorherzusagen — mit Python, SQL und Machine-Learning-Werkzeugen.',
      tags: ['Python', 'SQL', 'Machine Learning', 'Analytik', 'Vollzeit'],
    },
    fr: {
      title: 'Analyste de données',
      department: 'Données & Analyse',
      location: 'Hô Chi Minh-Ville, Vietnam',
      description:
        'Analyser les données énergétiques pour améliorer les performances et anticiper les tendances, avec Python, SQL et des outils d’apprentissage automatique.',
      tags: ['Python', 'SQL', 'Machine learning', 'Analyse', 'Temps plein'],
    },
    ko: {
      title: '데이터 분석가',
      department: '데이터 & 분석',
      location: '호치민시, 베트남',
      description:
        '에너지 데이터를 분석해 성능을 개선하고 추세를 예측합니다. Python, SQL, 머신러닝 도구를 활용합니다.',
      tags: ['Python', 'SQL', '머신러닝', '분석', '정규직'],
    },
    ja: {
      title: 'データアナリスト',
      department: 'データ＆分析',
      location: 'ホーチミン市、ベトナム',
      description:
        'エネルギーデータを分析し、性能の改善と傾向の予測を行います。Python、SQL、機械学習のツールを用います。',
      tags: ['Python', 'SQL', '機械学習', '分析', '正社員'],
    },
  },
}

export const AUTHORITATIVE_LANGUAGE = 'vi'

/** `[{ id, meta, title, department, location, description, tags }]`. */
export function getJobs(language) {
  return JOB_IDS.map((id) => {
    const job = JOBS[id]
    const text = job[language] || job[AUTHORITATIVE_LANGUAGE]
    return { id, meta: job.meta, ...text }
  })
}

export default JOBS
