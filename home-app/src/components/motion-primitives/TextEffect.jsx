import React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import './TextEffect.css'

/**
 * Motion Primitives "Text Effect" — text revealed a line, word or character at
 * a time, with a preset or custom variants.
 * @see https://motion-primitives.com/docs/text-effect
 *
 * Ported from the upstream TypeScript source. Two things had to change and one
 * was added:
 *
 *  - Upstream styles its segments with Tailwind utilities (`inline-block
 *    whitespace-pre`, `block`, `sr-only`). This app has no Tailwind in the home
 *    build, so those four rules live in TextEffect.css, the same way the
 *    vendored magicui TextAnimate handles it.
 *  - Reduced motion returns the plain tag with its text. Upstream animates
 *    regardless; the rest of this app defers to the OS setting (see the
 *    MotionConfig in main.jsx), and a per-word stagger is exactly the kind of
 *    motion that setting exists to suppress.
 *  - `startOnView` is new. Without it every TextEffect on the page animates at
 *    mount, including the ones several screens down — so the work happens while
 *    the reader is still at the top and the reveal is over before they arrive.
 *    It swaps `animate` for `whileInView`, which is how TextAnimate already
 *    does it here.
 *
 * `per="char"` mounts one motion node per character. On long paragraphs that is
 * hundreds of animated elements; prefer `per="word"` for body copy.
 */

const defaultStaggerTimes = {
  char: 0.03,
  word: 0.05,
  line: 0.1,
}

const defaultContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
}

const defaultItemVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
  },
  exit: { opacity: 0 },
}

const presetVariants = {
  blur: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: 'blur(12px)' },
      visible: { opacity: 1, filter: 'blur(0px)' },
      exit: { opacity: 0, filter: 'blur(12px)' },
    },
  },
  'fade-in-blur': {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 20, filter: 'blur(12px)' },
      visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
      exit: { opacity: 0, y: 20, filter: 'blur(12px)' },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0 },
      visible: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0 },
    },
  },
  fade: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
  },
}

const AnimationComponent = React.memo(({ segment, variants, per, segmentWrapperClassName }) => {
  const content =
    per === 'line' ? (
      <motion.span variants={variants} className="text-effect__line">
        {segment}
      </motion.span>
    ) : per === 'word' ? (
      <motion.span aria-hidden="true" variants={variants} className="text-effect__segment">
        {segment}
      </motion.span>
    ) : (
      <motion.span className="text-effect__segment">
        {segment.split('').map((char, charIndex) => (
          <motion.span
            key={`char-${charIndex}`}
            aria-hidden="true"
            variants={variants}
            className="text-effect__segment"
          >
            {char}
          </motion.span>
        ))}
      </motion.span>
    )

  if (!segmentWrapperClassName) {
    return content
  }

  const defaultWrapperClassName =
    per === 'line' ? 'text-effect__line' : 'text-effect__segment'

  return (
    <span className={`${defaultWrapperClassName} ${segmentWrapperClassName}`}>{content}</span>
  )
})

AnimationComponent.displayName = 'AnimationComponent'

const splitText = (text, per) => {
  if (per === 'line') return text.split('\n')
  return text.split(/(\s+)/)
}

const hasTransition = (variant) => {
  if (!variant) return false
  return typeof variant === 'object' && 'transition' in variant
}

const createVariantsWithTransition = (baseVariants, transition) => {
  if (!transition) return baseVariants

  const { exit: _exit, ...mainTransition } = transition

  return {
    ...baseVariants,
    visible: {
      ...baseVariants.visible,
      transition: {
        ...(hasTransition(baseVariants.visible) ? baseVariants.visible.transition : {}),
        ...mainTransition,
      },
    },
    exit: {
      ...baseVariants.exit,
      transition: {
        ...(hasTransition(baseVariants.exit) ? baseVariants.exit.transition : {}),
        ...mainTransition,
        staggerDirection: -1,
      },
    },
  }
}

export function TextEffect({
  children,
  per = 'word',
  as = 'p',
  variants,
  className,
  preset = 'fade',
  delay = 0,
  speedReveal = 1,
  speedSegment = 1,
  trigger = true,
  onAnimationComplete,
  onAnimationStart,
  segmentWrapperClassName,
  containerTransition,
  segmentTransition,
  style,
  /* Additions — see the header note. */
  startOnView = false,
  once = true,
  viewportAmount = 0.25,
}) {
  const prefersReducedMotion = useReducedMotion()
  const segments = splitText(children, per)
  const MotionTag = motion[as] || motion.p

  if (prefersReducedMotion) {
    const StaticTag = as
    return (
      <StaticTag className={className} style={style}>
        {children}
      </StaticTag>
    )
  }

  const baseVariants = preset
    ? presetVariants[preset]
    : { container: defaultContainerVariants, item: defaultItemVariants }

  const stagger = defaultStaggerTimes[per] / speedReveal

  const baseDuration = 0.3 / speedSegment

  const customStagger = hasTransition(variants?.container?.visible ?? {})
    ? variants?.container?.visible.transition?.staggerChildren
    : undefined

  const customDelay = hasTransition(variants?.container?.visible ?? {})
    ? variants?.container?.visible.transition?.delayChildren
    : undefined

  const computedVariants = {
    container: createVariantsWithTransition(variants?.container || baseVariants.container, {
      staggerChildren: customStagger ?? stagger,
      delayChildren: customDelay ?? delay,
      ...containerTransition,
      exit: {
        staggerChildren: customStagger ?? stagger,
        staggerDirection: -1,
      },
    }),
    item: createVariantsWithTransition(variants?.item || baseVariants.item, {
      duration: baseDuration,
      ...segmentTransition,
    }),
  }

  // Key on the copy so a locale switch remounts the motion tree. Without it,
  // startOnView + once leaves newly mounted word/char spans stuck at the
  // `hidden` variant (opacity 0): the parent already completed its in-view
  // reveal and will not fire again. AnimatePresence then swaps the old text
  // out and the new one in, so whileInView runs for the replacement.
  const presenceKey = typeof children === 'string' ? children : undefined

  return (
    <AnimatePresence mode="popLayout">
      {trigger && (
        <MotionTag
          key={presenceKey}
          initial="hidden"
          animate={startOnView ? undefined : 'visible'}
          whileInView={startOnView ? 'visible' : undefined}
          viewport={startOnView ? { once, amount: viewportAmount } : undefined}
          exit="exit"
          variants={computedVariants.container}
          className={className}
          onAnimationComplete={onAnimationComplete}
          onAnimationStart={onAnimationStart}
          style={style}
        >
          {per !== 'line' ? <span className="text-effect__sr-only">{children}</span> : null}
          {segments.map((segment, index) => (
            <AnimationComponent
              key={`${per}-${index}-${segment}`}
              segment={segment}
              variants={computedVariants.item}
              per={per}
              segmentWrapperClassName={segmentWrapperClassName}
            />
          ))}
        </MotionTag>
      )}
    </AnimatePresence>
  )
}

export default TextEffect
