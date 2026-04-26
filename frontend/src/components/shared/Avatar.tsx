import styles from './Avatar.module.css';

type Tone = 'sage' | 'copper' | 'teal' | 'ink';

interface AvatarProps {
  name: string | null | undefined;
  tone?: Tone;
  size?: number;
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.replace(/^Dr\.?\s+/i, '').trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, tone = 'sage', size = 34 }: AvatarProps) {
  const fontSize = Math.max(10, Math.round(size * 0.36));
  return (
    <span
      className={`${styles.avatar} ${styles[tone]}`}
      style={{ width: size, height: size, fontSize }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}
