"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getShare, incrementViewCount } from "@/lib/resumeDb";
import type { ResumeData } from "@/lib/types";

// Re-export the template renderer from builder
// We import the preview component lazily to avoid circular deps
import dynamic from "next/dynamic";

const ResumePreviewDynamic = dynamic(
  () => import("@/components/ResumePreview"),
  { ssr: false, loading: () => <div style={{ color: "#9ca3af", padding: 40 }}>Loading…</div> }
);

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [resume, setResume] = useState<{ data: ResumeData; template: string; viewCount: number } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    getShare(id).then((r) => {
      if (r) {
        setResume(r);
        // Fire-and-forget — non-critical, never blocks render
        incrementViewCount(id);
      } else {
        setNotFound(true);
      }
    });
  }, [id]);

  if (notFound) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0f172a", color: "#9ca3af", fontFamily: "system-ui",
        flexDirection: "column", gap: 12,
      }}>
        <div style={{ fontSize: 32 }}>🔍</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>Resume not found</div>
        <div style={{ fontSize: 13 }}>This share link may have expired or been deleted.</div>
        <a href="https://resume.emi24.com/builder" style={{ marginTop: 8, color: "#3b82f6", fontSize: 13 }}>
          Build your own →
        </a>
      </div>
    );
  }

  if (!resume) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0f172a",
      }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #3b82f6", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1e293b", padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Top bar */}
      <div style={{
        width: "100%", maxWidth: 794, marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <a href="https://resume.emi24.com/builder" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "#3b82f6", color: "#fff", borderRadius: 8,
          padding: "8px 16px", fontSize: 12, fontWeight: 700, textDecoration: "none",
        }}>
          Build yours free →
        </a>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          {resume.viewCount > 0 && (
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
              👁 {resume.viewCount.toLocaleString()} view{resume.viewCount !== 1 ? "s" : ""}
            </span>
          )}
          <span style={{ fontSize: 11, color: "#64748b" }}>
            Shared via Resume · powered by emi24
          </span>
        </div>
      </div>

      <ResumePreviewDynamic data={resume.data} template={resume.template} />
    </div>
  );
}
