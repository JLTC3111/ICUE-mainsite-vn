import runtime from './runtimeEnv.js'
import { handleGeminiArticleRequest } from '../../news-app/src/lib/geminiServer.js'
import { aiRequest } from './lib/ai-request.mjs'

export const config = { rateLimit: { windowLimit: 12, windowSize: 60, aggregateBy: ['ip', 'domain'] } }
export default request => aiRequest(request, handleGeminiArticleRequest, runtime.loadRuntimeEnv())
