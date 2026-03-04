'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getQuestion, createAnswer, deleteQuestion } from '@/lib/api';
import { Question, Answer } from '@/types';
import AnswerCard from '@/components/AnswerCard';
import { useAuth } from '@/context/AuthContext';

export default function QuestionDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();

  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Answer form state
  const [answerContent, setAnswerContent] = useState('');
  const [answerAuthor, setAnswerAuthor] = useState('');
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this question? This will also delete all answers.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteQuestion(id);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete question');
      setIsDeleting(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await createAnswer(id, answerContent, answerAuthor || undefined);
      setAnswers((prev) => [...prev, result.answer]);
      setAnswerContent('');
      setAnswerAuthor('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading question...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error || 'Question not found'}</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 underline">
            Back to questions
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(question.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isQuestionOwner = !!user && !!question.user_id && user.id === question.user_id;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        &larr; Back to questions
      </Link>

      {/* Question */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="flex justify-between items-start">
          <h1 className="text-2xl font-bold text-gray-900">{question.title}</h1>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
        <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
          {question.author_name && <span>Asked by {question.author_name}</span>}
          <span>{formattedDate}</span>
        </div>
        {question.tags && question.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {question.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-6 prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
          {question.content}
        </div>
      </div>

      {/* Answers */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
        </h2>
        <div className="space-y-4">
          {answers.map((answer) => (
            <AnswerCard key={answer.id} answer={answer} />
          ))}
        </div>
      </div>

      {/* Add Answer Form */}
      {!isQuestionOwner && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Answer</h3>
          <form onSubmit={handleSubmitAnswer} className="space-y-4">
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
                {submitError}
              </div>
            )}
            <div>
              <textarea
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                required
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                placeholder="Share your knowledge or experience..."
              />
            </div>
            <div>
              <label
                htmlFor="answerAuthor"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Name *
              </label>
              <input
                type="text"
                id="answerAuthor"
                value={answerAuthor}
                onChange={(e) => setAnswerAuthor(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Dr. Jane Smith"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !answerContent || !answerAuthor}
              className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Post Answer'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
