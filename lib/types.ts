export interface WorkEntry {
  id: string;
  company: string;
  role: string;
  from: string;
  to: string;
  current: boolean;   // "Present" toggle
  desc: string;
}

export interface EduEntry {
  id: string;
  school: string;
  degree: string;
  year: string;
  gpa: string;        // GPA / percentage / grade
}

export interface ProjectEntry {
  id: string;
  name: string;
  url: string;        // live demo / project link
  repo: string;       // GitHub / GitLab repo link
  from: string;
  to: string;
  desc: string;
}

export interface ReferenceEntry {
  id: string;
  name: string;
  title: string;      // job title / relationship
  company: string;
  email: string;
  phone: string;
}

export interface CertEntry {
  id: string;
  name: string;
  issuer: string;
  year: string;
  logo?: string;   // base64 data URL of issuer logo (optional)
}

export interface LanguageEntry {
  id: string;
  name: string;
  level: "Basic" | "Conversational" | "Fluent" | "Native";
}

export interface AwardEntry {
  id: string;
  title: string;
  issuer: string;
  year: string;
  desc: string;
}

export interface CustomSection {
  id: string;
  title: string;    // e.g. "Volunteer Work", "Publications"
  content: string;  // freeform text / bullet points
}

export interface ResumeData {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website: string;    // portfolio / personal site
  linkedin: string;   // linkedin.com/in/…
  github: string;     // github.com/…
  photo: string;      // base64 data URL or ""
  summary: string;
  work: WorkEntry[];
  edu: EduEntry[];
  skills: string;
  projects: ProjectEntry[];
  certifications: CertEntry[];
  languages: LanguageEntry[];
  awards: AwardEntry[];       // awards & honors
  interests: string;          // comma-separated hobbies / interests
  references: ReferenceEntry[];
  customSections?: CustomSection[];  // user-defined extra sections
}
