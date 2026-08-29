import SharedCircularText from '../../../../shared/ui/CircularText/CircularText.jsx'
import { useInteractiveBackgroundActive } from '../../contexts/InteractiveBackgroundContext'

function CircularText(props) {
  const interactiveBg = useInteractiveBackgroundActive()

  return (
    <SharedCircularText
      {...props}
      lightColor="#ffffff"
      darkColor="#88fff6"
      tintColor="#ffffff"
      brightness={1.35}
      contrast={interactiveBg ? 0.55 : 0.5}
    />
  )
}

export default CircularText
