import type { Metadata } from "next";
import LoginPage from "../../components/Login/login";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Me Nasoma account and pick up right where you left off.",
};

export default function Login() {
  return (
    <div className="flex min-h-screen bg-white">
      <LoginPage />
    </div>
  );
}