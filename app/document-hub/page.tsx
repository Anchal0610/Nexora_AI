'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCareer } from '@/components/CareerContext';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  FileText,
  Database,
  Upload,
  CheckCircle,
  Search,
  PlusCircle,
  HelpCircle,
  FileCheck,
  RefreshCw,
  X,
  Briefcase,
  GraduationCap,
  Code2,
  Award,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export default function DocumentHubPage() {
  const router = useRouter();
  const {
    email: loggedInEmail,
    sessionData,
    loading,
    error,
    uploadResume,
    resetCareerSession,
  } = useCareer();

  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'ats' | 'rag'>('ats');
  const [isReuploading, setIsReuploading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [reuploadSuccess, setReuploadSuccess] = useState('');
  const [formResetKey, setFormResetKey] = useState(0);

  // Additional RAG Doc Upload
  const [extraFile, setExtraFile] = useState<File | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [extraSuccess, setExtraSuccess] = useState('');
  const [extraError, setExtraError] = useState('');

  // RAG query state
  const [query, setQuery] = useState('');
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [answer, setAnswer] = useState('');
  const [citation, setCitation] = useState('');
  const [queryError, setQueryError] = useState('');

  useEffect(() => {
    if (sessionData?.email) {
      setEmail(sessionData.email);
    } else if (loggedInEmail) {
      setEmail(loggedInEmail);
    }
  }, [sessionData, loggedInEmail]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleExtraFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setExtraFile(e.target.files[0]);
    }
  };

  const handlePipelineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !jobDescription || !email) return;

    setReuploadSuccess('');
    const wasReuploading = isReuploading;
    const ok = await uploadResume(file, jobDescription, email);
    if (ok) {
      setFile(null);
      setFormResetKey((k) => k + 1);
      setIsReuploading(false);
      setAnswer('');
      setCitation('');
      setQuery('');
      setQueryError('');
      if (wasReuploading) {
        setReuploadSuccess('Updated resume analyzed and career session refreshed.');
      }
    }
  };

  const handleOpenReupload = () => {
    setReuploadSuccess('');
    setFile(null);
    setFormResetKey((k) => k + 1);
    if (!jobDescription && sessionData?.job_description) {
      setJobDescription(sessionData.job_description);
    }
    setIsReuploading((prev) => !prev);
  };

  const handleResetSession = async () => {
    setResetting(true);
    try {
      await resetCareerSession();
      setFile(null);
      setJobDescription('');
      setActiveTab('ats');
      setIsReuploading(false);
      setReuploadSuccess('');
      setExtraFile(null);
      setExtraSuccess('');
      setExtraError('');
      setQuery('');
      setAnswer('');
      setCitation('');
      setQueryError('');
      setFormResetKey((k) => k + 1);
      router.refresh();
    } finally {
      setResetting(false);
    }
  };

  const handleExtraUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setExtraError('');
    setExtraSuccess('');
    if (!extraFile) return;

    setLoadingExtra(true);
    try {
      const formData = new FormData();
      formData.append('file', extraFile);

      const res = await fetch('/api/document/ingest', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to ingest additional document.');
      }

      const data = await res.json();
      setExtraSuccess(`Successfully ingested "${extraFile.name}"! Indexed ${data.chunksCount} chunks.`);
      setExtraFile(null);
    } catch (err) {
      setExtraError((err as Error).message);
    } finally {
      setLoadingExtra(false);
    }
  };

  const handleRAGSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setQueryError('');
    if (!query) return;

    setLoadingQuery(true);
    try {
      const res = await fetch('/api/document/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'RAG search query failed.');
      }

      const data = await res.json();
      setAnswer(data.answer);
      setCitation(data.context);
    } catch (err) {
      setQueryError((err as Error).message);
    } finally {
      setLoadingQuery(false);
    }
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5';
    if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/5';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/5';
  };

  const renderResumeUploadCard = (isUpdateMode: boolean) => (
    <Card className="bg-surface border-border p-6 shadow-xl">
      <CardHeader className="p-0 pb-3 border-b border-border/30 mb-5 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">
          {isUpdateMode ? 'Re-upload Updated Resume & Target Job' : 'Ingest New Resume & Target Job'}
        </CardTitle>
        {isUpdateMode && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsReuploading(false);
              setFile(null);
            }}
            className="text-xs text-muted hover:text-white h-7 px-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Cancel
          </Button>
        )}
      </CardHeader>
      <form onSubmit={handlePipelineSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] font-bold tracking-wider text-muted uppercase">
            {isUpdateMode ? 'Upload Updated Resume File' : 'Upload Resume File'}
          </label>
          <div className="relative border border-dashed border-border rounded-lg p-6 bg-zinc-950/40 text-center hover:border-accent/40 transition-colors cursor-pointer">
            <input
              key={formResetKey}
              type="file"
              required
              accept=".pdf,.docx,.pptx,.txt"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="text-muted text-[11px] py-1">
              <Upload className="w-5 h-5 mx-auto mb-2 text-muted" />
              {file ? (
                <span className="text-accent font-semibold">Selected: {file.name}</span>
              ) : (
                <span>Drag & drop or click to upload PDF, DOCX, or TXT</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold tracking-wider text-muted uppercase">User Email</label>
          <Input
            type="email"
            disabled
            value={email}
            className="bg-zinc-950 border-border text-muted-foreground text-xs h-9 cursor-not-allowed select-none opacity-80"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold tracking-wider text-muted uppercase">Target Job Description</label>
          <Textarea
            required
            placeholder="Paste the job description of the target role here. The AI will extract requirements, calculate fit, identify gaps, and format a study roadmap..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="bg-zinc-950 border-border text-white text-xs min-h-[140px]"
          />
        </div>

        {error && (
          <div className="p-3 rounded bg-rose-500/5 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            Error: {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !file || !jobDescription || !email}
          className="w-full bg-accent hover:bg-accent-glow text-white font-bold h-9 text-xs uppercase tracking-wider transition-colors rounded cursor-pointer"
        >
          {loading
            ? isUpdateMode
              ? 'Re-analyzing Updated Resume...'
              : 'Running Unified Career Pipeline...'
            : isUpdateMode
              ? 'Re-upload & Re-analyze Resume'
              : 'Generate Career Intelligence Session'}
        </Button>
      </form>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/30 pb-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
            <Database className="text-accent w-6 h-6" /> Document Hub
          </h1>
          <p className="text-xs text-muted">
            Upload once to analyze resume ATS match and build your custom semantic RAG search space
          </p>
        </div>
        {sessionData && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={handleOpenReupload}
              disabled={loading || resetting}
              className="text-xs border-accent/40 bg-accent/10 hover:bg-accent/20 text-white h-8 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-accent" />
              {isReuploading ? 'Close Re-upload' : 'Re-upload Resume'}
            </Button>
            <Button
              variant="outline"
              onClick={handleResetSession}
              disabled={loading || resetting}
              className="text-xs border-border hover:bg-surface-2 text-white h-8 cursor-pointer"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', resetting && 'animate-spin')} />
              {resetting ? 'Resetting...' : 'Reset Session'}
            </Button>
          </div>
        )}
      </div>

      {/* 2. Initial Upload View if no sessionData exists */}
      {!sessionData ? (
        <div className="max-w-2xl mx-auto">{renderResumeUploadCard(false)}</div>
      ) : (
        /* 3. Session Active - Show Optional Re-upload Drawer + Tabs */
        <div className="space-y-6">
          {reuploadSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{reuploadSuccess}</span>
            </div>
          )}

          {isReuploading && (
            <div className="max-w-2xl mx-auto">{renderResumeUploadCard(true)}</div>
          )}

          {/* Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-surface border-border p-4 flex items-center gap-3">
              <div className="bg-accent/10 p-2.5 rounded-lg shrink-0">
                <FileText className="text-accent w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono tracking-tight text-white">{sessionData.ats_score}%</p>
                <p className="text-[10px] text-muted font-semibold uppercase tracking-wider">ATS Match Score</p>
              </div>
            </Card>

            <Card className="bg-surface border-border p-4 flex items-center gap-3">
              <div className="bg-accent/10 p-2.5 rounded-lg shrink-0">
                <CheckCircle className="text-accent w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono tracking-tight text-white">
                  {sessionData.skills_present.length} /{' '}
                  {sessionData.skills_present.length + sessionData.skills_missing.length}
                </p>
                <p className="text-[10px] text-muted font-semibold uppercase tracking-wider">Skills Mapped</p>
              </div>
            </Card>

            <Card className="bg-surface border-border p-4 flex items-center gap-3">
              <div className="bg-accent/10 p-2.5 rounded-lg shrink-0">
                <FileCheck className="text-accent w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold truncate tracking-tight text-white" style={{ maxWidth: '170px' }}>
                  {sessionData.target_role}
                </p>
                <p className="text-[10px] text-muted font-semibold uppercase tracking-wider">Top Recommended Role</p>
              </div>
            </Card>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-border/30 gap-4">
            <button
              onClick={() => setActiveTab('ats')}
              className={cn(
                'pb-3 text-xs tracking-wider uppercase font-bold border-b-2 px-1 transition-all cursor-pointer',
                activeTab === 'ats'
                  ? 'text-accent border-accent font-extrabold'
                  : 'text-muted border-transparent hover:text-white'
              )}
            >
              Resume ATS Analyzer
            </button>
            <button
              onClick={() => setActiveTab('rag')}
              className={cn(
                'pb-3 text-xs tracking-wider uppercase font-bold border-b-2 px-1 transition-all cursor-pointer',
                activeTab === 'rag'
                  ? 'text-accent border-accent font-extrabold'
                  : 'text-muted border-transparent hover:text-white'
              )}
            >
              Semantic RAG Assistant
            </button>
          </div>

          {/* Tab Contents */}
          {activeTab === 'ats' ? (
            /* ATS Tab */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Resume Score + Candidate Details */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="bg-surface border-border p-5">
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
                      Resume Score
                    </div>
                    <div
                      className={cn(
                        'w-28 h-28 rounded-full border-4 mx-auto flex flex-col justify-center items-center font-mono text-3xl font-extrabold',
                        getScoreColorClass(sessionData.ats_score)
                      )}
                    >
                      {sessionData.ats_score}%
                    </div>
                  </div>

                  {sessionData.file_url && (
                    <div className="mt-4 p-2.5 rounded bg-zinc-950 border border-border text-[11px] text-zinc-300 text-center">
                      Cloud Backup File:{' '}
                      <a
                        href={sessionData.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-bold text-accent hover:text-accent-glow"
                      >
                        File Link URL
                      </a>
                    </div>
                  )}

                  <div className="mt-4 p-3.5 bg-zinc-950 border border-border rounded-lg space-y-2 text-xs text-muted">
                    <div className="flex justify-between gap-2">
                      <span>Candidate:</span>
                      <strong className="text-white text-right">{sessionData.name}</strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Resume Email:</span>
                      <strong className="text-white text-right truncate">
                        {sessionData.candidate_email || sessionData.email}
                      </strong>
                    </div>
                    {sessionData.phone && (
                      <div className="flex justify-between gap-2">
                        <span>Phone:</span>
                        <strong className="text-white font-mono text-right">{sessionData.phone}</strong>
                      </div>
                    )}
                    {sessionData.location && (
                      <div className="flex justify-between gap-2">
                        <span>Location:</span>
                        <strong className="text-white text-right">{sessionData.location}</strong>
                      </div>
                    )}
                    {sessionData.rag_ingested && (
                      <div className="flex justify-between gap-2">
                        <span>RAG Ingest Status:</span>
                        <strong className="text-emerald-400 font-mono">
                          ACTIVE ({sessionData.rag_ingested.chunksCount} chunks)
                        </strong>
                      </div>
                    )}
                  </div>

                  {(sessionData.links?.linkedin || sessionData.links?.github || sessionData.links?.portfolio) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sessionData.links.linkedin && (
                        <a
                          href={sessionData.links.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold hover:bg-blue-500/20"
                        >
                          LinkedIn <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {sessionData.links.github && (
                        <a
                          href={sessionData.links.github}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 text-[11px] font-semibold hover:bg-zinc-700"
                        >
                          GitHub <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {sessionData.links.portfolio && (
                        <a
                          href={sessionData.links.portfolio}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-semibold hover:bg-cyan-500/20"
                        >
                          Portfolio <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </Card>

                {/* Candidate Details */}
                <Card className="bg-surface border-border p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Candidate Details</h3>

                  {sessionData.summary && (
                    <div className="p-3 rounded-lg bg-zinc-950 border border-border/80 space-y-1">
                      <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider">Summary</h4>
                      <p className="text-xs text-zinc-300 leading-relaxed">{sessionData.summary}</p>
                    </div>
                  )}

                  <div className="space-y-4 text-xs">
                    {/* Extracted Skills */}
                    <div>
                      <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">
                        Extracted Skills
                      </h4>
                      {sessionData.skills_extracted && sessionData.skills_extracted.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {sessionData.skills_extracted.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200 text-[11px] font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted italic">No structured skills detected in resume.</p>
                      )}
                    </div>

                    {/* Education */}
                    <div className="pt-2 border-t border-border/30">
                      <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-cyan-400" /> Education
                      </h4>
                      {sessionData.education && sessionData.education.length > 0 ? (
                        <ul className="list-disc list-inside text-zinc-300 space-y-1.5 leading-relaxed">
                          {sessionData.education.map((edu, idx) => (
                            <li key={idx}>{edu}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted italic">No education entries detected in resume.</p>
                      )}
                    </div>

                    {/* Experience */}
                    <div className="pt-2 border-t border-border/30">
                      <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-blue-400" /> Experience
                      </h4>
                      {sessionData.experience && sessionData.experience.length > 0 ? (
                        <ul className="list-disc list-inside text-zinc-300 space-y-1.5 leading-relaxed">
                          {sessionData.experience.map((exp, idx) => (
                            <li key={idx}>{exp}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted italic">No work experience entries detected in resume.</p>
                      )}
                    </div>

                    {/* Projects */}
                    <div className="pt-2 border-t border-border/30">
                      <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-emerald-400" /> Projects
                      </h4>
                      {sessionData.projects && sessionData.projects.length > 0 ? (
                        <ul className="list-disc list-inside text-zinc-300 space-y-1.5 leading-relaxed">
                          {sessionData.projects.map((proj, idx) => (
                            <li key={idx}>{proj}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted italic">No project entries detected in resume.</p>
                      )}
                    </div>

                    {/* Certifications */}
                    {sessionData.certifications && sessionData.certifications.length > 0 && (
                      <div className="pt-2 border-t border-border/30">
                        <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-400" /> Certifications &amp; Achievements
                        </h4>
                        <ul className="list-disc list-inside text-zinc-300 space-y-1.5 leading-relaxed">
                          {sessionData.certifications.map((cert, idx) => (
                            <li key={idx}>{cert}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Right Column: Resume Fit & Keywords Match */}
              <div className="lg:col-span-7 space-y-6">
                <Card className="bg-surface border-border p-5 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-2">
                      Resume Fit &amp; Keywords Match
                    </h3>
                    <div className="p-3 bg-zinc-950 border border-border rounded text-xs text-muted">
                      Keyword match overlap:{' '}
                      <strong className="text-white font-mono">{sessionData.overlap_percentage}%</strong> of target job
                      description phrases are represented in resume text.
                    </div>
                  </div>

                  {(sessionData.matched_keywords?.length || sessionData.missing_keywords?.length) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-zinc-950/70 border border-border/70 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          Matched JD Keywords ({sessionData.matched_keywords?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(sessionData.matched_keywords || []).map((kw, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-mono"
                            >
                              {kw}
                            </span>
                          ))}
                          {(!sessionData.matched_keywords || sessionData.matched_keywords.length === 0) && (
                            <span className="text-[11px] text-muted">None matched yet</span>
                          )}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-zinc-950/70 border border-border/70 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          Missing JD Keywords ({sessionData.missing_keywords?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(sessionData.missing_keywords || []).map((kw, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono"
                            >
                              {kw}
                            </span>
                          ))}
                          {(!sessionData.missing_keywords || sessionData.missing_keywords.length === 0) && (
                            <span className="text-[11px] text-emerald-400">All target keywords covered</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-5 pt-2 border-t border-border/30">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5">
                        Profile Strengths
                      </h4>
                      {sessionData.strengths && sessionData.strengths.length > 0 ? (
                        <ul className="space-y-2 text-xs text-zinc-300 leading-relaxed">
                          {sessionData.strengths.map((str, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-400 font-extrabold mt-0.5">+</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted">Re-upload resume to compute profile strengths.</p>
                      )}
                    </div>

                    <div className="border-t border-border/30 pt-4">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5">
                        ATS Improvement Areas
                      </h4>
                      {sessionData.weaknesses_improvements && sessionData.weaknesses_improvements.length > 0 ? (
                        <ul className="space-y-2 text-xs text-zinc-300 leading-relaxed">
                          {sessionData.weaknesses_improvements.map((weak, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-rose-400 font-extrabold mt-0.5">-</span>
                              <span>{weak}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted">No critical ATS gaps detected.</p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            /* Document RAG Tab */
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
              {/* Ingest Extra Documents */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-surface border-border p-5">
                  <CardHeader className="p-0 pb-3 border-b border-border/30 mb-4">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-white">
                      Add Reference Documents
                    </CardTitle>
                  </CardHeader>
                  <form onSubmit={handleExtraUpload} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-wider text-muted uppercase">
                        Upload reference (PDF, DOCX, TXT)
                      </label>
                      <div className="relative border border-dashed border-border rounded p-4 bg-zinc-950/40 text-center hover:border-accent/40 transition-colors cursor-pointer">
                        <input
                          type="file"
                          required
                          accept=".pdf,.docx,.pptx,.txt"
                          onChange={handleExtraFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="text-muted text-[10px] py-1">
                          <PlusCircle className="w-5 h-5 mx-auto mb-2 text-muted" />
                          {extraFile ? (
                            <span className="text-accent font-semibold">Selected: {extraFile.name}</span>
                          ) : (
                            <span>Upload extra context for search</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {extraSuccess && (
                      <div className="p-2.5 rounded bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                        {extraSuccess}
                      </div>
                    )}

                    {extraError && (
                      <div className="p-2.5 rounded bg-rose-500/5 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                        {extraError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loadingExtra || !extraFile}
                      className="w-full bg-white hover:bg-zinc-200 text-black font-bold h-8 text-xs uppercase tracking-wider transition-colors rounded cursor-pointer"
                    >
                      {loadingExtra ? 'Ingesting document...' : 'Ingest to Vector Store'}
                    </Button>
                  </form>
                </Card>

                <Card className="bg-surface border-border p-5 text-xs text-muted">
                  <h4 className="font-bold text-white uppercase mb-2">Search Space Ingested Nodes</h4>
                  <ul className="space-y-1.5 list-disc list-inside">
                    <li>
                      Resume:{' '}
                      <strong className="text-white font-mono">
                        {sessionData.rag_ingested?.filename || 'Uploaded Resume'}
                      </strong>
                    </li>
                    {sessionData.rag_ingested && (
                      <li>
                        Chunks count:{' '}
                        <strong className="text-white font-mono">{sessionData.rag_ingested.chunksCount}</strong>
                      </li>
                    )}
                    <li>
                      Status: <strong className="text-emerald-400 font-mono">Semantic Queries Ready</strong>
                    </li>
                  </ul>
                </Card>
              </div>

              {/* RAG Query Interface */}
              <Card className="bg-surface border-border lg:col-span-3 p-5 min-h-[400px] space-y-6">
                <CardHeader className="p-0 pb-3 border-b border-border/30">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-accent" /> Semantic Vector Search (RAG)
                  </CardTitle>
                </CardHeader>

                <form onSubmit={handleRAGSearch} className="flex gap-2">
                  <Input
                    type="text"
                    required
                    placeholder="Ask questions about candidate's resume or other ingested documents..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="bg-zinc-950 border-border text-white text-xs h-9 flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={loadingQuery}
                    className="bg-accent hover:bg-accent-glow text-white font-bold h-9 px-4 text-xs uppercase tracking-wider transition-colors rounded cursor-pointer"
                  >
                    {loadingQuery ? 'Searching...' : 'Ask'}
                  </Button>
                </form>

                {queryError && (
                  <div className="p-3 rounded bg-rose-500/5 border border-rose-500/20 text-rose-400 text-xs">
                    {queryError}
                  </div>
                )}

                {answer && (
                  <div className="space-y-4 pt-2 border-t border-border/30">
                    <div>
                      <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Answer Synthesis</h5>
                      <div className="p-4 bg-zinc-950 border border-border rounded text-zinc-300 text-xs leading-relaxed font-sans">
                        {answer}
                      </div>
                    </div>

                    {citation && (
                      <div>
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                          Retrieved Vector Chunk Citation Context
                        </h5>
                        <pre className="p-4 bg-zinc-950 border border-border rounded text-zinc-500 text-[10px] leading-normal font-mono whitespace-pre-wrap max-h-[160px] overflow-y-auto scrollbar-thin">
                          {citation}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {!answer && !loadingQuery && (
                  <div className="text-center py-20 text-xs text-muted flex flex-col items-center gap-2">
                    <HelpCircle className="w-8 h-8 text-muted/50" />
                    <span>Input queries to run similarity search across vector store spaces.</span>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
