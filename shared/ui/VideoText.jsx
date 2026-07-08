import { Children, useLayoutEffect, useMemo, useState } from 'react';
import './video-text.css';

function buildSvgMask({
  content,
  fontSize,
  fontWeight,
  textAnchor,
  dominantBaseline,
  fontFamily,
}) {
  const responsiveFontSize =
    typeof fontSize === 'number' ? `${fontSize}vw` : fontSize;

  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 120' preserveAspectRatio='xMidYMid meet' width='100%' height='100%'><text x='50%' y='52%' font-size='${responsiveFontSize}' font-weight='${fontWeight}' text-anchor='${textAnchor}' dominant-baseline='${dominantBaseline}' font-family='${fontFamily}'>${content}</text></svg>`;
}

/**
 * Magic UI Video Text — text filled with a looping video mask.
 * @see https://magicui.design/docs/components/video-text
 */
export default function VideoText({
  src,
  children,
  className = '',
  autoPlay = true,
  muted = true,
  loop = true,
  preload = 'auto',
  fontSize = 20,
  fontWeight = 'bold',
  textAnchor = 'middle',
  dominantBaseline = 'middle',
  fontFamily = 'sans-serif',
  as: Component = 'div',
}) {
  const content = Children.toArray(children).join('');
  const [viewportFontSize, setViewportFontSize] = useState(fontSize);

  const maskOptions = useMemo(
    () => ({
      content,
      fontSize: viewportFontSize,
      fontWeight,
      textAnchor,
      dominantBaseline,
      fontFamily,
    }),
    [content, viewportFontSize, fontWeight, textAnchor, dominantBaseline, fontFamily],
  );

  const svgMask = useMemo(() => buildSvgMask(maskOptions), [maskOptions]);

  useLayoutEffect(() => {
    const updateSvgMask = () => {
      setViewportFontSize(fontSize);
    };

    updateSvgMask();
    window.addEventListener('resize', updateSvgMask);
    return () => window.removeEventListener('resize', updateSvgMask);
  }, [fontSize]);

  const dataUrlMask = `url("data:image/svg+xml,${encodeURIComponent(svgMask)}")`;

  return (
    <Component className={['video-text', className].filter(Boolean).join(' ')}>
      <div
        className="video-text__mask"
        style={{
          maskImage: dataUrlMask,
          WebkitMaskImage: dataUrlMask,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
        }}
      >
        <video
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          preload={preload}
          playsInline
          disablePictureInPicture
          tabIndex={-1}
          aria-hidden="true"
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>
      <span className="video-text__sr-only">{content}</span>
    </Component>
  );
}
