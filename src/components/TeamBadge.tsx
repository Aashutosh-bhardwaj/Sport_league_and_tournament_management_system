import React from 'react';

interface TeamBadgeProps {
  name: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

function getTeamInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return 'TM';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function TeamBadge({ name, color = '#0B3D91', size = 'sm' }: TeamBadgeProps) {
  const initials = getTeamInitials(name);
  const dims =
    size === 'xs'
      ? 'w-6 h-6 text-[9px]'
      : size === 'sm'
      ? 'w-8 h-8 text-[11px]'
      : size === 'md'
      ? 'w-10 h-10 text-xs'
      : 'w-14 h-14 text-base';

  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${dims}`}
      title={name}
    >
      <svg viewBox="0 0 40 44" className="w-full h-full drop-shadow-xs" aria-hidden="true">
        <path
          d="M20 2 L37 8 V21 C37 31.5 29.5 38.8 20 42 C10.5 38.8 3 31.5 3 21 V8 L20 2 Z"
          fill={color}
          stroke="#FFFFFF"
          strokeWidth="2"
        />
        <path
          d="M20 4.5 L34.5 9.6 V21 C34.5 30 28 36.4 20 39.3"
          fill="rgba(255,255,255,0.12)"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-white tracking-tight leading-none pb-0.5">
        {initials}
      </span>
    </span>
  );
}
