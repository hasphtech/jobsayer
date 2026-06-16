/** @type {import('next').NextConfig} */

const SUPABASE_HOSTS = "https://*.supabase.co wss://*.supabase.co";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control",   value: "on" },
  { key: "X-Frame-Options",          value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options",   value: "nosniff" },
  { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",       value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://lh3.googleusercontent.com",
      `connect-src 'self' ${SUPABASE_HOSTS} https://accounts.google.com`,
      "frame-src https://accounts.google.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
    ].join("; "),
  },
];

const nextConfig = {
  poweredByHeader: false,
  compress: true,
  async redirects() {
    return [
      // /sign-in was never a valid route — /login is the correct page.
      // 308 so POST requests (if any) also redirect correctly.
      {
        source: "/sign-in",
        destination: "/login",
        permanent: true,
      },
      // Common variants people might type or link to
      {
        source: "/signup",
        destination: "/login",
        permanent: true,
      },
      {
        source: "/register",
        destination: "/login",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
