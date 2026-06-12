import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/app/components/Home/components/Header";
import Footer from "@/app/components/Home/components/Footer";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Find out how Me Nasoma uses cookies and similar technologies to operate and improve our AI-powered text-to-speech platform.",
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
  { id: "what-are-cookies", label: "What Are Cookies?" },
  { id: "types", label: "Types of Cookies We Use" },
  { id: "third-party", label: "Third-Party Cookies" },
  { id: "managing", label: "Managing Cookies" },
  { id: "do-not-track", label: "Do Not Track" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact Us" },
];

type CookieRow = {
  name: string;
  purpose: string;
  duration: string;
  type: "Essential" | "Functional" | "Analytics";
};

const cookieTable: CookieRow[] = [
  {
    name: "session_token",
    purpose: "Authenticates your session after login",
    duration: "Session (until you close the browser)",
    type: "Essential",
  },
  {
    name: "refresh_token",
    purpose: "Keeps you logged in across sessions",
    duration: "30 days",
    type: "Essential",
  },
  {
    name: "csrf_token",
    purpose: "Protects against cross-site request forgery attacks",
    duration: "Session",
    type: "Essential",
  },
  {
    name: "theme_preference",
    purpose: "Remembers your light/dark mode preference",
    duration: "1 year",
    type: "Functional",
  },
  {
    name: "playback_speed",
    purpose: "Remembers your preferred audio playback speed",
    duration: "1 year",
    type: "Functional",
  },
  {
    name: "_nasoma_analytics",
    purpose: "Tracks aggregate usage metrics to help us improve the Service",
    duration: "90 days",
    type: "Analytics",
  },
];

const typeBadgeClass: Record<CookieRow["type"], string> = {
  Essential:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Functional:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Analytics:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function CookiePolicy() {
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
              Cookie Policy
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

                {/* Cookie type legend */}
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    Legend
                  </p>
                  <div className="space-y-2">
                    {(["Essential", "Functional", "Analytics"] as CookieRow["type"][]).map((t) => (
                      <div key={t} className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${typeBadgeClass[t]}`}
                        >
                          {t}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <article className="flex-1 space-y-10">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This Cookie Policy explains how {COMPANY} (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
                &ldquo;our&rdquo;) uses cookies and similar technologies on {DOMAIN}
                (the &ldquo;Service&rdquo;). It should be read together with our{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>

              <Section id="what-are-cookies" title="1. What Are Cookies?">
                <p>
                  Cookies are small text files that a website stores in your browser when you visit
                  it. They are widely used to make websites work efficiently, to remember your
                  preferences, and to provide analytical information to site owners.
                </p>
                <p>
                  We also use <strong>localStorage</strong> and <strong>sessionStorage</strong>{" "}
                  (browser storage APIs) for similar purposes — for example, to cache your document
                  library so the app loads faster on repeat visits. These work like cookies but are
                  stored in your browser&rsquo;s local storage rather than being sent with every
                  HTTP request.
                </p>
              </Section>

              <Section id="types" title="2. Types of Cookies We Use">
                <p>
                  We use three categories of cookies. The table below lists each cookie, its
                  purpose, and how long it lasts.
                </p>

                <div className="space-y-4 mt-4">
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
                    <h3 className="font-semibold text-foreground mb-1 text-sm">
                      Essential Cookies
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Required for the Service to function. You cannot opt out of these without
                      affecting core functionality such as staying logged in.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                    <h3 className="font-semibold text-foreground mb-1 text-sm">
                      Functional Cookies
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Remember your preferences so you get a more personalised experience (e.g.,
                      theme and playback speed). Disabling these will reset preferences on each
                      visit.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                    <h3 className="font-semibold text-foreground mb-1 text-sm">
                      Analytics Cookies
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Help us understand how visitors use the Service so we can improve it. All
                      analytics data is aggregated and anonymised — we cannot identify you from
                      analytics data alone.
                    </p>
                  </div>
                </div>

                {/* Cookie table */}
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-secondary/50">
                        <th className="text-left px-3 py-2 border border-border font-semibold text-foreground">
                          Cookie name
                        </th>
                        <th className="text-left px-3 py-2 border border-border font-semibold text-foreground">
                          Purpose
                        </th>
                        <th className="text-left px-3 py-2 border border-border font-semibold text-foreground">
                          Duration
                        </th>
                        <th className="text-left px-3 py-2 border border-border font-semibold text-foreground">
                          Type
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cookieTable.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "" : "bg-secondary/20"}>
                          <td className="px-3 py-2 border border-border font-mono">
                            {row.name}
                          </td>
                          <td className="px-3 py-2 border border-border">{row.purpose}</td>
                          <td className="px-3 py-2 border border-border">{row.duration}</td>
                          <td className="px-3 py-2 border border-border">
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                typeBadgeClass[row.type]
                              }`}
                            >
                              {row.type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section id="third-party" title="3. Third-Party Cookies">
                <p>
                  Some features of the Service may use third-party services that set their own
                  cookies:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Payment processing:</strong> our payment provider may set cookies to
                    detect fraud and ensure secure transactions
                  </li>
                  <li>
                    <strong>Social sign-in:</strong> if you use Google or GitHub to sign in, those
                    providers may set cookies in accordance with their own privacy policies
                  </li>
                </ul>
                <p>
                  We do not control third-party cookies. Please refer to the respective
                  provider&rsquo;s cookie or privacy policy for more information.
                </p>
              </Section>

              <Section id="managing" title="4. Managing Cookies">
                <p>
                  You can control and manage cookies in the following ways:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Browser settings:</strong> most browsers allow you to block or delete
                    cookies via settings (usually under Privacy &amp; Security). Note that blocking
                    essential cookies will prevent you from logging in.
                  </li>
                  <li>
                    <strong>Account preferences:</strong> you can opt out of analytics cookies
                    from your account settings page (under Privacy).
                  </li>
                  <li>
                    <strong>Browser storage:</strong> you can clear localStorage and sessionStorage
                    via your browser&rsquo;s developer tools (Application &rarr; Storage).
                  </li>
                </ul>
                <p>
                  For more information on managing cookies in popular browsers, visit{" "}
                  <a
                    href="https://www.aboutcookies.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    aboutcookies.org
                  </a>
                  .
                </p>
              </Section>

              <Section id="do-not-track" title="5. Do Not Track">
                <p>
                  Some browsers offer a &ldquo;Do Not Track&rdquo; (DNT) setting that sends a
                  signal to websites requesting that your browsing not be tracked. The Service
                  currently does not respond to DNT signals because there is no consistent industry
                  standard for doing so. We will revisit this as standards evolve.
                </p>
              </Section>

              <Section id="changes" title="6. Changes to This Policy">
                <p>
                  We may update this Cookie Policy from time to time to reflect changes in
                  technology, regulation, or our practices. We will update the effective date at the
                  top of this page. For material changes we will also notify you via email or an
                  in-app notice.
                </p>
              </Section>

              <Section id="contact" title="7. Contact Us">
                <p>
                  If you have questions about our use of cookies, please contact us:
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
                <Link href="/privacy" className="hover:text-primary transition-colors">
                  Privacy Policy
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
