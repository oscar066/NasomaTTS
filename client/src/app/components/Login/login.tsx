"use client";

import React, { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Loader2 } from "lucide-react";
import Link from "next/link";
import { FaGoogle } from "react-icons/fa";
import { BsEyeFill, BsEyeSlashFill } from "react-icons/bs";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
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

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

     // console.log("Sign in result:", result);     
    } catch (error) {
      console.error("Login failed:", error);
      setErrorMessage("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-background to-secondary">
      <div className="w-full max-w-md px-4 py-8">
        <div className="bg-card p-8 rounded-lg shadow-md">
          <div className="flex flex-col space-y-2 text-center mb-6">
            <Link
              href="/"
              className="flex items-center justify-center space-x-2"
            >
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7 text-primary group-hover:scale-110 transition-transform duration-300"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Nasoma
              </span>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to sign in to your account
            </p>
          </div>
          {errorMessage && (
            <p className="text-destructive text-center mb-4">{errorMessage}</p>
          )}
          <div className="grid gap-6">
            <form onSubmit={onSubmit}>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label className="sr-only" htmlFor="email">
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-1 relative">
                  <Label className="sr-only" htmlFor="password">
                    Password
                  </Label>
                  <Input
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    type={showPassword ? "text" : "password"}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    autoCorrect="off"
                    disabled={isLoading}
                  />
                  <div
                    className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <BsEyeFill className="text-muted-foreground" />
                    ) : (
                      <BsEyeSlashFill className="text-muted-foreground" />
                    )}
                  </div>
                </div>
                <Button disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  Sign In
                </Button>
              </div>
            </form>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <Button variant="outline" type="button" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FaGoogle className="mr-2 h-4 w-4" />
              )}
              Google
            </Button>
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              <Link
                href="/auth/forget-password"
                className="hover:text-primary underline underline-offset-4"
              >
                Forgot your password?
              </Link>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/signup"
                className="hover:text-primary underline underline-offset-4"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
