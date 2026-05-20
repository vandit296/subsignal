'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const POLICY_LINKS = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Refund', href: '/refund' },
  { label: 'Cookies', href: '/cookies' },
];

// Don't show the footer inside the main app shell pages (they have sidebar nav)
const SHELL_ROUTES = ['/feed', '/watch', '/compose', '/command', '/find', '/engage',
  '/scout', '/dashboard', '/post', '/track', '/onboarding', '/reports', '/saved',
  '/collections', '/settings', '/alerts', '/upgrade'];

export default function PolicyFooter() {
  const pathname = usePathname();

  // Hide inside app shell routes
  if (SHELL_ROUTES.some(r => pathname.startsWith(r))) return null;
  // Hide on auth pages
  if (pathname.startsWith('/auth')) return null;
  // Hide on policy pages themselves (they have their own cross-links)
  if (['/terms', '/privacy', '/refund', '/cookies'].some(r => pathname.startsWith(r))) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      padding: '20px 24px',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      flexWrap: 'wrap',
    }}>
      {POLICY_LINKS.map(l => (
        <Link
          key={l.href}
          href={l.href}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.18)',
            textDecoration: 'none',
            textTransform: 'uppercase',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}
        >
          {l.label}
        </Link>
      ))}
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.06em',
        color: 'rgba(255,255,255,0.1)',
        textTransform: 'uppercase',
      }}>
        © {new Date().getFullYear()} Treddit
      </span>
    </div>
  );
}
