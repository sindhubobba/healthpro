'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createQuestion } from '@/lib/api';
import ConversationalComposer, {
  ComposerSubmitPayload,
} from '@/components/ask/ConversationalComposer';
import SuggestionCard from '@/components/ask/SuggestionCard';
import styles from './page.module.css';

interface Suggestion {
  iconTone: 'sage' | 'copper' | 'teal';
  icon: React.ReactNode;
  title: string;
  suffix: string;
  fullQuestion: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    iconTone: 'sage',
    icon: (
      <svg viewBox="0 0 16 16">
        <path d="M8 2a6 6 0 100 12A6 6 0 008 2z" />
        <path d="M10.5 6.5c-.6-.5-1.5-.8-2.5-.8s-1.9.3-2.5.8" />
        <path d="M6 10c.5.5 1.2.8 2 .8s1.5-.3 2-.8" />
      </svg>
    ),
    title: 'AFib anticoagulation',
    suffix: 'in hemodialysis patients',
    fullQuestion: 'How do you manage anticoagulation for AFib in a hemodialysis patient?',
  },
  {
    iconTone: 'copper',
    icon: (
      <svg viewBox="0 0 16 16">
        <path d="M4 12V8a4 4 0 018 0v4" />
        <path d="M2 12h12" />
      </svg>
    ),
    title: 'T2DM management',
    suffix: 'with stage 3 CKD',
    fullQuestion: 'What is the preferred management strategy for type 2 diabetes with CKD stage 3?',
  },
  {
    iconTone: 'teal',
    icon: (
      <svg viewBox="0 0 16 16">
        <path d="M3 13V7l5-4 5 4v6" />
        <path d="M7 13v-3h2v3" />
      </svg>
    ),
    title: 'Ventilator weaning',
    suffix: 'after prolonged intubation',
    fullQuestion: 'What criteria should guide ventilator weaning after prolonged intubation?',
  },
];

export default function NewQuestion() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/questions/new');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className={styles.shell}>
        <div className={styles.loading}>
          {authLoading ? 'Loading…' : 'Redirecting to login…'}
        </div>
      </div>
    );
  }

  const handleSubmit = async ({ text, tags }: ComposerSubmitPayload) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const authorName = user.name?.trim() || user.email;
      const result = await createQuestion(
        text,
        authorName,
        tags.length > 0 ? tags : undefined,
      );
      router.push(`/questions/${result.question.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create question');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.shell}>
      <div className={`${styles.heroText} reveal d1`}>
        <h1 className={styles.h}>
          What do you need to <em>know?</em>
        </h1>
        <p className={styles.p}>Ask like you&rsquo;re texting a colleague. We&rsquo;ll find the answer.</p>
      </div>

      {error && <div className={`${styles.error} reveal d2`}>{error}</div>}

      <div className="reveal d2">
        <ConversationalComposer
          text={text}
          onTextChange={setText}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>

      <div className={`${styles.hints} reveal d3`}>
        {SUGGESTIONS.map((s) => (
          <SuggestionCard
            key={s.fullQuestion}
            icon={s.icon}
            iconTone={s.iconTone}
            title={s.title}
            suffix={s.suffix}
            fullQuestion={s.fullQuestion}
            onTap={(q) => setText(q)}
          />
        ))}
      </div>

      <div className={`${styles.footer} reveal d4`}>
        Visible to verified physicians. Patient identifiers are stripped before storage.
      </div>
    </div>
  );
}
