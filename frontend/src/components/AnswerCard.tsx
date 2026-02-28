import { Answer } from '@/types';
import AIResponseBadge from './AIResponseBadge';
import VoteButtons from './VoteButtons';

interface AnswerCardProps {
  answer: Answer;
}

export default function AnswerCard({ answer }: AnswerCardProps) {
  const formattedDate = new Date(answer.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border p-6 ${
        answer.is_ai_generated ? 'border-l-4 border-l-purple-400' : ''
      }`}
    >
      <div className="flex">
        <div className="mr-4">
          <VoteButtons
            answerId={answer.id}
            initialUpvotes={answer.upvotes}
            initialDownvotes={answer.downvotes}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-3">
            {answer.is_ai_generated && <AIResponseBadge source={answer.ai_source} />}
            {answer.author_name && (
              <span className="text-sm text-gray-600">by {answer.author_name}</span>
            )}
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {answer.content}
          </div>
          <div className="mt-4 text-sm text-gray-400">{formattedDate}</div>
        </div>
      </div>
    </div>
  );
}
