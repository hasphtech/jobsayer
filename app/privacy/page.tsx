"use client";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)", fontFamily: "inherit" }}>
      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(15,17,23,.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        height: 56, display: "flex", alignItems: "center", padding: "0 24px", gap: 12,
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="jobSayer" style={{ width: 26, height: 26, borderRadius: 6, objectFit: "cover" }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)" }}>
            job<span style={{ color: "var(--accent)" }}>Sayer</span>
          </span>
        </Link>
        <div style={{ flex: 1 }} />
        <Link href="/" style={{ fontSize: 13, color: "var(--text3)", textDecoration: "none" }}>← Back to Home</Link>
      </nav>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>Privacy Policy</h1>
        <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 40 }}>Last updated: 1 June 2026 · GDPR · CCPA · IT Act compliant</p>

        <Section title="1. Who We Are">
          JobSayer Technologies Pvt. Ltd. ("JobSayer", "we", "us") operates the JobSayer platform.
          We are committed to protecting your personal data. Data Controller: JobSayer Technologies Pvt. Ltd.,
          Bangalore, India. DPO contact:{" "}
          <a href="mailto:privacy@jobsayer.com" style={{ color: "var(--accent)" }}>privacy@jobsayer.com</a>.
        </Section>

        <Section title="2. Information We Collect">
          <strong style={{ color: "var(--text1)" }}>Account information:</strong> Email, name, profile
          photo (Google/LinkedIn OAuth), IP address, country (detected at login for currency and
          compliance purposes).
          <br /><br />
          <strong style={{ color: "var(--text1)" }}>Resume and career data:</strong> Work history,
          education, skills, certifications, salary expectations, and other professional information
          you enter. This is the core of our Service.
          <br /><br />
          <strong style={{ color: "var(--text1)" }}>BGV documents:</strong> Identity documents,
          certificates, and other materials you submit for background verification. These are treated
          as sensitive personal data with additional protections.
          <br /><br />
          <strong style={{ color: "var(--text1)" }}>Usage analytics:</strong> Pages visited, features
          used, session duration, and interaction events (via Posthog, configured without cross-site
          tracking). No advertising profiles are built.
          <br /><br />
          <strong style={{ color: "var(--text1)" }}>Payment metadata:</strong> Plan type, currency,
          and billing dates. Card details are never stored — processed entirely by Razorpay/Stripe.
        </Section>

        <Section title="3. How We Use Your Information">
          Legal basis (GDPR Article 6): contract performance, legitimate interest, consent where required.
          <ul style={{ marginTop: 10, paddingLeft: 20, lineHeight: 2 }}>
            <li>Provide, personalise, and improve the Service</li>
            <li>Power AI features — your content is sent to Groq AI for processing only; Groq does not retain data per their DPA</li>
            <li>Manage subscriptions and process payments</li>
            <li>Send transactional emails (OTP, receipts, account alerts)</li>
            <li>Maintain security audit logs for enterprise account compliance</li>
            <li>Detect and prevent fraud and abuse</li>
            <li>Comply with legal obligations (tax, law enforcement requests)</li>
          </ul>
        </Section>

        <Section title="4. Data Sharing">
          We do <strong style={{ color: "var(--text1)" }}>not sell</strong> your personal data. Sub-processors:
          <ul style={{ marginTop: 10, paddingLeft: 20, lineHeight: 2 }}>
            <li><strong style={{ color: "var(--text1)" }}>Supabase</strong> — database + auth (servers: Singapore/EU)</li>
            <li><strong style={{ color: "var(--text1)" }}>Groq AI</strong> — AI processing (servers: US; no data retained)</li>
            <li><strong style={{ color: "var(--text1)" }}>Razorpay</strong> — India payment processing</li>
            <li><strong style={{ color: "var(--text1)" }}>Stripe</strong> — international payment processing</li>
            <li><strong style={{ color: "var(--text1)" }}>Vercel</strong> — hosting and CDN (servers: global edge)</li>
            <li><strong style={{ color: "var(--text1)" }}>Posthog</strong> — privacy-first analytics (EU-hosted, no cross-site tracking)</li>
            <li><strong style={{ color: "var(--text1)" }}>Sentry</strong> — error monitoring (stack traces only, no PII)</li>
            <li>Employers — only for BGV features and only with your explicit consent</li>
            <li>Law enforcement — only when legally required</li>
          </ul>
          Full sub-processor list available on request for Enterprise customers.
        </Section>

        <Section title="5. International Data Transfers">
          Your data may be processed in countries outside your residence (India, Singapore, US, EU).
          For EU/UK users, transfers are covered by Standard Contractual Clauses (SCCs). For Enterprise
          customers, we can execute a GDPR-compliant Data Processing Agreement (DPA) — request at{" "}
          <a href="mailto:enterprise@jobsayer.com" style={{ color: "var(--accent)" }}>enterprise@jobsayer.com</a>.
        </Section>

        <Section title="6. Data Retention">
          Active accounts: data retained until account deletion. Deleted accounts: all personal data
          purged within 30 days except where legal obligations require longer retention (e.g., payment
          records: 7 years per Indian tax law). BGV documents: deleted 90 days after verification
          completion unless you request earlier deletion. Audit logs: retained 2 years for enterprise
          compliance.
        </Section>

        <Section title="7. Cookies and Storage">
          Authentication session cookies (Supabase — strictly necessary). Browser localStorage for
          resume drafts and UI preferences (no server transmission until you save). We do not use
          third-party advertising cookies. Analytics (Posthog) uses a first-party cookie only.
          You can opt out of analytics in Account Settings.
        </Section>

        <Section title="8. Your Rights">
          Depending on your jurisdiction you may have the right to:
          <ul style={{ marginTop: 10, paddingLeft: 20, lineHeight: 2 }}>
            <li><strong style={{ color: "var(--text1)" }}>Access</strong> — request a copy of your personal data</li>
            <li><strong style={{ color: "var(--text1)" }}>Rectification</strong> — correct inaccurate data</li>
            <li><strong style={{ color: "var(--text1)" }}>Erasure</strong> — "right to be forgotten" — delete your account in Settings or email us</li>
            <li><strong style={{ color: "var(--text1)" }}>Portability</strong> — export your resume and profile data (available in Builder)</li>
            <li><strong style={{ color: "var(--text1)" }}>Restriction</strong> — limit certain processing while a dispute is resolved</li>
            <li><strong style={{ color: "var(--text1)" }}>Objection</strong> — opt out of processing based on legitimate interest</li>
            <li><strong style={{ color: "var(--text1)" }}>CCPA / California</strong> — right to know, delete, and opt out of sale (we don't sell data)</li>
          </ul>
          Submit a Data Subject Access Request (DSAR) at:{" "}
          <a href="mailto:privacy@jobsayer.com" style={{ color: "var(--accent)" }}>privacy@jobsayer.com</a>.
          We respond within 30 days. EU users may lodge complaints with their supervisory authority.
        </Section>

        <Section title="9. Security">
          HTTPS/TLS in transit. AES-256 encryption at rest (Supabase). Row-Level Security (RLS) —
          users can only access their own data. Content Security Policy (CSP) and security headers
          on all responses. CSRF token validation on all mutating API calls. Input sanitization on
          all user-submitted data. Regular dependency audits. Incident response plan in place.
          Report security vulnerabilities to{" "}
          <a href="mailto:security@jobsayer.com" style={{ color: "var(--accent)" }}>security@jobsayer.com</a>.
        </Section>

        <Section title="10. Children's Privacy">
          The Service is not directed to anyone under 18. We do not knowingly collect data from minors.
          If you believe a minor has provided data, contact us immediately for deletion.
        </Section>

        <Section title="11. Changes to This Policy">
          We will notify you of material changes by email and in-app banner at least 14 days before
          they take effect. The date at the top of this page indicates the last revision.
        </Section>

        <Section title="12. Contact & DPO">
          Privacy / DSAR:{" "}<a href="mailto:privacy@jobsayer.com" style={{ color: "var(--accent)" }}>privacy@jobsayer.com</a>
          {" · "}Security:{" "}<a href="mailto:security@jobsayer.com" style={{ color: "var(--accent)" }}>security@jobsayer.com</a>
          {" · "}Enterprise DPA:{" "}<a href="mailto:enterprise@jobsayer.com" style={{ color: "var(--accent)" }}>enterprise@jobsayer.com</a>
          <br />JobSayer Technologies Pvt. Ltd. · Bangalore, India
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text1)", marginBottom: 10 }}>{title}</h2>
      <div style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.75 }}>{children}</div>
    </div>
  );
}
