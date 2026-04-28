'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import styles from './PageTransition.module.css';

/**
 * Wraps page content in a brief opacity fade on route change. Per-section
 * `.reveal` stagger animations (used on landing / ask / detail) layer on
 * top of this without competing — this transition is opacity-only.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Keying on pathname remounts children on navigation so the fade replays.
  return (
    <div key={pathname} className={styles.fade}>
      {children}
    </div>
  );
}
