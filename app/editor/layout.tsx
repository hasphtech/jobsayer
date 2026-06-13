import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume Editor — Edit Your Resume Directly | jobSayer",
  description: "Edit your existing resume directly without templates. Inline editing for all sections — experience, education, skills, projects and more. Export as PDF or DOCX.",
  keywords: ["resume editor", "edit resume online", "resume editing tool", "direct resume editor", "resume builder"],
  alternates: { canonical: "https://jobsayer.com/editor" },
  openGraph: {
    title: "Direct Resume Editor | jobSayer",
    description: "Edit your resume directly — no templates, no wizard. Just your content, your way.",
    url: "https://jobsayer.com/editor",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Direct Resume Editor | jobSayer",
    description: "Edit your resume directly — no templates, no wizard.",
  },
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
