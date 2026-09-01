/**
 * Strings the bot itself says, as opposed to the UI around it.
 *
 * Intent answers, FAQ answers, and this routing copy exist in all six site
 * locales. Unsupported-language copy is only used for languages outside that
 * authored set.
 */
const COPY = {
  vi: {
    unsupported:
      'Chatbot hiện hỗ trợ Tiếng Việt, English, Deutsch, Français, 한국어 và 日本語. Vui lòng sử dụng một trong các ngôn ngữ này.',
    fallback:
      'Mình chưa chắc mình hiểu đúng câu hỏi. Bạn có thể nói rõ hơn giúp mình không?',
    clarification: 'Mình tìm thấy hai chủ đề có thể phù hợp: {first} hoặc {second}. Bạn muốn hỏi về chủ đề nào?',
    viewFaqs: 'Xem câu hỏi thường gặp',
    faqs: 'Câu hỏi thường gặp',
    contact: 'Liên hệ',
  },
  en: {
    unsupported:
      'This chatbot supports English, Vietnamese, German, French, Korean, and Japanese. Please use one of these languages.',
    fallback: 'I’m not fully sure I understood. Could you clarify your question?',
    clarification: 'I found two possible topics: {first} or {second}. Which one do you mean?',
    viewFaqs: 'View the FAQs',
    faqs: 'FAQs',
    contact: 'Contact',
  },
  de: {
    unsupported:
      'Dieser Chatbot unterstützt Deutsch, Englisch, Vietnamesisch, Französisch, Koreanisch und Japanisch. Bitte verwenden Sie eine dieser Sprachen.',
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
      'Ce chatbot prend en charge le français, l’anglais, le vietnamien, l’allemand, le coréen et le japonais. Veuillez utiliser l’une de ces langues.',
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
      '이 챗봇은 한국어, 영어, 베트남어, 독일어, 프랑스어, 일본어를 지원합니다. 이 중 하나의 언어를 사용해 주세요.',
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
      'このチャットボットは、日本語、英語、ベトナム語、ドイツ語、フランス語、韓国語に対応しています。いずれかの言語で入力してください。',
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
