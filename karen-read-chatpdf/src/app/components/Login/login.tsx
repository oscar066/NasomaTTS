"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Loader2, UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaGoogle } from "react-icons/fa";
import { BsEyeFill, BsEyeSlashFill } from "react-icons/bs";
// import { useToast } from "@/hooks/use-toast";
// import { ToastAction } from "@/components/ui/toast";
import { Toaster } from "@/components/ui/sonner";
// import { useAuth } from "../../../app/contexts/AuthContext";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  // const { toast } = useToast();
  const router = useRouter();
  // const { dispatch } = useAuth();

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await axios.post(
        "http://localhost:8000/api/accounts/auth/login/",
        {
          email,
          password,
        }
      );

      // Store token and user info in localStorage
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("userEmail", email);
      localStorage.setItem("isAdmin", response.data.isAdmin ? "true" : "false");

      // Update global auth state
    //   dispatch({
    //     type: "LOGIN",
    //     payload: { email, isAdmin: response.data.isAdmin },
    //   });

    //   toast({
    //     title: "Login Successful",
    //     description: "Welcome back! You've successfully logged in.",
    //     className: "text-green-700",
    //   });

      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error) {
      console.error("Login failed:", error);
      setErrorMessage("Login failed. Please check your email and password.");
    //   toast({
    //     title: "Login Failed",
    //     description: "Please check your email and password.",
    //     variant: "destructive",
    //     action: <ToastAction altText="Try again">Try again</ToastAction>,
    //   });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-green-50">
      <div className="w-full max-w-md px-4 py-8">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="flex flex-col space-y-2 text-center mb-6">
            <UserCircle2 className="mx-auto h-12 w-12 text-green-700" />
            <h1 className="text-2xl font-semibold tracking-tight text-green-700">
              Welcome to NJOKARU
            </h1>
            <p className="text-sm text-green-600">
              Enter your email to sign in to your account
            </p>
          </div>
          {errorMessage && (
            <p className="text-red-700 text-center mb-4">{errorMessage}</p>
          )}
          <div className="grid gap-6">
            <form onSubmit={onSubmit}>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label className="sr-only text-green-800" htmlFor="email">
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
                    className="border-green-300 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                <div className="grid gap-1 relative">
                  <Label className="sr-only text-green-800" htmlFor="password">
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
                    className="border-green-300 focus:border-green-500 focus:ring-green-500 pr-10"
                  />
                  <div
                    className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <BsEyeFill className="text-green-600" />
                    ) : (
                      <BsEyeSlashFill className="text-green-600" />
                    )}
                  </div>
                </div>
                <Button
                  disabled={isLoading}
                  className="bg-green-700 hover:bg-green-800 text-white"
                >
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
                <span className="w-full border-t border-green-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-green-600">
                  Or continue with
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              type="button"
              disabled={isLoading}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FaGoogle className="mr-2 h-4 w-4" />
              )}
              Google
            </Button>
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm text-green-600">
              <Link
                href="/auth/forget-password"
                className="hover:text-green-800 underline underline-offset-4"
              >
                Forgot your password?
              </Link>
            </p>
            <p className="mt-2 text-sm text-green-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/signup"
                className="hover:text-green-800 underline underline-offset-4"
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