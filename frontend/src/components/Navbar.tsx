'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-blue-600">HealthPro Q&A</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/questions/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ask Question
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
