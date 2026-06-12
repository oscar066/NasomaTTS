"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail, CheckCircle2, ShieldCheck, Lock, KeyRound } from "lucide-react";
import Link from "next/link";
import NasomaLogo from "@/app/components/Logo/nasoma-logo";

const perks = [
  { icon: ShieldCheck, text: "Secure password reset link" },
  { icon: Lock,        text: "Link expires after 15 minutes" },
  { icon: KeyRound,    text: "Only you can reset your password" },
];

export default function ForgotPasswordPage() {
  const [email, setEmail]         = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError("Please enter your email address."); return; }
    setError(null);
    setIsLoading(true);

    // TODO: wire up to your actual reset-password API endpoint
    await new Promise((r) => setTimeout(r, 1200)); // simulate request
    setIsLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen w-full flex">

      {/* ── Left panel — branding ───────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary to-purple-700 flex-col justify-between p-12 text-white overflow-hidden">
        {/* Background orbs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-300/10 rounded-full blur-3xl" />

        {/* Logo */}
        <Link href="/" className="relative z-10">
          <NasomaLogo size="md" variant="onDark" showText />
        </Link>

        {/* Center content */}
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-4 leading-snug">
            Forgot your<br />password?
          </h2>
          <p className="text-white/80 mb-8 leading-relaxed">
            No worries — it happens to everyone. Enter your email and
            we&apos;ll send you a secure link to get back in.
          </p>
          <ul className="space-y-4">
            {perks.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10 border-t border-white/20 pt-6">
          <p className="text-sm text-white/70 italic">
            &ldquo;Getting back in was seamless — reset link arrived in seconds.&rdquo;
          </p>
          <p className="text-xs text-white/50 mt-1">— James K., Student</p>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center mb-8">
            <Link href="/">
              <NasomaLogo size="sm" showText />
            </Link>
          </div>

          {submitted ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 bg-clip-text text-transparent">
                Check your inbox
              </h1>
              <p className="text-sm text-muted-foreground mb-2">
                We&apos;ve sent a password-reset link to
              </p>
              <p className="text-sm font-semibold text-foreground mb-6">{email}</p>
              <p className="text-xs text-muted-foreground mb-8">
                Didn&apos;t receive it? Check your spam folder, or{" "}
                <button
                  onClick={() => { setSubmitted(false); setEmail(""); }}
                  className="text-primary font-medium hover:underline"
                >
                  try another email
                </button>
                .
              </p>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-extrabold mb-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 bg-clip-text text-transparent">
                  Reset your password
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enter the email address linked to your account and we&apos;ll
                  send you a reset link.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 mb-6 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={isLoading}
                      className="pl-9"
                    />
                  </div>
                </div>

                <Button
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 shadow-md"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send Reset Link
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
