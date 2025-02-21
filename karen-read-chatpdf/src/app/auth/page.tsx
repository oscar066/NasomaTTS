import { redirect } from "next/navigation";

export default function AuthPage() {
  redirect("/auth/login"); // Redirects to login page by default
  return null;
}