'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import styles from './ConversationalComposer.module.css';

export interface ComposerSubmitPayload {
  title: string;
  content: string;
  tags: string[];
}

interface ConversationalComposerProps {
  /** Controlled value — parent owns the title so SuggestionCard taps can update it */
  title: string;
  onTitleChange: (next: string) => void;
  onSubmit: (payload: ComposerSubmitPayload) => void | Promise<void>;
  isSubmitting?: boolean;
}

export default function ConversationalComposer({
  title,
  onTitleChange,
  onSubmit,
  isSubmitting = false,
}: ConversationalComposerProps) {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !isSubmitting;

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
    onSubmit({ title: title.trim(), content: content.trim(), tags });
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
        rows={1}
        placeholder="e.g., When should I switch from metformin to a GLP-1 agonist?"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        onKeyDown={handleMainKey}
        aria-label="Question"
      />
      <textarea
        className={styles.detailInput}
        rows={2}
        placeholder="Add clinical context — patient details, specific concerns, what you've already considered…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleMainKey}
        aria-label="Clinical context"
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
