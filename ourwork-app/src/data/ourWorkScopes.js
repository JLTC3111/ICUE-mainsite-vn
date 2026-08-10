/**
 * Our Work — direction 1B (Technical Index) page content, keyed by locale.
 *
 * This is page *content*, not UI chrome: nav/footer/theme strings live in
 * src/locales/*.json and are read through `t()`. Content lives here because the
 * layout depends on its shape, and the shape is easier to police in one module
 * than across six JSON files.
 *
 * VI is authoritative — it is the language the copy was written in. EN is the
 * parallel that replaces the en.icue.vn legacy carousel. DE/FR/KO/JA are
 * hand-written translations of the VI/EN pair.
 *
 * INVARIANTS THE LAYOUT DEPENDS ON (see our-work-1b spec §4):
 *   exactly 4 scopes · exactly 4 `items` per scope · exactly 4 process steps ·
 *   exactly 4 stats. All four grids are repeat(4, 1fr). Adding a fifth of
 *   anything breaks the composition — change the grid deliberately if content
 *   grows. `assertOurWorkShape` below fails loudly in dev if this drifts.
 *
 * `sub` is the small plate line under each card title, uppercased by CSS and
 * kept in sentence case here so screen readers don't spell it out. It is
 * translated per locale like everything else. It reads as a compressed echo of
 * the card's own title — that is what it is for, and it is why the two are
 * worded close but never identical in any locale.
 *
 * ⚠️ PENDING REAL FIGURES: `stats` and `certs` are placeholders carried over
 * from the spec, and the per-scope `std` lines name plausible standards that
 * have not been confirmed against ICUE's actual accreditations. All three need
 * sign-off before this page goes live.
 */

const IMG = {
  as: '/work/ourWork_img1.webp',
  sv: '/work/ourWork_img2.webp',
  pm: '/work/ourWork_img3.webp',
  ae: '/work/ourWork_img4.webp',
}

/**
 * Measured from public/work/. The spec's asset table lists all four as
 * 1920×1280, but img3 is portrait and img4 is smaller — the well crops with
 * object-fit either way, so this only feeds honest width/height attributes.
 */
export const IMAGE_SIZES = {
  [IMG.as]: { w: 1920, h: 1280 },
  [IMG.sv]: { w: 1920, h: 1280 },
  [IMG.pm]: { w: 1280, h: 1920 },
  [IMG.ae]: { w: 892, h: 1240 },
}

const STD = {
  as: 'TCVN 9381:2012 · ISO 9001:2015',
  sv: 'TCVN 9398:2012 · ISO 19650',
  pm: 'TCVN 4419:1987 · ISO 21500',
  ae: 'ISO 21384-3 · ISO 9001:2015',
}

/* Keyed locale → scope code. Each line is a shortened restatement of that
   locale's own card title, so it never repeats the title verbatim. */
const SUB = {
  vi: {
    as: 'Đánh giá & lập báo cáo',
    sv: 'Đo đạc & kỹ thuật kết cấu',
    pm: 'Hạ tầng & quản lý dự án',
    ae: 'Không ảnh & tư liệu không gian',
  },
  en: {
    as: 'Assessment & reporting',
    sv: 'Surveying & structural engineering',
    pm: 'Infrastructure & project management',
    ae: 'Aerial & spatial documentation',
  },
  de: {
    as: 'Bewertung & Berichterstattung',
    sv: 'Aufmaß & Tragwerksplanung',
    pm: 'Infrastruktur & Projektsteuerung',
    ae: 'Luftbild & Raumdokumentation',
  },
  fr: {
    as: 'Évaluation & rapports',
    sv: 'Relevés & ingénierie structure',
    pm: 'Infrastructures & gestion de projet',
    ae: 'Vues aériennes & documentation spatiale',
  },
  ko: {
    as: '평가 및 보고',
    sv: '측량 및 구조 엔지니어링',
    pm: '인프라 및 사업 관리',
    ae: '드론 촬영 및 공간 기록',
  },
  ja: {
    as: '評価とレポート',
    sv: '測量と構造エンジニアリング',
    pm: 'インフラとプロジェクト管理',
    ae: '空撮と空間ドキュメント',
  },
}

export const OUR_WORK = {
  vi: {
    eyebrow: 'PHẠM VI CÔNG VIỆC',
    heroTitle: 'Bốn nhóm dịch vụ, trọn vẹn từ hiện trường đến hồ sơ nghiệm thu.',
    heroLead:
      'ICUE khảo sát, đo lường, dự toán và lập hồ sơ cho các dự án hạ tầng và xây dựng — từ dự toán khối lượng (QS) và mô hình BIM đến kiểm định kết cấu và bay chụp drone.',
    indexTitle: 'Mục lục phạm vi',
    deliverLabel: 'Hạng mục bàn giao',
    processTitle: 'Một hợp đồng đi qua bốn bước',
    closeTitle: 'Cần bản mô tả phạm vi cho một dự án cụ thể?',
    closeLead:
      'Hồ sơ năng lực và ví dụ hồ sơ nghiệm thu thực tế — tải trực tiếp, không cần cam kết gì.',
    closeA: 'Tải hồ sơ năng lực',
    closeB: 'Xem dự án đã thực hiện',
    scopes: [
      {
        num: '01',
        code: 'AS',
        count: '04 hạng mục',
        title: 'Đánh giá & báo cáo công trình',
        sub: SUB.vi.as,
        desc: 'Khảo sát hiện trạng, đánh giá mức độ an toàn và lập báo cáo kỹ thuật cho công trình đang khai thác hoặc chuẩn bị cải tạo.',
        items: [
          'Khảo sát hiện trạng và ghi nhận khuyết tật',
          'Đánh giá mức độ an toàn kết cấu',
          'Báo cáo kỹ thuật kèm khuyến nghị xử lý',
          'Hồ sơ đối chiếu tiêu chuẩn hiện hành',
        ],
        std: STD.as,
        img: IMG.as,
      },
      {
        num: '02',
        code: 'SV',
        count: '04 hạng mục',
        title: 'Khảo sát đo lường & kỹ thuật kết cấu',
        sub: SUB.vi.sv,
        desc: 'Đo đạc hiện trường, bóc tách khối lượng và dựng mô hình BIM làm cơ sở cho thiết kế, dự toán và thi công.',
        items: [
          'Đo đạc và định vị công trình',
          'Bóc tách khối lượng (QS)',
          'Mô hình BIM và bản vẽ kỹ thuật',
          'Tính toán kiểm tra kết cấu',
        ],
        std: STD.sv,
        img: IMG.sv,
      },
      {
        num: '03',
        code: 'PM',
        count: '04 hạng mục',
        title: 'Phân tích hạ tầng & quản lý dự án',
        sub: SUB.vi.pm,
        desc: 'Phân tích khoảng trống hạ tầng, dự toán chi phí và kiểm soát ngân sách từ giai đoạn lập kế hoạch đến khi nghiệm thu.',
        items: [
          'Phân tích khoảng trống hạ tầng',
          'Dự toán chi phí và kiểm soát ngân sách',
          'Tiến độ và quản lý hợp đồng',
          'Báo cáo giám sát theo giai đoạn',
        ],
        std: STD.pm,
        img: IMG.pm,
      },
      {
        num: '04',
        code: 'AE',
        count: '04 hạng mục',
        title: 'Chụp ảnh & tư liệu không gian',
        sub: SUB.vi.ae,
        desc: 'Bay chụp drone, lập bản đồ trực ảnh và tư liệu hoá công trình phục vụ đánh giá đất đai, giám sát và hồ sơ dự án.',
        items: [
          'Bay chụp drone và ảnh trên không',
          'Bản đồ trực ảnh và mô hình địa hình',
          'Giám sát tiến độ theo chu kỳ',
          'Ảnh kiến trúc và tư liệu dự án',
        ],
        std: STD.ae,
        img: IMG.ae,
      },
    ],
    process: [
      { k: '01', t: 'Khảo sát hiện trường', d: 'Đo đạc, ghi nhận hiện trạng và thu thập dữ liệu gốc tại công trường.' },
      { k: '02', t: 'Mô hình & dữ liệu', d: 'Dựng mô hình BIM, bản vẽ và bộ dữ liệu chuẩn hoá cho dự án.' },
      { k: '03', t: 'Phân tích & dự toán', d: 'Bóc tách khối lượng, tính toán kết cấu và lập dự toán chi phí.' },
      { k: '04', t: 'Hồ sơ & báo cáo', d: 'Bàn giao báo cáo kỹ thuật và hồ sơ phục vụ nghiệm thu.' },
    ],
    stats: [
      { n: '120+', l: 'Dự án đã thực hiện' },
      { n: '18', l: 'Năm hoạt động' },
      { n: '40+', l: 'Kỹ sư & chuyên gia' },
      { n: '12', l: 'Tỉnh thành' },
    ],
    certs: [
      'ISO 9001:2015',
      'Chứng chỉ năng lực hoạt động xây dựng',
      'Chứng chỉ hành nghề khảo sát xây dựng',
      'Giấy phép bay thiết bị không người lái',
      'Kiểm định kết cấu công trình',
    ],
  },

  en: {
    eyebrow: 'OUR SCOPE OF WORK',
    heroTitle: 'Four service groups, from the site visit to the handover file.',
    heroLead:
      'ICUE surveys, measures, estimates and documents infrastructure and building projects — from quantity surveying and BIM models to structural assessment and drone capture.',
    indexTitle: 'Scope index',
    deliverLabel: 'Deliverables',
    processTitle: 'Every engagement runs through four stages',
    closeTitle: 'Need a scope statement for a specific project?',
    closeLead:
      'Our capability statement, with real examples of handover documentation — download it directly, no commitment required.',
    closeA: 'Download capability statement',
    closeB: 'See completed projects',
    scopes: [
      {
        num: '01',
        code: 'AS',
        count: '04 deliverables',
        title: 'Building assessment & reporting',
        sub: SUB.en.as,
        desc: 'Condition surveys, structural safety assessment and technical reporting for buildings in service or awaiting refurbishment.',
        items: [
          'Condition survey and defect recording',
          'Structural safety assessment',
          'Technical report with remedial recommendations',
          'Compliance review against current standards',
        ],
        std: STD.as,
        img: IMG.as,
      },
      {
        num: '02',
        code: 'SV',
        count: '04 deliverables',
        title: 'Quantity surveying & structural engineering',
        sub: SUB.en.sv,
        desc: 'Site measurement, quantity take-off and BIM modelling that give design, costing and construction a single source of truth.',
        items: [
          'Site measurement and setting out',
          'Quantity take-off (QS)',
          'BIM models and technical drawings',
          'Structural verification calculations',
        ],
        std: STD.sv,
        img: IMG.sv,
      },
      {
        num: '03',
        code: 'PM',
        count: '04 deliverables',
        title: 'Infrastructure analysis & project management',
        sub: SUB.en.pm,
        desc: 'Infrastructure gap analysis, cost estimation and budget control from the planning stage through to final acceptance.',
        items: [
          'Infrastructure gap analysis',
          'Cost estimation and budget control',
          'Programme and contract administration',
          'Stage-by-stage monitoring reports',
        ],
        std: STD.pm,
        img: IMG.pm,
      },
      {
        num: '04',
        code: 'AE',
        count: '04 deliverables',
        title: 'Aerial photography & spatial documentation',
        sub: SUB.en.ae,
        desc: 'Drone capture, orthophoto mapping and project documentation for land assessment, progress monitoring and project records.',
        items: [
          'Drone capture and aerial photography',
          'Orthophoto maps and terrain models',
          'Cyclical progress monitoring',
          'Architectural photography and project records',
        ],
        std: STD.ae,
        img: IMG.ae,
      },
    ],
    process: [
      { k: '01', t: 'Site survey', d: 'Measurement, condition recording and primary data capture on site.' },
      { k: '02', t: 'Model & data', d: 'BIM models, drawings and a normalised project dataset.' },
      { k: '03', t: 'Analysis & costing', d: 'Quantity take-off, structural checks and cost estimation.' },
      { k: '04', t: 'File & report', d: 'Technical reporting and the documentation acceptance requires.' },
    ],
    stats: [
      { n: '120+', l: 'Projects delivered' },
      { n: '18', l: 'Years in practice' },
      { n: '40+', l: 'Engineers & specialists' },
      { n: '12', l: 'Provinces covered' },
    ],
    certs: [
      'ISO 9001:2015',
      'Construction activity capability certificate',
      'Construction survey practising certificate',
      'UAV flight permit',
      'Structural inspection accreditation',
    ],
  },

  de: {
    eyebrow: 'UNSER LEISTUNGSUMFANG',
    heroTitle: 'Vier Leistungsbereiche — von der Baustelle bis zur Abnahmeakte.',
    heroLead:
      'ICUE vermisst, bewertet, kalkuliert und dokumentiert Infrastruktur- und Hochbauprojekte — von Mengenermittlung und BIM-Modellen bis zu Tragwerksprüfung und Drohnenbefliegung.',
    indexTitle: 'Leistungsverzeichnis',
    deliverLabel: 'Leistungen',
    processTitle: 'Jeder Auftrag durchläuft vier Stufen',
    closeTitle: 'Sie brauchen eine Leistungsbeschreibung für ein konkretes Projekt?',
    closeLead:
      'Unsere Leistungsübersicht mit echten Beispielen von Abnahmeunterlagen — direkter Download, unverbindlich.',
    closeA: 'Leistungsübersicht herunterladen',
    closeB: 'Realisierte Projekte ansehen',
    scopes: [
      {
        num: '01',
        code: 'AS',
        count: '04 Leistungen',
        title: 'Bauwerksbewertung & Berichte',
        sub: SUB.de.as,
        desc: 'Zustandserfassung, Beurteilung der Tragsicherheit und technische Berichte für Bauwerke im Betrieb oder vor der Sanierung.',
        items: [
          'Zustandserfassung und Schadensaufnahme',
          'Beurteilung der Tragsicherheit',
          'Technischer Bericht mit Sanierungsempfehlung',
          'Abgleich mit geltenden Normen',
        ],
        std: STD.as,
        img: IMG.as,
      },
      {
        num: '02',
        code: 'SV',
        count: '04 Leistungen',
        title: 'Vermessung & Tragwerksplanung',
        sub: SUB.de.sv,
        desc: 'Aufmaß vor Ort, Mengenermittlung und BIM-Modellierung als gemeinsame Datengrundlage für Planung, Kalkulation und Ausführung.',
        items: [
          'Aufmaß und Absteckung',
          'Mengenermittlung (QS)',
          'BIM-Modelle und Ausführungspläne',
          'Statische Nachweise und Prüfrechnung',
        ],
        std: STD.sv,
        img: IMG.sv,
      },
      {
        num: '03',
        code: 'PM',
        count: '04 Leistungen',
        title: 'Infrastrukturanalyse & Projektsteuerung',
        sub: SUB.de.pm,
        desc: 'Analyse von Infrastrukturlücken, Kostenschätzung und Budgetkontrolle von der Planungsphase bis zur Abnahme.',
        items: [
          'Analyse von Infrastrukturlücken',
          'Kostenschätzung und Budgetkontrolle',
          'Terminplanung und Vertragsmanagement',
          'Stufenweise Überwachungsberichte',
        ],
        std: STD.pm,
        img: IMG.pm,
      },
      {
        num: '04',
        code: 'AE',
        count: '04 Leistungen',
        title: 'Luftbilder & räumliche Dokumentation',
        sub: SUB.de.ae,
        desc: 'Drohnenbefliegung, Orthofoto-Kartierung und Projektdokumentation für Flächenbewertung, Baufortschritt und Projektakten.',
        items: [
          'Drohnenbefliegung und Luftaufnahmen',
          'Orthofotokarten und Geländemodelle',
          'Zyklische Baufortschrittskontrolle',
          'Architekturfotografie und Projektakten',
        ],
        std: STD.ae,
        img: IMG.ae,
      },
    ],
    process: [
      { k: '01', t: 'Bestandsaufnahme', d: 'Aufmaß, Zustandserfassung und Primärdaten direkt auf der Baustelle.' },
      { k: '02', t: 'Modell & Daten', d: 'BIM-Modelle, Pläne und ein normierter Projektdatensatz.' },
      { k: '03', t: 'Analyse & Kalkulation', d: 'Mengenermittlung, statische Prüfung und Kostenschätzung.' },
      { k: '04', t: 'Akte & Bericht', d: 'Technische Berichte und die für die Abnahme nötigen Unterlagen.' },
    ],
    stats: [
      { n: '120+', l: 'Realisierte Projekte' },
      { n: '18', l: 'Jahre Praxis' },
      { n: '40+', l: 'Ingenieure & Fachleute' },
      { n: '12', l: 'Provinzen' },
    ],
    certs: [
      'ISO 9001:2015',
      'Befähigungsnachweis Bautätigkeit',
      'Berufszulassung Bauvermessung',
      'UAV-Flugerlaubnis',
      'Akkreditierung Tragwerksprüfung',
    ],
  },

  fr: {
    eyebrow: "NOTRE PÉRIMÈTRE D'INTERVENTION",
    heroTitle: "Quatre familles de prestations, du relevé sur site au dossier de réception.",
    heroLead:
      "ICUE relève, mesure, chiffre et documente les projets d'infrastructure et de bâtiment — du métré et des maquettes BIM au diagnostic structurel et aux prises de vue par drone.",
    indexTitle: 'Sommaire des prestations',
    deliverLabel: 'Livrables',
    processTitle: 'Chaque mission suit quatre étapes',
    closeTitle: 'Besoin d’un descriptif de prestations pour un projet précis ?',
    closeLead:
      'Notre dossier de références avec de vrais exemples de dossiers de réception — téléchargement direct, sans engagement.',
    closeA: 'Télécharger le dossier de références',
    closeB: 'Voir les projets réalisés',
    scopes: [
      {
        num: '01',
        code: 'AS',
        count: '04 livrables',
        title: "Évaluation d'ouvrages & rapports",
        sub: SUB.fr.as,
        desc: "Relevé de l'état existant, évaluation de la sécurité structurelle et rapports techniques pour les ouvrages en service ou à réhabiliter.",
        items: [
          "Relevé de l'état existant et des désordres",
          'Évaluation de la sécurité structurelle',
          'Rapport technique et préconisations',
          'Contrôle de conformité aux normes en vigueur',
        ],
        std: STD.as,
        img: IMG.as,
      },
      {
        num: '02',
        code: 'SV',
        count: '04 livrables',
        title: 'Relevés, métrés & ingénierie structure',
        sub: SUB.fr.sv,
        desc: "Relevés sur site, métrés et maquettes BIM qui donnent à la conception, au chiffrage et au chantier une base de données unique.",
        items: [
          'Relevés et implantation',
          'Métrés et quantitatifs (QS)',
          'Maquettes BIM et plans techniques',
          'Notes de calcul et vérifications structurelles',
        ],
        std: STD.sv,
        img: IMG.sv,
      },
      {
        num: '03',
        code: 'PM',
        count: '04 livrables',
        title: "Analyse d'infrastructures & gestion de projet",
        sub: SUB.fr.pm,
        desc: "Analyse des manques d'infrastructure, estimation des coûts et maîtrise du budget, de la phase d'études jusqu'à la réception.",
        items: [
          "Analyse des manques d'infrastructure",
          'Estimation des coûts et maîtrise du budget',
          'Planning et gestion contractuelle',
          'Rapports de suivi par phase',
        ],
        std: STD.pm,
        img: IMG.pm,
      },
      {
        num: '04',
        code: 'AE',
        count: '04 livrables',
        title: 'Prises de vue & documentation spatiale',
        sub: SUB.fr.ae,
        desc: "Vols drone, cartographie orthophoto et documentation de projet pour l'évaluation foncière, le suivi de chantier et les archives.",
        items: [
          'Vols drone et photographie aérienne',
          'Orthophotoplans et modèles de terrain',
          'Suivi de chantier périodique',
          "Photographie d'architecture et archives projet",
        ],
        std: STD.ae,
        img: IMG.ae,
      },
    ],
    process: [
      { k: '01', t: 'Relevé sur site', d: 'Mesures, état des lieux et collecte des données primaires sur le terrain.' },
      { k: '02', t: 'Maquette & données', d: 'Maquettes BIM, plans et jeu de données projet normalisé.' },
      { k: '03', t: 'Analyse & chiffrage', d: 'Métrés, vérifications structurelles et estimation des coûts.' },
      { k: '04', t: 'Dossier & rapport', d: 'Rapports techniques et pièces nécessaires à la réception.' },
    ],
    stats: [
      { n: '120+', l: 'Projets livrés' },
      { n: '18', l: 'Années de pratique' },
      { n: '40+', l: 'Ingénieurs & spécialistes' },
      { n: '12', l: 'Provinces couvertes' },
    ],
    certs: [
      'ISO 9001:2015',
      "Certificat de capacité d'activité de construction",
      "Certificat professionnel d'études topographiques",
      'Autorisation de vol drone',
      "Agrément d'inspection des structures",
    ],
  },

  ko: {
    eyebrow: '업무 범위',
    heroTitle: '현장 조사부터 준공 서류까지, 네 가지 서비스 영역.',
    heroLead:
      'ICUE는 인프라·건축 프로젝트를 조사하고 측량하고 적산하고 문서화합니다 — 물량 산출(QS)과 BIM 모델부터 구조 안전성 평가와 드론 촬영까지.',
    indexTitle: '업무 목차',
    deliverLabel: '산출물',
    processTitle: '모든 계약은 네 단계를 거칩니다',
    closeTitle: '특정 프로젝트의 업무 범위서가 필요하신가요?',
    closeLead: '역량 소개서와 실제 준공 서류 예시 — 바로 내려받을 수 있으며, 별도의 약정은 필요하지 않습니다.',
    closeA: '역량 소개서 다운로드',
    closeB: '완료 프로젝트 보기',
    scopes: [
      {
        num: '01',
        code: 'AS',
        count: '4개 산출물',
        title: '건축물 평가 및 보고',
        sub: SUB.ko.as,
        desc: '사용 중이거나 리모델링을 앞둔 건축물에 대한 현황 조사, 구조 안전성 평가 및 기술 보고서 작성.',
        items: [
          '현황 조사 및 결함 기록',
          '구조 안전성 평가',
          '보수 권고를 포함한 기술 보고서',
          '현행 기준 적합성 검토',
        ],
        std: STD.as,
        img: IMG.as,
      },
      {
        num: '02',
        code: 'SV',
        count: '4개 산출물',
        title: '측량·적산 및 구조 엔지니어링',
        sub: SUB.ko.sv,
        desc: '현장 실측, 물량 산출, BIM 모델링으로 설계·적산·시공이 하나의 데이터를 공유하도록 합니다.',
        items: [
          '현장 실측 및 기준점 설정',
          '물량 산출(QS)',
          'BIM 모델 및 기술 도면',
          '구조 검토 계산서',
        ],
        std: STD.sv,
        img: IMG.sv,
      },
      {
        num: '03',
        code: 'PM',
        count: '4개 산출물',
        title: '인프라 분석 및 사업 관리',
        sub: SUB.ko.pm,
        desc: '기획 단계부터 준공까지 인프라 격차 분석, 공사비 산정 및 예산 관리를 수행합니다.',
        items: [
          '인프라 격차 분석',
          '공사비 산정 및 예산 관리',
          '공정 계획 및 계약 관리',
          '단계별 감리 보고',
        ],
        std: STD.pm,
        img: IMG.pm,
      },
      {
        num: '04',
        code: 'AE',
        count: '4개 산출물',
        title: '항공 촬영 및 공간 기록',
        sub: SUB.ko.ae,
        desc: '토지 평가, 공정 모니터링, 프로젝트 기록을 위한 드론 촬영, 정사영상 지도 제작 및 문서화.',
        items: [
          '드론 촬영 및 항공 사진',
          '정사영상 지도 및 지형 모델',
          '주기적 공정 모니터링',
          '건축 사진 및 프로젝트 기록',
        ],
        std: STD.ae,
        img: IMG.ae,
      },
    ],
    process: [
      { k: '01', t: '현장 조사', d: '현장에서 실측과 현황 기록, 원천 데이터를 수집합니다.' },
      { k: '02', t: '모델·데이터', d: 'BIM 모델과 도면, 표준화된 프로젝트 데이터셋을 구축합니다.' },
      { k: '03', t: '분석·적산', d: '물량 산출, 구조 검토, 공사비 산정을 수행합니다.' },
      { k: '04', t: '서류·보고', d: '기술 보고서와 준공에 필요한 서류를 인계합니다.' },
    ],
    stats: [
      { n: '120+', l: '수행 프로젝트' },
      { n: '18', l: '업력(년)' },
      { n: '40+', l: '엔지니어·전문가' },
      { n: '12', l: '대상 지역' },
    ],
    certs: [
      'ISO 9001:2015',
      '건설업 역량 인증서',
      '건설 측량 기술자 자격',
      '무인기 비행 허가',
      '구조 검사 인증',
    ],
  },

  ja: {
    eyebrow: '業務範囲',
    heroTitle: '現地調査から竣工書類まで、4 つのサービス領域。',
    heroLead:
      'ICUE はインフラ・建築プロジェクトの調査、測量、積算、記録を行います — 数量拾い（QS）と BIM モデルから、構造安全性の評価、ドローン撮影まで。',
    indexTitle: '業務目次',
    deliverLabel: '成果物',
    processTitle: 'すべての契約は 4 つの段階を通ります',
    closeTitle: '個別プロジェクトの業務範囲書が必要ですか？',
    closeLead: '会社概要と実際の竣工書類の例 — そのままダウンロードできます。お約束は不要です。',
    closeA: '会社概要をダウンロード',
    closeB: '実績プロジェクトを見る',
    scopes: [
      {
        num: '01',
        code: 'AS',
        count: '4 項目',
        title: '建物の調査・報告',
        sub: SUB.ja.as,
        desc: '供用中または改修を控えた建物を対象とした現況調査、構造安全性の評価、技術報告書の作成。',
        items: [
          '現況調査と損傷の記録',
          '構造安全性の評価',
          '補修提案を含む技術報告書',
          '現行基準との適合性照査',
        ],
        std: STD.as,
        img: IMG.as,
      },
      {
        num: '02',
        code: 'SV',
        count: '4 項目',
        title: '測量・積算と構造エンジニアリング',
        sub: SUB.ja.sv,
        desc: '現地実測、数量拾い、BIM モデリングにより、設計・積算・施工が同一のデータを共有できるようにします。',
        items: [
          '現地実測と墨出し',
          '数量拾い（QS）',
          'BIM モデルと技術図面',
          '構造照査計算書',
        ],
        std: STD.sv,
        img: IMG.sv,
      },
      {
        num: '03',
        code: 'PM',
        count: '4 項目',
        title: 'インフラ分析とプロジェクト管理',
        sub: SUB.ja.pm,
        desc: '計画段階から竣工検査まで、インフラの不足分析、工事費の算定、予算管理を行います。',
        items: [
          'インフラの不足分析',
          '工事費の算定と予算管理',
          '工程計画と契約管理',
          '段階ごとの監理報告',
        ],
        std: STD.pm,
        img: IMG.pm,
      },
      {
        num: '04',
        code: 'AE',
        count: '4 項目',
        title: '空撮と空間記録',
        sub: SUB.ja.ae,
        desc: '土地評価、進捗監視、プロジェクト記録のためのドローン撮影、オルソ画像地図の作成、資料化。',
        items: [
          'ドローン撮影と航空写真',
          'オルソ画像地図と地形モデル',
          '定期的な進捗モニタリング',
          '建築写真とプロジェクト資料',
        ],
        std: STD.ae,
        img: IMG.ae,
      },
    ],
    process: [
      { k: '01', t: '現地調査', d: '現場での実測、現況記録、一次データの収集。' },
      { k: '02', t: 'モデル・データ', d: 'BIM モデル、図面、標準化されたプロジェクトデータの整備。' },
      { k: '03', t: '分析・積算', d: '数量拾い、構造照査、工事費の算定。' },
      { k: '04', t: '書類・報告', d: '技術報告書と竣工検査に必要な書類の引き渡し。' },
    ],
    stats: [
      { n: '120+', l: '実施プロジェクト' },
      { n: '18', l: '設立からの年数' },
      { n: '40+', l: '技術者・専門家' },
      { n: '12', l: '対象地域' },
    ],
    certs: [
      'ISO 9001:2015',
      '建設業能力証明',
      '建設測量技術者資格',
      '無人航空機の飛行許可',
      '構造検査の認定',
    ],
  },
}

/** vi and en are authored; the rest fall back through en, then vi. */
function contentLangChain(lang) {
  if (lang === 'vi') return ['vi', 'en']
  if (lang === 'en') return ['en', 'vi']
  return [lang, 'en', 'vi']
}

export function getOurWorkContent(lang) {
  for (const code of contentLangChain(lang)) {
    if (OUR_WORK[code]) return OUR_WORK[code]
  }
  return OUR_WORK.vi
}

/**
 * The 1B grids are all repeat(4, 1fr) and the deliverable rows assume a fixed
 * count, so a content edit that adds a fifth entry silently ruins the layout.
 * Fail in dev instead.
 */
export function assertOurWorkShape() {
  for (const [code, c] of Object.entries(OUR_WORK)) {
    const problems = []
    if (c.scopes.length !== 4) problems.push(`${c.scopes.length} scopes`)
    if (c.process.length !== 4) problems.push(`${c.process.length} process steps`)
    if (c.stats.length !== 4) problems.push(`${c.stats.length} stats`)
    c.scopes.forEach((s, i) => {
      if (s.items.length !== 4) problems.push(`scope ${i + 1} has ${s.items.length} items`)
    })
    if (problems.length) {
      console.error(`[ourWorkScopes] locale "${code}" breaks the 4-up layout: ${problems.join(', ')}`)
    }
  }
}

export default OUR_WORK
