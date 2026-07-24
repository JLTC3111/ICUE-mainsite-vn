/** phosphor-icons cpu-light */
export default function PhosphorCpu({ className, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect
        x="104"
        y="104"
        width="48"
        height="48"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="12"
      />
      <rect
        x="48"
        y="48"
        width="160"
        height="160"
        rx="8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="12"
      />
      <line x1="208" y1="104" x2="232" y2="104" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12" />
      <line x1="208" y1="152" x2="232" y2="152" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12" />
      <line x1="24" y1="104" x2="48" y2="104" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12" />
      <line x1="24" y1="152" x2="48" y2="152" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12" />
      <line x1="152" y1="208" x2="152" y2="232" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12" />
      <line x1="104" y1="208" x2="104" y2="232" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12" />
      <line x1="152" y1="24" x2="152" y2="48" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12" />
      <line x1="104" y1="24" x2="104" y2="48" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12" />
    </svg>
  )
}
