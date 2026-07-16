import { Children, useLayoutEffect, useMemo, useState } from 'react';
import './video-text.css';

function getVideoMimeType(src) {
  if (src.endsWith('.webm')) return 'video/webm';
  if (src.endsWith('.mp4')) return 'video/mp4';
  return undefined;
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSvgMask({
  content,
  fontSize,
  fontWeight,
  textAnchor,
  textX,
  dominantBaseline,
  fontFamily,
  viewBox,
}) {
  const responsiveFontSize =
    typeof fontSize === 'number' ? `${fontSize}vw` : fontSize;

  const svgAttrs = viewBox
    ? `viewBox='${viewBox}' preserveAspectRatio='xMidYMid meet' width='100%' height='100%'`
    : `width='100%' height='100%'`;

  const x = textX ?? '50%';
  const lines = content.split('\n');
  const isMultiLine = lines.length > 1;
  const y = isMultiLine ? '42%' : viewBox ? '52%' : '50%';

  const textBody = isMultiLine
    ? lines
        .map((line, index) => {
          const escaped = escapeXml(line);
          return index === 0
            ? `<tspan x='${x}' dy='0'>${escaped}</tspan>`
            : `<tspan x='${x}' dy='1.15em'>${escaped}</tspan>`;
        })
        .join('')
    : escapeXml(content);

  return `<svg xmlns='http://www.w3.org/2000/svg' ${svgAttrs}><text x='${x}' y='${y}' font-size='${responsiveFontSize}' font-weight='${fontWeight}' text-anchor='${textAnchor}' dominant-baseline='${dominantBaseline}' font-family='${fontFamily}'>${textBody}</text></svg>`;
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
  textX,
  dominantBaseline = 'middle',
  fontFamily = 'sans-serif',
  viewBox,
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
      textX,
      dominantBaseline,
      fontFamily,
      viewBox,
    }),
    [content, viewportFontSize, fontWeight, textAnchor, textX, dominantBaseline, fontFamily, viewBox],
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

  const maskPosition = textAnchor === 'start' ? 'left center' : 'center';
  const videoType = getVideoMimeType(src);

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
          maskPosition,
          WebkitMaskPosition: maskPosition,
        }}
      >
        <video
          className="video-text__video"
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          preload={preload}
          playsInline
          disablePictureInPicture
          tabIndex={-1}
          aria-hidden="true"
        >
          <source src={src} {...(videoType ? { type: videoType } : {})} />
        </video>
      </div>
      <span className="video-text__sr-only">{content}</span>
    </Component>
  );
}
