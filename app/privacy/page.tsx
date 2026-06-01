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
        <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 40 }}>Last updated: June 2025</p>

        <Section title="1. Who We Are">
          jobSayer ("we", "us", "our") operates the jobSayer platform at jobsayer.com. We are committed
          to protecting your personal information and your right to privacy. For questions, contact us at{" "}
          <a href="mailto:hello@jobsayer.com" style={{ color: "var(--accent)" }}>hello@jobsayer.com</a>.
        </Section>

        <Section title="2. Information We Collect">
          <strong style={{ color: "var(--text1)" }}>Account information:</strong> When you sign up, we
          collect your email address, name, and profile picture (from Google OAuth) or just your email
          (if you use email OTP sign-in).
          <br /><br />
          <strong style={{ color: "var(--text1)" }}>Resume data:</strong> Content you enter into the
          resume builder — name, contact details, work history, education, skills, and other
          professional information you choose to provide.
          <br /><br />
          <strong style={{ color: "var(--text1)" }}>Usage data:</strong> Pages visited, features used,
          and interaction logs to help us improve the Service.
          <br /><br />
          <strong style={{ color: "var(--text1)" }}>Payment information:</strong> Subscription payments
          are processed by Razorpay. We do not store your card or bank details.
        </Section>

        <Section title="3. How We Use Your Information">
          We use your information to:
          <ul style={{ marginTop: 10, paddingLeft: 20, lineHeight: 2 }}>
            <li>Provide and improve the Service</li>
            <li>Store and retrieve your resume data across devices</li>
            <li>Process AI enhancement requests (your content is sent to Groq AI servers)</li>
            <li>Manage your subscription and process payments</li>
            <li>Send transactional emails (OTP codes, payment receipts)</li>
            <li>Communicate important Service updates</li>
          </ul>
        </Section>

        <Section title="4. Data Sharing">
          We do <strong style={{ color: "var(--text1)" }}>not sell</strong> your personal data.
          We share data only with:
          <ul style={{ marginTop: 10, paddingLeft: 20, lineHeight: 2 }}>
            <li><strong style={{ color: "var(--text1)" }}>Supabase</strong> — database and authentication hosting (servers in Singapore/India)</li>
            <li><strong style={{ color: "var(--text1)" }}>Groq AI</strong> — processes resume text for AI features (no data retained per their policy)</li>
            <li><strong style={{ color: "var(--text1)" }}>Razorpay</strong> — payment processing</li>
            <li><strong style={{ color: "var(--text1)" }}>Vercel</strong> — hosting and CDN</li>
            <li>Law enforcement when required by law</li>
          </ul>
        </Section>

        <Section title="5. Resume Sharing">
          When you generate a public share link for your resume (/r/[id]), that resume is accessible
          to anyone with the link. You can delete your resume at any time to revoke access. We track
          anonymous view counts on shared resumes.
        </Section>

        <Section title="6. Data Retention">
          Your resume data is retained as long as your account is active. If you delete your account,
          all associated data is permanently deleted within 30 days. Draft data stored in your browser's
          localStorage is controlled entirely by you and never leaves your device until you choose to save.
        </Section>

        <Section title="7. Cookies and Local Storage">
          We use browser localStorage to save your resume draft and preferences locally on your device.
          Authentication session cookies are set by Supabase to maintain your login session. We do not
          use tracking cookies or third-party advertising cookies.
        </Section>

        <Section title="8. Your Rights">
          You have the right to:
          <ul style={{ marginTop: 10, paddingLeft: 20, lineHeight: 2 }}>
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate information</li>
            <li>Delete your account and all associated data</li>
            <li>Export your resume data (available via the builder)</li>
            <li>Withdraw consent at any time by deleting your account</li>
          </ul>
          To exercise these rights, email{" "}
          <a href="mailto:hello@jobsayer.com" style={{ color: "var(--accent)" }}>hello@jobsayer.com</a>.
        </Section>

        <Section title="9. Security">
          We use industry-standard security practices: HTTPS encryption in transit, row-level security
          (RLS) in our database ensuring users can only access their own data, and Supabase's managed
          infrastructure with SOC 2 compliance. No system is 100% secure; use a strong, unique password
          for your email account.
        </Section>

        <Section title="10. Children's Privacy">
          The Service is not directed to children under 18. We do not knowingly collect personal
          information from minors. If you believe a minor has provided us with personal data, please
          contact us immediately.
        </Section>

        <Section title="11. Changes to This Policy">
          We may update this Privacy Policy from time to time. We will notify you of significant changes
          by email or a notice on the platform. The updated policy will be effective immediately upon
          posting.
        </Section>

        <Section title="12. Contact">
          For privacy-related questions or to exercise your rights, contact us at{" "}
          <a href="mailto:hello@jobsayer.com" style={{ color: "var(--accent)" }}>hello@jobsayer.com</a>.
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
