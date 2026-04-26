'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, loading, logout } = useAuth();

  return (
    <nav className={styles.nav}>
      <div className={`hp-container ${styles.inner}`}>
        <Link href="/" className={styles.logo} aria-label="Gia home">
          {/* Slash prefix evokes a slash command (/help, /ask) — Gia is the AI you talk to. */}
          <span className={styles.slash} aria-hidden="true">/</span>
          <span className={styles.word}>Gia</span>
        </Link>

        <div className={styles.right}>
          {loading ? (
            <div className={styles.skeletonAvatar} aria-hidden="true" />
          ) : user ? (
            <>
              <Link href="/" className={styles.link}>Home</Link>
              <Link href="/questions" className={styles.link}>Questions</Link>
              <Link href="/questions/new" className="hp-btn hp-btn-dark">Ask</Link>
              <button onClick={() => logout()} className={styles.linkButton}>Sign out</button>
            </>
          ) : (
            <>
              <Link href="/" className={styles.link}>Home</Link>
              <Link href="/login" className={styles.link}>Sign in</Link>
              <Link href="/signup" className="hp-btn hp-btn-dark">Get started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
