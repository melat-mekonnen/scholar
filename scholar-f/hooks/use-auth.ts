"use client";

import { useState, useEffect } from "react";
import { apiFetchJson } from "@/lib/api";
import { logoutFromServer, clearToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

export type User = {
  id: string;
  fullName: string;
  email: string;
  role: string;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const { res, data } = await apiFetchJson<User>("/api/auth/me", {
          method: "GET",
        });

        if (res.ok && data) {
          setUser(data);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const router = useRouter();

  const logout = async () => {
    setLoading(true);
    await logoutFromServer();
    clearToken();
    setUser(null);
    router.replace("/signin");
    setLoading(false);
  };

  return { user, loading, isAuthenticated: !!user, logout };
}

export function useRoleCheck(requiredRole: string) {
  const { user, loading } = useAuth();

  if (loading) {
    return { hasAccess: false, loading: true };
  }

  if (!user) {
    return { hasAccess: false, loading: false };
  }

  return { hasAccess: user.role === requiredRole, loading: false };
}