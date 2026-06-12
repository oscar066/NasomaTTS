import type { Metadata } from "next";
import Home from "./components/Home/Home";

export const metadata: Metadata = {
  title: "Me Nasoma — Turn Any Document Into Audio",
  description:
    "Upload any PDF or document and listen to it in natural, lifelike audio. Perfect for commuters, students, and anyone who wants to learn on the go.",
};

export default function HomePage() {
  return (
    <div className="pt-0">
      <Home />
    </div>
  );
}
