/**
 * Strings the bot itself says, as opposed to the UI around it.
 *
 * Intent answers exist in Vietnamese and English. FAQ answers and this routing
 * copy exist in all six site locales, so a reader can search the localized FAQ
 * before the bot explains the narrower intent-language support.
 */
const COPY = {
  vi: {
    unsupported:
      'Hiện tại chatbot chỉ hỗ trợ Tiếng Việt và English. Vui lòng đặt câu hỏi bằng Tiếng Việt hoặc English (bạn có thể đổi ngôn ngữ trang bằng biểu tượng lá cờ trên thanh menu).',
    fallback:
      'Mình chưa chắc mình hiểu đúng câu hỏi. Bạn có thể nói rõ hơn giúp mình không?',
    clarification: 'Mình tìm thấy hai chủ đề có thể phù hợp: {first} hoặc {second}. Bạn muốn hỏi về chủ đề nào?',
    viewFaqs: 'Xem câu hỏi thường gặp',
    faqs: 'Câu hỏi thường gặp',
    contact: 'Liên hệ',
  },
  en: {
    unsupported:
      'This chatbot currently supports Vietnamese and English only. Please ask your question in Vietnamese or English (you can switch the page language with the flag icon in the menu).',
    fallback: 'I’m not fully sure I understood. Could you clarify your question?',
    clarification: 'I found two possible topics: {first} or {second}. Which one do you mean?',
    viewFaqs: 'View the FAQs',
    faqs: 'FAQs',
    contact: 'Contact',
  },
  de: {
    unsupported:
      'Der Chatbot kann FAQ-Fragen auf Deutsch beantworten. Für andere Anfragen verwenden Sie bitte Vietnamesisch oder Englisch.',
    fallback: 'Ich bin nicht sicher, ob ich die Frage richtig verstanden habe. Können Sie sie präzisieren?',
    clarification: 'Ich habe zwei mögliche Themen gefunden: {first} oder {second}. Welches meinen Sie?',
    viewFaqs: 'FAQ ansehen',
    faqs: 'FAQ',
    contact: 'Kontakt',
    quickTopics: {
      services: {
        triggers: ['Leistungen'],
        answer: 'Die FAQ gibt einen Überblick über die Leistungen von ICUE. Für eine projektspezifische Prüfung nutzen Sie bitte die Kontaktseite.',
        links: ['faqs', 'contact'],
      },
      pricing: {
        triggers: ['Honorare'],
        answer: 'Honorare hängen von Umfang, Zeitplan und Komplexität ab. Senden Sie für eine projektspezifische Einschätzung eine kurze Anfrage über die Kontaktseite.',
        links: ['contact'],
      },
      contact: {
        triggers: ['Kontakt'],
        answer: 'Die aktuellen Kontaktmöglichkeiten finden Sie auf der Kontaktseite.',
        links: ['contact'],
      },
    },
  },
  fr: {
    unsupported:
      'Le chatbot peut répondre aux questions de la FAQ en français. Pour les autres demandes, veuillez utiliser le vietnamien ou l’anglais.',
    fallback: 'Je ne suis pas certain d’avoir bien compris. Pouvez-vous préciser votre question ?',
    clarification: 'Deux sujets semblent possibles : {first} ou {second}. Lequel recherchez-vous ?',
    viewFaqs: 'Voir la FAQ',
    faqs: 'FAQ',
    contact: 'Contact',
    quickTopics: {
      services: {
        triggers: ['Prestations'],
        answer: 'La FAQ présente les prestations d’ICUE. Pour une évaluation propre à votre projet, utilisez la page Contact.',
        links: ['faqs', 'contact'],
      },
      pricing: {
        triggers: ['Honoraires'],
        answer: 'Les honoraires dépendent du périmètre, du calendrier et de la complexité. Envoyez une brève demande via la page Contact pour une estimation liée au projet.',
        links: ['contact'],
      },
      contact: {
        triggers: ['Contact'],
        answer: 'Les moyens de contact actuels figurent sur la page Contact.',
        links: ['contact'],
      },
    },
  },
  ko: {
    unsupported:
      '이 챗봇은 한국어 FAQ 질문에 답할 수 있습니다. 그 밖의 문의는 베트남어 또는 영어로 작성해 주세요.',
    fallback: '질문을 정확히 이해하지 못했습니다. 조금 더 구체적으로 알려 주세요.',
    clarification: '두 가지 주제가 검색되었습니다: {first} 또는 {second}. 어느 쪽을 의미하시나요?',
    viewFaqs: 'FAQ 보기',
    faqs: 'FAQ',
    contact: '문의',
    quickTopics: {
      services: {
        triggers: ['서비스'],
        answer: 'FAQ에서 ICUE의 서비스 개요를 확인할 수 있습니다. 프로젝트별 검토가 필요하면 문의 페이지를 이용해 주세요.',
        links: ['faqs', 'contact'],
      },
      pricing: {
        triggers: ['비용'],
        answer: '비용은 업무 범위, 일정, 복잡도에 따라 달라집니다. 프로젝트별 견적은 문의 페이지에서 간단한 개요와 함께 요청해 주세요.',
        links: ['contact'],
      },
      contact: {
        triggers: ['문의'],
        answer: '현재 이용 가능한 연락 방법은 문의 페이지에서 확인할 수 있습니다.',
        links: ['contact'],
      },
    },
  },
  ja: {
    unsupported:
      'このチャットボットは日本語のFAQに回答できます。その他のお問い合わせは、ベトナム語または英語で入力してください。',
    fallback: 'ご質問を正確に理解できませんでした。もう少し具体的に入力してください。',
    clarification: '該当する可能性のある項目が2つあります：{first} または {second}。どちらについてですか。',
    viewFaqs: 'FAQを見る',
    faqs: 'FAQ',
    contact: 'お問い合わせ',
    quickTopics: {
      services: {
        triggers: ['サービス'],
        answer: 'ICUEのサービス概要はFAQで確認できます。案件ごとの確認が必要な場合は、お問い合わせページをご利用ください。',
        links: ['faqs', 'contact'],
      },
      pricing: {
        triggers: ['費用'],
        answer: '費用は業務範囲、スケジュール、複雑さによって異なります。案件ごとの見積りは、お問い合わせページから概要を添えてご依頼ください。',
        links: ['contact'],
      },
      contact: {
        triggers: ['お問い合わせ'],
        answer: '現在ご利用いただける連絡方法は、お問い合わせページで確認できます。',
        links: ['contact'],
      },
    },
  },
}

/**
 * @param {string} language  one of the six site locales; anything else uses English
 * @param {{faqsUrl: string, contactUrl: string}} urls  real paths, resolved by
 *   the host app — the legacy version hardcoded the dead hash routes `#/faqs`
 *   and `#/Contact`.
 */
export function createBotCopy({ faqsUrl, contactUrl }) {
  return (language) => ({ ...(COPY[language] || COPY.en), faqsUrl, contactUrl })
}

export default COPY
