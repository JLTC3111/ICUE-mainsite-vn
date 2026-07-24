const { loadRuntimeEnv } = require('./runtimeEnv')

exports.handler = async (event) => {
  try {
    const { handleFluxImageRequest } = await import('../../news-app/src/lib/fluxServer.js')
    return handleFluxImageRequest(event, loadRuntimeEnv())
  } catch (err) {
    console.error('[flux-image]', err)
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'image generation failed',
        code: err?.message || 'function_error',
      }),
    }
  }
}
