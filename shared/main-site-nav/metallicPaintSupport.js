export function supportsMetallicMenuPaint({
  documentObject = typeof document === 'undefined' ? null : document,
  navigatorObject = typeof navigator === 'undefined' ? null : navigator,
} = {}) {
  if (!documentObject) return false;

  let gl = null;

  try {
    const canvas = documentObject.createElement('canvas');
    gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) return false;

    const isFirefox = /Firefox\//i.test(navigatorObject?.userAgent || '');
    // Firefox suppresses this extension when resistFingerprinting is active.
    // Its availability is enough here; never read the identifying renderer values.
    if (isFirefox && !gl.getExtension('WEBGL_debug_renderer_info')) return false;

    return true;
  } catch {
    return false;
  } finally {
    try {
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      // Context cleanup is best-effort and must not change the support result.
    }
  }
}
