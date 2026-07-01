import { useEffect, useState } from 'react';

/**
 * Reads device gyroscope (deviceorientation) and returns clamped tilt in degrees.
 * On iOS 13+ requires a user-gesture permission call; expose `requestPermission`.
 * Falls back to pointermove parallax on desktop / when denied.
 */
export function useDeviceTilt(maxDeg = 15) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [needsPermission, setNeedsPermission] = useState(false);

  useEffect(() => {
    const anyDOE: any = (window as any).DeviceOrientationEvent;
    if (anyDOE && typeof anyDOE.requestPermission === 'function') {
      setNeedsPermission(true);
    }

    const onOrient = (e: DeviceOrientationEvent) => {
      // beta: front-back (-180..180), gamma: left-right (-90..90)
      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;
      const y = Math.max(-maxDeg, Math.min(maxDeg, gamma / 3));
      const x = Math.max(-maxDeg, Math.min(maxDeg, -beta / 6));
      setTilt({ x, y });
    };

    const onMove = (e: PointerEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const y = ((e.clientX / w) - 0.5) * 2 * maxDeg;
      const x = -((e.clientY / h) - 0.5) * 2 * maxDeg;
      setTilt({ x, y });
    };

    window.addEventListener('deviceorientation', onOrient);
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('pointermove', onMove);
    };
  }, [maxDeg]);

  const requestPermission = async () => {
    const anyDOE: any = (window as any).DeviceOrientationEvent;
    if (anyDOE && typeof anyDOE.requestPermission === 'function') {
      try {
        const res = await anyDOE.requestPermission();
        if (res === 'granted') setNeedsPermission(false);
      } catch { /* ignore */ }
    }
  };

  return { tilt, needsPermission, requestPermission };
}