import styles from './NotificationPill.module.css';

interface NotificationPillProps {
  children: React.ReactNode;
}

export default function NotificationPill({ children }: NotificationPillProps) {
  return (
    <div className={styles.pill} role="status">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 2a5 5 0 00-5 5v3l-1.5 2h13L13 10V7a5 5 0 00-5-5z" />
        <path d="M6.5 14a1.5 1.5 0 003 0" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
