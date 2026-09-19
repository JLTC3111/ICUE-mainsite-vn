import { subscribeToPageResume } from '../../../shared/resilience/pageResume.js';
export const HOME_BG_VIDEO_STORAGE_KEY = 'home_bg_video_enabled';

export function readHomeBackgroundVideoEnabledPreference() {
  try {
    const raw = localStorage.getItem(HOME_BG_VIDEO_STORAGE_KEY);
    if (raw === null) return true;
    return raw === '1' || raw === 'true' || raw === 'on';
  } catch {
    return true;
  }
}

export function readHomeBackgroundVideoEnabledState() {
  if (typeof window !== 'undefined' && window.HomeBackgroundVideoManager?.isEnabled) {
    return !!window.HomeBackgroundVideoManager.isEnabled();
  }
  return readHomeBackgroundVideoEnabledPreference();
}

const HomeBackgroundVideoManager = (() => {
  const STORAGE_KEY_ENABLED = HOME_BG_VIDEO_STORAGE_KEY;
  let _enabled = true; // In-memory state

  const initEnabledState = () => {
    _enabled = readHomeBackgroundVideoEnabledPreference();
  };

  const getUserEnabled = () => _enabled;

  const setUserEnabled = (enabled) => {
    _enabled = enabled;
    try {
      localStorage.setItem(STORAGE_KEY_ENABLED, enabled ? '1' : '0');
    } catch (e) {
      // ignore
    }
  };

  // Initialize state immediately
  initEnabledState();

  const videoPlaylist = [
    {
      id: 'momentum',
      desktop: '/bgVideos/home_bg_1_720.mp4',
      mobile: '/bgVideos/home_bg_1_540.mp4',
      prefersLightNav: true
    },
    {
      id: 'harmony',
      desktop: '/bgVideos/home_bg_2_720.mp4',
      mobile: '/bgVideos/home_bg_2_540.mp4',
      prefersLightNav: true
    },
    {
      id: 'luminous',
      desktop: '/bgVideos/home_bg_3_720.mp4',
      mobile: '/bgVideos/home_bg_3_540.mp4',
      prefersLightNav: true
    },
    {
      id: 'kaleidoscope',
      desktop: '/bgVideos/home_bg_4_720.mp4',
      mobile: '/bgVideos/home_bg_4_540.mp4',
      prefersLightNav: true
    },
  ];

  let unsubscribeResume = null;
  let recoveryMetadataHandler = null;
  let needsMediaRecovery = false;
  let videoEl = null;
  let resizeHandler = null;
  let visibilityHandler = null;
  let endFallbackHandler = null;
  let isTransitioning = false;
  let watchdogTimer = null;
  let lastProgressTime = 0;
  let lastCurrentTime = 0;
  let playRetryTimer = null;
  let playHandler = null;
  let pauseHandler = null;
  let waitingHandler = null;
  let stalledHandler = null;
  let errorHandler = null;
  let activeMeta = null;
  let errorSwapAttempted = false;
  let currentIndex = -1;
  let warmupVideo = null;
  let lifecycle = 0;
  let playFallbackTimer = null;
  let transitionTimer = null;
  let warmupTask = null;
  let warmupUsesIdle = false;
  let canPlayHandler = null;
  let metadataHandler = null;

  const logHomeBg = (...args) => console.log('[HomeBackgroundVideo]', ...args);

  const debounce = (fn, delay = 200) => {
    let timer;
    function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    }
    debounced.cancel = () => clearTimeout(timer);
    return debounced;
  };

  const cancelWarmup = () => {
    if (warmupTask === null) return;
    if (warmupUsesIdle) window.cancelIdleCallback(warmupTask);
    else clearTimeout(warmupTask);
    warmupTask = null;
  };

  const scheduleIdleTask = (task) => {
    cancelWarmup();
    const token = lifecycle;
    const run = () => {
      warmupTask = null;
      if (token === lifecycle && videoEl && !shouldKeepStatic() && !document.hidden) task();
    };
    warmupUsesIdle = typeof window.requestIdleCallback === 'function';
    if (warmupUsesIdle) {
      warmupTask = window.requestIdleCallback(run, { timeout: 2000 });
    } else {
      warmupTask = setTimeout(run, 100);
    }
  };

  // Keep phones on the smaller asset after rotation, and include the 768px
  // boundary used by the mobile layout.
  const isMobileViewport = () => window.matchMedia(
    '(max-width: 768px), (max-width: 1024px) and (max-height: 600px) and (pointer: coarse)',
  ).matches;

  const getConnection = () => navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  const canPlayVideosInThisContext = () => {
    const connection = getConnection();
    const slowNetwork = connection && (connection.saveData || /(slow-2g|2g)/i.test(connection.effectiveType || ''));
    // Mobile is allowed: keep video available and let the user toggle.
    // Still respect reduced-motion and data-saver/slow-network.
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !slowNetwork;
  };

  const shouldKeepStatic = () => {
    if (!getUserEnabled()) return true;
    return !canPlayVideosInThisContext();
  };

  const syncRootVideoStateAttr = () => {
    if (!document?.documentElement) return;
    const shouldHide = shouldKeepStatic();
    
    // Safety check: ensure we have the element reference even if internal state is cleared
    const el = videoEl || document.getElementById('bgVideo');

    if (shouldHide) {
      document.documentElement.setAttribute('data-home-bg-video', 'off');
      // Direct force hide to ensure it applies even if CSS is lagging or overridden
      if (el) el.style.display = 'none';
    } else {
      document.documentElement.removeAttribute('data-home-bg-video');
      if (el) el.style.display = '';
    }
  };

  const enforceVideoNonInteractive = (el) => {
    if (!el) return;
    el.controls = false;
    el.disablePictureInPicture = true;
    el.setAttribute('tabindex', '-1');
    el.setAttribute('aria-hidden', 'true');
    el.style.pointerEvents = 'none';
    el.style.touchAction = 'none';
    el.style.userSelect = 'none';
  };

  const ensureVideoElement = () => {
    videoEl = document.getElementById('bgVideo');
    if (!videoEl) {
        const mediaContainer = document.querySelector('.home-hero__media');
        if (mediaContainer) {
            videoEl = document.createElement('video');
            videoEl.id = 'bgVideo';
            videoEl.className = 'video-bg';
            enforceVideoNonInteractive(videoEl);
            const overlay = mediaContainer.querySelector('.home-hero__overlay');
            if (overlay) {
                mediaContainer.insertBefore(videoEl, overlay);
            } else {
                mediaContainer.appendChild(videoEl);
            }
        }
    }
    if (videoEl) {
      videoEl.loop = false;
      videoEl.preload = 'metadata';
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.setAttribute('muted', '');
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('autoplay', '');
      videoEl.setAttribute('webkit-playsinline', '');
      enforceVideoNonInteractive(videoEl);
    }
    return videoEl;
  };

  // Simplified - no longer needed since we use direct src assignment
  // Kept for backward compatibility but returns early
  const ensureSources = () => {
    return { desktop: null, mobile: null };
  };

  const applyNavTheme = (meta) => {
    if (typeof window.setNavLinkContrast === 'function') {
      window.setNavLinkContrast(!!meta?.prefersLightNav);
    }
  };

  const clearVideoSources = () => {
    if (!videoEl) return;
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.removeAttribute('data-active-src');
    videoEl.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
    videoEl.load();
  };

  const persistIndex = (index) => {
    try {
      sessionStorage.setItem('home_bg_video_index', String(index));
    } catch (e) {
      // Storage may be blocked by browser privacy settings.
    }
  };

  const nextIndex = () => {
    if (!videoPlaylist.length) return -1;
    try {
      const cached = parseInt(sessionStorage.getItem('home_bg_video_index') ?? '-1', 10);
      if (Number.isInteger(cached) && cached >= 0) {
        return (cached + 1) % videoPlaylist.length;
      }
    } catch (e) {
      // ignore
    }
    return Math.floor(Math.random() * videoPlaylist.length);
  };

  const warmVideoForMeta = (meta) => {
    if (!meta) return;

    if (!warmupVideo) {
      warmupVideo = document.createElement('video');
      warmupVideo.muted = true;
      warmupVideo.playsInline = true;
      warmupVideo.preload = 'metadata'; // Changed from 'auto' to 'metadata' for lighter load
      warmupVideo.setAttribute('aria-hidden', 'true');
      warmupVideo.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;pointer-events:none;';
      document.body.appendChild(warmupVideo);
    }

    const prefersMobile = isMobileViewport();
    const src = prefersMobile && meta.mobile ? meta.mobile : meta.desktop;
    if (!src) return;

    const cachedSrc = warmupVideo.getAttribute('data-src');
    if (cachedSrc === src) return;

    warmupVideo.setAttribute('data-src', src);
    warmupVideo.src = src;
    warmupVideo.load();
  };

  const attemptPlay = (label = 'play') => {
    if (!videoEl || shouldKeepStatic() || document.hidden) return;
    const el = videoEl;
    const token = lifecycle;
    const isCurrent = () => token === lifecycle && el === videoEl && !shouldKeepStatic() && !document.hidden;
    const playPromise = el.play();
    if (playPromise?.catch) {
      playPromise.catch(err => {
        if (!isCurrent()) return;
        console.warn('[HomeBackgroundVideo] Autoplay blocked:', err);
        logHomeBg('play failed', { label, err });
        el.muted = true;
        el.setAttribute('muted', '');
        clearTimeout(playFallbackTimer);
        playFallbackTimer = setTimeout(() => {
          playFallbackTimer = null;
          if (!isCurrent() || !el.paused) return;
          el.play().catch(e2 => {
            if (isCurrent()) console.warn('[HomeBackgroundVideo] Retry play failed:', e2);
          });
        }, 200);
      });
    }
  };

  const activateVideo = (meta) => {
    if (!videoEl || !meta || shouldKeepStatic()) return;
    enforceVideoNonInteractive(videoEl);

    const prefersMobile = isMobileViewport();
    const chosenSrc = prefersMobile && meta.mobile ? meta.mobile : meta.desktop;
    if (!chosenSrc) return;
    
    // Skip if already active to avoid unnecessary reloads
    const currentActiveSrc = videoEl.getAttribute('data-active-src');
    if (currentActiveSrc === chosenSrc) {
      logHomeBg('skip activate - already active', meta.id);
      return;
    }

    lifecycle += 1;
    clearTimeout(playFallbackTimer);
    if (canPlayHandler) videoEl.removeEventListener('canplay', canPlayHandler);
    if (metadataHandler) videoEl.removeEventListener('loadedmetadata', metadataHandler);
    
    videoEl.src = chosenSrc;
    videoEl.setAttribute('data-active-src', chosenSrc);
    videoEl.setAttribute('data-video-key', meta.id);
    activeMeta = meta;
    errorSwapAttempted = false;

    logHomeBg('activate', meta.id, { chosenSrc });

    videoEl.load();

    try {
      videoEl.currentTime = 0;
    } catch (e) {
      logHomeBg('currentTime reset failed', e);
    }

    if (videoEl.readyState >= 2) {
      attemptPlay('ready');
    } else {
      metadataHandler = () => logHomeBg('loadedmetadata', { duration: videoEl.duration, src: videoEl.currentSrc || videoEl.src });
      canPlayHandler = () => attemptPlay('canplay');
      videoEl.addEventListener('loadedmetadata', metadataHandler, { once: true });
      videoEl.addEventListener('canplay', canPlayHandler, { once: true });
    }

    if (playRetryTimer) clearTimeout(playRetryTimer);
    playRetryTimer = setTimeout(() => {
      if (!videoEl || isTransitioning || !videoEl.paused) return;
      logHomeBg('retry watchdog: forcing play', { currentTime: videoEl.currentTime, duration: videoEl.duration });
      attemptPlay('retry-watchdog');
    }, 1500);

    if (videoPlaylist.length > 1) {
      const upcoming = videoPlaylist[(currentIndex + 1) % videoPlaylist.length];
      scheduleIdleTask(() => {
        warmVideoForMeta(upcoming);
      });
    }
  };

  const goToIndex = (index) => {
    if (!videoPlaylist[index]) return;
    currentIndex = index;
    persistIndex(index);
    const meta = videoPlaylist[index];
    activateVideo(meta);
    applyNavTheme(meta);
  };

  const handleEnded = () => {
    if (!videoEl || !videoPlaylist.length || isTransitioning || shouldKeepStatic() || document.hidden) return;
    isTransitioning = true;
    logHomeBg('handleEnded', { currentIndex, nextIndex: (currentIndex + 1) % videoPlaylist.length });
    goToIndex((currentIndex + 1) % videoPlaylist.length);
    transitionTimer = setTimeout(() => { isTransitioning = false; }, 500);
  };

  const handleResize = () => {
    if (currentIndex === -1 || !videoPlaylist[currentIndex] || shouldKeepStatic() || document.hidden) return;
    activateVideo(videoPlaylist[currentIndex]);
  };

  const handleVisibilityChange = () => {
    if (!videoEl) return;
    if (document.hidden) {
      videoEl.pause();
    } else if (!shouldKeepStatic()) {
      handleResize();
      attemptPlay('visible');
    }
  };

  const init = () => {
    HomeBackgroundVideoManager.destroy();
    if (!ensureVideoElement()) return;

    // Bind toggle UI whenever Home is (re)rendered
    HomeBackgroundVideoManager.bindToggleUI();

    syncRootVideoStateAttr();

    if (shouldKeepStatic()) {
      clearVideoSources();
      applyNavTheme({ prefersLightNav: false });
      return;
    }

    const startIndex = nextIndex();
    if (startIndex === -1) return;
    goToIndex(startIndex);

    // Warm the next video as soon as we know what is currently active
    if (videoPlaylist.length > 1) {
      const upcoming = videoPlaylist[(startIndex + 1) % videoPlaylist.length];
      scheduleIdleTask(() => {
        warmVideoForMeta(upcoming);
      });
    }

    let lastLogTime = 0;
    const throttleLog = (msg, data) => {
      const now = Date.now();
      if (now - lastLogTime > 1000) { // Only log once per second
        logHomeBg(msg, data);
        lastLogTime = now;
      }
    };
    playHandler = () => { needsMediaRecovery = false; throttleLog('playing', { currentIndex }); };
    pauseHandler = () => throttleLog('pause', { currentIndex, src: videoEl?.currentSrc || videoEl?.src });
    waitingHandler = () => throttleLog('waiting', { currentIndex, src: videoEl?.currentSrc || videoEl?.src });
    stalledHandler = () => { needsMediaRecovery = true; throttleLog('stalled', { currentIndex }); };
    errorHandler = () => {
      needsMediaRecovery = true;
      const currentSrc = videoEl?.currentSrc || videoEl?.src;
      logHomeBg('error', { error: videoEl?.error, currentSrc, active: videoEl?.getAttribute('data-active-src') });
      if (!activeMeta || errorSwapAttempted) return;
      const mobileSrc = activeMeta.mobile || activeMeta.desktop;
      const desktopSrc = activeMeta.desktop;
      const matchesMobile = currentSrc && mobileSrc && currentSrc.includes(mobileSrc);
      const matchesDesktop = currentSrc && desktopSrc && currentSrc.includes(desktopSrc);
      const trySwap = (nextSrc, reason) => {
        if (!nextSrc || nextSrc === currentSrc) return;
        errorSwapAttempted = true;
        logHomeBg('error fallback swap', { reason, nextSrc });
        videoEl.src = nextSrc;
        videoEl.setAttribute('data-active-src', nextSrc);
        videoEl.load();
        attemptPlay('error-swap');
      };
      if (matchesMobile && desktopSrc) {
        trySwap(desktopSrc, 'mobile->desktop');
      } else if (matchesDesktop && mobileSrc && mobileSrc !== desktopSrc) {
        trySwap(mobileSrc, 'desktop->mobile');
      }
    };

    videoEl.addEventListener('ended', handleEnded);
    videoEl.addEventListener('playing', playHandler);
    videoEl.addEventListener('pause', pauseHandler);
    videoEl.addEventListener('waiting', waitingHandler);
    videoEl.addEventListener('stalled', stalledHandler);
    videoEl.addEventListener('error', errorHandler);
    
    // Universal fallback: some browsers (especially mobile) don't reliably fire 'ended'.
    // This persistent timeupdate listener ensures videos always transition.
    endFallbackHandler = function () {
      try {
        if (!videoEl || videoEl.paused || isTransitioning) return;
        const duration = videoEl.duration;
        if (!duration || !isFinite(duration)) return;
        
        const timeRemaining = duration - videoEl.currentTime;
        // Trigger transition when less than 1 second remains
        if (timeRemaining <= 1.0 && timeRemaining >= 0) {
          logHomeBg('fallback timeupdate', { currentTime: videoEl.currentTime, duration });
          handleEnded();
        }
      } catch (e) {
        console.warn('[HomeBackgroundVideo] endFallback error', e);
      }
    };
    videoEl.addEventListener('timeupdate', endFallbackHandler);

    if (!watchdogTimer) {
      lastProgressTime = Date.now();
      lastCurrentTime = 0;
      watchdogTimer = setInterval(() => {
        if (!videoEl || videoEl.paused || isTransitioning) return;
        const duration = videoEl.duration;
        const currentTime = videoEl.currentTime || 0;
        const now = Date.now();
        if (currentTime !== lastCurrentTime) {
          lastCurrentTime = currentTime;
          lastProgressTime = now;
        }

        if (duration && isFinite(duration)) {
          const remaining = duration - currentTime;
          if (remaining <= 1.0 && remaining >= 0) {
            logHomeBg('fallback watchdog near-end', { currentTime, duration });
            handleEnded();
          } else if (currentTime > 0.1 && now - lastProgressTime > 5000) {
            logHomeBg('fallback watchdog stalled', { currentTime, duration });
            handleEnded();
          }
        }
      }, 1000);
    }
    resizeHandler = debounce(() => {
      handleResize();
      // Ensure toggle UI state persists correctly across layout changes
      bindToggleUI(); 
    }, 300);
    window.addEventListener('resize', resizeHandler, { passive: true });
    visibilityHandler = handleVisibilityChange;
    document.addEventListener('visibilitychange', visibilityHandler, { passive: true });
    unsubscribeResume = subscribeToPageResume(() => {
      if (!videoEl || shouldKeepStatic()) return;
      handleResize();
      if (needsMediaRecovery || videoEl.error) {
        const el = videoEl;
        const token = lifecycle;
        const position = el.currentTime;
        if (recoveryMetadataHandler) el.removeEventListener('loadedmetadata', recoveryMetadataHandler);
        recoveryMetadataHandler = () => {
          if (el !== videoEl || lifecycle !== token || shouldKeepStatic()) return;
          if (Number.isFinite(position) && position > 0 && position < el.duration) {
            try { el.currentTime = position; } catch { /* Browser can reject a seek. */ }
          }
          attemptPlay('reconnected-media');
        };
        el.addEventListener('loadedmetadata', recoveryMetadataHandler, { once: true });
        needsMediaRecovery = false;
        el.load();
      }
      attemptPlay('resume');
    }, { minHiddenMs: 0 });
  };

  const destroy = () => {
    unsubscribeResume?.();
    unsubscribeResume = null;
    needsMediaRecovery = false;
    if (videoEl && recoveryMetadataHandler) videoEl.removeEventListener('loadedmetadata', recoveryMetadataHandler);
    recoveryMetadataHandler = null;
    // Invalidate rejected play promises before detaching the media element.
    lifecycle += 1;
    cancelWarmup();
    clearTimeout(playFallbackTimer);
    clearTimeout(transitionTimer);
    playFallbackTimer = null;
    transitionTimer = null;
    isTransitioning = false;
    activeMeta = null;
    if (videoEl) {
      if (canPlayHandler) videoEl.removeEventListener('canplay', canPlayHandler);
      if (metadataHandler) videoEl.removeEventListener('loadedmetadata', metadataHandler);
      canPlayHandler = null;
      metadataHandler = null;
      clearVideoSources();
      videoEl.pause();
      videoEl.removeEventListener('ended', handleEnded);
      if (playHandler) videoEl.removeEventListener('playing', playHandler);
      if (pauseHandler) videoEl.removeEventListener('pause', pauseHandler);
      if (waitingHandler) videoEl.removeEventListener('waiting', waitingHandler);
      if (stalledHandler) videoEl.removeEventListener('stalled', stalledHandler);
      if (errorHandler) videoEl.removeEventListener('error', errorHandler);
      playHandler = null;
      pauseHandler = null;
      waitingHandler = null;
      stalledHandler = null;
      errorHandler = null;
      if (endFallbackHandler) {
        videoEl.removeEventListener('timeupdate', endFallbackHandler);
        endFallbackHandler = null;
      }
    }
    if (playRetryTimer) {
      clearTimeout(playRetryTimer);
      playRetryTimer = null;
    }
    if (watchdogTimer) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler.cancel();
      resizeHandler = null;
    }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
    if (warmupVideo) {
      warmupVideo.removeAttribute('src');
      warmupVideo.load();
      warmupVideo.remove();
      warmupVideo = null;
    }
    currentIndex = -1;
    videoEl = null;
    applyNavTheme(null);
  };

  let toggleDelegationBound = false;
  const ensureToggleDelegation = () => {
    if (toggleDelegationBound) return;
    toggleDelegationBound = true;

    const handler = (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.id !== 'homeVideoToggleDesktop' && target.id !== 'homeVideoToggleMobile') return;
      if (target.disabled) return;
      setEnabled(!!target.checked);
    };

    document.addEventListener('change', handler, true);
    document.addEventListener('input', handler, true);
  };

  const bindToggleUI = () => {
    ensureToggleDelegation();
    const desktopToggle = document.getElementById('homeVideoToggleDesktop');
    const mobileToggle = document.getElementById('homeVideoToggleMobile');
    const toggles = [desktopToggle, mobileToggle].filter(Boolean);

    if (!toggles.length) return;

    const enabled = getUserEnabled();
    const canPlay = canPlayVideosInThisContext();
    syncRootVideoStateAttr();

    toggles.forEach((toggle) => {
      toggle.checked = enabled;
      toggle.disabled = !canPlay;
    });
  };

  const setEnabled = (enabled) => {
    setUserEnabled(!!enabled);
    syncRootVideoStateAttr();
    if (enabled) {
      HomeBackgroundVideoManager.init();
    } else {
      HomeBackgroundVideoManager.destroy();
      applyNavTheme({ prefersLightNav: false });
    }

    window.dispatchEvent(new CustomEvent('icue:homeVideoEnabled', {
      detail: { enabled: !!enabled },
    }));

    // Keep both (desktop + mobile) toggles in sync.
    bindToggleUI();
  };

  const isEnabled = () => getUserEnabled();

  return { init, destroy, bindToggleUI, setEnabled, isEnabled, canToggleVideos: canPlayVideosInThisContext };
})();

export default HomeBackgroundVideoManager;
