/**
 * The community programmes, and the photographs that document them.
 *
 * Everything here was read off the banners and objects in the photographs
 * themselves — that was the only source available, because the legacy page it
 * replaces carried no copy at all: one heading, a 13-photo collage and a dead
 * button. See the plan for the full audit.
 *
 * WHAT IS ASSERTED, AND WHAT IS NOT
 *
 * Programme name, date, place, and what is visibly being handed over are all
 * legible in the photographs and are stated. Participant counts, sums raised,
 * beneficiary numbers and outcomes are *not* visible anywhere and are
 * deliberately absent — a page about charitable work is the last place to
 * round a number up.
 *
 * `meta.date` is optional on purpose. The Hà Giang banner carries 15.01.2024;
 * the Bảo Yên banner carries no date, so that entry simply has none rather
 * than an inferred one, and the page renders the date only where it exists.
 * Anything still unknown is listed in ./REVIEW.md, not guessed at here.
 *
 * A `TODO(review)` marker anywhere in this file fails `npm run verify:content`,
 * so a placeholder cannot reach production by accident.
 *
 * Vietnamese is authoritative; the other five are hand-written translations.
 *
 * On captions: each photograph has one authored string per locale, used as
 * both the visible `<figcaption>` and the image's `alt`. They describe what is
 * in the frame, which is what a caption should do here and what a reader who
 * cannot see the photograph needs.
 */

/** Display order. */
export const PROGRAMME_IDS = ['warmClothes', 'yagiRelief', 'fieldwork']

export const AUTHORITATIVE_LANGUAGE = 'vi'

const PROGRAMMES = {
  warmClothes: {
    meta: {
      date: '2024-01-15',
      locality: 'Thị trấn Tam Sơn',
      district: 'Quản Bạ',
      region: 'Hà Giang',
      country: 'VN',
      photos: [
        'warm-clothes-welcome',
        'warm-clothes-group',
        'warm-clothes-banner',
        'warm-clothes-table',
        'warm-clothes-handover',
        'warm-clothes-coats',
      ],
    },
    vi: {
      kicker: 'Chương trình thiện nguyện',
      name: 'Áo ấm cho con đến trường',
      place: 'Trường Mầm non thôn Thượng Sơn, thị trấn Tam Sơn, huyện Quản Bạ, tỉnh Hà Giang',
      summary: 'Áo ấm, quà và thiết bị dạy học trao tận tay các em nhỏ giữa mùa đông vùng cao.',
      body: [
        'Ngày 15 tháng 1 năm 2024, đoàn Viện Nghiên cứu Kinh tế Xây dựng và Đô thị đến Trường Mầm non thôn Thượng Sơn, thị trấn Tam Sơn, huyện Quản Bạ, tỉnh Hà Giang.',
        'Mỗi em nhỏ nhận một phần quà và một chiếc áo khoác mới đủ ấm cho mùa đông vùng cao. Nhà trường được trao thêm dầu ăn, mì gói, cùng một tivi LG 43 inch và loa thanh phục vụ việc dạy và học.',
      ],
      captions: {
        'warm-clothes-welcome': 'Đại diện Viện phát biểu khai mạc, phía sau là những phần quà đã xếp sẵn trên bàn.',
        'warm-clothes-group': 'Các em nhỏ cùng thầy cô và đoàn công tác trước phông chương trình.',
        'warm-clothes-banner': 'Phông chương trình ghi rõ địa điểm và ngày tổ chức: 15.01.2024.',
        'warm-clothes-table': 'Các em vây quanh bàn của đoàn công tác; dầu ăn xếp thành hàng phía bên trái.',
        'warm-clothes-handover': 'Bàn giao tivi LG 43 inch và loa thanh cho nhà trường.',
        'warm-clothes-coats': 'Các em trong lớp học, mặc những chiếc áo khoác mới vừa được trao.',
      },
    },
    en: {
      kicker: 'Charitable programme',
      name: 'Warm Coats for the Journey to School',
      place: 'Thượng Sơn Village Kindergarten, Tam Sơn township, Quản Bạ district, Hà Giang province',
      summary: 'Coats, gifts and teaching equipment handed to the children in the middle of a highland winter.',
      body: [
        'On 15 January 2024 a delegation from the Institute for Construction and Urban Economics Research travelled to Thượng Sơn Village Kindergarten in Tam Sơn township, Quản Bạ district, Hà Giang province.',
        'Every child received a gift and a new coat warm enough for a highland winter. The school was also given cooking oil, instant noodles, and an LG 43-inch television with a soundbar for teaching.',
      ],
      captions: {
        'warm-clothes-welcome': 'A representative of the Institute opens the programme, the prepared gifts laid out on tables behind.',
        'warm-clothes-group': 'The children with their teachers and the visiting delegation in front of the programme banner.',
        'warm-clothes-banner': 'The banner gives the place and the date: 15.01.2024.',
        'warm-clothes-table': 'Children gather round the delegation’s table; bottles of cooking oil are stacked at the left.',
        'warm-clothes-handover': 'Handing over an LG 43-inch television and a soundbar to the school.',
        'warm-clothes-coats': 'The children in their classroom, wearing the new coats they had just been given.',
      },
    },
    de: {
      kicker: 'Wohltätigkeitsprogramm',
      name: 'Warme Jacken für den Schulweg',
      place: 'Kindergarten des Dorfes Thượng Sơn, Gemeinde Tam Sơn, Kreis Quản Bạ, Provinz Hà Giang',
      summary: 'Jacken, Geschenke und Unterrichtstechnik, übergeben mitten im Winter des Hochlands.',
      body: [
        'Am 15. Januar 2024 reiste eine Delegation des Instituts für Bau- und Stadtökonomieforschung zum Kindergarten des Dorfes Thượng Sơn in der Gemeinde Tam Sơn, Kreis Quản Bạ, Provinz Hà Giang.',
        'Jedes Kind erhielt ein Geschenk und eine neue Jacke, warm genug für einen Winter im Hochland. Die Schule bekam außerdem Speiseöl, Instantnudeln sowie einen LG-Fernseher mit 43 Zoll und eine Soundbar für den Unterricht.',
      ],
      captions: {
        'warm-clothes-welcome': 'Eine Vertreterin des Instituts eröffnet das Programm; dahinter liegen die vorbereiteten Geschenke auf Tischen.',
        'warm-clothes-group': 'Die Kinder mit ihren Lehrerinnen und der Delegation vor dem Programmbanner.',
        'warm-clothes-banner': 'Das Banner nennt Ort und Datum: 15.01.2024.',
        'warm-clothes-table': 'Kinder drängen sich um den Tisch der Delegation; links stapelt sich Speiseöl.',
        'warm-clothes-handover': 'Übergabe eines 43-Zoll-Fernsehers von LG und einer Soundbar an die Schule.',
        'warm-clothes-coats': 'Die Kinder im Klassenraum, in den neuen Jacken, die sie gerade bekommen haben.',
      },
    },
    fr: {
      kicker: 'Programme solidaire',
      name: 'Des manteaux chauds pour aller à l’école',
      place: 'École maternelle du village de Thượng Sơn, bourg de Tam Sơn, district de Quản Bạ, province de Hà Giang',
      summary: 'Manteaux, cadeaux et matériel pédagogique remis aux enfants en plein hiver des hauts plateaux.',
      body: [
        'Le 15 janvier 2024, une délégation de l’Institut de recherche en économie de la construction et de l’urbanisme s’est rendue à l’école maternelle du village de Thượng Sơn, bourg de Tam Sơn, district de Quản Bạ, province de Hà Giang.',
        'Chaque enfant a reçu un cadeau et un manteau neuf, assez chaud pour l’hiver des hauts plateaux. L’école a également reçu de l’huile alimentaire, des nouilles instantanées, ainsi qu’un téléviseur LG de 43 pouces et une barre de son pour l’enseignement.',
      ],
      captions: {
        'warm-clothes-welcome': 'Une représentante de l’Institut ouvre le programme, les cadeaux préparés disposés sur les tables derrière elle.',
        'warm-clothes-group': 'Les enfants avec leurs enseignantes et la délégation devant la banderole du programme.',
        'warm-clothes-banner': 'La banderole indique le lieu et la date : 15.01.2024.',
        'warm-clothes-table': 'Les enfants se pressent autour de la table de la délégation ; des bidons d’huile sont empilés à gauche.',
        'warm-clothes-handover': 'Remise d’un téléviseur LG de 43 pouces et d’une barre de son à l’école.',
        'warm-clothes-coats': 'Les enfants dans leur classe, vêtus des manteaux neufs qu’ils viennent de recevoir.',
      },
    },
    ko: {
      kicker: '자선 프로그램',
      name: '학교 가는 길, 따뜻한 겉옷',
      place: '하장성 꽌바현 땀선읍 트엉선마을 유치원',
      summary: '고산지대의 한겨울, 아이들에게 겉옷과 선물, 그리고 교육 기자재를 전했습니다.',
      body: [
        '2024년 1월 15일, 건설·도시경제연구소 대표단이 하장성 꽌바현 땀선읍에 있는 트엉선마을 유치원을 찾았습니다.',
        '아이들은 저마다 선물과 함께 고산지대의 겨울을 날 수 있는 새 겉옷을 받았습니다. 유치원에는 식용유와 라면, 그리고 수업에 쓸 LG 43인치 텔레비전과 사운드바를 전달했습니다.',
      ],
      captions: {
        'warm-clothes-welcome': '연구소 대표가 개회 인사를 하고, 뒤편 탁자에는 준비된 선물이 놓여 있습니다.',
        'warm-clothes-group': '프로그램 현수막 앞에 선 아이들과 교사, 그리고 방문단.',
        'warm-clothes-banner': '현수막에 장소와 날짜가 적혀 있습니다: 15.01.2024.',
        'warm-clothes-table': '방문단 탁자 주위로 모여든 아이들. 왼쪽에는 식용유가 쌓여 있습니다.',
        'warm-clothes-handover': 'LG 43인치 텔레비전과 사운드바를 유치원에 전달하는 모습.',
        'warm-clothes-coats': '방금 받은 새 겉옷을 입고 교실에 모인 아이들.',
      },
    },
    ja: {
      kicker: '慈善プログラム',
      name: '学校へ向かう子どもたちに暖かい上着を',
      place: 'ハザン省クアンバ県タムソン町トゥオンソン村 幼稚園',
      summary: '高地の冬のさなか、子どもたちに上着と贈り物、そして教材機器を届けました。',
      body: [
        '2024年1月15日、建設・都市経済研究所の一行が、ハザン省クアンバ県タムソン町のトゥオンソン村幼稚園を訪ねました。',
        '子どもたち一人ひとりに贈り物と、高地の冬をしのげる新しい上着を手渡しました。幼稚園には食用油とインスタント麺、そして授業で使うLGの43インチテレビとサウンドバーを寄贈しています。',
      ],
      captions: {
        'warm-clothes-welcome': '研究所の代表が開会の挨拶をする。後方の机には用意された贈り物が並ぶ。',
        'warm-clothes-group': 'プログラムの横断幕の前に並ぶ子どもたち、先生、そして訪問団。',
        'warm-clothes-banner': '横断幕に会場と日付が記されている ― 15.01.2024。',
        'warm-clothes-table': '訪問団の机を囲む子どもたち。左手には食用油が積まれている。',
        'warm-clothes-handover': 'LGの43インチテレビとサウンドバーを幼稚園へ引き渡す。',
        'warm-clothes-coats': '受け取ったばかりの新しい上着を着て教室に集まる子どもたち。',
      },
    },
  },

  yagiRelief: {
    meta: {
      // The banner carries no date. Yagi made landfall in September 2024, but
      // that is inference, not evidence, so no date is claimed here.
      locality: 'Xã Yên Sơn',
      district: 'Bảo Yên',
      region: 'Lào Cai',
      country: 'VN',
      photos: [
        'yagi-departure',
        'yagi-banner',
        'yagi-rice',
        'yagi-handover',
        'yagi-group',
      ],
    },
    vi: {
      kicker: 'Cứu trợ sau thiên tai',
      name: 'Hỗ trợ bà con huyện Bảo Yên khắc phục bão lũ Yagi',
      place: 'Nhà Văn hóa Bản Chom, xã Yên Sơn, huyện Bảo Yên, tỉnh Lào Cai',
      summary: 'Gạo và nhu yếu phẩm chuyển tới tận thôn bản sau khi bão Yagi đi qua.',
      body: [
        'Sau bão Yagi, đoàn Viện Nghiên cứu Kinh tế Xây dựng và Đô thị lên đường từ Hà Nội trong đêm, mang theo gạo và nhu yếu phẩm cho bà con huyện Bảo Yên, tỉnh Lào Cai.',
        'Điểm phát đặt tại Nhà Văn hóa Bản Chom, xã Yên Sơn. Chương trình được thực hiện cùng Ủy ban nhân dân huyện Bảo Yên và các đơn vị đồng hành.',
      ],
      captions: {
        'yagi-departure': 'Đoàn công tác trước giờ xuất phát từ Hà Nội, băng rôn cứu trợ treo trước đầu xe.',
        'yagi-banner': 'Đại diện Viện trò chuyện cùng người dân dưới băng rôn chương trình.',
        'yagi-rice': 'Gạo và các suất quà xếp sẵn trước Nhà Văn hóa Bản Chom, bà con xếp hàng nhận.',
        'yagi-handover': 'Trao từng suất quà; trên túi ghi rõ chương trình hỗ trợ huyện Bảo Yên – Lào Cai.',
        'yagi-group': 'Đoàn công tác và bà con sau khi phát xong.',
      },
    },
    en: {
      kicker: 'Disaster relief',
      name: 'Relief for Bảo Yên district after typhoon Yagi',
      place: 'Bản Chom Culture House, Yên Sơn commune, Bảo Yên district, Lào Cai province',
      summary: 'Rice and essential supplies carried into the hamlets after typhoon Yagi had passed.',
      body: [
        'After typhoon Yagi, a delegation from the Institute for Construction and Urban Economics Research set out from Hanoi overnight, carrying rice and essential supplies for the people of Bảo Yên district, Lào Cai province.',
        'The distribution point was the Bản Chom Culture House in Yên Sơn commune. The programme was carried out together with the Bảo Yên District People’s Committee and partner organisations.',
      ],
      captions: {
        'yagi-departure': 'The team before setting out from Hanoi, the relief banner tied across the front of the coach.',
        'yagi-banner': 'A representative of the Institute talking with residents beneath the programme banner.',
        'yagi-rice': 'Rice and prepared parcels laid out in front of the Bản Chom Culture House as people queue.',
        'yagi-handover': 'Handing over a parcel; the bags name the relief programme for Bảo Yên – Lào Cai.',
        'yagi-group': 'The team and residents after the distribution had finished.',
      },
    },
    de: {
      kicker: 'Katastrophenhilfe',
      name: 'Hilfe für den Kreis Bảo Yên nach dem Taifun Yagi',
      place: 'Kulturhaus Bản Chom, Gemeinde Yên Sơn, Kreis Bảo Yên, Provinz Lào Cai',
      summary: 'Reis und Hilfsgüter, nach dem Durchzug des Taifuns Yagi bis in die Weiler gebracht.',
      body: [
        'Nach dem Taifun Yagi brach eine Delegation des Instituts für Bau- und Stadtökonomieforschung nachts von Hanoi auf, mit Reis und Hilfsgütern für die Menschen im Kreis Bảo Yên, Provinz Lào Cai.',
        'Ausgabestelle war das Kulturhaus Bản Chom in der Gemeinde Yên Sơn. Durchgeführt wurde das Programm gemeinsam mit dem Volkskomitee des Kreises Bảo Yên und weiteren Partnern.',
      ],
      captions: {
        'yagi-departure': 'Das Team vor der Abfahrt aus Hanoi, das Hilfsbanner vorn am Bus befestigt.',
        'yagi-banner': 'Eine Vertreterin des Instituts im Gespräch mit Anwohnern unter dem Banner.',
        'yagi-rice': 'Reis und vorbereitete Pakete vor dem Kulturhaus Bản Chom, während die Menschen anstehen.',
        'yagi-handover': 'Übergabe eines Pakets; auf den Taschen steht das Hilfsprogramm für Bảo Yên – Lào Cai.',
        'yagi-group': 'Das Team und die Anwohner nach Abschluss der Verteilung.',
      },
    },
    fr: {
      kicker: 'Aide après catastrophe',
      name: 'Aide au district de Bảo Yên après le typhon Yagi',
      place: 'Maison de la culture de Bản Chom, commune de Yên Sơn, district de Bảo Yên, province de Lào Cai',
      summary: 'Du riz et des produits de première nécessité acheminés jusqu’aux hameaux après le passage du typhon Yagi.',
      body: [
        'Après le typhon Yagi, une délégation de l’Institut de recherche en économie de la construction et de l’urbanisme a quitté Hanoï de nuit, emportant du riz et des produits de première nécessité pour les habitants du district de Bảo Yên, province de Lào Cai.',
        'La distribution s’est tenue à la maison de la culture de Bản Chom, commune de Yên Sơn. Le programme a été mené avec le Comité populaire du district de Bảo Yên et des organisations partenaires.',
      ],
      captions: {
        'yagi-departure': 'L’équipe avant le départ de Hanoï, la banderole d’aide fixée à l’avant du car.',
        'yagi-banner': 'Une représentante de l’Institut échange avec des habitants sous la banderole du programme.',
        'yagi-rice': 'Riz et colis préparés devant la maison de la culture de Bản Chom, les habitants font la queue.',
        'yagi-handover': 'Remise d’un colis ; les sacs portent le nom du programme d’aide à Bảo Yên – Lào Cai.',
        'yagi-group': 'L’équipe et les habitants une fois la distribution terminée.',
      },
    },
    ko: {
      kicker: '재해 구호',
      name: '태풍 야기 피해를 입은 바오옌현 지원',
      place: '라오까이성 바오옌현 옌선사 반쫌 문화회관',
      summary: '태풍 야기가 지나간 뒤, 쌀과 생필품을 마을까지 실어 날랐습니다.',
      body: [
        '태풍 야기가 지나간 뒤, 건설·도시경제연구소 대표단이 밤중에 하노이를 출발해 라오까이성 바오옌현 주민들을 위한 쌀과 생필품을 실어 갔습니다.',
        '배부 장소는 옌선사의 반쫌 문화회관이었습니다. 이 프로그램은 바오옌현 인민위원회와 협력 기관들이 함께했습니다.',
      ],
      captions: {
        'yagi-departure': '하노이 출발 직전의 대표단. 버스 앞면에 구호 현수막이 걸려 있습니다.',
        'yagi-banner': '프로그램 현수막 아래에서 주민과 이야기를 나누는 연구소 대표.',
        'yagi-rice': '반쫌 문화회관 앞에 놓인 쌀과 준비된 꾸러미, 그리고 줄을 선 주민들.',
        'yagi-handover': '꾸러미를 전달하는 모습. 가방에는 바오옌–라오까이 지원 프로그램이 적혀 있습니다.',
        'yagi-group': '배부를 마친 뒤의 대표단과 주민들.',
      },
    },
    ja: {
      kicker: '災害支援',
      name: '台風ヤギの被害を受けたバオイエン県への支援',
      place: 'ラオカイ省バオイエン県イエンソン社 バンチョム文化会館',
      summary: '台風ヤギが去ったあと、米と生活必需品を集落まで届けました。',
      body: [
        '台風ヤギの通過後、建設・都市経済研究所の一行が夜のうちにハノイを発ち、ラオカイ省バオイエン県の人びとへ米と生活必需品を運びました。',
        '配付場所はイエンソン社のバンチョム文化会館です。本プログラムはバオイエン県人民委員会および協力各社とともに実施しました。',
      ],
      captions: {
        'yagi-departure': 'ハノイ出発前の一行。バスの前面に支援の横断幕が掲げられている。',
        'yagi-banner': '横断幕の下で住民と言葉を交わす研究所の代表。',
        'yagi-rice': 'バンチョム文化会館の前に並べられた米と支援品、そして列をつくる住民。',
        'yagi-handover': '支援品を手渡す。袋にはバオイエン県・ラオカイ省への支援である旨が記されている。',
        'yagi-group': '配付を終えたあとの一行と住民。',
      },
    },
  },

  fieldwork: {
    meta: {
      // Two archive photographs that belong to no named programme. They carry
      // no banner and no legible date, so this section states only what is in
      // the frame and makes no claim about when or why. See ./REVIEW.md.
      photos: ['fieldwork-town', 'fieldwork-survey'],
    },
    vi: {
      kicker: 'Ảnh tư liệu',
      name: 'Trên đường công tác',
      captions: {
        'fieldwork-town': 'Đoàn công tác tại một thị trấn miền núi phía Bắc.',
        'fieldwork-survey': 'Khảo sát thực địa bên một công trình công cộng của địa phương.',
      },
    },
    en: {
      kicker: 'From the archive',
      name: 'In the field',
      captions: {
        'fieldwork-town': 'The team in a town in the northern mountains.',
        'fieldwork-survey': 'A field survey beside a local public works marker.',
      },
    },
    de: {
      kicker: 'Aus dem Archiv',
      name: 'Unterwegs',
      captions: {
        'fieldwork-town': 'Das Team in einer Stadt im nördlichen Bergland.',
        'fieldwork-survey': 'Eine Ortsbegehung neben dem Gedenkstein eines kommunalen Bauvorhabens.',
      },
    },
    fr: {
      kicker: 'Archives',
      name: 'Sur le terrain',
      captions: {
        'fieldwork-town': 'L’équipe dans une ville des montagnes du Nord.',
        'fieldwork-survey': 'Un relevé de terrain près d’une borne d’ouvrage public local.',
      },
    },
    ko: {
      kicker: '자료 사진',
      name: '현장에서',
      captions: {
        'fieldwork-town': '북부 산간의 한 소도시에 선 대표단.',
        'fieldwork-survey': '지역 공공시설 표지석 옆에서 진행된 현장 조사.',
      },
    },
    ja: {
      kicker: '資料写真',
      name: '現場にて',
      captions: {
        'fieldwork-town': '北部山間の町に立つ一行。',
        'fieldwork-survey': '地域の公共事業の記念碑のかたわらで行われた現地調査。',
      },
    },
  },
}

/** `[{ id, meta, kicker, name, place?, summary?, body?, captions }]`. */
export function getProgrammes(language) {
  return PROGRAMME_IDS.map((id) => {
    const programme = PROGRAMMES[id]
    const text = programme[language] || programme[AUTHORITATIVE_LANGUAGE]
    return { id, meta: programme.meta, ...text }
  })
}

export default PROGRAMMES
