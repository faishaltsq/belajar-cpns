import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Tampilkan hanya ikon tanpa teks */
  iconOnly?: boolean;
}

const sizeMap = {
  sm: { icon: 18, text: 15, gap: 6 },
  md: { icon: 24, text: 19, gap: 8 },
  lg: { icon: 32, text: 26, gap: 10 },
  xl: { icon: 48, text: 38, gap: 14 },
};

/**
 * Lolos.in logomark — SVG ikon + teks wordmark.
 * Gunakan di Navbar, Footer, Login page, dsb.
 */
export default function Logo({ size = 'md', iconOnly = false }: LogoProps) {
  const { icon, text, gap } = sizeMap[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: gap,
        userSelect: 'none',
        textDecoration: 'none',
      }}
    >
      {/* Ikon: kotak rounded dengan tanda centang stilisasi */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        {/* Background bulat amber */}
        <rect width="36" height="36" rx="10" fill="#c96442" />
        {/* Garis bawah tipis sebagai "underline" pada tanda centang */}
        <path
          d="M8 27h20"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Tanda centang tebal — simbol "lolos" */}
        <path
          d="M9 18.5L15.5 25L27 11"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {!iconOnly && (
        <span
          style={{
            fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: text,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: 'var(--foreground, #2d2b22)',
          }}
        >
          Lolos
          <span style={{ color: '#c96442' }}>.in</span>
        </span>
      )}
    </span>
  );
}
