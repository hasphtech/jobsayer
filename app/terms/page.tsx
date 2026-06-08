"use client";
import Link from "next/link";

export default function TermsPage() {
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
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>Terms of Service</h1>
        <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 40 }}>Last updated: 1 June 2026 · JobSayer Technologies Pvt. Ltd.</p>

        <Section title="1. Acceptance of Terms">
          These Terms constitute a legally binding agreement between you and JobSayer Technologies Pvt. Ltd.
          ("JobSayer", "we", "us") governing your use of the platform and all associated services. If you
          use the Service on behalf of a company, you represent you have authority to bind that entity.
          If you do not agree, please do not use the Service.
        </Section>

        <Section title="2. Description of Service">
          JobSayer is a global career growth platform providing resume building, ATS scoring, interview
          preparation, salary benchmarks, job matching, background verification (BGV), career path
          guidance, document vault, and AI-powered career development tools across 50+ countries.
          We reserve the right to modify or discontinue features with reasonable notice.
        </Section>

        <Section title="3. User Accounts">
          You must be at least 18 years old to create an account. You agree to provide accurate, current
          information and keep credentials confidential. You are responsible for all activity under your
          account. Notify us immediately at{" "}
          <a href="mailto:legal@jobsayer.com" style={{ color: "var(--accent)" }}>legal@jobsayer.com</a>{" "}
          if you suspect unauthorised access.
        </Section>

        <Section title="4. Acceptable Use">
          You agree not to:
          <ul style={{ marginTop: 10, paddingLeft: 20, lineHeight: 2 }}>
            <li>Use the Service for any unlawful purpose or in violation of applicable regulations</li>
            <li>Upload false, misleading, or fraudulent resume or profile information</li>
            <li>Attempt unauthorised access to any part of the Service or its infrastructure</li>
            <li>Scrape, copy, or redistribute data from the Service without written permission</li>
            <li>Use automated bots or crawlers without our express written consent</li>
            <li>Submit content that infringes third-party intellectual property rights</li>
            <li>Use AI features to generate false credentials or misrepresent qualifications</li>
            <li>Reverse-engineer, decompile, or disassemble the Service</li>
            <li>Interfere with or disrupt the Service, servers, or networks</li>
          </ul>
          We reserve the right to suspend or terminate accounts that violate these rules without refund.
        </Section>

        <Section title="5. Subscriptions and Payments">
          Paid subscriptions are billed in advance monthly or annually. Prices are displayed in your
          local currency (detected by IP address). Payments are processed by Razorpay (India) or Stripe
          (international). We do not store payment card details. Subscriptions auto-renew unless cancelled
          at least 24 hours before renewal. Pricing may change with 30 days' notice; continued use
          constitutes acceptance.
        </Section>

        <Section title="6. Enterprise Plans">
          Enterprise customers ("Enterprise Accounts") receive additional features including SSO/SAML,
          seat management, audit logs, a dedicated account manager, and a Data Processing Agreement (DPA).
          Enterprise terms are governed by a separate Master Services Agreement (MSA) which supplements
          these Terms. Contact{" "}
          <a href="mailto:enterprise@jobsayer.com" style={{ color: "var(--accent)" }}>enterprise@jobsayer.com</a>.
        </Section>

        <Section title="7. AI-Generated Content">
          AI-generated resume suggestions, interview answers, cover letters, and career advice are
          provided for informational purposes only. You are solely responsible for reviewing AI-generated
          content before use. Outputs may contain inaccuracies and are not guaranteed to be suitable for
          your specific situation. JobSayer is not liable for outcomes resulting from use of AI content.
        </Section>

        <Section title="8. Background Verification (BGV)">
          By using BGV features, you consent to sharing your documents and information with employers
          for verification. JobSayer does not independently verify submitted documents and is not liable
          for third-party verification errors. BGV data is handled per applicable laws including the
          Information Technology Act (India), GDPR (EU/UK), and CCPA (California).
        </Section>

        <Section title="9. Intellectual Property">
          JobSayer retains all IP rights in the platform including software, design, content, and
          trademarks. You retain ownership of content you upload. By uploading content, you grant us a
          non-exclusive, worldwide, royalty-free licence to store and process that content solely to
          provide the Service. This licence terminates when you delete your account.
        </Section>

        <Section title="10. Privacy & Data">
          Our <Link href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</Link> is
          incorporated into these Terms by reference. By using the Service, you consent to data
          processing as described therein. Enterprise customers may request a DPA for GDPR Article 28
          compliance.
        </Section>

        <Section title="11. Limitation of Liability">
          To the maximum extent permitted by law, JobSayer shall not be liable for indirect, incidental,
          special, consequential, or punitive damages, including loss of profits, data, or employment
          opportunities. Our total aggregate liability for any claim shall not exceed the greater of
          (a) the amount you paid us in the 12 months preceding the claim, or (b) USD 100.
        </Section>

        <Section title="12. Disclaimers">
          The Service is provided "as is" without warranties of any kind. We do not warrant uninterrupted
          or error-free service. JobSayer is not a recruitment agency and does not guarantee employment
          outcomes, salary increases, or career advancement.
        </Section>

        <Section title="13. Governing Law & Disputes">
          These Terms are governed by the laws of India. Disputes shall first be resolved by good-faith
          negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration
          in Bangalore, India under the Arbitration and Conciliation Act, 1996. Either party may seek
          urgent injunctive relief from a court of competent jurisdiction.
        </Section>

        <Section title="14. Changes to Terms">
          We may update these Terms and will notify you of material changes by email or in-app notice.
          Continued use after the effective date of updated Terms constitutes acceptance.
        </Section>

        <Section title="15. Contact">
          General:{" "}<a href="mailto:hello@jobsayer.com" style={{ color: "var(--accent)" }}>hello@jobsayer.com</a>
          {" · "}Legal:{" "}<a href="mailto:legal@jobsayer.com" style={{ color: "var(--accent)" }}>legal@jobsayer.com</a>
          {" · "}Enterprise:{" "}<a href="mailto:enterprise@jobsayer.com" style={{ color: "var(--accent)" }}>enterprise@jobsayer.com</a>
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
