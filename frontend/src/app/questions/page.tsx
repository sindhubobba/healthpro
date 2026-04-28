'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getQuestions } from '@/lib/api';
import { Question } from '@/types';
import QuestionCard from '@/components/QuestionCard';
import styles from './page.module.css';

export default function QuestionsFeed() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchQuestions() {
      try {
        setLoading(true);
        const data = await getQuestions(page);
        setQuestions(data.questions);
        setTotalPages(data.pagination.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions');
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, [page]);

  return (
    <div className={styles.feedShell}>
      <header className={`${styles.feedHeader} reveal d1`}>
        <div>
          <h1 className={styles.feedTitle}>Questions</h1>
          <p className={styles.feedSub}>
            Browse questions from health professionals or ask your own.
          </p>
        </div>
        <Link href="/questions/new" className="hp-btn hp-btn-fill">
          Ask a question
        </Link>
      </header>

      {loading ? (
        <div className={styles.loading}>Loading questions…</div>
      ) : error ? (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.retry}>
            Try again
          </button>
        </div>
      ) : questions.length === 0 ? (
        <div className={styles.empty}>
          <h2>No questions yet</h2>
          <p>Be the first to ask a question.</p>
          <Link href="/questions/new" className="hp-btn hp-btn-fill">
            Ask a question
          </Link>
        </div>
      ) : (
        <>
          <div className={`${styles.list} reveal d2`}>
            {questions.map((question) => (
              <QuestionCard key={question.id} question={question} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={styles.pageBtn}
              >
                Previous
              </button>
              <span className={styles.pageNum}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
