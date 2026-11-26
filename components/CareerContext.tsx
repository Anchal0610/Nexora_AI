'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface PipelineSessionData {
  email: string;
  name: string;
  target_role: string;
  job_description?: string;
  skills_extracted: string[];
  education: string[];
  experience: string[];
  projects: string[];
  ats_score: number;
  strengths: string[];
  weaknesses_improvements: string[];
  overlap_percentage: number;
  file_url: string | null;
  career_recommendations: {
    role_name: string;
    description: string;
    growth_trend: string;
  }[];
  skills_present: string[];
  skills_missing: {
    skill_name: string;
    current_proficiency: string;
    required_proficiency: string;
    estimated_learning_hours: number;
  }[];
  roadmap: {
    week_number: number;
    topic: string;
    resource_link: string;
    milestone: string;
  }[];
  interview_questions: {
    technical: {
      question: string;
      category: string;
      beginner_answer: string;
      intermediate_answer: string;
      expert_answer: string;
    }[];
    behavioral: {
      question: string;
      category: string;
      beginner_answer: string;
      intermediate_answer: string;
      expert_answer: string;
    }[];
  };
  knowledge_graph: {
    nodes: { id: string; category: string }[];
    edges: { source: string; target: string; relationship: string; isGap?: boolean }[];
  };
  vector_embeddings: {
    label: string;
    category: string;
    coords: number[];
    embedding?: number[];
  }[];
  readiness_score: number;
  rag_ingested: {
    filename: string;
    chunksCount: number;
    file_url: string | null;
  } | null;
  created_at: string;
}

export interface User {
  id?: string;
  name: string;
  email: string;
  picture?: string;
  target_role?: string;
  readiness_score: number;
  created_at?: string;
}

interface CareerContextType {
  email: string;
  user: User | null;
  sessionData: PipelineSessionData | null;
  loading: boolean;
  authChecking: boolean;
  error: string | null;
  setEmail: (email: string) => void;
  loadSession: (email: string) => Promise<boolean>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  uploadResume: (file: File, jobDescription: string, email: string) => Promise<boolean>;
  resetCareerSession: () => Promise<void>;
  clearSession: () => void;
}

interface OAuthExchangeResult {
  user?: User;
  session?: PipelineSessionData | null;
  error?: string;
}

// Deduplicate single-use Google authorization code exchanges across React Strict Mode mounts
const oauthExchangeCache = new Map<string, Promise<OAuthExchangeResult>>();

function exchangeGoogleCodeOnce(code: string, state: string | null): Promise<OAuthExchangeResult> {
  const existing = oauthExchangeCache.get(code);
  if (existing) {
    return existing;
  }

  const promise = (async (): Promise<OAuthExchangeResult> => {
    try {
      const res = await fetch('/api/auth/google/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Google authentication failed.' };
      }
      return { user: data.user, session: data.session ?? null };
    } catch (err) {
      return { error: (err as Error).message || 'Google authentication failed.' };
    }
  })();

  oauthExchangeCache.set(code, promise);
  return promise;
}

function clearPipelineStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('nexora_session_data');
  localStorage.removeItem('atsScore');
  localStorage.removeItem('overallReadiness');
  localStorage.removeItem('gapPercentage');
  localStorage.removeItem('currentSkills');
  localStorage.removeItem('missingSkills');
  localStorage.removeItem('targetRole');
}

function clearLocalStorageSession() {
  if (typeof window === 'undefined') return;
  clearPipelineStorage();
  localStorage.removeItem('nexora_user_email');
  localStorage.removeItem('nexora_user');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
}

function syncSessionToStorage(userObj: User, session: PipelineSessionData | null) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('nexora_user', JSON.stringify(userObj));
  localStorage.setItem('nexora_user_email', userObj.email);
  localStorage.setItem('userEmail', userObj.email);
  localStorage.setItem('userName', userObj.name);

  if (session) {
    const presentCount = session.skills_present?.length || 0;
    const missingCount = session.skills_missing?.length || 0;
    const totalSkills = presentCount + missingCount;
    const gapPercentage = totalSkills > 0 ? 100 - (presentCount / totalSkills) * 100 : 0;

    localStorage.setItem('nexora_session_data', JSON.stringify(session));
    localStorage.setItem('atsScore', session.ats_score.toString());
    localStorage.setItem('overallReadiness', session.readiness_score.toString());
    localStorage.setItem('gapPercentage', gapPercentage.toString());
    localStorage.setItem('currentSkills', (session.skills_present || []).join(', '));
    localStorage.setItem(
      'missingSkills',
      JSON.stringify((session.skills_missing || []).map((s) => s.skill_name))
    );
    localStorage.setItem('targetRole', session.target_role || '');
  } else {
    localStorage.removeItem('nexora_session_data');
    localStorage.removeItem('atsScore');
    localStorage.removeItem('overallReadiness');
    localStorage.removeItem('gapPercentage');
    localStorage.removeItem('currentSkills');
    localStorage.removeItem('missingSkills');
    localStorage.removeItem('targetRole');
  }
}

const CareerContext = createContext<CareerContextType | undefined>(undefined);

export function CareerProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmailState] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [sessionData, setSessionData] = useState<PipelineSessionData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const setEmail = (newEmail: string) => {
    setEmailState(newEmail);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexora_user_email', newEmail);
    }
  };

  const applyAuthenticatedState = (nextUser: User, nextSession: PipelineSessionData | null) => {
    setUser(nextUser);
    setEmailState(nextUser.email);
    setSessionData(nextSession);
    setError(null);
    syncSessionToStorage(nextUser, nextSession);
  };

  // Handle Google OAuth redirect callback and restore verified Google session on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;

    const initAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const oauthCode = params.get('code');
      const oauthState = params.get('state');
      const oauthError = params.get('error');
      const authError = params.get('auth_error');

      if (oauthError || authError) {
        if (!cancelled) {
          setError(
            authError ||
              (oauthError === 'access_denied'
                ? 'Google sign-in was cancelled.'
                : `Google sign-in failed: ${oauthError}`)
          );
          clearLocalStorageSession();
          setAuthChecking(false);
          window.history.replaceState({}, '', window.location.pathname);
        }
        return;
      }

      if (oauthCode) {
        const result = await exchangeGoogleCodeOnce(oauthCode, oauthState);
        if (!cancelled) {
          window.history.replaceState({}, '', window.location.pathname);
          if (result.user) {
            applyAuthenticatedState(result.user, result.session ?? null);
          } else {
            clearLocalStorageSession();
            setError(result.error || 'Failed to authenticate with Google.');
          }
          setAuthChecking(false);
        }
        return;
      }

      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled) {
          if (res.ok && data.authenticated && data.user) {
            applyAuthenticatedState(data.user, data.session ?? null);
          } else {
            setUser(null);
            setEmailState('');
            setSessionData(null);
            clearLocalStorageSession();
          }
        }
      } catch (err) {
        console.warn('Failed to verify Google session:', err);
        if (!cancelled) {
          setUser(null);
          setEmailState('');
          setSessionData(null);
        }
      } finally {
        if (!cancelled) {
          setAuthChecking(false);
        }
      }
    };

    initAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  // Redirect user to Google OAuth
  const loginWithGoogle = () => {
    setError(null);
    setLoading(true);
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/google';
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Failed to clear server session cookie:', err);
    }
    clearSession();
  };

  // Check if session data exists on backend and load it
  const loadSession = async (searchEmail: string): Promise<boolean> => {
    if (!searchEmail) return false;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pipeline/session?email=${encodeURIComponent(searchEmail.trim())}`);
      if (!res.ok) throw new Error('Failed to retrieve session from database.');
      const data = await res.json();

      if (data.exists && data.session) {
        const parsedName = data.session.name || user?.name || searchEmail.split('@')[0];
        const loadedUser: User = {
          ...user,
          name: parsedName,
          email: searchEmail,
          target_role: data.session.target_role,
          readiness_score: data.session.readiness_score || 0.0,
        };
        applyAuthenticatedState(loadedUser, data.session);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Run the unified resume diagnostics pipeline
  const uploadResume = async (file: File, jobDescription: string, uploadEmail: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('jobDescription', jobDescription);
      formData.append('email', uploadEmail);

      const res = await fetch('/api/pipeline', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server error occurred during parsing.');
      }

      const data: PipelineSessionData = await res.json();
      const loadedUser: User = {
        ...user,
        name: data.name || user?.name || uploadEmail.split('@')[0],
        email: uploadEmail,
        target_role: data.target_role,
        readiness_score: data.readiness_score || 0.0,
      };
      applyAuthenticatedState(loadedUser, data);
      return true;
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetCareerSession = async () => {
    const activeEmail = user?.email || email;
    if (activeEmail) {
      try {
        await fetch(`/api/pipeline/session?email=${encodeURIComponent(activeEmail)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('Failed to delete pipeline session from database:', err);
      }
    }
    setSessionData(null);
    setError(null);
    clearPipelineStorage();
  };

  const clearSession = () => {
    setEmailState('');
    setSessionData(null);
    setError(null);
    setUser(null);
    clearLocalStorageSession();
  };

  return (
    <CareerContext.Provider
      value={{
        email,
        user,
        sessionData,
        loading,
        authChecking,
        error,
        setEmail,
        loadSession,
        loginWithGoogle,
        logout,
        uploadResume,
        resetCareerSession,
        clearSession,
      }}
    >
      {children}
    </CareerContext.Provider>
  );
}

export function useCareer() {
  const context = useContext(CareerContext);
  if (context === undefined) {
    throw new Error('useCareer must be used within a CareerProvider');
  }
  return context;
}
