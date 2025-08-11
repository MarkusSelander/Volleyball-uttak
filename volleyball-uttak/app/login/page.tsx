"use client";

import {
  auth,
  googleProvider,
  onAuthStateChanged,
  signInWithPopup,
} from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/dashboard");
    });
    return () => unsub();
  }, [router]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError("Innlogging feilet. Prøv igjen.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-secondary relative overflow-hidden">
      {/* Bakgrunnsdekorasjoner */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-32 right-32 w-40 h-40 bg-white rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-32 left-32 w-32 h-32 bg-white rounded-full animate-bounce-slow"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen gap-8 p-4">
        {/* Login kort */}
        <div className="glass rounded-2xl p-8 md:p-12 max-w-md w-full animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🏐</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Velkommen tilbake
            </h1>
            <p className="text-white/80">
              Logg inn for å administrere ditt volleyball lag
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-800 rounded-xl font-semibold hover-lift transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Logger inn...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Logg inn med Google</span>
              </>
            )}
          </button>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-white/70 hover:text-white text-sm transition-colors">
              ← Tilbake til forsiden
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 text-center text-white/70 text-sm">
          <p>Sikker innlogging med Google</p>
        </div>
      </div>
    </div>
  );
}
