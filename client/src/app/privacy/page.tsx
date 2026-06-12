import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/app/components/Home/components/Header";
import Footer from "@/app/components/Home/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Me Nasoma collects, uses, and protects your personal data when you use our AI-powered text-to-speech platform.",
};

const EFFECTIVE_DATE = "June 1, 2025";
const COMPANY = "Me Nasoma";
const DOMAIN = "me-nasoma.com";
const EMAIL = "privacy@me-nasoma.com";

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
  { id: "overview", label: "Overview" },
  { id: "data-collected", label: "Data We Collect" },
  { id: "how-we-use", label: "How We Use Your Data" },
  { id: "sharing", label: "Data Sharing" },
  { id: "retention", label: "Data Retention" },
  { id: "security", label: "Security" },
  { id: "cookies", label: "Cookies" },
  { id: "your-rights", label: "Your Rights" },
  { id: "children", label: "Children's Privacy" },
  { id: "international", label: "International Transfers" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact Us" },
];

export default function PrivacyPolicy() {
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
              Privacy Policy
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
                At {COMPANY} we take your privacy seriously. This Privacy Policy explains what
                personal data we collect when you use {DOMAIN} (&ldquo;Service&rdquo;), why we
                collect it, how we use it, and the choices you have. Please read it carefully
                alongside our{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>
                .
              </p>

              <Section id="overview" title="1. Overview">
                <p>
                  {COMPANY} is the data controller for personal data processed in connection with
                  the Service. We collect only the data we need to operate and improve the Service,
                  and we never sell your personal data to third parties.
                </p>
              </Section>

              <Section id="data-collected" title="2. Data We Collect">
                <p>We collect data in three ways:</p>

                <h3 className="font-semibold text-foreground pt-2">Data you provide directly</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Account information:</strong> email address, display name, and password
                    (stored as a secure hash) when you register
                  </li>
                  <li>
                    <strong>Documents:</strong> PDF and text files you upload to be converted to
                    audio
                  </li>
                  <li>
                    <strong>Payment information:</strong> billing details processed by our payment
                    provider (we do not store raw card numbers)
                  </li>
                  <li>
                    <strong>Communications:</strong> messages you send us via email or support
                    channels
                  </li>
                </ul>

                <h3 className="font-semibold text-foreground pt-2">Data collected automatically</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Usage data:</strong> pages visited, features used, audio playback
                    events, document reading progress
                  </li>
                  <li>
                    <strong>Device and browser data:</strong> IP address, browser type and version,
                    operating system, screen resolution
                  </li>
                  <li>
                    <strong>Log data:</strong> access timestamps, error logs, and performance
                    metrics
                  </li>
                  <li>
                    <strong>Cookies and similar technologies:</strong> see our{" "}
                    <Link href="/cookies" className="text-primary hover:underline">
                      Cookie Policy
                    </Link>
                  </li>
                </ul>

                <h3 className="font-semibold text-foreground pt-2">Data from third parties</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    If you sign in with a social provider (Google, GitHub, etc.), we receive your
                    name, email, and profile picture from that provider
                  </li>
                </ul>
              </Section>

              <Section id="how-we-use" title="3. How We Use Your Data">
                <p>We process your data for the following purposes and legal bases:</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse mt-2">
                    <thead>
                      <tr className="bg-secondary/50">
                        <th className="text-left px-3 py-2 border border-border font-semibold text-foreground">
                          Purpose
                        </th>
                        <th className="text-left px-3 py-2 border border-border font-semibold text-foreground">
                          Legal basis
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Providing and maintaining the Service", "Contract performance"],
                        ["Processing payments and managing subscriptions", "Contract performance"],
                        ["Authenticating your identity", "Contract performance"],
                        ["Sending transactional emails (receipts, password resets)", "Contract performance"],
                        ["Improving and personalising the Service", "Legitimate interest"],
                        ["Detecting fraud and ensuring security", "Legitimate interest"],
                        ["Complying with legal obligations", "Legal obligation"],
                        ["Sending product updates and marketing emails (opt-in only)", "Consent"],
                      ].map(([purpose, basis], i) => (
                        <tr key={i} className={i % 2 === 0 ? "" : "bg-secondary/20"}>
                          <td className="px-3 py-2 border border-border">{purpose}</td>
                          <td className="px-3 py-2 border border-border">{basis}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section id="sharing" title="4. Data Sharing">
                <p>
                  We do not sell, rent, or trade your personal data. We may share data with:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Service providers:</strong> cloud infrastructure (storage, compute),
                    payment processors, email delivery services — strictly to provide the Service
                  </li>
                  <li>
                    <strong>Analytics providers:</strong> aggregated, anonymised usage data to help
                    us understand how the Service is used
                  </li>
                  <li>
                    <strong>Law enforcement / legal process:</strong> where required by law, court
                    order, or to protect the rights and safety of our users or the public
                  </li>
                  <li>
                    <strong>Business transfers:</strong> in the event of a merger, acquisition, or
                    sale of assets, your data may be transferred as part of that transaction. We
                    will notify you before your data is subject to a different privacy policy.
                  </li>
                </ul>
              </Section>

              <Section id="retention" title="5. Data Retention">
                <p>
                  We retain your personal data for as long as your account is active or as
                  necessary to provide the Service. Specific retention periods:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Account data:</strong> retained until you delete your account, then
                    purged within 30 days
                  </li>
                  <li>
                    <strong>Uploaded documents and generated audio:</strong> deleted when you
                    remove them from your library, or within 30 days of account deletion
                  </li>
                  <li>
                    <strong>Payment records:</strong> retained for 7 years for tax and legal
                    compliance
                  </li>
                  <li>
                    <strong>Server logs:</strong> retained for up to 90 days, then deleted
                  </li>
                </ul>
              </Section>

              <Section id="security" title="6. Security">
                <p>
                  We implement industry-standard security measures to protect your data, including:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>TLS/HTTPS encryption for all data in transit</li>
                  <li>AES-256 encryption for documents and audio files at rest</li>
                  <li>Bcrypt password hashing — we never store passwords in plain text</li>
                  <li>
                    Role-based access controls so only authorised personnel can access user data
                  </li>
                  <li>Regular security reviews and dependency updates</li>
                </ul>
                <p>
                  No method of transmission or storage is 100% secure. If you discover a security
                  vulnerability, please report it to{" "}
                  <a href="mailto:security@me-nasoma.com" className="text-primary hover:underline">
                    security@me-nasoma.com
                  </a>
                  .
                </p>
              </Section>

              <Section id="cookies" title="7. Cookies">
                <p>
                  We use cookies and similar technologies to operate the Service, remember your
                  preferences, and analyse usage. For full details see our{" "}
                  <Link href="/cookies" className="text-primary hover:underline">
                    Cookie Policy
                  </Link>
                  .
                </p>
              </Section>

              <Section id="your-rights" title="8. Your Rights">
                <p>
                  Depending on your location you may have the following rights regarding your
                  personal data:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Access:</strong> request a copy of the personal data we hold about you
                  </li>
                  <li>
                    <strong>Rectification:</strong> ask us to correct inaccurate data
                  </li>
                  <li>
                    <strong>Erasure:</strong> request deletion of your data (subject to legal
                    retention requirements)
                  </li>
                  <li>
                    <strong>Portability:</strong> receive your data in a structured, machine-readable
                    format
                  </li>
                  <li>
                    <strong>Restriction:</strong> ask us to limit how we process your data in
                    certain circumstances
                  </li>
                  <li>
                    <strong>Objection:</strong> object to processing based on legitimate interest
                  </li>
                  <li>
                    <strong>Withdraw consent:</strong> where processing is based on consent, you
                    may withdraw it at any time
                  </li>
                </ul>
                <p>
                  To exercise any of these rights, email us at{" "}
                  <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">
                    {EMAIL}
                  </a>
                  . We will respond within 30 days.
                </p>
                <p>
                  You also have the right to lodge a complaint with your local data protection
                  authority.
                </p>
              </Section>

              <Section id="children" title="9. Children's Privacy">
                <p>
                  The Service is not directed to children under 16. We do not knowingly collect
                  personal data from children under 16. If you believe we have inadvertently
                  collected such data, please contact us immediately at{" "}
                  <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">
                    {EMAIL}
                  </a>{" "}
                  and we will delete it promptly.
                </p>
              </Section>

              <Section id="international" title="10. International Transfers">
                <p>
                  Your data may be processed and stored in countries outside your own. Where we
                  transfer data internationally, we ensure appropriate safeguards are in place
                  (such as Standard Contractual Clauses or equivalent mechanisms) to protect your
                  data in accordance with this policy and applicable law.
                </p>
              </Section>

              <Section id="changes" title="11. Changes to This Policy">
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of
                  material changes via email or an in-app notice at least 14 days before they take
                  effect. The &ldquo;effective date&rdquo; at the top of this page will always
                  reflect the most recent revision.
                </p>
              </Section>

              <Section id="contact" title="12. Contact Us">
                <p>
                  For privacy-related questions, data requests, or complaints, please contact our
                  privacy team:
                </p>
                <div className="mt-2 p-4 rounded-lg bg-secondary/40 border border-border text-sm">
                  <p className="font-semibold text-foreground">{COMPANY} — Privacy Team</p>
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
                <Link href="/terms" className="hover:text-primary transition-colors">
                  Terms of Service
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
