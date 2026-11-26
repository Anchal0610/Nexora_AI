export interface ParsedResumeDetails {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  links: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  profile_labels: string[];
  learning_qualifiers: string[];
  summary?: string;
  skills: string[];
  education: string[];
  experience: string[];
  projects: string[];
  certifications: string[];
  years_of_experience: number;
}

export interface DeterministicATSAnalysis {
  ats_score: number;
  overlap_percentage: number;
  matched_keywords: string[];
  missing_keywords: string[];
  strengths: string[];
  weaknesses_improvements: string[];
}

const KNOWN_SKILLS: { label: string; patterns: RegExp[] }[] = [
  { label: 'Python', patterns: [/\bpython\b/i] },
  { label: 'JavaScript', patterns: [/\bjavascript\b/i, /(?<![.\w])js(?![.\w])/i] },
  { label: 'TypeScript', patterns: [/\btypescript\b/i, /(?<![.\w])ts(?![.\w])/i] },
  { label: 'Java', patterns: [/\bjava\b/i] },
  { label: 'C++', patterns: [/(?:^|[\s,/|;(])c\+\+(?=$|[\s,/|;).])/i] },
  { label: 'C#', patterns: [/(?:^|[\s,/|;(])c#(?=$|[\s,/|;).])/i] },
  { label: 'C', patterns: [/(?:^|[\s,/|;(])c(?=$|[\s,/|;),])/i] },
  { label: 'Go', patterns: [/\bgolang\b/i] },
  { label: 'Rust', patterns: [/\brust\b/i] },
  { label: 'PHP', patterns: [/\bphp\b/i] },
  { label: 'Ruby', patterns: [/\bruby\b/i] },
  { label: 'Kotlin', patterns: [/\bkotlin\b/i] },
  { label: 'Swift', patterns: [/\bswift\b/i] },
  { label: 'SQL', patterns: [/\bsql\b/i] },
  { label: 'HTML', patterns: [/\bhtml5?\b/i] },
  { label: 'CSS', patterns: [/\bcss3?\b/i] },
  { label: 'React', patterns: [/\breact(?:\.js|js)?\b/i] },
  { label: 'Next.js', patterns: [/\bnext(?:\.js|js)\b/i] },
  { label: 'Angular', patterns: [/\bangular\b/i] },
  { label: 'Vue.js', patterns: [/\bvue(?:\.js|js)?\b/i] },
  { label: 'Tailwind CSS', patterns: [/\btailwind(?:\s*css)?\b/i] },
  { label: 'Redux', patterns: [/\bredux\b/i] },
  { label: 'Node.js', patterns: [/\bnode(?:\.js|js)\b/i] },
  { label: 'Express.js', patterns: [/\bexpress(?:\.js|js)?\b/i] },
  { label: 'NestJS', patterns: [/\bnestjs\b/i] },
  { label: 'Django', patterns: [/\bdjango\b/i] },
  { label: 'Flask', patterns: [/\bflask\b/i] },
  { label: 'FastAPI', patterns: [/\bfastapi\b/i] },
  { label: 'Spring Boot', patterns: [/\bspring\s*boot\b/i] },
  { label: 'REST APIs', patterns: [/\brest(?:ful)?\s*apis?\b/i] },
  { label: 'GraphQL', patterns: [/\bgraphql\b/i] },
  { label: 'PostgreSQL', patterns: [/\bpostgres(?:ql)?\b/i] },
  { label: 'MySQL', patterns: [/\bmysql\b/i] },
  { label: 'MongoDB', patterns: [/\bmongodb\b/i, /\bmongo\b/i] },
  { label: 'Prisma', patterns: [/\bprisma\b/i] },
  { label: 'Redis', patterns: [/\bredis\b/i] },
  { label: 'Firebase', patterns: [/\bfirebase\b/i] },
  { label: 'Supabase', patterns: [/\bsupabase\b/i] },
  { label: 'Docker', patterns: [/\bdocker\b/i] },
  { label: 'Kubernetes', patterns: [/\bkubernetes\b/i, /\bk8s\b/i] },
  { label: 'AWS', patterns: [/\baws\b/i, /\bamazon web services\b/i] },
  { label: 'Azure', patterns: [/\bazure\b/i] },
  { label: 'Google Cloud (GCP)', patterns: [/\bgcp\b/i, /\bgoogle cloud\b/i] },
  { label: 'CI/CD', patterns: [/\bci\s*\/\s*cd\b/i, /\bgithub actions\b/i, /\bjenkins\b/i] },
  { label: 'Terraform', patterns: [/\bterraform\b/i] },
  { label: 'Git', patterns: [/\bgit\b/i] },
  { label: 'GitHub', patterns: [/\bgithub\b/i] },
  { label: 'VS Code', patterns: [/\bvs\s*code\b/i, /\bvisual studio code\b/i] },
  { label: 'Postman', patterns: [/\bpostman\b/i] },
  { label: 'Vercel', patterns: [/\bvercel\b/i] },
  { label: 'Linux', patterns: [/\blinux\b/i] },
  { label: 'Machine Learning', patterns: [/\bmachine learning\b/i] },
  { label: 'Deep Learning', patterns: [/\bdeep learning\b/i] },
  { label: 'NLP', patterns: [/\bnlp\b/i, /\bnatural language processing\b/i] },
  { label: 'LLMs', patterns: [/\bllms?\b/i, /\blarge language models?\b/i] },
  { label: 'RAG', patterns: [/\brag\b/i, /\bretrieval[- ]augmented generation\b/i] },
  { label: 'LangChain', patterns: [/\blangchain\b/i] },
  { label: 'PyTorch', patterns: [/\bpytorch\b/i] },
  { label: 'TensorFlow', patterns: [/\btensorflow\b/i] },
  { label: 'Scikit-learn', patterns: [/\bscikit[- ]learn\b/i, /\bsklearn\b/i] },
  { label: 'Pandas', patterns: [/\bpandas\b/i] },
  { label: 'NumPy', patterns: [/\bnumpy\b/i] },
  { label: 'Pinecone', patterns: [/\bpinecone\b/i] },
  { label: 'OpenAI API', patterns: [/\bopenai\b/i] },
  { label: 'Mistral AI', patterns: [/\bmistral\b/i] },
  { label: 'Microservices', patterns: [/\bmicroservices\b/i] },
  { label: 'System Design', patterns: [/\bsystem design\b/i] },
  { label: 'Data Structures & Algorithms', patterns: [/\bdata structures\b/i, /\bdsa\b/i] },
  { label: 'Unit Testing / Jest', patterns: [/\bjest\b/i, /\bpytest\b/i, /\bunit testing\b/i] },
  { label: 'Figma', patterns: [/\bfigma\b/i] },
  { label: 'Power BI', patterns: [/\bpower\s*bi\b/i] },
  { label: 'Tableau', patterns: [/\btableau\b/i] },
  { label: 'Agile / Scrum', patterns: [/\bagile\b/i, /\bscrum\b/i] },
];

const STOPWORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'along', 'already', 'also', 'always',
  'among', 'and', 'any', 'are', 'around', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'building', 'build', 'candidate', 'candidates', 'company', 'could',
  'create', 'degree', 'demonstrated', 'design', 'develop', 'developing', 'development',
  'duties', 'each', 'ensure', 'equivalent', 'excellent', 'experience', 'experienced',
  'familiarity', 'following', 'for', 'from', 'good', 'great', 'have', 'having', 'help',
  'high', 'including', 'into', 'job', 'knowledge', 'looking', 'make', 'more', 'most',
  'must', 'need', 'nice', 'only', 'other', 'our', 'over', 'plus', 'position', 'preferred',
  'proficiency', 'proven', 'qualifications', 'related', 'required', 'requirements',
  'responsibilities', 'responsible', 'role', 'seeking', 'should', 'skills', 'some',
  'strong', 'such', 'team', 'teams', 'technical', 'technologies', 'technology', 'than',
  'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'understanding', 'using', 'very', 'well', 'what', 'when', 'where', 'which',
  'while', 'who', 'will', 'with', 'within', 'without', 'work', 'working', 'would',
  'year', 'years', 'you', 'your',
]);

type SectionKey = 'summary' | 'skills' | 'experience' | 'projects' | 'education' | 'certifications' | 'other';

const SECTION_PATTERNS: { key: SectionKey; regex: RegExp }[] = [
  { key: 'summary', regex: /^(?:professional\s+summary|career\s+summary|executive\s+summary|summary|career\s+objective|objective|profile|about(?:\s+me)?)$/i },
  { key: 'skills', regex: /^(?:technical\s+skills|core\s+skills|key\s+skills|skills|core\s+competencies|competencies|tech\s+stack|technologies|tools\s*(?:&|and)\s*technologies|programming\s+languages)$/i },
  { key: 'experience', regex: /^(?:work\s+experience|professional\s+experience|relevant\s+experience|experience|employment(?:\s+history)?|work\s+history|internships?)$/i },
  { key: 'projects', regex: /^(?:key\s+projects|personal\s+projects|academic\s+projects|selected\s+projects|notable\s+projects|projects)$/i },
  { key: 'education', regex: /^(?:education|educational\s+qualifications|academic\s+background|academics|qualifications)$/i },
  { key: 'certifications', regex: /^(?:certifications?|licenses?\s*(?:&|and)?\s*certifications?|achievements?|awards?(?:\s*(?:&|and)\s*honors)?|honors)$/i },
];

function cleanLine(line: string): string {
  return line
    .replace(/^[\u2022\u2023\u25E6\u2043\u2219•●○▪▫➢➣➤\-–—*]+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCaseIfUpper(text: string): string {
  if (text === text.toUpperCase() && /[A-Z]/.test(text)) {
    return text
      .toLowerCase()
      .split(/\s+/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
      .join(' ');
  }
  return text;
}

function detectSectionHeader(line: string): { key: SectionKey; remainder?: string } | null {
  const normalized = line.replace(/[:|_\-–—]+$/g, '').trim();
  if (!normalized || normalized.length > 55) return null;

  for (const { key, regex } of SECTION_PATTERNS) {
    if (regex.test(normalized)) {
      return { key };
    }
  }

  // Handle inline section headers like "Skills: Python, React, SQL"
  const colonIdx = line.indexOf(':');
  if (colonIdx > 2 && colonIdx < 30) {
    const prefix = line.slice(0, colonIdx).trim();
    const remainder = line.slice(colonIdx + 1).trim();
    for (const { key, regex } of SECTION_PATTERNS) {
      if (regex.test(prefix)) {
        return { key, remainder };
      }
    }
  }

  return null;
}

function groupSectionEntries(lines: string[], maxItems: number): string[] {
  const entries: string[] = [];
  let current = '';

  const isBullet = (raw: string) => /^[\u2022\u2023\u25E6\u2043\u2219•●○▪▫➢➣➤\-*]\s+/.test(raw.trim());
  const hasDateOrHeadingCue = (raw: string) =>
    /(?:\b(?:19|20)\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\bpresent\b|\bcgpa\b|\bgpa\b|\bb\.?tech\b|\bm\.?tech\b|\bb\.?e\.?\b|\bb\.?sc\b|\bm\.?sc\b|\bbca\b|\bmca\b|\bmba\b|\bbachelor\b|\bmaster\b|\buniversity\b|\bcollege\b|\binstitute\b|\bintern\b|\bengineer\b|\bdeveloper\b|\banalyst\b|\|)/i.test(
      raw
    );

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (current) {
        entries.push(current);
        current = '';
      }
      continue;
    }

    const cleaned = cleanLine(trimmed);
    if (!cleaned || /^page\s+\d+/i.test(cleaned)) continue;

    if (isBullet(trimmed)) {
      if (current) {
        entries.push(current);
        current = '';
      }
      entries.push(cleaned);
    } else if (hasDateOrHeadingCue(cleaned)) {
      if (current) {
        entries.push(current);
      }
      current = cleaned;
    } else if (!current) {
      current = cleaned;
    } else if (current.length + cleaned.length < 220) {
      current = `${current} — ${cleaned}`;
    } else {
      entries.push(current);
      current = cleaned;
    }
  }

  if (current) {
    entries.push(current);
  }

  return Array.from(new Set(entries)).slice(0, maxItems);
}

function extractSkillsFromSectionLines(lines: string[]): string[] {
  const results: string[] = [];
  for (const raw of lines) {
    const cleaned = cleanLine(raw);
    if (!cleaned) continue;
    // Strip category prefix like "Languages:" and parenthetical qualifiers like "(Learning)"
    const withoutCategory = cleaned
      .replace(/^[A-Za-z0-9 &/+-]{2,30}:\s*/, '')
      .replace(/\s*\((?:learning|beginner|basic|in progress|exploring)\)/gi, '');
    const parts = withoutCategory
      .split(/[,|•·;/]+/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 2 && p.length <= 40 && !/^(and|or|with|etc\.?)$/i.test(p));
    results.push(...parts);
  }
  return results;
}

function estimateYearsOfExperience(expLines: string[], fullText: string): number {
  const explicitMatch = fullText.match(/(\d+(?:\.\d+)?)\+?\s+years?\s+(?:of\s+)?experience/i);
  if (explicitMatch) {
    return Math.min(40, Math.round(parseFloat(explicitMatch[1]) * 10) / 10);
  }

  const joined = expLines.join('\n');
  const rangeRegex = /\b(20\d{2}|19\d{2})\s*[-–—to]+\s*(20\d{2}|19\d{2}|present|current|now)\b/gi;
  let totalYears = 0;
  let match: RegExpExecArray | null;
  const currentYear = new Date().getFullYear();

  while ((match = rangeRegex.exec(joined)) !== null) {
    const start = parseInt(match[1], 10);
    const endRaw = match[2].toLowerCase();
    const end = endRaw === 'present' || endRaw === 'current' || endRaw === 'now' ? currentYear : parseInt(endRaw, 10);
    if (end >= start && end - start <= 25) {
      totalYears += Math.max(0.5, end - start);
    }
  }

  if (totalYears > 0) {
    return Math.min(40, Math.round(totalYears * 10) / 10);
  }

  return expLines.length > 0 ? 1 : 0;
}

export function extractSkillsFromText(text: string): string[] {
  const found = new Set<string>();
  for (const skill of KNOWN_SKILLS) {
    if (skill.patterns.some((p) => p.test(text))) {
      found.add(skill.label);
    }
  }
  return Array.from(found);
}

export function parseResumeText(rawText: string, fallbackEmail: string): ParsedResumeDetails {
  const lines = rawText
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  // Extract contact details
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = (emailMatch?.[0] || fallbackEmail).trim().toLowerCase();

  const phoneMatch = rawText.match(
    /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{3}\)[\s.-]?\d{3}[\s.-]?\d{4}|\d{5}[\s.-]?\d{5}|\d{3}[\s.-]\d{3}[\s.-]\d{4}|\b\d{10}\b)/
  );
  const phone = phoneMatch?.[0]?.trim();

  const linkedinMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i);
  const githubMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+/i);
  const urlMatches = rawText.match(/https?:\/\/[^\s|,)>]+/gi) || [];
  const portfolio = urlMatches.find(
    (u) => !/linkedin\.com|github\.com|mailto:|w3\.org/i.test(u)
  );

  const normalizeUrl = (u?: string) => (u ? (u.startsWith('http') ? u : `https://${u}`) : undefined);

  // Extract name from top lines
  let name = '';
  for (const rawLine of lines.slice(0, 8)) {
    const candidate = cleanLine(rawLine).split('|')[0].trim();
    if (!candidate || candidate.length < 3 || candidate.length > 48) continue;
    if (/^(resume|curriculum vitae|cv|profile|summary)$/i.test(candidate)) continue;
    if (/@|http|www\.|linkedin|github|\d{4,}/i.test(candidate)) continue;
    if (detectSectionHeader(candidate)) continue;
    const words = candidate.split(/\s+/);
    if (words.length >= 1 && words.length <= 5 && /^[A-Za-z.\s'-]+$/.test(candidate)) {
      name = toTitleCaseIfUpper(candidate);
      break;
    }
  }
  if (!name) {
    name = email
      .split('@')[0]
      .replace(/[^a-zA-Z]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(' ') || 'Candidate';
  }

  // Extract location from header lines if available (supports City, State and City, State, Country)
  let location: string | undefined;
  for (const rawLine of lines.slice(0, 10)) {
    const cleanedLocLine = cleanLine(rawLine);
    const threePart = cleanedLocLine.match(
      /\b([A-Z][a-zA-Z\s]{1,22},\s*[A-Z][a-zA-Z\s]{1,24},\s*[A-Z][a-zA-Z\s]{2,22})\b/
    );
    const twoPart = cleanedLocLine.match(
      /\b([A-Z][a-zA-Z\s]{1,22},\s*(?:[A-Z]{2}|[A-Z][a-zA-Z\s]{2,22}))\b/
    );
    const candidateLoc = threePart?.[1] || twoPart?.[1];
    if (
      candidateLoc &&
      !/@|http|github|linkedin|leetcode|cgpa|gpa|b\.?tech|m\.?tech|university|college/i.test(candidateLoc)
    ) {
      location = candidateLoc.trim();
      break;
    }
  }

  // Detect plain-text profile labels (e.g., "LinkedIn", "GitHub", "LeetCode" without full https:// URLs)
  const headerSlice = lines.slice(0, 12).join(' ');
  const profile_labels: string[] = [];
  if (/\blinkedin\b/i.test(headerSlice) && !linkedinMatch) profile_labels.push('LinkedIn');
  if (/\bgithub\b/i.test(headerSlice) && !githubMatch) profile_labels.push('GitHub');
  if (/\bleetcode\b/i.test(headerSlice) && !/leetcode\.com\/[^\s|,)]+/i.test(headerSlice)) profile_labels.push('LeetCode');
  if (/\bcodechef\b/i.test(headerSlice) && !/codechef\.com\/[^\s|,)]+/i.test(headerSlice)) profile_labels.push('CodeChef');
  if (/\bhackerrank\b/i.test(headerSlice) && !/hackerrank\.com\/[^\s|,)]+/i.test(headerSlice)) profile_labels.push('HackerRank');

  // Detect qualifiers like "(Learning)", "(Beginner)", "(Basic)", "(In Progress)"
  const qualifierMatches = rawText.match(/\((?:learning|beginner|basic|in progress|exploring)\)/gi) || [];
  const learning_qualifiers = Array.from(new Set(qualifierMatches.map((q) => q.trim())));

  // Split into sections
  const sections: Record<SectionKey, string[]> = {
    summary: [],
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    other: [],
  };

  let activeSection: SectionKey = 'other';
  for (const rawLine of lines) {
    const header = detectSectionHeader(rawLine.trim());
    if (header) {
      activeSection = header.key;
      if (header.remainder) {
        sections[activeSection].push(header.remainder);
      }
      continue;
    }
    sections[activeSection].push(rawLine);
  }

  const summary =
    sections.summary.length > 0
      ? sections.summary.map(cleanLine).filter(Boolean).join(' ').slice(0, 500)
      : undefined;

  let education = groupSectionEntries(sections.education, 8);
  if (education.length === 0) {
    const eduFallback = lines
      .map(cleanLine)
      .filter((l) =>
        /\b(b\.?tech|m\.?tech|b\.?e\.?|b\.?sc|m\.?sc|bca|mca|mba|ph\.?d|bachelor|master|university|institute of technology|college)\b/i.test(
          l
        )
      );
    education = Array.from(new Set(eduFallback)).slice(0, 6);
  }

  let experience = groupSectionEntries(sections.experience, 12);
  if (experience.length === 0) {
    const expFallback = lines
      .map(cleanLine)
      .filter(
        (l) =>
          /\b(intern|software engineer|developer|analyst|architect|lead|consultant|manager)\b/i.test(l) &&
          l.length > 15 &&
          !detectSectionHeader(l)
      );
    experience = Array.from(new Set(expFallback)).slice(0, 6);
  }

  const projects = groupSectionEntries(sections.projects, 10);
  const certifications = groupSectionEntries(sections.certifications, 8);

  const dictionarySkills = extractSkillsFromText(rawText);
  const sectionSkills = extractSkillsFromSectionLines(sections.skills);
  const normalizeSkillKey = (s: string) => s.toLowerCase().replace(/\.js$/i, '');
  const mergedSkills = new Map<string, string>();
  for (const s of [...dictionarySkills, ...sectionSkills]) {
    const key = normalizeSkillKey(s);
    if (!mergedSkills.has(key)) {
      mergedSkills.set(key, s);
    }
  }

  const skills = Array.from(mergedSkills.values()).slice(0, 30);
  const years_of_experience = estimateYearsOfExperience(sections.experience, rawText);

  return {
    name,
    email,
    phone,
    location,
    links: {
      linkedin: normalizeUrl(linkedinMatch?.[0]),
      github: normalizeUrl(githubMatch?.[0]),
      portfolio,
    },
    profile_labels,
    learning_qualifiers,
    summary,
    skills,
    education,
    experience,
    projects,
    certifications,
    years_of_experience,
  };
}

export function analyzeResumeAgainstJD(
  rawText: string,
  jobDescription: string,
  parsed: ParsedResumeDetails
): DeterministicATSAnalysis {
  const normalizeKwKey = (w: string) => w.toLowerCase().replace(/\.js$/i, '');
  const resumeSkillsLower = new Set(parsed.skills.map(normalizeKwKey));
  const jdSkills = extractSkillsFromText(jobDescription);

  const tokenRegex = /\b[a-zA-Z][a-zA-Z0-9+#.-]{1,20}\b/g;
  const jdWordTokens = (jobDescription.toLowerCase().match(tokenRegex) || []).filter(
    (w) => w.length >= 3 && !STOPWORDS.has(w)
  );
  const resWordSet = new Set(rawText.toLowerCase().match(tokenRegex) || []);

  // Build weighted keyword list: prioritize technical skills mentioned in JD, then meaningful domain words
  const keywordCandidates = new Map<string, string>();
  for (const skill of jdSkills) {
    keywordCandidates.set(normalizeKwKey(skill), skill);
  }
  for (const token of jdWordTokens) {
    const norm = normalizeKwKey(token);
    if (!keywordCandidates.has(norm) && keywordCandidates.size < 35) {
      keywordCandidates.set(norm, token);
    }
  }

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];
  const resLower = rawText.toLowerCase();

  for (const [key, display] of keywordCandidates.entries()) {
    const displayLower = display.toLowerCase();
    const inResume =
      resumeSkillsLower.has(key) ||
      resWordSet.has(displayLower) ||
      resLower.includes(displayLower);
    if (inResume) {
      matchedKeywords.push(display);
    } else {
      missingKeywords.push(display);
    }
  }

  const totalKeywords = matchedKeywords.length + missingKeywords.length;
  const overlapPercentage =
    totalKeywords > 0
      ? Math.round((matchedKeywords.length / totalKeywords) * 10000) / 100
      : parsed.skills.length > 0
        ? 50
        : 0;

  // Score components (0 - 100)
  const keywordScore = Math.min(45, (overlapPercentage / 100) * 45);
  const sectionScore =
    (parsed.name ? 5 : 0) +
    (parsed.skills.length > 0 ? 6 : 0) +
    (parsed.education.length > 0 ? 5 : 0) +
    (parsed.experience.length > 0 ? 5 : 0) +
    (parsed.projects.length > 0 ? 4 : 0);

  const hasMetrics = /\b\d+(?:\.\d+)?%|\$\d+|\b\d+\+?\s*(?:users|requests|ms|seconds|projects|clients|team)\b/i.test(
    rawText
  );
  const actionVerbMatches =
    rawText.match(
      /\b(built|designed|developed|engineered|implemented|architected|led|optimized|deployed|automated|reduced|increased|launched|created|integrated)\b/gi
    ) || [];
  const impactScore = (hasMetrics ? 10 : 4) + Math.min(10, actionVerbMatches.length * 2);

  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  const depthScore = wordCount >= 250 ? 10 : wordCount >= 120 ? 7 : 4;

  const atsScore = Math.min(98, Math.max(25, Math.round((keywordScore + sectionScore + impactScore + depthScore) * 10) / 10));

  const strengths: string[] = [];
  if (parsed.skills.length > 0) {
    strengths.push(`Solid technical stack covering ${parsed.skills.slice(0, 8).join(', ')}.`);
  }
  if (parsed.projects.length > 0) {
    strengths.push(
      `Demonstrated hands-on implementation through ${parsed.projects.length} project(s), including ${parsed.projects[0]}.`
    );
  }
  if (parsed.education.length > 0) {
    strengths.push(`Strong academic foundation (${parsed.education[0]}).`);
  }
  const contactProfiles = [
    ...(parsed.links.linkedin ? ['LinkedIn'] : []),
    ...(parsed.links.github ? ['GitHub'] : []),
    ...(parsed.links.portfolio ? ['Portfolio'] : []),
    ...parsed.profile_labels,
  ];
  const uniqueProfiles = Array.from(new Set(contactProfiles));
  if (parsed.email && (uniqueProfiles.length > 0 || parsed.phone)) {
    const profilePart =
      uniqueProfiles.length > 0
        ? ` and ${uniqueProfiles.join(', ')} profiles`
        : parsed.phone
          ? ` and ${parsed.phone}`
          : '';
    strengths.push(`Complete ATS-readable contact header (${parsed.email}${profilePart}).`);
  }
  if (matchedKeywords.length > 0 && strengths.length < 5) {
    strengths.push(`Strong job alignment on key terms: ${matchedKeywords.slice(0, 6).join(', ')}.`);
  }
  if (parsed.experience.length > 0 && strengths.length < 5) {
    strengths.push(`Includes structured experience (${parsed.experience.length} entries extracted).`);
  }
  if (hasMetrics && strengths.length < 5) {
    strengths.push('Uses quantifiable impact metrics to substantiate engineering outcomes.');
  }

  const improvements: string[] = [];
  if (parsed.experience.length === 0) {
    improvements.push(
      'No dedicated Work Experience / Internship section detected — add internships, freelance work, or open-source contributions with role dates.'
    );
  }
  if (parsed.profile_labels.length > 0) {
    improvements.push(
      `Replace plain text profile labels (${parsed.profile_labels.join(', ')}) with full clickable HTTPS URLs so ATS parsers and recruiters can verify links directly.`
    );
  }
  if (parsed.learning_qualifiers.length > 0) {
    improvements.push(
      `Remove qualifiers like "${parsed.learning_qualifiers[0]}" next to core stack items and instead demonstrate hands-on usage inside a project bullet.`
    );
  }
  if (missingKeywords.length > 0) {
    improvements.push(
      `Incorporate missing target job keywords where applicable: ${missingKeywords.slice(0, 6).join(', ')}.`
    );
  }
  if (!hasMetrics) {
    improvements.push(
      'Add measurable impact metrics (e.g., latency reduction %, user scale, test coverage) to bullet points.'
    );
  }
  if (parsed.projects.length === 0) {
    improvements.push('Include a Projects section highlighting architecture, tech stack, and links.');
  }
  if (!parsed.summary && improvements.length < 5) {
    improvements.push('Add a concise 2–3 line Professional Summary tailored to the target role.');
  }

  return {
    ats_score: atsScore,
    overlap_percentage: overlapPercentage,
    matched_keywords: matchedKeywords.slice(0, 16),
    missing_keywords: missingKeywords.slice(0, 12),
    strengths: strengths.slice(0, 5),
    weaknesses_improvements: improvements.slice(0, 5),
  };
}
