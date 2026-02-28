'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getDebugConversation, DebugConversation, DebugMessage } from '@/lib/api';

export default function DebugConversationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [conversation, setConversation] = useState<DebugConversation | null>(null);
  const [messages, setMessages] = useState<DebugMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getDebugConversation(id);
        setConversation(data.conversation);
        setMessages(data.messages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conversation');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">{error || 'Conversation not found'}</p>
          <Link href="/debug/conversations" className="text-blue-600 hover:underline mt-4 block">
            Back to conversations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/debug/conversations"
          className="text-blue-600 hover:underline text-sm mb-4 block"
        >
          ← Back to conversations
        </Link>

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{conversation.title}</h1>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              {conversation.specialty}
            </span>
            {conversation.sub_specialty && (
              <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                {conversation.sub_specialty}
              </span>
            )}
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
              {conversation.scenario_type}
            </span>
            <span className={`px-2 py-1 text-xs rounded ${
              conversation.complexity === 'basic' ? 'bg-green-100 text-green-700' :
              conversation.complexity === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {conversation.complexity}
            </span>
          </div>

          {/* Conditions */}
          <div className="mb-3">
            <span className="text-xs text-gray-500 font-medium">Conditions: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {conversation.conditions?.map((c) => (
                <span key={c} className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Guidelines */}
          <div>
            <span className="text-xs text-gray-500 font-medium">Guidelines Referenced: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {conversation.guidelines_referenced?.map((g) => (
                <span key={g} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-xs rounded">
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Conversation ({messages.length} messages)</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`p-4 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
              >
                {/* Speaker info */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-gray-900">
                      {msg.professional_name}
                    </span>
                    <span className="text-gray-500 text-sm ml-2">
                      {msg.professional_credentials}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {msg.has_embedding ? (
                      <span className="text-green-600">✓ Embedded</span>
                    ) : (
                      <span className="text-red-600">✗ No embedding</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {msg.role} • {msg.professional_specialty} • {msg.professional_institution}
                </div>

                {/* Message content */}
                <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
