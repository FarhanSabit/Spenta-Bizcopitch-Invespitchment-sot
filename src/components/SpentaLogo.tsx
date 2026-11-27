import React, { useState } from 'react';
import { SPENTA_LOGO_DARK_URL, SPENTA_LOGO_URL } from '../data/spentaManifest';

interface SpentaLogoProps {
  className?: string;
  tone?: 'dark-bg' | 'light-bg';
  variant?: 'lockup' | 'mark';
}

export function SpentaLogo({
  className = 'h-8',
  tone = 'dark-bg',
  variant = 'lockup',
}: SpentaLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const src =
    variant === 'mark'
      ? '/icon.svg'
      : tone === 'dark-bg'
        ? SPENTA_LOGO_DARK_URL
        : SPENTA_LOGO_URL;

  if (imgFailed) {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        <svg viewBox="0 0 64 64" className="h-full w-auto" aria-hidden="true">
          <defs>
            <linearGradient id="spentaFallbackLeaf" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#134E32" />
              <stop offset="50%" stopColor="#189350" />
              <stop offset="100%" stopColor="#DC2638" />
            </linearGradient>
          </defs>
          <path d="M9 54 C5 30, 18 9, 57 7 C59 38, 40 57, 9 54 Z" fill="url(#spentaFallbackLeaf)" />
          <path d="M9 54 L26 38 L35 38 L44 29 L44 20" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <circle cx="44" cy="16.5" r="3.4" stroke="#FFFFFF" strokeWidth="2.4" fill="none" />
        </svg>
        {variant === 'lockup' && (
          <span
            className={`font-extrabold tracking-tight text-base ${
              tone === 'dark-bg' ? 'text-white' : 'text-[#0E3924]'
            }`}
          >
            spenta
          </span>
        )}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt="Spenta Technology"
      decoding="async"
      onError={() => setImgFailed(true)}
      className={`${className} w-auto object-contain select-none`}
    />
  );
}
