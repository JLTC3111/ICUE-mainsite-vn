/**
 * Strings the bot itself says, as opposed to the UI around it.
 *
 * These exist only in Vietnamese and English because those are the only two
 * languages the authored knowledge base covers (public/chatbot/kb.*.json), and
 * therefore the only two the bot can answer in. The chrome around the bot —
 * title, placeholder, suggestion chips, aria labels — comes from the host app's
 * own i18n and does exist in all six locales.
 *
 * When kb.de/fr/ko/ja.json are written, add them here and to KB_LANGUAGES in
 * ./knowledge.js at the same time; those two lists must agree.
 */
const COPY = {
  vi: {
    unsupported:
      'Hiện tại chatbot chỉ hỗ trợ Tiếng Việt và English. Vui lòng đặt câu hỏi bằng Tiếng Việt hoặc English (bạn có thể đổi ngôn ngữ trang bằng biểu tượng lá cờ trên thanh menu).',
    fallback:
      'Mình chưa chắc mình hiểu đúng câu hỏi. Bạn có thể nói rõ hơn giúp mình không?',
    viewFaqs: 'Xem câu hỏi thường gặp',
    faqs: 'Câu hỏi thường gặp',
    contact: 'Liên hệ',
  },
  en: {
    unsupported:
      'This chatbot currently supports Vietnamese and English only. Please ask your question in Vietnamese or English (you can switch the page language with the flag icon in the menu).',
    fallback: 'I’m not fully sure I understood. Could you clarify your question?',
    viewFaqs: 'View the FAQs',
    faqs: 'FAQs',
    contact: 'Contact',
  },
}

/**
 * @param {string} language  'vi' or 'en'; anything else falls back to English
 * @param {{faqsUrl: string, contactUrl: string}} urls  real paths, resolved by
 *   the host app — the legacy version hardcoded the dead hash routes `#/faqs`
 *   and `#/Contact`.
 */
export function createBotCopy({ faqsUrl, contactUrl }) {
  return (language) => ({ ...(COPY[language] || COPY.en), faqsUrl, contactUrl })
}

export default COPY
