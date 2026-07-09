/**
 * macOS-style dock with hover magnification (Magic UI).
 * @see https://magicui.design/docs/components/dock
 */
import React, { useRef, useState, useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import { cn } from './cn';
import './Dock.css';

const DEFAULT_SIZE = 40;
const DEFAULT_MAGNIFICATION = 56;
const DEFAULT_DISTANCE = 120;

function usePrefersCoarsePointer() {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return coarse;
}

export const Dock = React.forwardRef(function Dock(
  {
    className,
    children,
    iconSize = DEFAULT_SIZE,
    iconMagnification = DEFAULT_MAGNIFICATION,
    disableMagnification: disableMagnificationProp,
    iconDistance = DEFAULT_DISTANCE,
    direction = 'middle',
    ...props
  },
  ref,
) {
  const prefersCoarsePointer = usePrefersCoarsePointer();
  const disableMagnification = disableMagnificationProp ?? prefersCoarsePointer;
  const mouseX = useMotionValue(Infinity);

  const renderChildren = () =>
    React.Children.map(children, (child) => {
      if (React.isValidElement(child) && child.type === DockIcon) {
        return React.cloneElement(child, {
          ...child.props,
          mouseX,
          size: child.props.size ?? iconSize,
          magnification: child.props.magnification ?? iconMagnification,
          disableMagnification:
            child.props.disableMagnification ?? disableMagnification,
          distance: child.props.distance ?? iconDistance,
        });
      }
      return child;
    });

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      {...props}
      className={cn('icue-dock', className)}
    >
      {renderChildren()}
    </motion.div>
  );
});

export function DockIcon({
  size = DEFAULT_SIZE,
  magnification = DEFAULT_MAGNIFICATION,
  disableMagnification = false,
  distance = DEFAULT_DISTANCE,
  mouseX,
  className,
  children,
  ...props
}) {
  const ref = useRef(null);
  const padding = Math.max(4, size * 0.1);
  const defaultMouseX = useMotionValue(Infinity);

  const distanceCalc = useTransform(mouseX ?? defaultMouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const targetSize = disableMagnification ? size : magnification;

  const sizeTransform = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [size, targetSize, size],
  );

  const scaleSize = useSpring(sizeTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.div
      ref={ref}
      style={{ width: scaleSize, height: scaleSize, padding }}
      className={cn(
        'icue-dock__icon',
        disableMagnification && 'icue-dock__icon--static',
        className,
      )}
      {...props}
    >
      <div className="icue-dock__icon-inner">{children}</div>
    </motion.div>
  );
}

export function DockDivider({ className }) {
  return (
    <span
      className={cn('icue-dock__divider', className)}
      role="separator"
      aria-orientation="vertical"
      aria-hidden="true"
    />
  );
}
