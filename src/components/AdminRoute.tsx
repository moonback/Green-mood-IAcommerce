import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { verifyServerAdmin } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export default function AdminRoute() {
  const { user, isLoading } = useAuthStore();
  const [serverChecked, setServerChecked] = useState(false);
  const [isServerAdmin, setIsServerAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const runServerCheck = async () => {
      if (!user) {
        if (!cancelled) {
          setIsServerAdmin(false);
          setServerChecked(true);
        }
        return;
      }

      const allowed = await verifyServerAdmin();
      if (!cancelled) {
        setIsServerAdmin(allowed);
        setServerChecked(true);
      }
    };

    setServerChecked(false);
    runServerCheck();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (isLoading || !serverChecked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isServerAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
