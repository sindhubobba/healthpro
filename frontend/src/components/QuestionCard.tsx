import Link from 'next/link';
import { Question } from '@/types';

interface QuestionCardProps {
  question: Question;
}

export default function QuestionCard({ question }: QuestionCardProps) {
  const formattedDate = new Date(question.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
      <Link href={`/questions/${question.id}`}>
        <h2 className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
          {question.title}
        </h2>
      </Link>
      <p className="mt-2 text-gray-600 line-clamp-2">{question.content}</p>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span className="flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            {question.answer_count || 0} answers
          </span>
          <span>{formattedDate}</span>
        </div>
        {question.author_name && (
          <span className="text-sm text-gray-500">by {question.author_name}</span>
        )}
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
    </div>
  );
}
