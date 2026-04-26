import { ReactNode } from 'react';
import styles from './AuthShell.module.css';

interface AuthShellProps {
  eyebrow: string;
  title: ReactNode;
  subtitle: ReactNode;
  children: ReactNode;
}

export default function AuthShell({ eyebrow, title, subtitle, children }: AuthShellProps) {
  return (
    <div className={styles.shell}>
      <div className={`${styles.head} reveal d1`}>
        <div className={styles.eyebrow}>{eyebrow}</div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      <div className={`${styles.card} reveal d2`}>
        {children}
      </div>
    </div>
  );
}
