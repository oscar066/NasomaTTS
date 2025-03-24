"use client";

// Header Component
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, Headphones, BookOpen } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-primary/10 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 group">
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
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Nasoma
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6">
          <Link
            href="#features"
            className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/5"
          >
            <BookOpen className="h-4 w-4" />
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/5"
          >
            Pricing
          </Link>
          <Link
            href="#testimonials"
            className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/5"
          >
            <Headphones className="h-4 w-4" />
            Listen
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="hidden md:inline-block text-sm font-medium hover:text-primary"
          >
            Log in
          </Link>
          <Link href="/auth/signup/" passHref>
            <Button className="shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700">
              Start Reading
            </Button>
          </Link>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden py-4 px-4 bg-background border-b border-primary/10 animate-in slide-in-from-top">
          <nav className="flex flex-col space-y-4">
            <Link
              href="#features"
              className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2 p-2 rounded-md hover:bg-primary/5"
              onClick={() => setMobileMenuOpen(false)}
            >
              <BookOpen className="h-4 w-4" />
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2 p-2 rounded-md hover:bg-primary/5"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="#testimonials"
              className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2 p-2 rounded-md hover:bg-primary/5"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Headphones className="h-4 w-4" />
              Listen
            </Link>
            <Link
              href="/auth/login"
              className="text-sm font-medium hover:text-primary p-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Log in
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
