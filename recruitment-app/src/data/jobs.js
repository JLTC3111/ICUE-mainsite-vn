/**
 * Open positions.
 *
 * Migrated from the `jobPositions` array in src/script.js:3175-3197 (Vietnamese)
 * and merged in 2026-08 with the English postings that en.icue.vn published
 * separately, when that site's /recruitment was retired in favour of this one.
 * Each posting carries all six locales together rather than being split across
 * six files: there are only ever a handful, and when you add one you want every
 * language of it in front of you at once.
 *
 * The two sites had genuinely diverged, so the merge followed one rule:
 *
 *  - Where the English was only a different rendering of the same fact, ICUE's
 *    published English wording is kept verbatim — it is what readers and search
 *    engines have already seen.
 *  - Where the English carried a fact the Vietnamese lacked, that fact was
 *    added to the Vietnamese and propagated to all six locales, so the pages
 *    agree. Two did: the research internship is **part-time with flexible
 *    hours**, and the technology role asks for general technical and
 *    project/admin ability, not only JavaScript. Both were English-only before
 *    this; the Vietnamese below is where they now live and should be reviewed.
 *
 * One difference was deliberately NOT merged into the Vietnamese. The English
 * page framed the work around the **energy sector** — in the Open Positions
 * subtitle and the "Exciting Projects" benefit — where the Vietnamese says
 * scientific research and district-level planning, which is what the
 * institute's own name describes. That claim is preserved in the English
 * locale exactly as published, but propagating it into five more languages
 * would mean asserting something nobody has confirmed. Worth settling with
 * whoever owns the copy; see recruitment-app/src/locales/en.json.
 *
 * `meta` is the locale-independent half — what the JobPosting structured data
 * in scripts/generate-head.mjs is built from, so it uses schema.org vocabulary
 * and ISO values rather than display strings.
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
        'Hiểu biết công nghệ, kỹ năng hành chính và quản lý dự án',
        'JavaScript',
        'Giao tiếp và tổ chức tốt',
        'Chủ động, tư duy giải quyết vấn đề',
        'Toàn thời gian',
      ],
    },
    en: {
      title: 'Head of Technology Assistant',
      department: 'Technology',
      location: 'Hanoi, Vietnam',
      description:
        'We’re looking for a tech-savvy, organized pro to support our CTO and tech leadership. Help manage projects, streamline workflows, and keep our tech teams firing on all cylinders.',
      tags: [
        'Tech understanding + admin/project skills',
        'JavaScript',
        'Great communication & organization',
        'Proactive, solution-oriented mindset',
        'Full-time',
      ],
    },
    de: {
      title: 'Assistenz der Technologieleitung',
      department: 'Technologie',
      location: 'Hanoi, Vietnam',
      description:
        'Wir suchen eine technisch versierte, gut organisierte Person zur Unterstützung des CTO und der Technologieleitung. Sie begleiten Projekte, verbessern unsere Arbeitsabläufe und halten den Entwicklungsteams den Rücken frei.',
      tags: [
        'Technisches Verständnis, Verwaltungs- und Projektkompetenz',
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
        'Culture technique, compétences administratives et gestion de projet',
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
      tags: [
        '기술 이해도와 행정·프로젝트 관리 역량',
        'JavaScript',
        '뛰어난 커뮤니케이션과 조직력',
        '주도적인 문제 해결 성향',
        '정규직',
      ],
    },
    ja: {
      title: '技術部門長アシスタント',
      department: '技術',
      location: 'ハノイ、ベトナム',
      description:
        'CTO および技術部門のリーダーシップを支える、技術に明るく段取りの良い方を募集します。プロジェクトの運営を助け、業務の進め方を整え、エンジニアリングチームが滞りなく動けるようにする役割です。',
      tags: [
        '技術への理解と、管理・プロジェクト運営の実務力',
        'JavaScript',
        '高いコミュニケーション力と段取り力',
        '主体的な課題解決志向',
        '正社員',
      ],
    },
  },

  researchIntern: {
    meta: {
      // Both: it is an internship, and en.icue.vn stated it is part-time.
      employmentType: ['INTERN', 'PART_TIME'],
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
        'Tham gia cùng chúng tôi để khám phá công nghệ mới, hỗ trợ các dự án sáng tạo và học hỏi từ các chuyên gia hàng đầu trong lĩnh vực. Đây là vị trí thực tập bán thời gian với thời gian làm việc linh hoạt.',
      tags: [
        'Tò mò và đam mê nghiên cứu',
        'Sẵn sàng học hỏi và đóng góp',
        'Kỹ năng phân tích và giải quyết vấn đề tốt',
        'Bán thời gian',
      ],
    },
    en: {
      title: 'Research Intern',
      department: 'Administration',
      location: 'Hanoi, Vietnam',
      description:
        'Join our team to explore new technologies, support innovative projects, and learn from top experts in the field. This is a part-time internship with flexible hours.',
      tags: [
        'Curiosity and passion for research',
        'Willingness to learn and contribute',
        'Strong analytical and problem-solving skills',
        'Part-time',
      ],
    },
    de: {
      title: 'Praktikant·in Forschung',
      department: 'Verwaltung',
      location: 'Hanoi, Vietnam',
      description:
        'Kommen Sie zu uns, um neue Technologien zu erkunden, wegweisende Projekte zu begleiten und von erfahrenen Fachleuten des Gebiets zu lernen. Das Praktikum ist eine Teilzeitstelle mit flexiblen Arbeitszeiten.',
      tags: [
        'Neugier und echte Freude an Forschung',
        'Bereitschaft zu lernen und beizutragen',
        'Gutes analytisches und lösungsorientiertes Denken',
        'Teilzeit',
      ],
    },
    fr: {
      title: 'Stagiaire recherche',
      department: 'Administration',
      location: 'Hanoï, Vietnam',
      description:
        'Rejoignez-nous pour explorer de nouvelles technologies, contribuer à des projets innovants et apprendre auprès de praticiens parmi les plus expérimentés du domaine. Il s’agit d’un stage à temps partiel, aux horaires souples.',
      tags: [
        'Curiosité et vrai goût pour la recherche',
        'Envie d’apprendre et de contribuer',
        'Solides capacités d’analyse et de résolution de problèmes',
        'Temps partiel',
      ],
    },
    ko: {
      title: '연구 인턴',
      department: '행정',
      location: '하노이, 베트남',
      description:
        '새로운 기술을 탐색하고, 앞서가는 프로젝트를 지원하며, 분야에서 가장 경험 많은 전문가들과 함께 배우실 분을 찾습니다. 근무 시간을 유연하게 조정할 수 있는 파트타임 인턴 자리입니다.',
      tags: [
        '호기심과 연구에 대한 진정한 열의',
        '배우고 기여할 준비',
        '뛰어난 분석력과 문제 해결 능력',
        '파트타임',
      ],
    },
    ja: {
      title: '研究インターン',
      department: '管理',
      location: 'ハノイ、ベトナム',
      description:
        '新しい技術に触れ、先進的なプロジェクトを支えながら、この分野で最も経験豊かな実務者とともに学んでいただく機会です。勤務時間を柔軟に調整できるパートタイムのインターンシップです。',
      tags: [
        '好奇心と研究への確かな意欲',
        '学び、貢献する姿勢',
        '高い分析力と課題解決力',
        'パートタイム',
      ],
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
        'Analyze energy data to optimize performance and predict trends. Use Python, SQL, and machine learning tools.',
      tags: ['Python', 'SQL', 'Machine Learning', 'Analytics', 'Full-time'],
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
