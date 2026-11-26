import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ocrService } from '@/lib/ocr';
import { imagekitService } from '@/lib/imagekit';
import { mistralService } from '@/lib/mistral';
import { pineconeService } from '@/lib/pinecone';
import { dbManager } from '@/lib/db';
import {
  analyzeResumeAgainstJD,
  extractSkillsFromText,
  parseResumeText,
} from '@/lib/resume-parser';

function splitTextIntoChunks(text: string, chunkSize = 800, chunkOverlap = 200): string[] {
  const chunks: string[] = [];
  if (!text) return chunks;

  let index = 0;
  while (index < text.length) {
    const chunk = text.slice(index, index + chunkSize);
    chunks.push(chunk);
    index += chunkSize - chunkOverlap;
  }
  return chunks;
}

function projectTo3D(embedding: number[], label: string, index: number): number[] {
  if (!embedding || embedding.length === 0) {
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    const x = Math.sin(hash + index) * 0.8;
    const y = Math.cos(hash + index * 2) * 0.8;
    const z = Math.sin(hash * 3 + index) * 0.8;
    return [x, y, z];
  }

  let x = 0;
  let y = 0;
  let z = 0;

  for (let i = 0; i < embedding.length; i++) {
    if (i < 340) x += embedding[i] * Math.sin(i + index);
    else if (i < 680) y += embedding[i] * Math.cos(i + index);
    else z += embedding[i] * Math.sin(i * 2 + index);
  }

  const length = Math.sqrt(x * x + y * y + z * z) || 1;
  return [x / length, y / length, z / length];
}

function inferRolesFromSkills(skills: string[], jobDescription: string) {
  const skillSet = new Set(skills.map((s) => s.toLowerCase()));
  const jdLower = jobDescription.toLowerCase();

  const hasFrontend = ['react', 'next.js', 'angular', 'vue.js', 'tailwind css', 'html', 'css'].some((s) =>
    skillSet.has(s)
  );
  const hasBackend = ['node.js', 'express.js', 'nestjs', 'django', 'flask', 'fastapi', 'spring boot', 'sql', 'mongodb', 'postgresql'].some(
    (s) => skillSet.has(s)
  );
  const hasAI = ['machine learning', 'deep learning', 'llms', 'rag', 'langchain', 'pytorch', 'tensorflow', 'nlp'].some(
    (s) => skillSet.has(s)
  );
  const hasDevOps = ['docker', 'kubernetes', 'aws', 'azure', 'google cloud (gcp)', 'ci/cd', 'terraform'].some((s) =>
    skillSet.has(s)
  );

  const roles: { role_name: string; description: string; growth_trend: string }[] = [];

  if (hasFrontend && hasBackend) {
    roles.push({
      role_name: 'Full Stack Software Engineer',
      description: 'Build end-to-end web applications spanning modern UI frameworks, APIs, and databases.',
      growth_trend: '21% YoY growth',
    });
  }
  if (hasAI || /\bai\b|\bml\b|\brag\b|\bllm\b/i.test(jdLower)) {
    roles.push({
      role_name: 'AI / Applied ML Engineer',
      description: 'Design LLM/RAG pipelines, semantic search systems, and intelligent automation workflows.',
      growth_trend: '28% YoY growth',
    });
  }
  if (hasBackend) {
    roles.push({
      role_name: 'Backend Engineer',
      description: 'Architect scalable APIs, data models, authentication flows, and distributed services.',
      growth_trend: '17% YoY growth',
    });
  }
  if (hasFrontend) {
    roles.push({
      role_name: 'Frontend Engineer',
      description: 'Craft responsive, accessible, high-performance interfaces with modern component architectures.',
      growth_trend: '16% YoY growth',
    });
  }
  if (hasDevOps) {
    roles.push({
      role_name: 'Cloud / DevOps Engineer',
      description: 'Automate CI/CD, container orchestration, and resilient cloud infrastructure.',
      growth_trend: '19% YoY growth',
    });
  }

  if (roles.length < 3) {
    roles.push(
      {
        role_name: 'Software Engineer',
        description: 'Deliver production software features across core application modules and data layers.',
        growth_trend: '18% YoY growth',
      },
      {
        role_name: 'Backend Engineer',
        description: 'Design RESTful APIs, databases, and server-side processing pipelines.',
        growth_trend: '17% YoY growth',
      },
      {
        role_name: 'Cloud Solutions Developer',
        description: 'Integrate cloud APIs, vector databases, and automated deployment pipelines.',
        growth_trend: '19% YoY growth',
      }
    );
  }

  // Deduplicate by role_name and return top 3
  const seen = new Set<string>();
  return roles
    .filter((r) => {
      if (seen.has(r.role_name)) return false;
      seen.add(r.role_name);
      return true;
    })
    .slice(0, 3);
}

function nonEmptyArray(primary: unknown, fallback: string[]): string[] {
  if (Array.isArray(primary)) {
    const cleaned = primary.map((item) => String(item).trim()).filter(Boolean);
    if (cleaned.length > 0) return cleaned;
  }
  return fallback;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const jobDescription = formData.get('jobDescription') as string | null;
    const inputEmail = formData.get('email') as string | null;

    if (!file || !jobDescription) {
      return NextResponse.json({ error: 'Missing file or job description' }, { status: 400 });
    }

    const email = (inputEmail || 'guest@nexora.ai').trim().toLowerCase();

    // 1. Temp file extraction & OCR
    const tempDir = path.join(os.tmpdir(), 'talentforge-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const safeFilename = path.basename(file.name);
    const tempFilePath = path.join(tempDir, `${Date.now()}-${safeFilename}`);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempFilePath, fileBuffer);

    let rawText = '';
    let fileUrl: string | null = null;

    try {
      rawText = await ocrService.extractText(tempFilePath);
      if (imagekitService.isEnabled()) {
        const url = await imagekitService.uploadPdf(fileBuffer, safeFilename);
        if (url) fileUrl = url;
      }
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

    // Deterministic extraction & ATS analysis directly from the uploaded resume text
    const deterministicParsed = parseResumeText(rawText, email);
    const deterministicATS = analyzeResumeAgainstJD(rawText, jobDescription, deterministicParsed);

    // 2. Parse candidate resume using LLM (with strict throwOnFailure -> deterministic fallback)
    let llmAvailable = true;
    const parsePrompt = `
    Extract structured candidate details from the following resume text.
    Resume Text:
    ${rawText.slice(0, 6000)}
    `;
    const parseSystem = `You are a professional recruiting parser. Extract candidate details accurately from the resume text.
    Do NOT invent fields that are not in the resume. If a section is present, extract all entries cleanly.
    Your output MUST be a strict JSON matching this schema:
    {
      "name": "Full name of candidate",
      "email": "Email address from resume or empty string",
      "phone": "Phone number from resume or empty string",
      "location": "City/State/Country from resume or empty string",
      "summary": "Brief professional summary if present or empty string",
      "skills": ["array of professional technical skills extracted"],
      "education": ["array of colleges, degrees, graduation dates, GPAs"],
      "experience": ["array of jobs, internships, roles, dates, and key achievements"],
      "projects": ["array of projects built with technologies and outcomes"],
      "certifications": ["array of certifications or awards if present"],
      "years_of_experience": 2
    }`;

    let parsedCandidate: any = null;
    try {
      parsedCandidate = await mistralService.generateStructuredCompletion(
        parsePrompt,
        parseSystem,
        'ResumeExtractor',
        true
      );
    } catch {
      llmAvailable = false;
      parsedCandidate = null;
    }

    const candidateName =
      (parsedCandidate?.name && String(parsedCandidate.name).trim()) || deterministicParsed.name;
    const candidateEmail =
      (parsedCandidate?.email && String(parsedCandidate.email).trim()) || deterministicParsed.email || email;
    const candidatePhone =
      (parsedCandidate?.phone && String(parsedCandidate.phone).trim()) || deterministicParsed.phone;
    const candidateLocation =
      (parsedCandidate?.location && String(parsedCandidate.location).trim()) || deterministicParsed.location;
    const candidateSummary =
      (parsedCandidate?.summary && String(parsedCandidate.summary).trim()) || deterministicParsed.summary;

    const candidateSkills = nonEmptyArray(parsedCandidate?.skills, deterministicParsed.skills);
    const candidateEducation = nonEmptyArray(parsedCandidate?.education, deterministicParsed.education);
    const candidateExperience = nonEmptyArray(parsedCandidate?.experience, deterministicParsed.experience);
    const candidateProjects = nonEmptyArray(parsedCandidate?.projects, deterministicParsed.projects);
    const candidateCertifications = nonEmptyArray(
      parsedCandidate?.certifications,
      deterministicParsed.certifications
    );
    const candidateYoe =
      typeof parsedCandidate?.years_of_experience === 'number'
        ? parsedCandidate.years_of_experience
        : deterministicParsed.years_of_experience;

    // 3. Compare skills to job description and calculate ATS score
    const overlapPercentage = deterministicATS.overlap_percentage;
    let atsResult: any = null;
    if (llmAvailable) {
      const atsPrompt = `
      Analyze candidate resume text against target job description. Output ATS Score and feedback.
      Resume: ${rawText.slice(0, 3500)}
      Job Description: ${jobDescription.slice(0, 2000)}
      `;
      const atsSystem = `You are an ATS algorithms auditor. Compare resume to job description.
      Your output MUST be a strict JSON matching this schema:
      {
        "ats_score": 85,
        "strengths": ["array of strong fits referencing concrete skills/experience from the resume"],
        "weaknesses_improvements": ["array of specific changes to improve keyword and role alignment"]
      }`;

      try {
        atsResult = await mistralService.generateStructuredCompletion(
          atsPrompt,
          atsSystem,
          'ATSScoring',
          true
        );
      } catch {
        llmAvailable = false;
        atsResult = null;
      }
    }

    const rawAtsScore =
      typeof atsResult?.ats_score === 'number' ? atsResult.ats_score : deterministicATS.ats_score;
    const finalAtsScore = atsResult
      ? Math.min(Math.round((rawAtsScore * 0.7 + overlapPercentage * 0.3) * 10) / 10, 100)
      : deterministicATS.ats_score;
    const finalStrengths = nonEmptyArray(atsResult?.strengths, deterministicATS.strengths);
    const finalWeaknesses = nonEmptyArray(
      atsResult?.weaknesses_improvements,
      deterministicATS.weaknesses_improvements
    );

    // 4. Career Advisor top 3 target roles
    let advisorResult: any = null;
    if (llmAvailable) {
      const advisorPrompt = `
      Candidate Skills: ${candidateSkills.join(', ')}
      Years of Experience: ${candidateYoe}
      Job Description Target: ${jobDescription.slice(0, 500)}
      `;
      const advisorSystem = `You are a tech recruiter. Recommend top 3 target roles for this profile.
      Your output MUST be a strict JSON matching this schema:
      {
        "top_roles": [
          {
            "role_name": "Backend Developer",
            "description": "Develop scalable API routes",
            "growth_trend": "18% growth YoY"
          }
        ]
      }`;

      try {
        advisorResult = await mistralService.generateStructuredCompletion(
          advisorPrompt,
          advisorSystem,
          'CareerAdvisor',
          true
        );
      } catch {
        llmAvailable = false;
        advisorResult = null;
      }
    }

    const fallbackRoles = inferRolesFromSkills(candidateSkills, jobDescription);
    const topRoles =
      Array.isArray(advisorResult?.top_roles) && advisorResult.top_roles.length > 0
        ? advisorResult.top_roles
        : fallbackRoles;
    const recommendedTopRole = topRoles[0]?.role_name || 'Software Engineer';

    // 5. Skill Gap Analysis against the recommended top role & JD
    const jdExtractedSkills = extractSkillsFromText(jobDescription);
    const candidateSkillLower = new Set(candidateSkills.map((s) => s.toLowerCase()));
    const deterministicMissingSkills = jdExtractedSkills
      .filter((s) => !candidateSkillLower.has(s.toLowerCase()))
      .map((skillName) => ({
        skill_name: skillName,
        current_proficiency: 'None',
        required_proficiency: 'Intermediate',
        estimated_learning_hours: 15,
      }));

    if (deterministicMissingSkills.length === 0 && deterministicATS.missing_keywords.length > 0) {
      deterministicATS.missing_keywords.slice(0, 4).forEach((kw) => {
        deterministicMissingSkills.push({
          skill_name: kw,
          current_proficiency: 'Beginner',
          required_proficiency: 'Intermediate',
          estimated_learning_hours: 12,
        });
      });
    }

    let gapResult: any = null;
    if (llmAvailable) {
      const gapPrompt = `
      Target Role: ${recommendedTopRole}
      Candidate Skills: ${candidateSkills.join(', ')}
      Job Description: ${jobDescription.slice(0, 1000)}
      `;
      const gapSystem = `You are a skills assessor. List present skills and missing skills.
      Your output MUST be a strict JSON matching this schema:
      {
        "skills_present": ["list of skills candidate has"],
        "skills_missing": [
          {
            "skill_name": "Kubernetes",
            "current_proficiency": "None",
            "required_proficiency": "Intermediate",
            "estimated_learning_hours": 30
          }
        ]
      }`;

      try {
        gapResult = await mistralService.generateStructuredCompletion(
          gapPrompt,
          gapSystem,
          'SkillGap',
          true
        );
      } catch {
        llmAvailable = false;
        gapResult = null;
      }
    }

    const skillsPresent = nonEmptyArray(gapResult?.skills_present, candidateSkills);
    const skillsMissing =
      Array.isArray(gapResult?.skills_missing) && gapResult.skills_missing.length > 0
        ? gapResult.skills_missing
        : deterministicMissingSkills;
    const missingSkillsNames = skillsMissing.map((s: any) => s.skill_name);

    // 6. Roadmap Generation for missing skills
    let roadmapResult: any = null;
    if (llmAvailable) {
      const roadmapPrompt = `
      Target Role: ${recommendedTopRole}
      Missing Skills: ${missingSkillsNames.join(', ')}
      `;
      const roadmapSystem = `You are a curriculum creator. Build a weekly study plan.
      Your output MUST be a strict JSON matching this schema:
      {
        "weekly_plan": [
          {
            "week_number": 1,
            "topic": "Topic title",
            "resource_link": "https://docs.example.com/",
            "milestone": "Practical milestone"
          }
        ]
      }`;

      try {
        roadmapResult = await mistralService.generateStructuredCompletion(
          roadmapPrompt,
          roadmapSystem,
          'Roadmap',
          true
        );
      } catch {
        llmAvailable = false;
        roadmapResult = null;
      }
    }

    const fallbackPlan =
      missingSkillsNames.length > 0
        ? missingSkillsNames.slice(0, 4).map((skill: string, idx: number) => ({
            week_number: idx + 1,
            topic: `${skill} Core Concepts & Applied Integration`,
            resource_link: `https://www.google.com/search?q=${encodeURIComponent(skill + ' official documentation tutorial')}`,
            milestone: `Build and document a practical ${recommendedTopRole} module using ${skill}`,
          }))
        : [
            {
              week_number: 1,
              topic: `${recommendedTopRole} System Design & Architecture Review`,
              resource_link: 'https://roadmap.sh/',
              milestone: 'Document architecture tradeoffs and performance benchmarks for flagship projects',
            },
          ];

    const weeklyPlan =
      Array.isArray(roadmapResult?.weekly_plan) && roadmapResult.weekly_plan.length > 0
        ? roadmapResult.weekly_plan
        : fallbackPlan;

    // 7. Interview Prep Questions (10 technical + 5 behavioral)
    let prepResult: any = null;
    if (llmAvailable) {
      const prepPrompt = `
      Target Role: ${recommendedTopRole}
      Missing Skills: ${missingSkillsNames.join(', ')}
      Present Skills: ${skillsPresent.join(', ')}
      `;
      const prepSystem = `You are a lead interviewer. Generate 10 technical questions and 5 behavioral questions.
      Each question must contain model answers at 3 difficulty levels: Beginner, Intermediate, Expert.
      Your output MUST be a strict JSON matching this schema:
      {
        "technical_questions": [
          {
            "question": "Question text here",
            "category": "Technical",
            "beginner_answer": "...",
            "intermediate_answer": "...",
            "expert_answer": "..."
          }
        ],
        "behavioral_questions": [
          {
            "question": "Question text here",
            "category": "Behavioral",
            "beginner_answer": "...",
            "intermediate_answer": "...",
            "expert_answer": "..."
          }
        ]
      }`;

      try {
        prepResult = await mistralService.generateStructuredCompletion(
          prepPrompt,
          prepSystem,
          'InterviewPrep',
          true
        );
      } catch {
        llmAvailable = false;
        prepResult = null;
      }
    }

    const focusSkills = [...skillsPresent, ...missingSkillsNames];
    const finalTechQuestions = (Array.isArray(prepResult?.technical_questions) ? prepResult.technical_questions : []).slice(0, 10);
    const finalBehQuestions = (Array.isArray(prepResult?.behavioral_questions) ? prepResult.behavioral_questions : []).slice(0, 5);

    while (finalTechQuestions.length < 10) {
      const idx = finalTechQuestions.length;
      const skillTopic = focusSkills[idx % Math.max(1, focusSkills.length)] || recommendedTopRole;
      finalTechQuestions.push({
        question: `How have you applied ${skillTopic} in a production or project setting, and what trade-offs did you consider?`,
        category: 'Technical',
        beginner_answer: `Explain what ${skillTopic} does and describe a basic use case where you used it.`,
        intermediate_answer: `Walk through how you structured ${skillTopic}, handled edge cases, and integrated it with the rest of your stack.`,
        expert_answer: `Discuss performance bottlenecks, failure modes, observability, and architectural trade-offs when scaling ${skillTopic}.`,
      });
    }
    while (finalBehQuestions.length < 5) {
      const idx = finalBehQuestions.length;
      const prompts = [
        'Describe a challenging technical bug you diagnosed under a tight deadline.',
        'Tell me about a time you had to learn a new technology quickly to deliver a project.',
        'How do you prioritize conflicting requirements or technical debt during a sprint?',
        'Describe a disagreement on architecture or implementation and how you resolved it.',
        'Walk through a project you are proud of and what you would improve if rebuilding it today.',
      ];
      finalBehQuestions.push({
        question: prompts[idx % prompts.length],
        category: 'Behavioral',
        beginner_answer: 'Briefly describe the situation and the action you took.',
        intermediate_answer: 'Use the STAR method (Situation, Task, Action, Result) with concrete details.',
        expert_answer: 'Highlight measurable impact, stakeholder alignment, and long-term engineering lessons applied afterward.',
      });
    }

    // 8. Document RAG: chunk resume and upload to Pinecone
    const chunks = splitTextIntoChunks(rawText);
    const ragIngested = {
      filename: safeFilename,
      chunksCount: chunks.length,
      file_url: fileUrl,
    };

    if (chunks.length > 0) {
      console.log(`Pipeline Document RAG: Ingesting resume (${chunks.length} chunks) to vector store...`);
      const embeddings: number[][] = [];
      for (const chunk of chunks) {
        const emb = await mistralService.getEmbedding(chunk);
        embeddings.push(emb);
      }
      const metadatas = chunks.map((_, i) => ({
        document_name: safeFilename,
        chunk_index: i,
      }));
      await pineconeService.upsertChunks(chunks, embeddings, metadatas);
      await dbManager.saveDocument(safeFilename, chunks, fileUrl || undefined);
    }

    // 9. Knowledge Graph JSON Structure
    const graphNodes: any[] = [
      { id: candidateName, category: 'User' },
      { id: recommendedTopRole, category: 'Role' },
    ];
    const graphEdges: any[] = [
      { source: candidateName, target: recommendedTopRole, relationship: 'aims_for' },
    ];

    skillsPresent.forEach((skill: string) => {
      graphNodes.push({ id: skill, category: 'Skill' });
      graphEdges.push({ source: recommendedTopRole, target: skill, relationship: 'requires', isGap: false });
    });

    skillsMissing.forEach((gap: any) => {
      graphNodes.push({ id: gap.skill_name, category: 'Skill' });
      graphEdges.push({ source: recommendedTopRole, target: gap.skill_name, relationship: 'missing_for', isGap: true });

      const resNodeName = `Study: ${gap.skill_name}`;
      graphNodes.push({ id: resNodeName, category: 'Resource' });
      graphEdges.push({ source: resNodeName, target: gap.skill_name, relationship: 'teaches' });
    });

    candidateProjects.forEach((proj: string) => {
      graphNodes.push({ id: proj, category: 'Project' });
      graphEdges.push({ source: candidateName, target: proj, relationship: 'built' });
      if (skillsPresent.length > 0) {
        graphEdges.push({ source: proj, target: skillsPresent[0], relationship: 'implements' });
      }
    });

    // 10. Vector Embeddings
    const embeddingTexts = [
      candidateName,
      recommendedTopRole,
      ...skillsPresent,
      ...missingSkillsNames,
      ...candidateProjects,
    ];

    console.log(`Generating visual coordinates for ${embeddingTexts.length} items...`);
    const coordVectors = await Promise.all(embeddingTexts.map((txt) => mistralService.getEmbedding(txt)));

    const vectorEmbeddings = embeddingTexts.map((txt, i) => {
      let category = 'General';
      if (txt === candidateName) category = 'User';
      else if (txt === recommendedTopRole) category = 'Role';
      else if (skillsPresent.includes(txt)) category = 'Skill';
      else if (missingSkillsNames.includes(txt)) category = 'Skill';
      else if (candidateProjects.includes(txt)) category = 'Project';

      const coords = projectTo3D(coordVectors[i], txt, i);

      return {
        label: txt,
        category,
        coords,
        embedding: coordVectors[i],
      };
    });

    // 11. Readiness Score calculation
    let mockAvg = 75.0;
    try {
      const userObj = await dbManager.getUser(email);
      if (userObj && userObj.id) {
        const dbInfo = await dbManager.getDiagnostics();
        if (dbInfo.mockInterviewsCount > 0) {
          mockAvg = 80.0;
        }
      }
    } catch {
      // Ignore
    }

    const totalSkills = skillsPresent.length + skillsMissing.length;
    const skillsMappedPct = totalSkills > 0 ? (skillsPresent.length / totalSkills) * 100 : 100;
    const readinessScore = Math.round((finalAtsScore * 0.3 + skillsMappedPct * 0.3 + mockAvg * 0.4) * 10) / 10;

    // Compile unified session payload
    const pipelineData = {
      email,
      candidate_email: candidateEmail,
      name: candidateName,
      phone: candidatePhone,
      location: candidateLocation,
      links: deterministicParsed.links,
      summary: candidateSummary,
      years_of_experience: candidateYoe,
      target_role: recommendedTopRole,
      job_description: jobDescription,
      skills_extracted: candidateSkills,
      education: candidateEducation,
      experience: candidateExperience,
      projects: candidateProjects,
      certifications: candidateCertifications,
      ats_score: finalAtsScore,
      strengths: finalStrengths,
      weaknesses_improvements: finalWeaknesses,
      overlap_percentage: overlapPercentage,
      matched_keywords: deterministicATS.matched_keywords,
      missing_keywords: deterministicATS.missing_keywords,
      file_url: fileUrl,
      career_recommendations: topRoles,
      skills_present: skillsPresent,
      skills_missing: skillsMissing,
      roadmap: weeklyPlan,
      interview_questions: {
        technical: finalTechQuestions,
        behavioral: finalBehQuestions,
      },
      knowledge_graph: {
        nodes: graphNodes,
        edges: graphEdges,
      },
      vector_embeddings: vectorEmbeddings,
      readiness_score: readinessScore,
      rag_ingested: ragIngested,
      created_at: new Date().toISOString(),
    };

    try {
      const savedUser = await dbManager.saveUser(
        candidateName,
        email,
        recommendedTopRole,
        readinessScore
      );

      if (savedUser && savedUser.id) {
        await dbManager.saveResume(
          savedUser.id,
          safeFilename,
          rawText,
          finalAtsScore,
          fileUrl || undefined
        );
      }

      await dbManager.savePipelineSession(email, pipelineData);
      console.log(`Successfully completed and saved career preparation pipeline for: ${email}`);
    } catch (dbErr) {
      console.error('Failed to log session data inside db manager:', dbErr);
    }

    return NextResponse.json(pipelineData);
  } catch (err) {
    console.error('Unified Career Pipeline failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
