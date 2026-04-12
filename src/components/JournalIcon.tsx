export default function JournalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="1.3em"
      height="1.3em"
      className={className}
      aria-hidden="true"
    >
      {/* Book body / cover */}
      <path
        d="M6 3 L26 3 C27.1 3 28 3.9 28 5 L28 27 C28 28.1 27.1 29 26 29 L6 29 C4.9 29 4 28.1 4 27 L4 5 C4 3.9 4.9 3 6 3 Z"
        fill="currentColor"
      />
      {/* Spine edge */}
      <rect x="4" y="3" width="3.5" height="26" rx="1" fill="currentColor" opacity="0.5"/>
      {/* Spine ridges */}
      <line x1="4.5" y1="7" x2="7" y2="7" stroke="currentColor" strokeWidth="0.6" opacity="0.3"/>
      <line x1="4.5" y1="10" x2="7" y2="10" stroke="currentColor" strokeWidth="0.6" opacity="0.3"/>
      <line x1="4.5" y1="22" x2="7" y2="22" stroke="currentColor" strokeWidth="0.6" opacity="0.3"/>
      <line x1="4.5" y1="25" x2="7" y2="25" stroke="currentColor" strokeWidth="0.6" opacity="0.3"/>
      {/* Page edges visible at bottom */}
      <line x1="7.5" y1="28" x2="27" y2="28" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
      <line x1="7.5" y1="27.2" x2="27" y2="27.2" stroke="currentColor" strokeWidth="0.4" opacity="0.2"/>
      {/* Cover border / inset panel */}
      <rect x="9" y="5.5" width="17" height="21" rx="1.5" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.35"/>
      {/* Center emblem - WoW-style diamond crest */}
      <path
        d="M17.5 9 L21 14 L17.5 19 L14 14 Z"
        fill="currentColor"
        opacity="0.3"
      />
      <path
        d="M17.5 9 L21 14 L17.5 19 L14 14 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.5"
      />
      {/* Inner circle in emblem */}
      <circle cx="17.5" cy="14" r="2.2" fill="currentColor" opacity="0.25"/>
      <circle cx="17.5" cy="14" r="2.2" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.5"/>
      {/* Corner flourishes */}
      <path d="M10 6.5 L12.5 6.5 L10 9" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.3"/>
      <path d="M25 6.5 L22.5 6.5 L25 9" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.3"/>
      <path d="M10 25.5 L12.5 25.5 L10 23" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.3"/>
      <path d="M25 25.5 L22.5 25.5 L25 23" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.3"/>
      {/* Bookmark ribbon */}
      <path d="M21 3 L21 8.5 L22.5 7 L24 8.5 L24 3" fill="#8B2500"/>
      {/* Clasp / strap */}
      <rect x="27" y="13" width="2" height="3" rx="0.5" fill="currentColor" opacity="0.4"/>
    </svg>
  );
}
