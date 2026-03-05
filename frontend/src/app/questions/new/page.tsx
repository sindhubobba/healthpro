'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createQuestion } from '@/lib/api';

export default function NewQuestion() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/questions/new');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const result = await createQuestion(
        title,
        content,
        authorName || undefined,
        tagArray.length > 0 ? tagArray : undefined
      );

      router.push(`/questions/${result.question.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create question');
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="page-shell max-w-3xl py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto" />
        <p className="mt-4 text-slate-600">
          {authLoading ? 'Loading...' : 'Redirecting to login...'}
        </p>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-3xl">
      <h1 className="section-title mb-2">Ask a Question</h1>
      <p className="section-subtitle mb-8">
        Get AI-powered answers and responses from other health professionals
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="field-label">
            Question Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="field-input"
            placeholder="e.g., What are the current guidelines for hypertension management in elderly patients?"
          />
        </div>

        <div>
          <label htmlFor="content" className="field-label">
            Details *
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={8}
            className="field-textarea"
            placeholder="Provide more context about your question. Include relevant patient details, clinical scenario, or specific aspects you want addressed..."
          />
        </div>

        <div>
          <label htmlFor="authorName" className="field-label">
            Your Name *
          </label>
          <input
            type="text"
            id="authorName"
            required
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="field-input"
            placeholder="Dr. Jane Smith"
          />
        </div>

        <div>
          <label htmlFor="tags" className="field-label">
            Tags (optional, comma-separated)
          </label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="field-input"
            placeholder="cardiology, hypertension, elderly"
          />
        </div>

        <div className="bg-sky-50 border border-sky-100 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-sky-600 mt-0.5 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-slate-700">
              After submitting, our AI will analyze your question and provide an initial response
              based on medical knowledge and similar past questions. Other health professionals
              can also contribute their expertise.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !title || !content || !authorName}
          className="btn-primary w-full"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Analyzing and generating AI response...
            </span>
          ) : (
            'Submit Question'
          )}
        </button>
      </form>
    </div>
  );
}
