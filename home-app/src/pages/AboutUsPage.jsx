import { Fragment, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import AboutGradientWaves from '../components/aboutUs/AboutGradientWaves'
import AboutModelViewer from '../components/aboutUs/AboutModelViewer'
import AboutTextSlider from '../components/aboutUs/AboutTextSlider'
import BalloonButton from '../components/aboutUs/BalloonButton'
import CurvedText from '../components/aboutUs/CurvedText'
import useAboutTheme from '../components/aboutUs/useAboutTheme'
import AccordionGallery from '../components/reactbits/AccordionGallery'
import MaskedHeading from '../components/reactbits/MaskedHeading'
import TextEffect from '../components/motion-primitives/TextEffect'
import {
  ABOUT_US_GALLERY,
  ABOUT_US_MEMBER_IMAGES,
  ABOUT_US_PEOPLE_IMAGES,
  WORDMARK_COLOR_SEQUENCES,
} from '../data/aboutUsContent'

/**
 * The About page.
 *
 * Converted from legacy/pages/aboutUs.html, and since then localized into all
 * six UI languages and given a dark variant. The element tree, class names and
 * ids still match the legacy page, and its inline <style> block still lives on
 * in AboutUsPage.css. Four things are load-bearing and easy to break:
 *
 *  - The children of `.about-container` are counted by CSS. The entrance
 *    animation is staggered with `.section:nth-child(n)` delays for n = 1..5,
 *    and the unclassed <div> in slot 2 is part of that count. The highlights
 *    section was added at slot 6, ahead of the contact section, precisely
 *    because neither slot 6 nor 7 has a delay rule — inserting anywhere earlier
 *    would reshuffle which section fades in when.
 *  - `#model-container` renders empty. It is a fixed 200x200 well the legacy
 *    page reserved for a 3D model it never mounted on this route; it is kept so
 *    the tree still matches.
 *  - The `{' '}` between wordmark letters is layout, not formatting. In the
 *    legacy HTML those spans sat on their own lines and HTML collapsed the
 *    newline into a real space; JSX strips it instead, and without them the
 *    wordmark renders ~30px narrower than the original.
 *  - The greeting's echo is a CSS `::before`, so its text cannot come from JSX.
 *    It is passed down as a custom property instead — see `--about-greeting-echo`
 *    in AboutUsPage.css.
 *
 * This is also the only route on icue.vn that renders English; see
 * SHARED_LOCALE_PATHS in lib/routes.js for why.
 */

/**
 * One <span> per character, coloured from a fixed sequence.
 *
 * The legacy page hardcoded these spans for "ĐỔI MỚI" and "SÁNG TẠO". Driving
 * them from the translated string keeps the Vietnamese rendering identical
 * while letting a word of any length — "KREATIVITÄT", "革新" — colour itself.
 */
function Wordmark({ text, sequence, className }) {
  return (
    <p className={className}>
      {[...text].map((character, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <Fragment key={index}>
          {index > 0 ? ' ' : null}
          <span className={sequence[index % sequence.length]}>{character}</span>
        </Fragment>
      ))}
    </p>
  )
}

const GALLERY_THEME = {
  light: { accentColor: '#cf7e40', overlayColor: '#1b1a2e', textColor: '#ffffff' },
  dark: { accentColor: '#8ec5e8', overlayColor: '#04060e', textColor: '#f2f5fb' },
}

export default function AboutUsPage() {
  const { t } = useTranslation()
  const theme = useAboutTheme()

  // The legacy About page sets this on <html> to swap in its static backdrop,
  // and leaves it behind when the reader walks from /about-us-legacy to here.
  // This page carries its own backdrop, so a stale flag would only darken the
  // page for no reason.
  useEffect(() => {
    document.documentElement.removeAttribute('data-aboutus-bg-video')
  }, [])

  // Memoised because AccordionGallery keys its background download queue off
  // this array: rebuilding it on every render would restart the queue every
  // time anything else on the page changed.
  const galleryItems = useMemo(
    () =>
      ABOUT_US_GALLERY.map((item) => ({
        image: item.image,
        fallback: item.fallback,
        blur: item.blur,
        width: item.width,
        height: item.height,
        label: t(`about.gallery.${item.key}.label`),
        alt: t(`about.gallery.${item.key}.alt`),
      })),
    [t],
  )

  return (
    <div className="about-us-page">
      <div id="model-container" />

      <section className="about-legacy-hero" aria-label={t('about.hero.ariaLabel')}>
        <div className="about-legacy-hero__content">
          <h1 className="cursive-default">
            {/* #rainText is inert here — makeItRainText() skips any copy inside
                .about-legacy-hero, so this renders as plain text. */}
            <span id="rainText" className="sub-text">
              <TextEffect as="span" per="word" preset="fade-in-blur" speedReveal={1.4}>
                {t('about.hero.subText')}
              </TextEffect>
            </span>
            {/* Not a TextEffect: this line is painted with a gradient through
                `background-clip: text`, and splitting it into per-word spans
                would leave each word transparent over no background of its own. */}
            <span className="hero-body">{t('about.hero.body')}</span>
          </h1>

          <AboutModelViewer alt={t('about.hero.modelAlt')} />

          <AboutTextSlider />
        </div>
      </section>

      <div className="about-container">
        <div className="section">
          <TextEffect
            as="h1"
            className="greeting-text"
            per="char"
            preset="blur"
            style={{ '--about-greeting-echo': JSON.stringify(t('about.greetingEcho')) }}
          >
            {t('about.greeting')}
          </TextEffect>

          <div className="highlight-container">
            <Wordmark
              className="highlight-firstPart"
              sequence={WORDMARK_COLOR_SEQUENCES.first}
              text={t('about.wordmark.first')}
            />{' '}
            <Wordmark
              className="highlight-secondPart"
              sequence={WORDMARK_COLOR_SEQUENCES.second}
              text={t('about.wordmark.second')}
            />
          </div>
        </div>

        <div>
          <p className="highlight-fourthPart">
            {t('about.excellence.before')}{' '}
            <span className="extra-bold">{t('about.excellence.emphasis')}</span>{' '}
            {t('about.excellence.after')}
          </p>
        </div>

        <div className="section">
          {/* One arc for “We Are” + “PASSION”: per-letter rotates share a
              transform-origin below the line, so the row bows upward like the
              design reference. TextEffect is skipped here — staggered motion
              spans would fight the curve transforms. */}
          <CurvedText
            as="h2"
            className="about-we-are-curve"
            segments={[
              { text: `${t('about.weAre.heading')} `, className: 'handwritten' },
              { text: t('about.weAre.fuzzy'), className: 'fuzzy-text' },
            ]}
          />
          <TextEffect
            as="p"
            className="regular-text"
            per="word"
            preset="fade-in-blur"
            startOnView
            speedReveal={2}
          >
            {t('about.weAre.body')}
          </TextEffect>
        </div>

        <div className="section">
          <h2 className="handwritten about-section-heading">
            {t('about.people.heading')}
          </h2>

          <div className="image-grid-top">
            {ABOUT_US_PEOPLE_IMAGES.filter((image) => image.grid === 'top').map((image) => (
              <img
                key={image.key}
                src={image.src}
                width={image.width}
                height={image.height}
                alt={t(`about.people.images.${image.key}`)}
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
          <div className="image-grid-mid">
            {ABOUT_US_PEOPLE_IMAGES.filter((image) => image.grid === 'mid').map((image) => (
              <img
                key={image.key}
                src={image.src}
                width={image.width}
                height={image.height}
                alt={t(`about.people.images.${image.key}`)}
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>

          <TextEffect as="p" className="middle-text" per="word" preset="slide" startOnView>
            {t('about.people.middle')}
          </TextEffect>
        </div>

        <div className="section">
          <h2 className="handwritten about-section-heading about-members-heading">
            {t('about.members.headingBefore')}
            <span className="about-members-heading__emphasis">
              {t('about.members.headingEmphasis')}
            </span>
            {t('about.members.headingAfter')}
          </h2>
          <div className="image-grid-bottom">
            {ABOUT_US_MEMBER_IMAGES.map((image) => (
              <img
                key={image.key}
                src={image.src}
                width={image.width}
                height={image.height}
                alt={t(`about.members.images.${image.key}`)}
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        </div>

        {/* Slot 6. See the note at the top of this file before moving it. */}
        <div className="section about-highlights">
          <MaskedHeading
            className="about-highlights__heading"
            text={t('about.highlights.heading')}
            /* WebP, not the JPEG beside it: same photograph, 91 KB instead of
               210 KB, and it downloads immediately above the gallery — on a
               phone the two are competing for the same connection. */
            src="/aboutUs/conference_nov5_2025.webp"
            reveal="rise"
            trigger="view"
            textScale={0.105}
            lineHeight={1.22}
            /* Drift and parallax both off: this heading sits on a page that is
               already running a WebGL backdrop, and the loop that animates them
               would be the only thing on screen asking for every frame. The
               photograph still fills the letters, it just holds still. */
            drift={0}
            parallax={0}
          />

          <AccordionGallery
            items={galleryItems}
            ariaLabel={t('about.highlights.galleryLabel')}
            height={420}
            defaultIndex={ABOUT_US_GALLERY.length - 1}
            {...GALLERY_THEME[theme]}
          />
        </div>

        <div className="section contact-section">
          <TextEffect as="h2" className="handwritten" per="word" preset="slide" startOnView>
            {t('about.contact.heading')}
          </TextEffect>
        </div>

        <BalloonButton label={t('about.balloon')} />

        <AboutGradientWaves theme={theme} />
      </div>
    </div>
  )
}
