'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import styles from './ConversationalComposer.module.css';

export interface ComposerSubmitPayload {
  text: string;
  tags: string[];
}

interface ConversationalComposerProps {
  text: string;
  onTextChange: (next: string) => void;
  onSubmit: (payload: ComposerSubmitPayload) => void | Promise<void>;
  isSubmitting?: boolean;
}

export default function ConversationalComposer({
  text,
  onTextChange,
  onSubmit,
  isSubmitting = false,
}: ConversationalComposerProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = text.trim().length > 0 && !isSubmitting;

  const commitTag = () => {
    const t = tagDraft.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagDraft('');
    setIsAddingTag(false);
  };

  const handleTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTag();
    } else if (e.key === 'Escape') {
      setTagDraft('');
      setIsAddingTag(false);
    } else if (e.key === 'Backspace' && tagDraft === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    onSubmit({ text: text.trim(), tags });
  };

  const handleMainKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form className={styles.wrap} onSubmit={handleSubmit}>
      <textarea
        className={styles.mainInput}
        rows={3}
        placeholder="Ask like you're texting a colleague — include patient context, what you've tried, and what you need to know."
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={handleMainKey}
        aria-label="Question"
      />

      <div className={styles.bottom}>
        <div className={styles.tags}>
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              className={styles.tag}
              onClick={() => removeTag(t)}
              title="Remove tag"
            >
              {t}
              <span className={styles.tagX} aria-hidden="true">×</span>
            </button>
          ))}
          {isAddingTag ? (
            <input
              ref={tagInputRef}
              autoFocus
              className={styles.tagInput}
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={handleTagKey}
              onBlur={commitTag}
              placeholder="tag"
              aria-label="New tag"
            />
          ) : (
            <button
              type="button"
              className={`${styles.tag} ${styles.tagAdd}`}
              onClick={() => setIsAddingTag(true)}
            >
              + add tag
            </button>
          )}
        </div>

        <button
          type="submit"
          className={styles.send}
          disabled={!canSubmit}
          aria-label="Submit question"
          title="Submit (⌘↵)"
        >
          {isSubmitting ? (
            <span className={styles.sendSpinner} aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}

export { ConversationalComposer };
