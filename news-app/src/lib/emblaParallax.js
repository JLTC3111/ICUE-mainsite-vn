const TWEEN_FACTOR_BASE = 0.52
const TWEEN_FACTOR_MIN = 1.35

export function collectParallaxLayers(emblaApi, layerSelector) {
  return emblaApi.slideNodes().map((slideNode) => slideNode.querySelector(layerSelector))
}

function getSnapList(emblaApi) {
  if (typeof emblaApi.snapList === 'function') return emblaApi.snapList()
  return emblaApi.scrollSnapList()
}

export function setParallaxTweenFactor(emblaApi, tweenFactorRef, tweenFactorBase = TWEEN_FACTOR_BASE) {
  const snapCount = getSnapList(emblaApi).length
  tweenFactorRef.current = Math.max(
    TWEEN_FACTOR_MIN,
    tweenFactorBase * snapCount,
  )
}

export function tweenParallax(emblaApi, tweenNodes, tweenFactorRef, axis = 'x') {
  const engine = emblaApi.internalEngine()
  const scrollProgress = emblaApi.scrollProgress()
  const loop = engine.options.loop
  const vertical = axis === 'y'

  getSnapList(emblaApi).forEach((scrollSnap, snapIndex) => {
    let diffToTarget = scrollSnap - scrollProgress
    const slidesInSnap = engine.slideRegistry[snapIndex]

    slidesInSnap.forEach((slideIndex) => {
      if (loop) {
        engine.slideLooper.loopPoints.forEach((loopItem) => {
          const target = loopItem.target()

          if (slideIndex === loopItem.index && target !== 0) {
            const sign = Math.sign(target)

            if (sign === -1) {
              diffToTarget = scrollSnap - (1 + scrollProgress)
            }
            if (sign === 1) {
              diffToTarget = scrollSnap + (1 - scrollProgress)
            }
          }
        })
      }

      const translate = diffToTarget * (-1 * tweenFactorRef.current) * 100
      const layerNode = tweenNodes[slideIndex]
      if (layerNode) {
        layerNode.style.transform = vertical
          ? `translate3d(0, ${translate}%, 0)`
          : `translate3d(${translate}%, 0, 0)`
      }
    })
  })
}

export function clearParallaxTransforms(tweenNodes) {
  tweenNodes.forEach((node) => {
    if (node) node.style.transform = ''
  })
}

export function bindEmblaParallax(
  emblaApi,
  { layerSelector, tweenNodesRef, tweenFactorRef, enabled, tweenFactorBase, axis = 'x' },
) {
  if (!enabled) return () => {}

  const refreshNodes = () => {
    tweenNodesRef.current = collectParallaxLayers(emblaApi, layerSelector)
  }

  const refreshFactor = () => setParallaxTweenFactor(emblaApi, tweenFactorRef, tweenFactorBase)

  const applyParallax = () => {
    tweenParallax(emblaApi, tweenNodesRef.current, tweenFactorRef, axis)
  }

  refreshNodes()
  refreshFactor()
  applyParallax()

  emblaApi.on('reInit', refreshNodes)
  emblaApi.on('reInit', refreshFactor)
  emblaApi.on('reInit', applyParallax)
  emblaApi.on('scroll', applyParallax)
  emblaApi.on('slideFocus', applyParallax)
  emblaApi.on('settle', applyParallax)

  return () => {
    emblaApi.off('reInit', refreshNodes)
    emblaApi.off('reInit', refreshFactor)
    emblaApi.off('reInit', applyParallax)
    emblaApi.off('scroll', applyParallax)
    emblaApi.off('slideFocus', applyParallax)
    emblaApi.off('settle', applyParallax)
    clearParallaxTransforms(tweenNodesRef.current)
  }
}
