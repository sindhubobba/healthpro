'use client';

import styles from './SuggestionCard.module.css';

type IconTone = 'sage' | 'copper' | 'teal';

interface SuggestionCardProps {
  icon: React.ReactNode;
  iconTone: IconTone;
  /** Title fragment, rendered bold */
  title: string;
  /** Suffix appended after the bold title (e.g., "in hemodialysis patients") */
  suffix?: string;
  /** The full question text that will be inserted into the composer on tap */
  fullQuestion: string;
  onTap: (fullQuestion: string) => void;
}

export default function SuggestionCard({
  icon,
  iconTone,
  title,
  suffix,
  fullQuestion,
  onTap,
}: SuggestionCardProps) {
  return (
    <button
      type="button"
      className={styles.hint}
      onClick={() => onTap(fullQuestion)}
    >
      <span className={`${styles.icon} ${styles[iconTone]}`} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.text}>
        <strong>{title}</strong>{suffix ? ` ${suffix}` : ''}
      </span>
      <span className={styles.arrow} aria-hidden="true">›</span>
    </button>
  );
}
