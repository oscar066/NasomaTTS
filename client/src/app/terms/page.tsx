import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/app/components/Home/components/Header";
import Footer from "@/app/components/Home/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the Terms of Service for Me Nasoma — the rules and conditions that govern your use of our AI-powered text-to-speech platform.",
};

const EFFECTIVE_DATE = "June 1, 2025";
const COMPANY = "Me Nasoma";
const DOMAIN = "me-nasoma.com";
const EMAIL = "legal@me-nasoma.com";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold text-foreground mb-4 pb-2 border-b border-border">
        {title}
      </h2>
      <div className="text-muted-foreground leading-relaxed space-y-3 text-sm">
        {children}
      </div>
    </section>
  );
}

const toc = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "description", label: "Description of Service" },
  { id: "accounts", label: "User Accounts" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "intellectual-property", label: "Intellectual Property" },
  { id: "content", label: "Your Content" },
  { id: "payment", label: "Payment & Subscriptions" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "limitation", label: "Limitation of Liability" },
  { id: "termination", label: "Termination" },
  { id: "changes", label: "Changes to Terms" },
  { id: "contact", label: "Contact Us" },
];

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-b from-secondary/30 to-background border-b border-border py-14">
          <div className="container mx-auto px-4 max-w-4xl">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-4 bg-primary/10 px-3 py-1.5 rounded-full">
              Legal
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Terms of Service
            </h1>
            <p className="text-muted-foreground text-sm">
              Effective date: <strong className="text-foreground">{EFFECTIVE_DATE}</strong>
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-4xl py-12">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Table of contents — sticky sidebar */}
            <aside className="lg:w-56 flex-shrink-0">
              <div className="sticky top-24 rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                  Contents
                </p>
                <nav className="space-y-1.5">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block text-xs text-muted-foreground hover:text-primary transition-colors py-0.5"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main content */}
            <article className="flex-1 space-y-10">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Welcome to {COMPANY}. These Terms of Service (&ldquo;Terms&rdquo;) govern your
                access to and use of {DOMAIN} and all related services (collectively, the
                &ldquo;Service&rdquo;). By creating an account or using the Service you agree to be
                bound by these Terms. If you do not agree, do not use the Service.
              </p>

              <Section id="acceptance" title="1. Acceptance of Terms">
                <p>
                  By accessing or using the Service you confirm that you are at least 16 years old
                  (or the age of digital consent in your jurisdiction, whichever is higher), that
                  you have read and understood these Terms, and that you have the legal capacity to
                  enter into a binding agreement.
                </p>
                <p>
                  If you are using the Service on behalf of an organisation, you represent and
                  warrant that you are authorised to bind that organisation to these Terms.
                </p>
              </Section>

              <Section id="description" title="2. Description of Service">
                <p>
                  {COMPANY} is a cloud-based, AI-powered text-to-speech (TTS) platform that
                  converts uploaded documents (PDF, text files, and other supported formats) into
                  natural-sounding audio. Features include:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Document upload and storage</li>
                  <li>AI-generated audio narration with multiple voice options</li>
                  <li>In-browser audio playback and word-level highlighting</li>
                  <li>Audio download (Pro and Enterprise plans)</li>
                  <li>Personal document library management</li>
                </ul>
                <p>
                  We reserve the right to modify, suspend, or discontinue any part of the Service
                  at any time with reasonable notice where possible.
                </p>
              </Section>

              <Section id="accounts" title="3. User Accounts">
                <p>
                  You must register for an account to use most features of the Service. You agree
                  to:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Provide accurate, current, and complete registration information</li>
                  <li>Keep your password secure and not share it with third parties</li>
                  <li>Notify us immediately at {EMAIL} if you suspect unauthorised access</li>
                  <li>
                    Take responsibility for all activity that occurs under your account
                  </li>
                </ul>
                <p>
                  We reserve the right to suspend or terminate accounts that provide false
                  information or violate these Terms.
                </p>
              </Section>

              <Section id="acceptable-use" title="4. Acceptable Use">
                <p>You agree not to use the Service to:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Upload, process, or distribute content that infringes the intellectual property
                    rights of others
                  </li>
                  <li>
                    Upload content that is unlawful, defamatory, harassing, abusive, fraudulent, or
                    obscene
                  </li>
                  <li>
                    Attempt to reverse-engineer, decompile, or derive source code from any part of
                    the Service
                  </li>
                  <li>
                    Circumvent rate limits, quotas, or any access controls
                  </li>
                  <li>
                    Use automated scripts or bots to access the Service without prior written
                    permission
                  </li>
                  <li>
                    Re-sell or sub-license access to the Service without our explicit consent
                  </li>
                  <li>
                    Introduce viruses, malware, or other harmful code
                  </li>
                </ul>
                <p>
                  Violations may result in immediate account suspension and, where appropriate,
                  referral to law enforcement.
                </p>
              </Section>

              <Section id="intellectual-property" title="5. Intellectual Property">
                <p>
                  The Service, including its interface, underlying models, branding, and generated
                  audio output from our AI engine, is owned by or licensed to {COMPANY} and is
                  protected by copyright, trademark, and other intellectual property laws.
                </p>
                <p>
                  We grant you a limited, non-exclusive, non-transferable, revocable licence to
                  access and use the Service solely for your personal or internal business purposes
                  in accordance with these Terms.
                </p>
                <p>
                  Nothing in these Terms transfers ownership of any {COMPANY} intellectual property
                  to you.
                </p>
              </Section>

              <Section id="content" title="6. Your Content">
                <p>
                  You retain ownership of all documents and other content you upload to the Service
                  (&ldquo;Your Content&rdquo;). By uploading content you grant {COMPANY} a
                  limited, non-exclusive, worldwide, royalty-free licence to store, process, and
                  convert Your Content solely for the purpose of providing the Service to you.
                </p>
                <p>
                  You represent and warrant that you have all necessary rights to upload Your
                  Content and that doing so does not infringe any third-party rights or applicable
                  law.
                </p>
                <p>
                  We do not claim ownership of Your Content and will not use it to train our AI
                  models without your explicit consent.
                </p>
              </Section>

              <Section id="payment" title="7. Payment &amp; Subscriptions">
                <p>
                  Certain features of the Service require a paid subscription. Prices are displayed
                  on our pricing page and are subject to change with 30 days&rsquo; notice.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Subscriptions are billed in advance on a monthly or annual basis depending on
                    the plan you select.
                  </li>
                  <li>
                    All fees are non-refundable except where required by applicable law or as
                    expressly stated in our refund policy.
                  </li>
                  <li>
                    If a payment fails, we may suspend your account until the outstanding amount is
                    settled.
                  </li>
                  <li>
                    You may cancel your subscription at any time; cancellation takes effect at the
                    end of the current billing period.
                  </li>
                </ul>
              </Section>

              <Section id="disclaimers" title="8. Disclaimers">
                <p>
                  THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo;
                  WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT
                  LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                  PURPOSE, OR NON-INFRINGEMENT.
                </p>
                <p>
                  We do not warrant that the Service will be uninterrupted, error-free, or free of
                  viruses or other harmful components. AI-generated audio may contain inaccuracies
                  and should not be relied upon as a substitute for the original source material in
                  professional or safety-critical contexts.
                </p>
              </Section>

              <Section id="limitation" title="9. Limitation of Liability">
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, {COMPANY.toUpperCase()} AND
                  ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY
                  INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS
                  OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF
                  DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF OR
                  INABILITY TO USE THE SERVICE.
                </p>
                <p>
                  IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU EXCEED THE GREATER OF (A) THE
                  AMOUNT YOU PAID TO US IN THE TWELVE MONTHS PRIOR TO THE CLAIM OR (B) USD $50.
                </p>
              </Section>

              <Section id="termination" title="10. Termination">
                <p>
                  You may delete your account at any time from your account settings. Upon deletion
                  your data will be removed in accordance with our{" "}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
                <p>
                  We may suspend or terminate your access to the Service at any time, with or
                  without cause and with or without notice, if we believe you have violated these
                  Terms or if we are required to do so by law.
                </p>
                <p>
                  Sections 5, 6, 8, 9, and any other provisions that by their nature should
                  survive, will survive termination of these Terms.
                </p>
              </Section>

              <Section id="changes" title="11. Changes to Terms">
                <p>
                  We may update these Terms from time to time. When we do, we will revise the
                  effective date at the top of this page and, for material changes, notify you via
                  email or an in-app notification. Your continued use of the Service after the
                  effective date of the revised Terms constitutes your acceptance of those changes.
                </p>
              </Section>

              <Section id="contact" title="12. Contact Us">
                <p>
                  If you have questions or concerns about these Terms, please contact us at:
                </p>
                <div className="mt-2 p-4 rounded-lg bg-secondary/40 border border-border text-sm">
                  <p className="font-semibold text-foreground">{COMPANY}</p>
                  <p>
                    Email:{" "}
                    <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">
                      {EMAIL}
                    </a>
                  </p>
                  <p>Website: {DOMAIN}</p>
                </div>
              </Section>

              <div className="pt-6 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
                <Link href="/privacy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/cookies" className="hover:text-primary transition-colors">
                  Cookie Policy
                </Link>
                <Link href="/" className="hover:text-primary transition-colors">
                  Back to Home
                </Link>
              </div>
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
