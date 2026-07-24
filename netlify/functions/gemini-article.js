const { loadRuntimeEnv } = require('./runtimeEnv')

exports.handler = async (event) => {
  try {
    const { handleGeminiArticleRequest } = await import('../../news-app/src/lib/geminiServer.js')
    return handleGeminiArticleRequest(event, loadRuntimeEnv())
  } catch (err) {
    console.error('[gemini-article]', err)
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'gemini failed',
        code: err?.message || 'function_error',
      }),
    }
  }
}
