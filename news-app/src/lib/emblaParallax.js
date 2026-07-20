const TWEEN_FACTOR_BASE = 0.2

export function collectParallaxLayers(emblaApi, layerSelector) {
  return emblaApi.slideNodes().map((slideNode) => slideNode.querySelector(layerSelector))
}

function getSnapList(emblaApi) {
  if (typeof emblaApi.snapList === 'function') return emblaApi.snapList()
  return emblaApi.scrollSnapList()
}

export function setParallaxTweenFactor(emblaApi, tweenFactorRef) {
  tweenFactorRef.current = TWEEN_FACTOR_BASE * getSnapList(emblaApi).length
}

export function tweenParallax(emblaApi, tweenNodes, tweenFactorRef, event) {
  const engine = emblaApi.internalEngine()
  const scrollProgress = emblaApi.scrollProgress()
  const slidesInView = emblaApi.slidesInView()
  const isScrollEvent = event?.type === 'scroll'
  const loop = engine.options.loop

  getSnapList(emblaApi).forEach((scrollSnap, snapIndex) => {
    let diffToTarget = scrollSnap - scrollProgress
    const slidesInSnap = engine.slideRegistry[snapIndex]

    slidesInSnap.forEach((slideIndex) => {
      if (isScrollEvent && !slidesInView.includes(slideIndex)) return

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
        layerNode.style.transform = `translateX(${translate}%)`
      }
    })
  })
}

export function clearParallaxTransforms(tweenNodes) {
  tweenNodes.forEach((node) => {
    if (node) node.style.transform = ''
  })
}

export function bindEmblaParallax(emblaApi, { layerSelector, tweenNodesRef, tweenFactorRef, enabled }) {
  if (!enabled) return () => {}

  const refreshNodes = () => {
    tweenNodesRef.current = collectParallaxLayers(emblaApi, layerSelector)
  }

  const refreshFactor = () => setParallaxTweenFactor(emblaApi, tweenFactorRef)

  const applyParallax = (event) => {
    tweenParallax(emblaApi, tweenNodesRef.current, tweenFactorRef, event)
  }

  refreshNodes()
  refreshFactor()
  applyParallax()

  emblaApi.on('reInit', refreshNodes)
  emblaApi.on('reInit', refreshFactor)
  emblaApi.on('reInit', applyParallax)
  emblaApi.on('scroll', applyParallax)
  emblaApi.on('slideFocus', applyParallax)

  return () => {
    emblaApi.off('reInit', refreshNodes)
    emblaApi.off('reInit', refreshFactor)
    emblaApi.off('reInit', applyParallax)
    emblaApi.off('scroll', applyParallax)
    emblaApi.off('slideFocus', applyParallax)
    clearParallaxTransforms(tweenNodesRef.current)
  }
}
