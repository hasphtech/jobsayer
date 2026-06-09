/**
 * lib/email.ts
 *
 * Thin wrapper around Resend for transactional email.
 * All emails are no-ops when RESEND_API_KEY is absent (safe for local dev).
 *
 * Setup:
 *   pnpm add resend
 *   Add to .env.local:
 *     RESEND_API_KEY=re_xxxxxxxxxxxx
 *     RESEND_FROM=jobSayer <noreply@jobsayer.com>
 *
 * Usage:
 *   await sendEmail({ to: "user@example.com", subject: "...", html: "..." });
 *   await sendWelcomeEmail({ email: "user@example.com", name: "Aarav" });
 */

type SendOptions = {
  to:      string | string[];
  subject: string;
  html:    string;
  replyTo?: string;
};

async function sendEmail(opts: SendOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email] no RESEND_API_KEY — skipping email to ${opts.to}: ${opts.subject}`);
    return;
  }

  // Dynamic import to avoid issues in edge runtimes
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const from   = process.env.RESEND_FROM ?? "jobSayer <noreply@jobsayer.com>";

  const { error } = await resend.emails.send({
    from,
    to:      Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html:    opts.html,
    reply_to: opts.replyTo,
  });

  if (error) {
    console.error("[email] send failed:", error);
  }
}

// ── Shared layout ────────────────────────────────────────────────────────────

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin:0; padding:0; background:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#18181b; }
  .container { max-width:560px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.08); }
  .header { background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%); padding:32px 40px; }
  .header h1 { margin:0; font-size:20px; color:#fff; font-weight:800; letter-spacing:-.3px; }
  .body { padding:32px 40px; }
  .body p { margin:0 0 16px; font-size:15px; line-height:1.6; color:#3f3f46; }
  .btn { display:inline-block; background:#6366f1; color:#fff!important; padding:12px 24px; border-radius:8px; font-weight:600; font-size:14px; text-decoration:none; margin:8px 0 16px; }
  .footer { padding:20px 40px; border-top:1px solid #e4e4e7; }
  .footer p { margin:0; font-size:12px; color:#a1a1aa; line-height:1.5; }
  .highlight { background:#f4f4ff; border-left:3px solid #6366f1; padding:12px 16px; border-radius:0 8px 8px 0; margin:16px 0; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>jobSayer</h1></div>
  <div class="body">${body}</div>
  <div class="footer">
    <p>You're receiving this because you have a jobSayer account.<br>
    <a href="https://jobsayer.com/profile" style="color:#6366f1">Manage email preferences</a> ·
    <a href="https://jobsayer.com/privacy" style="color:#6366f1">Privacy Policy</a></p>
  </div>
</div>
</body></html>`;
}

// ── Email templates ───────────────────────────────────────────────────────────

export async function sendWelcomeEmail({ email, name }: { email: string; name?: string }) {
  const firstName = name?.split(" ")[0] ?? "there";
  await sendEmail({
    to:      email,
    subject: "Welcome to jobSayer 🚀",
    html:    wrap(`
      <p>Hi ${firstName},</p>
      <p>Welcome to <strong>jobSayer</strong> — your career growth platform. Here's what you can do right now:</p>
      <div class="highlight">
        <p style="margin:0"><strong>✨ Build your resume</strong> — AI-powered, ATS-optimised<br>
        <strong>🎯 Score your resume</strong> — see exactly where you rank<br>
        <strong>💼 Apply to jobs</strong> — curated from 50+ countries<br>
        <strong>🎤 Prep for interviews</strong> — role-specific practice</p>
      </div>
      <a class="btn" href="https://jobsayer.com/dashboard">Go to Dashboard →</a>
      <p>Got questions? Reply to this email — we read every one.</p>
      <p>Good luck with your career journey!<br><strong>The jobSayer Team</strong></p>
    `),
  });
}

export async function sendPlanConfirmationEmail({
  email, name, plan, interval, expiresAt,
}: { email: string; name?: string; plan: string; interval: string; expiresAt: string }) {
  const firstName   = name?.split(" ")[0] ?? "there";
  const planLabel   = { pro: "Career Pro", elite: "Career Elite", starter: "Career Starter" }[plan] ?? plan;
  const expiry      = new Date(expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  await sendEmail({
    to:      email,
    subject: `Your ${planLabel} plan is active ✅`,
    html:    wrap(`
      <p>Hi ${firstName},</p>
      <p>Your <strong>${planLabel}</strong> plan is now active (${interval === "annual" ? "annual" : "monthly"} billing).</p>
      <div class="highlight">
        <p style="margin:0"><strong>Plan:</strong> ${planLabel}<br>
        <strong>Billing:</strong> ${interval === "annual" ? "Annual" : "Monthly"}<br>
        <strong>Active until:</strong> ${expiry}</p>
      </div>
      <a class="btn" href="https://jobsayer.com/dashboard">Go to Dashboard →</a>
      <p>To manage or cancel your subscription, visit your
      <a href="https://jobsayer.com/profile" style="color:#6366f1">profile page</a>.</p>
      <p><strong>The jobSayer Team</strong></p>
    `),
  });
}

export async function sendJobAlertEmail({
  email, name, jobs, keywords,
}: { email: string; name?: string; jobs: Array<{ title: string; company: string; location: string; url: string }>; keywords: string }) {
  if (!jobs.length) return;
  const firstName = name?.split(" ")[0] ?? "there";
  const jobsHtml = jobs.slice(0, 10).map(j => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f4f4f5">
        <a href="${j.url}" style="color:#6366f1;font-weight:600;text-decoration:none">${j.title}</a><br>
        <span style="font-size:13px;color:#71717a">${j.company} · ${j.location}</span>
      </td>
    </tr>
  `).join("");

  await sendEmail({
    to:      email,
    subject: `${jobs.length} new job${jobs.length > 1 ? "s" : ""} matching "${keywords}"`,
    html:    wrap(`
      <p>Hi ${firstName},</p>
      <p>We found <strong>${jobs.length} new jobs</strong> matching your alert for <em>"${keywords}"</em>:</p>
      <table width="100%" cellpadding="0" cellspacing="0">${jobsHtml}</table>
      <a class="btn" href="https://jobsayer.com/jobs?q=${encodeURIComponent(keywords)}">View all jobs →</a>
      <p style="font-size:13px;color:#a1a1aa">
        <a href="https://jobsayer.com/profile" style="color:#6366f1">Manage job alerts</a>
      </p>
    `),
  });
}

export async function sendPaymentFailedEmail({ email, name }: { email: string; name?: string }) {
  const firstName = name?.split(" ")[0] ?? "there";
  await sendEmail({
    to:      email,
    subject: "Action required: payment failed ⚠️",
    html:    wrap(`
      <p>Hi ${firstName},</p>
      <p>We couldn't process your subscription payment. Your account will revert to the free plan if this isn't resolved within 7 days.</p>
      <a class="btn" href="https://jobsayer.com/upgrade">Update payment method →</a>
      <p>Need help? Reply to this email.</p>
      <p><strong>The jobSayer Team</strong></p>
    `),
  });
}

export async function sendInterviewReminderEmail({
  email, name, role, scheduledAt,
}: { email: string; name?: string; role: string; scheduledAt: string }) {
  const firstName = name?.split(" ")[0] ?? "there";
  const dt = new Date(scheduledAt).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  await sendEmail({
    to:      email,
    subject: `Interview reminder: ${role} — ${dt}`,
    html:    wrap(`
      <p>Hi ${firstName},</p>
      <p>This is a reminder about your upcoming interview for <strong>${role}</strong>.</p>
      <div class="highlight">
        <p style="margin:0"><strong>Scheduled:</strong> ${dt}</p>
      </div>
      <a class="btn" href="https://jobsayer.com/interview">Practice now →</a>
      <p>Good luck! You've got this.</p>
      <p><strong>The jobSayer Team</strong></p>
    `),
  });
}

export async function sendReferralRewardEmail({
  email, name, referredName,
}: { email: string; name?: string; referredName?: string }) {
  const firstName = name?.split(" ")[0] ?? "there";
  await sendEmail({
    to:      email,
    subject: "You earned a free month! 🎁",
    html:    wrap(`
      <p>Hi ${firstName},</p>
      <p>${referredName ? `<strong>${referredName}</strong> just signed up` : "Someone you referred signed up"} using your referral link — you've earned <strong>1 free month of Career Pro</strong>!</p>
      <a class="btn" href="https://jobsayer.com/profile">View your account →</a>
      <p>Keep sharing and keep earning. Your referral link is always on your <a href="https://jobsayer.com/profile" style="color:#6366f1">profile page</a>.</p>
      <p><strong>The jobSayer Team</strong></p>
    `),
  });
}

export { sendEmail };
