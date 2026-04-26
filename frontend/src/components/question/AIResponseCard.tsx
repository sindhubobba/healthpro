'use client';

import { useState } from 'react';
import { Expert } from '@/types';
import SourceChip from '@/components/shared/SourceChip';
import styles from './AIResponseCard.module.css';

interface AIResponseCardProps {
  content: string;
  experts?: Expert[];
  hasMatch: boolean;
}

const FALLBACK_BODY =
  "I don't have any expert-verified conversations on this topic yet. A specialist will review your question and respond.";

export default function AIResponseCard({ content, experts, hasMatch }: AIResponseCardProps) {
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);

  const body = hasMatch ? content : FALLBACK_BODY;
  const paragraphs = body.split(/\n{2,}/).filter(Boolean);
  const showSources = hasMatch && experts && experts.length > 0;
  const showFeedback = hasMatch;

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <div className={styles.tag}>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.label}>Gia says</span>
        </div>
        {hasMatch && <span className={styles.instant}>Instant match</span>}
      </header>

      <div className={styles.bodyWrap}>
        <div className={styles.prose}>
          {paragraphs.length > 0
            ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
            : <p>{body}</p>}
        </div>
      </div>

      {showSources && (
        <div className={styles.sourcesBar}>
          <div className={styles.sourcesLabel}>Expert knowledge sources</div>
          <div className={styles.chips}>
            {experts!.map((expert, i) => (
              <SourceChip key={expert.id} expert={expert} index={i} />
            ))}
          </div>
        </div>
      )}

      {showFeedback && (
        <div className={styles.feedback}>
          <span className={styles.feedbackQ}>Was this helpful?</span>
          {/* TODO: wire to POST /api/answers/:id/feedback once the backend endpoint lands */}
          <button
            type="button"
            className={`${styles.fbBtn} ${feedback === 'yes' ? styles.fbBtnActive : ''}`}
            onClick={() => setFeedback('yes')}
            aria-pressed={feedback === 'yes'}
          >
            Yes
          </button>
          <button
            type="button"
            className={`${styles.fbBtn} ${feedback === 'no' ? styles.fbBtnActive : ''}`}
            onClick={() => setFeedback('no')}
            aria-pressed={feedback === 'no'}
          >
            No
          </button>
        </div>
      )}
    </article>
  );
}
