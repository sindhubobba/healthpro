'use client';

import { useState } from 'react';
import { vote } from '@/lib/api';

interface VoteButtonsProps {
  answerId: string;
  initialUpvotes: number;
  initialDownvotes: number;
}

export default function VoteButtons({
  answerId,
  initialUpvotes,
  initialDownvotes,
}: VoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const result = await vote(answerId, voteType);
      setUpvotes(result.upvotes);
      setDownvotes(result.downvotes);
    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const score = upvotes - downvotes;

  return (
    <div className="flex flex-col items-center space-y-1">
      <button
        onClick={() => handleVote('upvote')}
        disabled={isLoading}
        className="p-1 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
        aria-label="Upvote"
      >
        <svg
          className="w-6 h-6 text-gray-400 hover:text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      </button>
      <span
        className={`font-semibold text-lg ${
          score > 0 ? 'text-green-600' : score < 0 ? 'text-red-600' : 'text-gray-600'
        }`}
      >
        {score}
      </span>
      <button
        onClick={() => handleVote('downvote')}
        disabled={isLoading}
        className="p-1 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
        aria-label="Downvote"
      >
        <svg
          className="w-6 h-6 text-gray-400 hover:text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    </div>
  );
}
