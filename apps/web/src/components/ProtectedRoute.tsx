import { Navigate } from 'react-router-dom';
import { useApp } from '@/context/useApp';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useApp();

  if (loading) return <div role="status" className="p-8 text-center">Loading your session…</div>;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
