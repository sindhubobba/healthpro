import Avatar from '@/components/shared/Avatar';
import styles from './HumanAnswerCard.module.css';

interface HumanAnswerCardProps {
  authorName: string | null;
  content: string;
  createdAt: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HumanAnswerCard({ authorName, content, createdAt }: HumanAnswerCardProps) {
  const paragraphs = content.split(/\n{2,}/).filter(Boolean);

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <Avatar name={authorName} tone="copper" size={28} />
        <div>
          <div className={styles.name}>{authorName ?? 'Anonymous'}</div>
          <div className={styles.time}>{formatDate(createdAt)}</div>
        </div>
      </header>
      <div className={styles.prose}>
        {paragraphs.length > 0
          ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
          : <p>{content}</p>}
      </div>
    </article>
  );
}
