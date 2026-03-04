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
          {answer.attribution_type === 'expert' && answer.experts && answer.experts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Based on expert knowledge from:</p>
              <div className="flex flex-wrap gap-2">
                {answer.experts.map((expert) => (
                  <span
                    key={expert.id}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                  >
                    {expert.name}, {expert.credentials} — {expert.specialty}
                  </span>
                ))}
              </div>
            </div>
          )}
          {answer.attribution_type === 'ai_only' && answer.is_ai_generated && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                AI-generated response without expert knowledge base match
              </p>
            </div>
          )}
          <div className="mt-4 text-sm text-gray-400">{formattedDate}</div>
        </div>
      </div>
    </div>
  );
}
