"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail, CheckCircle2, XCircle, ShieldCheck, Clock, KeyRound } from "lucide-react";
import Link from "next/link";
import NasomaLogo from "@/app/components/Logo/nasoma-logo";
import { authApi } from "@/lib/api";

const perks = [
  { icon: ShieldCheck, text: "Confirms you own this email" },
  { icon: Clock,       text: "Keeps your account secure" },
  { icon: KeyRound,    text: "Unlocks all Nasoma features" },
];

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const [status,    setStatus]    = useState<"verifying" | "success" | "error" | "resend">(
    token ? "verifying" : "resend"
  );
  const [resendEmail,  setResendEmail]  = useState("");
  const [resendSent,   setResendSent]   = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState("The verification link is invalid or has expired.");

  useEffect(() => {
    if (!token) return;
    authApi.verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : "Verification failed.");
        setStatus("error");
      });
  }, [token]);

  async function onResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail) return;
    setResendLoading(true);
    try {
      await authApi.requestVerification(resendEmail);
    } catch {
      // swallow — don't leak whether the email exists
    }
    setResendLoading(false);
    setResendSent(true);
  }

  return (
    <div className="min-h-screen w-full flex">

      {/* ── Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary to-purple-700 flex-col justify-between p-12 text-white overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-300/10 rounded-full blur-3xl" />

        <Link href="/" className="relative z-10">
          <NasomaLogo size="md" variant="onDark" showText />
        </Link>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-4 leading-snug">
            Verify your<br />email address
          </h2>
          <p className="text-white/80 mb-8 leading-relaxed">
            One quick step to confirm it&apos;s really you — then you&apos;re
            all set to start reading.
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
            &ldquo;Verified in seconds — loved how smooth the onboarding was.&rdquo;
          </p>
          <p className="text-xs text-white/50 mt-1">— Priya M., Nasoma user</p>
        </div>
      </div>

      {/* ── Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-md">

          <div className="flex lg:hidden justify-center mb-8">
            <Link href="/">
              <NasomaLogo size="sm" showText />
            </Link>
          </div>

          {/* ── Verifying spinner ── */}
          {status === "verifying" && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-5" />
              <h1 className="text-2xl font-bold mb-2">Verifying your email&hellip;</h1>
              <p className="text-sm text-muted-foreground">Just a moment.</p>
            </div>
          )}

          {/* ── Success ── */}
          {status === "success" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 bg-clip-text text-transparent">
                Email verified!
              </h1>
              <p className="text-sm text-muted-foreground mb-8">
                Your account is now active. You can sign in and start reading.
              </p>
              <Link href="/auth/login">
                <Button className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 shadow-md">
                  Go to Sign In
                </Button>
              </Link>
            </div>
          )}

          {/* ── Error ── */}
          {status === "error" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Link expired</h1>
              <p className="text-sm text-muted-foreground mb-8">{errorMsg}</p>
              <Button variant="outline" className="w-full mb-4" onClick={() => setStatus("resend")}>
                <Mail className="h-4 w-4 mr-2" />
                Resend verification email
              </Button>
              <Link href="/auth/login">
                <Button variant="ghost" className="w-full text-muted-foreground">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          )}

          {/* ── Resend form ── */}
          {status === "resend" && (
            <>
              {resendSent ? (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 bg-clip-text text-transparent">
                    Check your inbox
                  </h1>
                  <p className="text-sm text-muted-foreground mb-2">
                    If that email has an account, a new verification link is on its way.
                  </p>
                  <p className="text-xs text-muted-foreground mb-8">
                    Check your spam folder if it doesn&apos;t appear within a minute.
                  </p>
                  <Link href="/auth/login">
                    <Button variant="outline" className="w-full">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h1 className="text-2xl font-extrabold mb-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 bg-clip-text text-transparent">
                      Verify your email
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Enter your email address and we&apos;ll send you a new verification link.
                    </p>
                  </div>

                  <form onSubmit={onResend} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="email"
                          type="email"
                          value={resendEmail}
                          onChange={(e) => setResendEmail(e.target.value)}
                          placeholder="you@example.com"
                          autoComplete="email"
                          disabled={resendLoading}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <Button
                      disabled={resendLoading}
                      className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 shadow-md"
                    >
                      {resendLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      Send verification link
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
