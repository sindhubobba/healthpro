'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AuthShell from '@/components/auth/AuthShell';
import formStyles from '@/components/auth/AuthForm.module.css';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(email, password, name || undefined);
      router.push('/questions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="For physicians, by physicians"
      title={<>Create your <em>account</em></>}
      subtitle={<>Already have one? <Link href="/login">Sign in</Link></>}
    >
      <form className={formStyles.form} onSubmit={handleSubmit}>
        {error && <div className={formStyles.error}>{error}</div>}

        <div className={formStyles.field}>
          <label htmlFor="name" className={formStyles.label}>
            Name <span className={formStyles.optional}>(optional)</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={formStyles.input}
            placeholder="Dr. Jane Smith"
          />
        </div>

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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={formStyles.input}
            placeholder="At least 6 characters"
          />
        </div>

        <div className={formStyles.field}>
          <label htmlFor="confirmPassword" className={formStyles.label}>Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={formStyles.input}
          />
        </div>

        <button type="submit" disabled={loading} className={formStyles.submit}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
