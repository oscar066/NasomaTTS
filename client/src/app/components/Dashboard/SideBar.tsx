"use client";

import React, { useRef } from "react";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Settings,
  HelpCircle,
  Loader2,
  Zap,
} from "lucide-react";
import NasomaLogo from "../Logo/nasoma-logo";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: FileText, label: "All Documents", href: "/dashboard" },
];

const bottomNavItems: NavItem[] = [
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: HelpCircle, label: "Help & Support", href: "/help" },
];

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadDocument, isLoading } = useDocumentUpload();
  const router = useRouter();
  const pathname = usePathname();

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Invalid file type", { description: "Please upload a PDF file." });
      event.target.value = "";
      return;
    }

    try {
      const result = await uploadDocument(file);
      toast.success("Document uploaded", {
        description: `${file.name} has been processed and saved.`,
      });
      if (result?.id) router.push(`/documents/${result.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during upload.";
      toast.error("Upload failed", { description: msg });
    } finally {
      event.target.value = "";
    }
  };

  return (
    <aside
      className={`
        flex flex-col bg-muted border-r border-border
        transition-all duration-300 overflow-hidden flex-shrink-0
        ${isOpen ? "w-64" : "w-16"}
      `}
    >
      {/* Logo — matches TopBar height exactly (h-14) */}
      <div className={`h-14 flex items-center border-b border-border flex-shrink-0 ${isOpen ? "px-4" : "justify-center"}`}>
        {isOpen ? (
          <NasomaLogo size="md" showText />
        ) : (
          <NasomaLogo size="sm" />
        )}
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
        {isOpen && (
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-1">
            Library
          </p>
        )}

        {navItems.map(({ icon: Icon, label, href }) => {
          const active = pathname === href;
          return (
            <button
              key={label}
              onClick={() => router.push(href)}
              title={!isOpen ? label : undefined}
              className={`
                flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors w-full text-left
                ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}
                ${!isOpen ? "justify-center" : ""}
              `}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {isOpen && <span>{label}</span>}
            </button>
          );
        })}

        {/* Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="application/pdf"
        />
        <button
          onClick={handleUploadClick}
          disabled={isLoading}
          title={!isOpen ? "Upload PDF" : undefined}
          className={`
            flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors w-full mt-2
            bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white
            disabled:opacity-60
            ${!isOpen ? "justify-center" : ""}
          `}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 flex-shrink-0" />
          )}
          {isOpen && <span>{isLoading ? "Uploading…" : "Upload PDF"}</span>}
        </button>
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-border space-y-1">
        {isOpen ? (
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Free Plan</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              Upgrade for more voices &amp; unlimited documents.
            </p>
            <button className="w-full text-xs font-semibold bg-gradient-to-r from-primary to-purple-600 text-white py-1.5 rounded-md hover:opacity-90 transition-opacity">
              Upgrade
            </button>
          </div>
        ) : (
          <button
            className="flex justify-center w-full py-2 text-muted-foreground hover:text-primary transition-colors"
            title="Upgrade"
          >
            <Zap className="h-4 w-4" />
          </button>
        )}

        {bottomNavItems.map(({ icon: Icon, label, href }) => (
          <button
            key={label}
            onClick={() => router.push(href)}
            title={!isOpen ? label : undefined}
            className={`
              flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors w-full text-left
              text-muted-foreground hover:bg-secondary hover:text-foreground
              ${!isOpen ? "justify-center" : ""}
            `}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {isOpen && <span>{label}</span>}
          </button>
        ))}
      </div>
    </aside>
  );
}
