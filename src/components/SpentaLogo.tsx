import React from 'react';
import { SPENTA_LOGO_DARK_URL, SPENTA_LOGO_URL } from '../data/spentaManifest';

export type SpentaLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const LOGO_SIZE_CLASS_MAP: Record<SpentaLogoSize, string> = {
  xs: 'h-5',
  sm: 'h-6',
  md: 'h-7 sm:h-8',
  lg: 'h-10',
  xl: 'h-12',
};

interface SpentaLogoProps {
  className?: string;
  size?: SpentaLogoSize;
  tone?: 'dark-bg' | 'light-bg';
  variant?: 'lockup' | 'mark';
  showTagline?: boolean;
  tagline?: string;
}

export function SpentaLogo({
  className,
  size = 'md',
  tone = 'dark-bg',
  variant = 'lockup',
  showTagline = false,
  tagline = 'INTELLIGENT REALITY',
}: SpentaLogoProps) {
  const src =
    variant === 'mark'
      ? '/icon.svg'
      : tone === 'dark-bg'
        ? SPENTA_LOGO_DARK_URL
        : SPENTA_LOGO_URL;

  const heightClass = className ?? LOGO_SIZE_CLASS_MAP[size];

  const imgElement = (
    <img
      src={src}
      alt="Spenta Technology"
      decoding="async"
      className={`${heightClass} w-auto object-contain select-none block shrink-0`}
    />
  );

  if (!showTagline) {
    return imgElement;
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      {imgElement}
      <span
        className={`text-[10px] font-mono font-semibold uppercase tracking-[0.16em] leading-none ${
          tone === 'dark-bg'
            ? 'text-[#94A3B8]'
            : 'text-[#4A5568]'
        }`}
      >
        {tagline}
      </span>
    </span>
  );
}
