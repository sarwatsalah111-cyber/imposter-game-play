export function SpyLogo({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Hat brim */}
      <ellipse cx="32" cy="22" rx="22" ry="5" fill="currentColor" opacity="0.9" />
      {/* Hat top */}
      <path
        d="M18 22C18 22 20 8 32 8C44 8 46 22 46 22"
        fill="currentColor"
        opacity="0.7"
      />
      {/* Face shadow */}
      <path
        d="M20 24C20 24 20 38 32 42C44 38 44 24 44 24"
        fill="currentColor"
        opacity="0.15"
      />
      {/* Eyes mask band */}
      <path
        d="M16 28C16 28 22 26 32 26C42 26 48 28 48 28L48 33C48 33 42 35 32 35C22 35 16 33 16 33Z"
        fill="currentColor"
        opacity="0.85"
      />
      {/* Left eye */}
      <ellipse cx="25" cy="30.5" rx="3.5" ry="2.5" fill="hsl(var(--background))" />
      <ellipse cx="25.5" cy="30.5" rx="1.5" ry="1.5" fill="hsl(var(--accent))" />
      {/* Right eye */}
      <ellipse cx="39" cy="30.5" rx="3.5" ry="2.5" fill="hsl(var(--background))" />
      <ellipse cx="39.5" cy="30.5" rx="1.5" ry="1.5" fill="hsl(var(--accent))" />
      {/* Smirk */}
      <path
        d="M27 39C27 39 30 42 37 39"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Collar / body hint */}
      <path
        d="M26 44L32 50L38 44"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </svg>
  );
}
