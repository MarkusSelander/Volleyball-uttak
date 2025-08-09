'use client';

import { useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (user) router.replace('/dashboard');
    });
    return () => unsub();
  }, [router]);

  const handleLogin = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Logg inn</h1>
      <button
        onClick={handleLogin}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Logg inn med Google
      </button>
    </div>
  );
}
