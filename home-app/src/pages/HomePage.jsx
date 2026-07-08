import { HERO, HOME_SECTIONS } from '../data/homeContent'
import HomeHero from '../components/HomeHero'
import HomeSection from '../components/HomeSection'
import { useHomeBackgroundVideo } from '../hooks/useHomeBackgroundVideo'
import { useHomeScrollReveal } from '../hooks/useScrollReveal'

export default function HomePage() {
  useHomeBackgroundVideo()
  useHomeScrollReveal()

  return (
    <>
      <HomeHero hero={HERO} />
      {HOME_SECTIONS.map((section) => (
        <HomeSection key={section.id} {...section} />
      ))}
    </>
  )
}
