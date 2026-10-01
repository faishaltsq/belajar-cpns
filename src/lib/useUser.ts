'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export interface User {
  id: string;
  email?: string;
  phone?: string | null;
  name: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch saat mount dan setiap rute berpindah
  useEffect(() => {
    fetchUser();
  }, [fetchUser, pathname]);

  // Re-fetch saat ada event 'auth-change' (setelah login / register / logout)
  useEffect(() => {
    const handleAuthChange = () => {
      fetchUser();
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network error
    } finally {
      setUser(null);
      window.dispatchEvent(new Event('auth-change'));
      window.location.href = '/';
    }
  }, []);

  return { user, loading, logout, refetch: fetchUser };
}
