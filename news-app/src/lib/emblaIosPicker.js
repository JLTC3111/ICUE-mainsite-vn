const CIRCLE_DEGREES = 360
const WHEEL_FACET_COUNT = 18
const DEFAULT_ITEMS_IN_VIEW = 5

export function createIosPickerMetrics(slideCount, itemSizePx, itemsInView = DEFAULT_ITEMS_IN_VIEW) {
  const count = Math.max(slideCount, 1)
  const wheelItemRadius = CIRCLE_DEGREES / WHEEL_FACET_COUNT
  const inViewDegrees = wheelItemRadius * itemsInView
  const wheelRadius = Math.round(
    itemSizePx / 2 / Math.tan(Math.PI / WHEEL_FACET_COUNT),
  )
  const totalRadius = count * wheelItemRadius

  return {
    wheelItemRadius,
    inViewDegrees,
    wheelRadius,
    totalRadius,
    itemSizePx,
  }
}

function isInView(wheelLocation, slidePosition, inViewDegrees) {
  return Math.abs(wheelLocation - slidePosition) < inViewDegrees
}

function getSnapList(emblaApi) {
  if (typeof emblaApi.snapList === 'function') return emblaApi.snapList()
  return emblaApi.scrollSnapList()
}

function focusAmount(wheelLocation, position, inViewDegrees) {
  const halfBand = inViewDegrees * 0.45
  return 1 - Math.min(Math.abs(wheelLocation - position) / halfBand, 1)
}

export function setIosPickerSlideStyles(
  emblaApi,
  index,
  { loop, slideCount, totalRadius, wheelItemRadius, inViewDegrees, wheelRadius },
) {
  const slideNode = emblaApi.slideNodes()[index]
  if (!slideNode) return

  const snapList = getSnapList(emblaApi)
  const wheelLocation = emblaApi.scrollProgress() * totalRadius
  const positionDefault = (snapList[index] ?? 0) * totalRadius
  const positionLoopStart = positionDefault + totalRadius
  const positionLoopEnd = positionDefault - totalRadius

  let visible = false
  let angle = index * -wheelItemRadius
  let focus = 0

  if (isInView(wheelLocation, positionDefault, inViewDegrees)) {
    visible = true
    focus = focusAmount(wheelLocation, positionDefault, inViewDegrees)
  }

  if (loop && isInView(wheelLocation, positionLoopEnd, inViewDegrees)) {
    visible = true
    focus = Math.max(focus, focusAmount(wheelLocation, positionLoopEnd, inViewDegrees))
    angle = -CIRCLE_DEGREES + (slideCount - index) * wheelItemRadius
  }

  if (loop && isInView(wheelLocation, positionLoopStart, inViewDegrees)) {
    visible = true
    focus = Math.max(focus, focusAmount(wheelLocation, positionLoopStart, inViewDegrees))
    angle = -(totalRadius % CIRCLE_DEGREES) - index * wheelItemRadius
  }

  if (visible) {
    const scale = 0.86 + focus * 0.14
    const opacity = 0.35 + focus * 0.65
    slideNode.style.opacity = String(opacity)
    slideNode.style.transform = `translateY(-${
      index * 100
    }%) rotateX(${angle}deg) translateZ(${wheelRadius}px) scale(${scale})`
  } else {
    slideNode.style.opacity = '0'
    slideNode.style.transform = 'none'
  }
}

export function setIosPickerContainerStyles(emblaApi, wheelRotation, wheelRadius) {
  emblaApi.containerNode().style.transform = `translateZ(${wheelRadius}px) rotateX(${wheelRotation}deg)`
}

export function inactivateEmblaTransform(emblaApi) {
  if (!emblaApi) return

  const engine = emblaApi.internalEngine()
  const { translate, slideLooper } = engine

  translate.clear()
  translate.toggleActive(false)

  if (slideLooper?.loopPoints?.length) {
    slideLooper.loopPoints.forEach(({ translate: loopTranslate }) => {
      loopTranslate.clear()
      loopTranslate.toggleActive(false)
    })
  }
}

export function rotateIosPickerWheel(emblaApi, metrics, loop, slideCount) {
  const rotationOffset = loop ? 0 : metrics.wheelItemRadius
  const rotation = slideCount * metrics.wheelItemRadius - rotationOffset
  const wheelRotation = rotation * emblaApi.scrollProgress()

  setIosPickerContainerStyles(emblaApi, wheelRotation, metrics.wheelRadius)
  emblaApi.slideNodes().forEach((_, index) => {
    setIosPickerSlideStyles(emblaApi, index, {
      loop,
      slideCount,
      totalRadius: metrics.totalRadius,
      wheelItemRadius: metrics.wheelItemRadius,
      inViewDegrees: metrics.inViewDegrees,
      wheelRadius: metrics.wheelRadius,
    })
  })
}

export function clearIosPickerTransforms(emblaApi) {
  if (!emblaApi) return
  emblaApi.containerNode().style.transform = 'none'
  emblaApi.slideNodes().forEach((slideNode) => {
    slideNode.style.opacity = '1'
    slideNode.style.transform = 'none'
  })
}

export function snapIosPickerOnRelease(emblaApi, itemSizePx) {
  const { scrollTo, target, location } = emblaApi.internalEngine()
  const diffToTarget = target.get() - location.get()
  const factor = Math.abs(diffToTarget) < itemSizePx / 2.5 ? 10 : 0.1
  scrollTo.distance(diffToTarget * factor, true)
}
