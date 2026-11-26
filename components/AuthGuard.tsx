'use client';

import React, { useState } from 'react';
import { useCareer } from '@/components/CareerContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ShieldAlert, Lock } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, authChecking, error, loginWithGoogle } = useCareer();

  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || authChecking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
            {authChecking ? 'Verifying Google Session...' : 'Initializing...'}
          </span>
        </div>
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen w-screen flex items-center justify-center bg-[#09090B] overflow-hidden p-4">
      {/* Dynamic glow circles */}
      <div className="absolute top-1/4 left-1/4 -translate-y-1/2 w-[30rem] h-[30rem] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-y-1/2 w-[30rem] h-[30rem] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <Card className="relative w-full max-w-[420px] bg-zinc-950/70 border border-zinc-800/80 rounded-2xl shadow-2xl backdrop-blur-xl p-3 overflow-hidden">
        {/* Glowing border top */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-cyan-400" />

        <CardHeader className="text-center pt-8 pb-4 space-y-2.5">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/20 mb-2 mx-auto select-none">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold uppercase tracking-wider text-white">
            Nexora AI
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
            Next-Gen Multi-Agent Career Intelligence & Advanced RAG Dashboard
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-4 pb-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="button"
            onClick={loginWithGoogle}
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-100 text-zinc-900 font-semibold h-11 text-xs uppercase tracking-wider transition-all duration-200 rounded-lg shadow-md border border-zinc-200 cursor-pointer flex items-center justify-center gap-3"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
                <span>Redirecting to Google...</span>
              </div>
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </Button>

          <div className="border-t border-zinc-900 pt-4 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span>Protected by Google OAuth 2.0</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
