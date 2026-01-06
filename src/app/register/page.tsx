'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    console.log('[REGISTER PAGE] Form submitted with email:', email);

    if (password !== confirmPassword) {
      const msg = 'Passwords do not match';
      console.log('[REGISTER PAGE]', msg);
      setError(msg);
      return;
    }

    if (password.length < 8) {
      const msg = 'Password must be at least 8 characters';
      console.log('[REGISTER PAGE]', msg);
      setError(msg);
      return;
    }

    setLoading(true);

    try {
      console.log('[REGISTER PAGE] Calling register...');
      await register(email, password);
      console.log('[REGISTER PAGE] Registration successful, redirecting...');
      router.push('/dashboard');
    } catch (err: any) {
      const message = err.message || 'Registration failed';
      console.error('[REGISTER PAGE] Registration error:', err);
      console.error('[REGISTER PAGE] Error message:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 px-4 py-10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">FuelTracker</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Create your account</h1>
          <p className="text-sm text-muted-foreground">Join and keep every fill-up organized.</p>
        </div>

        <Card className="border-none shadow-lg shadow-primary/5">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle>Register</CardTitle>
            <CardDescription>We only need an email and password to get started.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="At least 8 characters"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link className="font-medium text-primary" href="/login">
                Login instead
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
