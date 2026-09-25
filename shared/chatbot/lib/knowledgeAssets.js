// Import the canonical authored files as assets. Every standalone app gets
// base-aware URLs; no dependency on a different app's public directory.
import vi from '../../../public/chatbot/kb.vi.json?url'
import en from '../../../public/chatbot/kb.en.json?url'
import de from '../../../public/chatbot/kb.de.json?url'
import fr from '../../../public/chatbot/kb.fr.json?url'
import ko from '../../../public/chatbot/kb.ko.json?url'
import ja from '../../../public/chatbot/kb.ja.json?url'

export const knowledgeUrls = { vi, en, de, fr, ko, ja }
