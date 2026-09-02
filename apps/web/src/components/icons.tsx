type IconProps = { className?: string };

export function IconHome({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconNewAnalysis({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 9v6M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconList({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M8 7h12M8 12h12M8 17h12M4.5 7h.01M4.5 12h.01M4.5 17h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.5v2.2M12 18.3V20.5M4.9 6.5l1.6 1.6M17.5 16l1.6 1.6M3.5 12h2.2M18.3 12H20.5M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconShield({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3 5 6.2v6.1c0 4 2.9 6.9 7 8.7 4.1-1.8 7-4.7 7-8.7V6.2L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 12.5 9.2 17 19 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconClock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4.2l3 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconAlert({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3 5 6.2v6.1c0 4 2.9 6.9 7 8.7 4.1-1.8 7-4.7 7-8.7V6.2L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.2" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function IconSearchDoc({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M7 4.5h7.5L18.5 9v10.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="11" cy="13" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="m13 15 2.2 2.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevronRight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconImage({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="10" r="1.6" fill="currentColor" />
      <path d="m3.8 16.2 5-4.2 3.4 2.8 3.2-3.3 5.4 4.7" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconLock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 10V8a4 4 0 0 1 8 0v2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M7 7l10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 7h14M10 7V5h4v2M8 7l.8 12h6.4L16 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMenu({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconInfo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function IconRefresh({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M20 12a8 8 0 1 1-2.2-5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M20 5v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconWallet({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3.5" y="6" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 9h17" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.2" cy="13.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconWhatsApp({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 3C7.3 3 3.46 6.76 3.46 11.4c0 1.86.55 3.59 1.5 5.04L3 21l4.72-1.9a8.9 8.9 0 0 0 4.32 1.12c4.74 0 8.58-3.76 8.58-8.4C20.62 6.76 16.78 3 12.04 3Zm4.86 11.86c-.2.56-1.16 1.07-1.61 1.14-.41.06-.94.09-1.52-.1-.35-.11-.8-.26-1.38-.5-2.43-1.05-4.01-3.5-4.13-3.66-.12-.16-1-1.33-1-2.54 0-1.2.63-1.8.85-2.05.22-.24.48-.3.64-.3h.46c.15 0 .34 0 .52.4.2.44.67 1.63.73 1.75.06.12.1.26.02.42-.08.16-.12.26-.24.4-.12.14-.25.31-.36.42-.12.12-.24.24-.1.47.14.24.62 1.02 1.33 1.65.91.81 1.68 1.06 1.92 1.18.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.56-.14 1.12Z" />
    </svg>
  );
}

export function IconLogout({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h7A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 10 18.5V17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4 12h10M11 8.5 14.5 12 11 15.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
