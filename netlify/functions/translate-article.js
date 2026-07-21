exports.handler = async (event) => {
  const { handleTranslateArticleRequest } = await import('../../news-app/src/lib/translateServer.js')
  return handleTranslateArticleRequest(event, process.env)
}
