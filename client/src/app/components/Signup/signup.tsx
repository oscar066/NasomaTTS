"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UserPlus, AlertCircle, Sparkles, Brain, Bot, Globe } from "lucide-react";
import Link from "next/link";
import NasomaLogo from "@/app/components/Logo/nasoma-logo";
import { BsEyeFill, BsEyeSlashFill } from "react-icons/bs";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { authApi } from "@/lib/api";

const perks = [
  { icon: Sparkles, text: "Free to start, no credit card needed" },
  { icon: Brain,    text: "AI that reads and understands with you" },
  { icon: Bot,      text: "Chat, Summary, Quiz and Recap tools" },
  { icon: Globe,    text: "40+ voices across 100+ languages" },
];

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [username, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      router.push("/dashboard");
    }
  }, [router, session]);

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (!username || !email || !password || !confirmPassword) {
      setErrorMessage("All fields are required.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setIsLoading(false);
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!termsAccepted) {
      setErrorMessage("You must agree to the terms and conditions.");
      setIsLoading(false);
      return;
    }

    try {
      await authApi.signup({ username, email, password });

      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      if (result?.error) {
        setErrorMessage(result.error);
        return;
      }

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setTermsAccepted(false);
    } catch (error) {
      console.error("Registration failed:", error);
      setErrorMessage("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="min-h-screen w-full flex">
      {/* Left panel — branding */}
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
            Read more.<br />Retain what matters.
          </h2>
          <p className="text-white/80 mb-8 leading-relaxed">
            Join readers who concentrate better, understand more,
            and actually get through their reading list.
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
            &ldquo;I read three times more since I started using Me Nasoma. The focus is real.&rdquo;
          </p>
          <p className="text-xs text-white/50 mt-1">Emma R., Research Scientist</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-background overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center mb-8">
            <Link href="/">
              <NasomaLogo size="sm" showText />
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold mb-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 bg-clip-text text-transparent">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground">Your reading journey starts here.</p>
          </div>

          {/* Error alert */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 mb-6 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {errorMessage}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setName(e.target.value)}
                placeholder="johndoe"
                type="text"
                autoCapitalize="words"
                autoComplete="username"
                autoCorrect="off"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  autoCorrect="off"
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <BsEyeFill className="h-4 w-4" /> : <BsEyeSlashFill className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  type={showConfirmPassword ? "text" : "password"}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  autoCorrect="off"
                  disabled={isLoading}
                  className={`pr-10 ${passwordMismatch ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <BsEyeFill className="h-4 w-4" /> : <BsEyeSlashFill className="h-4 w-4" />}
                </button>
              </div>
              {passwordMismatch && (
                <p className="text-xs text-destructive">Passwords do not match.</p>
              )}
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                I agree to the{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 shadow-md mt-2"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Create Account
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
