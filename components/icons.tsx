import React from 'react';

const ACCENT = '#1f9d57';

export function EyeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="#8a8a90" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.5" stroke="#8a8a90" strokeWidth="1.6" />
    </svg>
  );
}

export function BookmarkIcon({ size = 18, saved = false }: { size?: number; saved?: boolean }) {
  return saved ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={ACCENT} aria-hidden="true">
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.2L5 21V4a1 1 0 0 1 1-1Z" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.2L5 21V4a1 1 0 0 1 1-1Z"
        stroke="#b4b4ba"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="#8a8a90" strokeWidth="2" />
      <path d="M21 21l-4-4" stroke="#8a8a90" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3a6 6 0 0 0-6 6v3.5L4.5 16h15L18 12.5V9a6 6 0 0 0-6-6Z"
        stroke="#3a3a3e"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="#3a3a3e" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="#9a9aa0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRight({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="#8a8a90" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
