import styles from './AwaitingBlock.module.css';

interface AwaitingBlockProps {
  title?: string;
  subtitle?: string;
}

export default function AwaitingBlock({
  title = 'Awaiting specialist response',
  subtitle = 'A specialist will respond to this question directly.',
}: AwaitingBlockProps) {
  return (
    <div className={styles.block}>
      <div className={styles.spinner} aria-hidden="true">
        <svg viewBox="0 0 20 20">
          <path d="M10 3a7 7 0 100 14 7 7 0 000-14z" />
          <path d="M10 7v4l3 2" strokeLinecap="round" />
        </svg>
      </div>
      <div className={styles.title}>{title}</div>
      <div className={styles.sub}>{subtitle}</div>
    </div>
  );
}
