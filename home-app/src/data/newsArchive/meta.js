/** Slim title/lead map for RouteHead. Do not import article bodies here.
 *  Keep in sync with copy/{lang}.js article title/lead fields. */

import { normalizeArchiveLang, pickCopy } from './lang.js'

export const NEWS_ARCHIVE_ARTICLE_META = {
  "vi": {
    "1": {
      "title": "Lễ Khánh Thành, Bàn Giao Công Viên Âu Cơ",
      "lead": "Với Sự Tham Dự Của Chủ Tịch UBND Tỉnh Quảng Nam - Ông Lê Văn Dũng"
    },
    "2": {
      "title": "Khai mạc Diễn đàn Bảo tồn Khu vực Châu Á lần thứ 8 tại Thái Lan",
      "lead": "Ngày 3/9, Diễn đàn Bảo tồn Khu vực Châu Á (RCF) lần thứ 8 của Liên minh Bảo tồn Thiên nhiên Quốc tế (IUCN) đã khai mạc tại Bangkok, Thái Lan. Sự kiện quy tụ gần 600 nhà lãnh đạo trong lĩnh vực bảo tồn từ khắp khu vực, bao gồm đại diện chính phủ, tổ chức phi chính phủ, nhà tài trợ và đối tác, học viện và khu vực tư nhân, cùng nhiều bên liên quan."
    },
    "3": {
      "title": "Chung tay đóng góp, ủng hộ, giúp đỡ đồng bào ảnh hưởng do bão Yagi",
      "lead": "Làm theo lời kêu gọi của Uỷ ban Trung ương Mặt trận Tổ quốc Việt Nam, Viện NCKTXD&ĐT đã có thông báo kêu gọi cán bộ và các đối tác cùng các nhà hảo tâm chung tay đóng góp, giúp đỡ đồng bào bị ảnh hưởng bởi bão Yagi."
    },
    "4": {
      "title": "Hội nghị tổng kết đề án phát triển đô thị thông minh và bền vững VN giai đoạn 2018-2025 và định hướng 2030",
      "lead": "Sáng Kiến Đô Thị Thông Minh của Việt Nam: Thành Tựu và Lộ Trình 2025-2030"
    },
    "5": {
      "title": "Xây Dựng Và Phát Triển Huế - Đô Thị Di Sản Văn Hoá Đặc Sắc Khu Vực Đông Nam Á",
      "lead": "Một hội thảo khoa học tại Hà Nội đã quy tụ các chuyên gia và nhà hoạch định chính sách để thảo luận về một con đường phát triển độc đáo cho Thừa Thiên Huế . Điểm chung là: tương lai của thành phố nên ưu tiên di sản văn hóa phong phú và bản sắc sinh thái thay vì mô hình công nghiệp truyền thống, đảm bảo Huế vẫn là một trung tâm văn hóa đặc sắc ở Đông Nam Á."
    },
    "6": {
      "title": "Kinh Tế Đô Thị Trong Quy Hoạch, Phát Triển Bền Vững Đô Thị Việt Nam - Cơ Hội & Thách Thức",
      "lead": "Viện Nghiên Cứu Kinh tế Xây Dựng và Đô Thị với sự bảo trợ của Ban Kinh Tế Trung ương và Bộ Xây Dựng đã tổ chức hội thảo “Kinh tế đô thị trong quy hoạch, xây dựng và phát triển bền vững đô thị Việt Nam - cơ hội và thách thức”. Đây là một sự kiện trong chuỗi các sự kiện của ngày Đô thị VN 08/11/2022 tổ chức tại Bộ Xây Dựng."
    },
    "7": {
      "title": "Toạ Đàm Tổng Quan Và Thực Trạng Đô Thị Biển Việt Nam – Một Số Quan Điểm Về Kiểm Soát Phát Triển",
      "lead": "Viện Nghiên Cứu Kinh Tế Xây Dựng và Đô Thị – Tổng Hội Xây Dựng Việt Nam đã tổ chức hội thảo khoa học"
    },
    "8": {
      "title": "Áo Ấm Đến Trường: Hành Trình Yêu Thương Đến Cao Nguyên Quản Bạ – Hà Giang",
      "lead": "Giữa tiết trời se lạnh của núi rừng Hà Giang, những chiếc áo ấm cùng nụ cười hồn nhiên đã viết nên câu chuyện chan chứa tình thương và gắn kết cộng đồng."
    },
    "9": {
      "title": "Hội An Xanh: Quy Hoạch Hành Lang Ven Biển Cửa Đại",
      "lead": "Trước nguy cơ xói lở nghiêm trọng ở bãi biển Cửa Đại, các chuyên gia và nhà quản lý đã cùng nhau thảo luận để kiến tạo một hành lang xanh – vừa bảo vệ bờ biển, vừa nuôi dưỡng hệ sinh thái và cộng đồng địa phương."
    }
  },
  "en": {
    "1": {
      "title": "Inauguration and Handover of Âu Cơ Park",
      "lead": "With the Attendance of the Chairman of the Quang Nam Provincial People's Committee — Mr. Lê Văn Dũng"
    },
    "2": {
      "title": "8th Asia Regional Conservation Forum opens in Thailand",
      "lead": "On 3 September, the 8th Asia Regional Conservation Forum (RCF) of the International Union for Conservation of Nature (IUCN) opened in Bangkok, Thailand. The event brought together nearly 600 conservation leaders from across the region, including representatives of governments, non-governmental organizations, donors and partners, academia and the private sector, and many other stakeholders."
    },
    "3": {
      "title": "Joining together to contribute relief for communities affected by Typhoon Yagi",
      "lead": "Following the call of the Central Committee of the Vietnam Fatherland Front, the Institute of Construction Economics and Urban Planning appealed to staff, partners, and donors to join in contributing relief for communities affected by Typhoon Yagi."
    },
    "4": {
      "title": "Conference reviewing Vietnam’s smart and sustainable urban development program, 2018–2025, and the 2030 outlook",
      "lead": "Vietnam’s Smart City Initiative: Achievements and the 2025–2030 Roadmap"
    },
    "5": {
      "title": "Building and Developing Hue — A Distinctive Cultural Heritage City in Southeast Asia",
      "lead": "A scientific workshop in Hanoi brought together experts and policymakers to discuss a distinctive development path for Thua Thien Hue. The shared view: the city’s future should prioritize its rich cultural heritage and ecological identity over a conventional industrial model, ensuring Hue remains a distinctive cultural center in Southeast Asia."
    },
    "6": {
      "title": "Urban Economics in Planning and Sustainable Urban Development in Vietnam — Opportunities & Challenges",
      "lead": "The Institute of Construction Economics and Urban Planning, under the patronage of the Central Economic Commission and the Ministry of Construction, hosted the workshop “Urban economics in planning, construction, and sustainable urban development in Vietnam — opportunities and challenges.” The event was part of Vietnam Urban Day on 8 November 2022, held at the Ministry of Construction."
    },
    "7": {
      "title": "Roundtable on the Overview and Current State of Vietnam’s Coastal Cities — Perspectives on Development Control",
      "lead": "The Institute of Construction Economics and Urban Planning – Vietnam Construction Association hosted a scientific workshop"
    },
    "8": {
      "title": "Warm Coats for School: A Journey of Care to the Quan Ba Highlands — Ha Giang",
      "lead": "In the chill of Ha Giang’s mountains, warm coats and unguarded smiles told a story of compassion and community."
    },
    "9": {
      "title": "Green Hội An: Planning the Cua Dai Coastal Corridor",
      "lead": "Facing severe erosion at Cua Dai Beach, experts and officials came together to shape a green corridor — one that protects the shoreline while sustaining local ecosystems and communities."
    }
  },
  "de": {
    "1": {
      "title": "Einweihung und Übergabe des Âu-Cơ-Parks",
      "lead": "In Anwesenheit des Vorsitzenden des Volkskomitees der Provinz Quang Nam, Herrn Lê Văn Dũng"
    },
    "2": {
      "title": "Eröffnung des 8. Regionalen Naturschutzforums Asien in Thailand",
      "lead": "Am 3. September wurde das 8. Regionale Naturschutzforum (RCF) der Internationalen Naturschutzunion (IUCN) in Bangkok, Thailand, eröffnet. Die Veranstaltung versammelte fast 600 führende Persönlichkeiten des Naturschutzes aus der gesamten Region, darunter Regierungsvertretungen, Nichtregierungsorganisationen, Geldgeber und Partner, Hochschulen und die Privatwirtschaft sowie zahlreiche weitere Beteiligte."
    },
    "3": {
      "title": "Gemeinsam spenden, unterstützen und den vom Taifun Yagi betroffenen Menschen helfen",
      "lead": "Dem Aufruf des Zentralkomitees der Vaterländischen Front Vietnams folgend hat das Institut für Bauökonomie und Stadtentwicklung Mitarbeitende, Partner und Förderer aufgerufen, gemeinsam zu spenden und den vom Taifun Yagi betroffenen Menschen zu helfen."
    },
    "4": {
      "title": "Abschlusskonferenz zum Programm für smarte und nachhaltige Stadtentwicklung in Vietnam 2018–2025 und Ausblick 2030",
      "lead": "Vietnams Smart-City-Initiative: Erfolge und Fahrplan 2025–2030"
    },
    "5": {
      "title": "Aufbau und Entwicklung von Hue – einer einzigartigen kulturellen Erbestadt in Südostasien",
      "lead": "Ein wissenschaftlicher Workshop in Hanoi versammelte Fachleute und politische Entscheidungsträgerinnen und Entscheidungsträger, um einen eigenständigen Entwicklungsweg für Thua Thien Hue zu erörtern. Der gemeinsame Nenner: Die Zukunft der Stadt sollte ihr reiches kulturelles Erbe und ihre ökologische Identität Vorrang vor einem herkömmlichen Industriemodell geben, damit Hue ein unverwechselbares Kulturzentrum Südostasiens bleibt."
    },
    "6": {
      "title": "Städtische Wirtschaft in Planung und nachhaltiger Stadtentwicklung Vietnams – Chancen & Herausforderungen",
      "lead": "Das Institut für Bauökonomie und Stadtentwicklung hat unter der Schirmherrschaft der Zentralen Wirtschaftskommission und des Bauministeriums den Workshop „Städtische Wirtschaft in Planung, Bau und nachhaltiger Stadtentwicklung Vietnams – Chancen und Herausforderungen“ ausgerichtet. Die Veranstaltung gehörte zur Reihe zum Tag der vietnamesischen Städte am 08.11.2022 im Bauministerium."
    },
    "7": {
      "title": "Fachgespräch: Überblick und Lage der Küstenstädte Vietnams – Standpunkte zur Entwicklungssteuerung",
      "lead": "Das Institut für Bauökonomie und Stadtentwicklung – Vietnamesischer Bauverband hat einen wissenschaftlichen Workshop ausgerichtet"
    },
    "8": {
      "title": "Warme Kleidung zur Schule: Eine Reise der Fürsorge auf die Hochebene Quan Ba – Ha Giang",
      "lead": "In der kühlen Luft der Bergwälder von Ha Giang haben warme Jacken und unbeschwerte Lächeln eine Geschichte voller Fürsorge und gemeinschaftlicher Verbundenheit geschrieben."
    },
    "9": {
      "title": "Grünes Hoi An: Planung des Küstenkorridors Cua Dai",
      "lead": "Angesichts der ernsthaften Erosionsgefahr am Strand von Cua Dai haben Fachleute und Verwaltung gemeinsam erörtert, wie ein Grünkorridor entstehen kann – der die Küste schützt und zugleich Ökosystem und lokale Gemeinschaft nährt."
    }
  },
  "fr": {
    "1": {
      "title": "Inauguration et remise du parc Âu Cơ",
      "lead": "En présence du président du Comité populaire de la province de Quang Nam - M. Lê Văn Dũng"
    },
    "2": {
      "title": "Ouverture du 8e Forum régional asiatique de la conservation en Thaïlande",
      "lead": "Le 3/9, le 8e Forum régional asiatique de la conservation (RCF) de l'Union internationale pour la conservation de la nature (IUCN) s'est ouvert à Bangkok, en Thaïlande. L'événement a réuni près de 600 dirigeants de la conservation venus de toute la région, parmi lesquels des représentants gouvernementaux, des organisations non gouvernementales, des bailleurs et partenaires, le monde académique et le secteur privé, ainsi que de nombreuses autres parties prenantes."
    },
    "3": {
      "title": "Unis pour contribuer, soutenir et aider les populations touchées par le typhon Yagi",
      "lead": "Répondant à l'appel du Comité central du Front de la patrie du Vietnam, l'Institut a lancé un appel à son personnel, à ses partenaires et aux donateurs pour contribuer ensemble et aider les populations touchées par le typhon Yagi."
    },
    "4": {
      "title": "Conférence de bilan du programme de développement des villes intelligentes et durables du Vietnam, période 2018-2025, et orientations 2030",
      "lead": "L'initiative villes intelligentes du Vietnam : réalisations et feuille de route 2025-2030"
    },
    "5": {
      "title": "Construire et développer Hué - Ville du patrimoine culturel distinctive en Asie du Sud-Est",
      "lead": "Un colloque scientifique à Hanoï a réuni experts et décideurs pour discuter d'une trajectoire de développement originale pour Thua Thien Hue. Le consensus : l'avenir de la ville devrait prioriser son riche patrimoine culturel et son identité écologique plutôt qu'un modèle industriel classique, afin que Hué demeure un pôle culturel distinctif en Asie du Sud-Est."
    },
    "6": {
      "title": "L'économie urbaine dans la planification et le développement durable des villes vietnamiennes - Opportunités & défis",
      "lead": "L'Institut d'économie de la construction et de l'urbanisme, sous le patronage de la Commission économique centrale et du ministère de la Construction, a organisé le colloque « L'économie urbaine dans la planification, la construction et le développement durable des villes vietnamiennes - opportunités et défis ». Cet événement s'inscrit dans la série des manifestations de la Journée des villes du Vietnam du 08/11/2022, organisée au ministère de la Construction."
    },
    "7": {
      "title": "Table ronde : aperçu et état des lieux des villes littorales du Vietnam – quelques points de vue sur le contrôle du développement",
      "lead": "L'Institut d'économie de la construction et de l'urbanisme – Association générale de la construction du Vietnam a organisé un colloque scientifique"
    },
    "8": {
      "title": "Des manteaux pour l'école : un voyage de solidarité vers le plateau de Quan Ba – Ha Giang",
      "lead": "Dans le froid vif des montagnes de Ha Giang, des manteaux chauds et des sourires d'enfants ont écrit une histoire de générosité et de lien communautaire."
    },
    "9": {
      "title": "Hoi An verte : planification du corridor littoral de Cua Dai",
      "lead": "Face au risque d'érosion grave de la plage de Cua Dai, experts et responsables se sont réunis pour concevoir un corridor vert – à la fois protection du littoral et soutien aux écosystèmes et à la communauté locale."
    }
  },
  "ja": {
    "1": {
      "title": "アウコー公園の竣工・引渡し式",
      "lead": "クアンナム省人民委員会委員長 Lê Văn Dũng 氏ご出席のもと"
    },
    "2": {
      "title": "第8回アジア地域保全フォーラムがタイで開幕",
      "lead": "9月3日、国際自然保護連合（IUCN）の第8回アジア地域保全フォーラム（RCF）が、タイのバンコクで開幕しました。本行事には、政府代表、非政府組織、資金提供機関およびパートナー、学術界、民間部門をはじめ、域内の保全分野からおよそ600名のリーダーが集まりました。"
    },
    "3": {
      "title": "台風ヤギの被災者への寄付・支援に力を合わせる",
      "lead": "ベトナム祖国戦線中央委員会の呼びかけに従い、建設経済・都市計画研究所は職員、パートナー、支援者に対し、台風ヤギの被災者をともに支え、助けるよう呼びかけました。"
    },
    "4": {
      "title": "ベトナムのスマートで持続可能な都市開発計画（2018–2025年）の総括会議および2030年に向けた方向性",
      "lead": "ベトナムのスマートシティ構想：成果と2025–2030年のロードマップ"
    },
    "5": {
      "title": "フエの建設と発展 — 東南アジアを代表する文化遺産都市",
      "lead": "ハノイで開かれた学術シンポジウムに、専門家と政策立案者が集まり、トゥアティエン＝フエの独自の発展の道について議論しました。共通の見解は、都市の将来は従来の産業モデルではなく、豊かな文化遺産と生態的アイデンティティを優先し、フエが東南アジアにおける特色ある文化拠点であり続けるべきだということです。"
    },
    "6": {
      "title": "ベトナム都市の計画と持続可能な発展における都市経済 — 機会と課題",
      "lead": "建設経済・都市計画研究所は、中央経済委員会および建設省の後援のもと、「ベトナム都市の計画・建設・持続可能な発展における都市経済 — 機会と課題」シンポジウムを開催しました。これは2022年11月8日のベトナム都市の日に建設省で行われた一連の行事のひとつです。"
    },
    "7": {
      "title": "ベトナム沿岸都市の概況と現状に関する座談会 — 開発制御をめぐるいくつかの見解",
      "lead": "建設経済・都市計画研究所 — ベトナム建設総会が学術シンポジウムを開催しました"
    },
    "8": {
      "title": "温かい服を学校へ：クアンバ高原への愛の旅 — ハザン",
      "lead": "ハザンの山と森の肌寒い空の下、暖かい衣服と無邪気な笑顔が、愛情と地域の絆に満ちた物語を紡ぎました。"
    },
    "9": {
      "title": "グリーン・ホイアン：クアダイ沿岸グリーンコリドーの計画",
      "lead": "クアダイ海岸の深刻な侵食の危機を前に、専門家と行政関係者が、海岸を守り、生態系と地域社会を育むグリーンコリドーの創出について議論しました。"
    }
  },
  "ko": {
    "1": {
      "title": "어우꺼 공원 준공·인계식",
      "lead": "꽝남성 인민위원장 Lê Văn Dũng 참석"
    },
    "2": {
      "title": "태국에서 열린 제8회 아시아 지역 보전 포럼 개막",
      "lead": "9월 3일, 세계자연보전연맹(IUCN)의 제8회 아시아 지역 보전 포럼(RCF)이 태국 방콕에서 개막했습니다. 이번 행사에는 정부 대표, 비정부기구, 후원기관과 협력기관, 학계와 민간 부문 등 역내 보전 분야 리더 약 600명이 모였습니다."
    },
    "3": {
      "title": "태풍 야기 피해 이웃을 위한 성금과 지원",
      "lead": "베트남 조국전선 중앙위원회의 호소에 따라, 건설경제·도시계획연구소는 임직원과 협력기관, 후원자들에게 태풍 야기 피해 주민을 돕는 성금과 지원을 요청했습니다."
    },
    "4": {
      "title": "베트남 스마트·지속가능 도시 발전 제안 2018-2025 종합 회의 및 2030 방향",
      "lead": "베트남 스마트 도시 이니셔티브: 성과와 2025-2030 로드맵"
    },
    "5": {
      "title": "후에 건설과 발전 — 동남아시아의 독특한 문화유산 도시",
      "lead": "하노이에서 열린 학술 워크숍에 전문가와 정책 입안자가 모여 트어티엔후에의 독특한 발전 경로를 논의했습니다. 공통된 결론은 이렇습니다. 도시의 미래는 전통적인 산업 모델보다 풍부한 문화유산과 생태적 정체성을 우선해야 하며, 후에가 동남아시아의 독특한 문화 중심지로 남도록 해야 합니다."
    },
    "6": {
      "title": "베트남 도시 계획·지속가능 발전 속의 도시경제 — 기회와 도전",
      "lead": "중앙경제위원회와 건설부의 후원 아래 건설경제·도시계획연구소는 「베트남 도시의 계획·건설·지속가능 발전 속 도시경제 — 기회와 도전」 워크숍을 개최했습니다. 이는 2022년 11월 8일 베트남 도시의 날을 맞아 건설부에서 열린 일련의 행사 중 하나입니다."
    },
    "7": {
      "title": "베트남 해안 도시 개관과 현황 — 개발 통제에 관한 몇 가지 관점 좌담회",
      "lead": "건설경제·도시계획연구소 – 베트남건설총회가 학술 워크숍을 개최했습니다"
    },
    "8": {
      "title": "따뜻한 교복: 꽌바 고원·하장으로 떠난 사랑의 여정",
      "lead": "하장 산중의 쌀쌀한 날씨 속에서, 따뜻한 옷과 해맑은 미소가 사랑과 지역사회 연대의 이야기를 써 내려갔습니다."
    },
    "9": {
      "title": "녹색 호이안: 꾸아다이 해안 회랑 계획",
      "lead": "꾸아다이 해수욕장의 심각한 침식 위기 앞에서, 전문가와 관리자들이 해안을 보호하면서 생태계와 지역사회를 키우는 그린 코리도를 만들기 위해 함께 논의했습니다."
    }
  }
}

export function getNewsArchiveArticleMeta(articleId, lang) {
  const id = String(articleId)
  const code = normalizeArchiveLang(lang)
  const localized = NEWS_ARCHIVE_ARTICLE_META[code]?.[id]
  const fallback = NEWS_ARCHIVE_ARTICLE_META.vi?.[id]
  if (!localized && !fallback) return null
  return {
    id,
    title: pickCopy(localized?.title, fallback?.title),
    lead: pickCopy(localized?.lead, fallback?.lead),
  }
}
