exports.handler = async (event) => {
  try {
    const { handleTranslateArticleRequest } = await import('../../news-app/src/lib/translateServer.js')
    return handleTranslateArticleRequest(event, process.env)
  } catch (err) {
    console.error('[translate-article]', err)
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'translation failed',
        code: err?.message || 'function_error',
      }),
    }
  }
}
