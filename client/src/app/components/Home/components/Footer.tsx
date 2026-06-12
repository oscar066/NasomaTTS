"use client";

import Link from "next/link";
import { Twitter, Linkedin, Github, Mail } from "lucide-react";
import NasomaLogo from "@/app/components/Logo/nasoma-logo";

const YEAR = new Date().getFullYear();

const productLinks = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#features", label: "Features" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#pricing", label: "Pricing" },
];

const accountLinks = [
  { href: "/auth/signup", label: "Sign Up" },
  { href: "/auth/login", label: "Log In" },
  { href: "/dashboard", label: "Dashboard" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/cookies", label: "Cookie Policy" },
];

export default function Footer() {
  return (
    <footer className="bg-background border-t border-primary/10 pt-14 pb-8">
      <div className="container mx-auto px-4">
        {/* Top row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-flex mb-4">
              <NasomaLogo size="sm" showText />
            </Link>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              AI-powered text-to-speech that turns any document into natural,
              lifelike audio — anytime, anywhere.
            </p>
            <div className="flex gap-3">
              {[
                { icon: Twitter, label: "Twitter" },
                { icon: Linkedin, label: "LinkedIn" },
                { icon: Github, label: "GitHub" },
                { icon: Mail, label: "Email" },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-8 h-8 rounded-md flex items-center justify-center bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-foreground">Product</h4>
            <ul className="space-y-2.5">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account links */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-foreground">Account</h4>
            <ul className="space-y-2.5">
              {accountLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-foreground">Stay in the loop</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Get product updates and TTS news — no spam.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                className="bg-primary text-white text-sm px-4 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {YEAR} Me Nasoma. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 justify-center">
            {legalLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
