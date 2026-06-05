"use client";
/**
 * CourseCard — compact affiliate course recommendation card.
 * Used in Career GPS, Interview Prep, and Score pages.
 * Pass `compact` for single-line list style.
 */
import React from "react";
import type { CourseRec } from "@/lib/courseRecommendations";

const PLATFORM_CONFIG = {
  udemy:    { label: "Udemy",    color: "#a435f0", bg: "rgba(164,53,240,.08)" },
  coursera: { label: "Coursera", color: "#0056d2", bg: "rgba(0,86,210,.08)"  },
  free:     { label: "Free",     color: "#16a34a", bg: "rgba(34,197,94,.08)" },
};

export default function CourseCard({ course, compact = false }: { course: CourseRec; compact?: boolean }) {
  const p = PLATFORM_CONFIG[course.platform];
  const isFree = course.price === "Free" || course.platform === "free";

  if (compact) {
    return (
      <a href={course.affiliateUrl} target="_blank" rel="noopener noreferrer sponsored"
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 9, textDecoration: "none", background: "var(--surface2)", border: "1px solid var(--border)", transition: "border-color .15s" }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = p.color + "60")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: p.bg, color: p.color, flexShrink: 0 }}>{p.label}</span>
        <span style={{ fontSize: 12, color: "var(--text1)", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.title}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: isFree ? "var(--success)" : "var(--text2)", flexShrink: 0 }}>{course.price}</span>
        <span style={{ fontSize: 11, color: p.color, flexShrink: 0, fontWeight: 600 }}>→</span>
      </a>
    );
  }

  return (
    <a href={course.affiliateUrl} target="_blank" rel="noopener noreferrer sponsored"
      style={{ display: "block", padding: "12px 14px", borderRadius: 10, textDecoration: "none", background: "var(--surface2)", border: "1px solid var(--border)", transition: "border-color .15s" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = p.color + "60")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: p.bg, color: p.color, flexShrink: 0 }}>{p.label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {course.tag && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: isFree ? "rgba(34,197,94,.1)" : "rgba(234,179,8,.1)", color: isFree ? "var(--success)" : "var(--warn)" }}>{course.tag}</span>
          )}
          <span style={{ fontSize: 12, fontWeight: 800, color: isFree ? "var(--success)" : "var(--text1)" }}>{course.price}</span>
        </div>
      </div>
      {/* Title */}
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text1)", lineHeight: 1.4, marginBottom: 5 }}>{course.title}</div>
      {/* Meta */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--text3)", flexWrap: "wrap" }}>
        <span>{course.instructor}</span>
        <span>⭐ {course.rating}</span>
        {course.students && <span>{course.students} students</span>}
        <span>⏱ {course.duration}</span>
      </div>
      {/* CTA */}
      <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: p.color }}>
        Enroll now →
      </div>
    </a>
  );
}
