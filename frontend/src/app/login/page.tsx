'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AuthShell from '@/components/auth/AuthShell';
import formStyles from '@/components/auth/AuthForm.module.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/questions';
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={formStyles.form} onSubmit={handleSubmit}>
      {error && <div className={formStyles.error}>{error}</div>}

      <div className={formStyles.field}>
        <label htmlFor="email" className={formStyles.label}>Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={formStyles.input}
          placeholder="you@hospital.org"
        />
      </div>

      <div className={formStyles.field}>
        <label htmlFor="password" className={formStyles.label}>Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={formStyles.input}
        />
      </div>

      <button type="submit" disabled={loading} className={formStyles.submit}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title={<>Sign in to <em>Gia</em></>}
      subtitle={<>New here? <Link href="/signup">Create an account</Link></>}
    >
      <Suspense fallback={<div style={{ minHeight: 200 }} />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
