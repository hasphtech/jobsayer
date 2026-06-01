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
        <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 40 }}>Last updated: June 2025</p>

        <Section title="1. Acceptance of Terms">
          By accessing or using jobSayer ("the Service"), you agree to be bound by these Terms of Service.
          If you do not agree, please do not use the Service. These terms apply to all visitors, users, and
          anyone who accesses the platform.
        </Section>

        <Section title="2. Description of Service">
          jobSayer is an AI-powered resume builder and job-matching platform. The Service includes resume
          creation tools, AI writing assistance, job listings, resume scoring, interview preparation, and
          career guidance features. Some features require a paid subscription.
        </Section>

        <Section title="3. User Accounts">
          You may create an account using Google OAuth or your email address. You are responsible for
          maintaining the confidentiality of your account credentials and for all activity that occurs
          under your account. You must be at least 18 years old to use the Service.
        </Section>

        <Section title="4. Acceptable Use">
          You agree not to:
          <ul style={{ marginTop: 10, paddingLeft: 20, lineHeight: 2 }}>
            <li>Use the Service for any unlawful purpose or in violation of any regulations</li>
            <li>Upload content that is defamatory, obscene, fraudulent, or violates others' rights</li>
            <li>Attempt to reverse-engineer, scrape, or extract data from the platform</li>
            <li>Use AI features to generate false credentials or misrepresent your qualifications</li>
            <li>Share your account credentials with others</li>
            <li>Interfere with or disrupt the Service or its servers</li>
          </ul>
        </Section>

        <Section title="5. Intellectual Property">
          The jobSayer platform, including its software, design, and branding, is owned by jobSayer and
          protected by intellectual property laws. Resume content you create remains yours. By using the
          Service you grant us a limited licence to store and process your content to provide the Service.
        </Section>

        <Section title="6. AI-Generated Content">
          jobSayer uses AI (powered by third-party language models) to assist with resume writing,
          interview preparation, and career guidance. AI-generated content is provided as a starting
          point and may not always be accurate or suitable. You are solely responsible for reviewing and
          verifying any AI-generated content before using it.
        </Section>

        <Section title="7. Subscriptions and Payments">
          Certain features require a paid plan (Starter or Pro). Subscription fees are billed in Indian
          Rupees (₹) and are non-refundable except as required by law. You may cancel your subscription
          at any time; access continues until the end of the current billing period.
        </Section>

        <Section title="8. Data and Privacy">
          We collect and process personal data as described in our{" "}
          <Link href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</Link>.
          Your resume data is stored securely and is never sold to third parties.
        </Section>

        <Section title="9. Limitation of Liability">
          To the maximum extent permitted by applicable law, jobSayer shall not be liable for any
          indirect, incidental, special, or consequential damages arising from your use of the Service,
          including but not limited to lost profits, loss of data, or inability to find employment.
          The Service is provided "as is" without warranties of any kind.
        </Section>

        <Section title="10. Changes to Terms">
          We reserve the right to modify these Terms at any time. We will notify users of material
          changes by email or prominent notice on the platform. Continued use after changes constitutes
          acceptance of the updated Terms.
        </Section>

        <Section title="11. Governing Law">
          These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive
          jurisdiction of the courts in Bangalore, Karnataka, India.
        </Section>

        <Section title="12. Contact">
          For questions about these Terms, contact us at{" "}
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
