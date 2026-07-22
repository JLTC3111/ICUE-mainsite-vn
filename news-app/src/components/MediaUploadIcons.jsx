function IconBase({ size = 16, className, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

/** Colorful photo icon for image upload counts. */
export function ImageMediaIcon({ size = 16, className }) {
  return (
    <IconBase size={size} className={className}>
      <rect x="1.5" y="3" width="17" height="14" rx="2.5" fill="#DBEAFE" stroke="#2563EB" strokeWidth="1.2" />
      <circle cx="6.5" cy="7.5" r="1.6" fill="#FBBF24" />
      <path d="M3.5 14.5L7.2 10.8C7.6 10.4 8.2 10.4 8.6 10.8L11.2 13.4L13.1 11.5C13.5 11.1 14.1 11.1 14.5 11.5L16.5 13.5V14.5C16.5 15.05 16.05 15.5 15.5 15.5H4.5C3.95 15.5 3.5 15.05 3.5 14.5Z" fill="#059669" />
      <path d="M12 6.5L15.2 9.7C15.5 10 16 9.8 16 9.4V5.5C16 4.95 15.55 4.5 15 4.5H12.6C12.2 4.5 12 4.9 12.2 5.2L12 6.5Z" fill="#38BDF8" />
    </IconBase>
  )
}

/** Colorful clapperboard-style icon for video upload counts. */
export function VideoMediaIcon({ size = 16, className }) {
  return (
    <IconBase size={size} className={className}>
      <rect x="2" y="5" width="16" height="11" rx="2.5" fill="#F1F5F9" stroke="#475569" strokeWidth="1.2" />
      <path d="M2 5.5L18 5.5" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5.5 5.5V3.8C5.5 3.25 5.95 2.8 6.5 2.8H8.2" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11.8 5.5V3.8C11.8 3.25 12.25 2.8 12.8 2.8H14.5" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="10" cy="10.5" r="3.2" fill="#DC2626" />
      <path d="M9.1 8.6L12.4 10.5L9.1 12.4V8.6Z" fill="#FFFFFF" />
    </IconBase>
  )
}
