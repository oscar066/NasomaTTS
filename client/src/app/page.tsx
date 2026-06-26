import type { Metadata } from "next";
import Home from "./components/Home/Home";

export const metadata: Metadata = {
  title: "Me Nasoma",
  description:
    "Read deeper, understand more. Sync audio and visual highlighting to stay focused, explore classic literature, and track your reading with the community.",
};

export default function HomePage() {
  return (
    <div className="pt-0">
      <Home />
    </div>
  );
}
