import Link from 'next/link';
import { Question } from '@/types';
import SpecialtyTag from '@/components/shared/SpecialtyTag';
import styles from './QuestionCard.module.css';

interface QuestionCardProps {
  question: Question;
}

export default function QuestionCard({ question }: QuestionCardProps) {
  const formattedDate = new Date(question.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const specialty = question.tags?.[0] ?? null;
  const remainingTags = question.tags ? question.tags.slice(1) : [];
  const answerCount = question.answer_count ?? 0;
  const showAwaiting = !question.has_human_answer && answerCount > 0;

  return (
    <Link href={`/questions/${question.id}`} className={styles.card}>
      <div className={styles.meta}>
        {specialty && <SpecialtyTag label={specialty} />}
        <span className={styles.date}>{formattedDate}</span>
      </div>

      <p className={styles.body}>{question.content}</p>

      <div className={styles.footer}>
        <span className={styles.answers}>
          {answerCount} {answerCount === 1 ? 'response' : 'responses'}
        </span>
        {showAwaiting && (
          <span className={styles.awaiting}>Awaiting specialist</span>
        )}
        {question.author_name && (
          <span className={styles.author}>by {question.author_name}</span>
        )}
        {remainingTags.length > 0 && (
          <span className={styles.tags}>
            {remainingTags.map((t) => (
              <span key={t} className={styles.tagChip}>{t}</span>
            ))}
          </span>
        )}
      </div>
    </Link>
  );
}
