import SpecialtyTag from '@/components/shared/SpecialtyTag';
import Avatar from '@/components/shared/Avatar';
import styles from './QuestionCard.module.css';

interface QuestionCardProps {
  body: string;
  specialty?: string | null;
  createdAt: string;
  authorName: string | null;
  authorCredentials?: string | null;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

export default function QuestionCard({
  body,
  specialty,
  createdAt,
  authorName,
  authorCredentials,
}: QuestionCardProps) {
  const paragraphs = body.split(/\n{2,}/).filter(Boolean);

  return (
    <article className={styles.card}>
      <div className={styles.meta}>
        {specialty && <SpecialtyTag label={specialty} />}
        {specialty && <span className={styles.dot} aria-hidden="true" />}
        <span className={styles.time}>{formatTimestamp(createdAt)}</span>
      </div>

      <div className={styles.asker}>
        <Avatar name={authorName} tone="sage" size={34} />
        <div>
          <div className={styles.name}>{authorName ?? 'Anonymous'}</div>
          {authorCredentials && <div className={styles.creds}>{authorCredentials}</div>}
        </div>
      </div>

      <div className={styles.body}>
        {paragraphs.length > 0
          ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
          : <p>{body}</p>}
      </div>
    </article>
  );
}
