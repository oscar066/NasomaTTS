import type { Metadata } from "next";
import SignupPage from "../../components/Signup/signup";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your free Me Nasoma account and start listening to your documents in minutes.",
};

export default function Signup() {
  return (
    <div className="flex min-h-screen bg-white">
      <SignupPage />
    </div>
  );
}