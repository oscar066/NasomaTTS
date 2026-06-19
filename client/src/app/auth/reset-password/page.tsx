"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Lock, CheckCircle2, ShieldCheck, KeyRound, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import NasomaLogo from "@/app/components/Logo/nasoma-logo";
import { authApi } from "@/lib/api";

const perks = [
  { icon: ShieldCheck, text: "Your new password is encrypted" },
  { icon: Lock,        text: "Previous sessions will be signed out" },
  { icon: KeyRound,    text: "Reset link is single-use" },
];

function ResetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) { setError("Please enter a new password."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (!token) { setError("Invalid or missing reset token. Please request a new link."); return; }

    setError(null);
    setIsLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed. The link may have expired.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex">

      {/* ── Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary to-purple-700 flex-col justify-between p-12 text-white overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-300/10 rounded-full blur-3xl" />

        <Link href="/" className="relative z-10">
          <NasomaLogo size="md" variant="onDark" showText />
        </Link>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-4 leading-snug">
            Choose a new<br />password
          </h2>
          <p className="text-white/80 mb-8 leading-relaxed">
            Pick something strong and memorable. We&apos;ll sign you in
            automatically once you&apos;re done.
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

        <div className="relative z-10 border-t border-white/20 pt-6">
          <p className="text-sm text-white/70 italic">
            &ldquo;Reset in under a minute. Back to reading without the hassle.&rdquo;
          </p>
          <p className="text-xs text-white/50 mt-1">Amara T., Nasoma user</p>
        </div>
      </div>

      {/* ── Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-md">

          <div className="flex lg:hidden justify-center mb-8">
            <Link href="/">
              <NasomaLogo size="sm" showText />
            </Link>
          </div>

          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 bg-clip-text text-transparent">
                Password updated!
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                Your password has been changed. Redirecting you to sign in&hellip;
              </p>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-extrabold mb-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 bg-clip-text text-transparent">
                  Set a new password
                </h1>
                <p className="text-sm text-muted-foreground">
                  Must be at least 8 characters.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 mb-6 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      disabled={isLoading}
                      className="pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="confirm"
                      type={showPw ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
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
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  Update password
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
