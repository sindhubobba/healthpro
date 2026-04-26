'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getQuestion, createAnswer } from '@/lib/api';
import { Question, Answer } from '@/types';
import { useAuth } from '@/context/AuthContext';
import QuestionCard from '@/components/question/QuestionCard';
import AIResponseCard from '@/components/question/AIResponseCard';
import HumanAnswerCard from '@/components/question/HumanAnswerCard';
import AwaitingBlock from '@/components/question/AwaitingBlock';
import NotificationPill from '@/components/question/NotificationPill';
import styles from './page.module.css';

export default function QuestionDetail() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answerContent, setAnswerContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuestion() {
      try {
        setLoading(true);
        const data = await getQuestion(id);
        setQuestion(data.question);
        setAnswers(data.answers);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load question');
      } finally {
        setLoading(false);
      }
    }
    fetchQuestion();
  }, [id]);

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await createAnswer(id, answerContent);
      setAnswers((prev) => [...prev, result.answer]);
      setAnswerContent('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.shell}>
        <div className={styles.loading}>Loading…</div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className={styles.shell}>
        <div className={styles.error}>
          <p>{error || 'Question not found'}</p>
          <Link href="/questions" className={styles.backLink}>Back to questions</Link>
        </div>
      </div>
    );
  }

  const aiAnswers = answers.filter((a) => a.is_ai_generated);
  const humanAnswers = answers.filter((a) => !a.is_ai_generated);
  const hasHumanAnswer = humanAnswers.length > 0;
  const isQuestionOwner = !!user && !!question.user_id && user.id === question.user_id;

  // First tag becomes the specialty pill (cardiology/endocrinology/pulmonology
  // map to copper/sage/teal; anything else falls back to sage in SpecialtyTag).
  const specialty = question.tags?.[0] ?? null;

  return (
    <div className={styles.shell}>
      <Link href="/questions" className={`${styles.back} reveal d1`}>
        <svg viewBox="0 0 14 14" aria-hidden="true">
          <path d="M9 2L4 7l5 5" />
        </svg>
        Back to questions
      </Link>

      <div className="reveal d2">
        <QuestionCard
          title={question.title}
          body={question.content}
          specialty={specialty}
          createdAt={question.created_at}
          authorName={question.author_name}
        />
      </div>

      {!hasHumanAnswer && (
        <div className={`${styles.spacer} reveal d3`}>
          <NotificationPill>
            A specialist has been notified and will respond directly.
          </NotificationPill>
        </div>
      )}

      <div className={`${styles.responsesLabel} reveal d3`}>Responses</div>

      <div className="reveal d4">
        {aiAnswers.map((a) => (
          <AIResponseCard
            key={a.id}
            content={a.content}
            experts={a.experts}
            hasMatch={a.attribution_type === 'expert' && (a.experts?.length ?? 0) > 0}
          />
        ))}
        {humanAnswers.map((a) => (
          <HumanAnswerCard
            key={a.id}
            authorName={a.author_name}
            content={a.content}
            createdAt={a.created_at}
          />
        ))}
      </div>

      {!hasHumanAnswer && (
        <div className="reveal d5">
          <AwaitingBlock />
        </div>
      )}

      {user && !isQuestionOwner && (
        <form onSubmit={handleSubmitAnswer} className={styles.answerForm}>
          <div className={styles.answerLabel}>Add your input</div>
          {submitError && <div className={styles.formError}>{submitError}</div>}
          <textarea
            value={answerContent}
            onChange={(e) => setAnswerContent(e.target.value)}
            required
            rows={5}
            className={styles.textarea}
            placeholder="Share your clinical perspective…"
          />
          <button
            type="submit"
            disabled={isSubmitting || !answerContent}
            className="hp-btn hp-btn-fill"
          >
            {isSubmitting ? 'Posting…' : 'Post response'}
          </button>
        </form>
      )}

      {!user && (
        <div className={styles.signinPrompt}>
          <Link href="/login" className={styles.signinLink}>Sign in</Link> to add your input.
        </div>
      )}
    </div>
  );
}
