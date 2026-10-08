import runtime from './runtimeEnv.js'
import { handleFluxImageRequest } from '../../news-app/src/lib/fluxServer.js'
import { aiRequest } from './lib/ai-request.mjs'

export const config = { rateLimit: { windowLimit: 6, windowSize: 60, aggregateBy: ['ip', 'domain'] } }
export default request => aiRequest(request, handleFluxImageRequest, runtime.loadRuntimeEnv())
