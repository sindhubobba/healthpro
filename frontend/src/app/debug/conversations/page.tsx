'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDebugConversations, getDebugStats, DebugConversation, DebugStats } from '@/lib/api';

export default function DebugConversationsPage() {
  const [conversations, setConversations] = useState<DebugConversation[]>([]);
  const [stats, setStats] = useState<DebugStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [convsData, statsData] = await Promise.all([
          getDebugConversations(),
          getDebugStats(),
        ]);
        setConversations(convsData.conversations);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Debug: Synthetic Conversations
          </h1>
          <p className="text-gray-500 text-sm">
            This page is for testing only. Delete before production.
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.conversations_count}</div>
              <div className="text-sm text-gray-500">Conversations</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-green-600">{stats.messages_count}</div>
              <div className="text-sm text-gray-500">Messages</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.messages_with_embeddings}</div>
              <div className="text-sm text-gray-500">With Embeddings</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.professionals_count}</div>
              <div className="text-sm text-gray-500">Professionals</div>
            </div>
          </div>
        )}

        {/* Specialties */}
        {stats?.specialties && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Specialties:</h2>
            <div className="flex flex-wrap gap-2">
              {stats.specialties.filter(Boolean).map((specialty) => (
                <span
                  key={specialty}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Conversations ({conversations.length})</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No conversations found. Run the batch job to generate synthetic conversations.
              </div>
            ) : (
              conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/debug/conversations/${conv.id}`}
                  className="block p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{conv.title}</h3>
                      <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                        <span className="px-2 py-0.5 bg-gray-100 rounded">{conv.specialty}</span>
                        <span>{conv.scenario_type}</span>
                        <span className="text-gray-300">|</span>
                        <span>{conv.message_count} messages</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {conv.conditions?.slice(0, 3).map((condition) => (
                          <span
                            key={condition}
                            className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded"
                          >
                            {condition}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        conv.complexity === 'basic' ? 'bg-green-100 text-green-700' :
                        conv.complexity === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {conv.complexity}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
