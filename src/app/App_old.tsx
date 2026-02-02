import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Toaster, toast } from 'sonner';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import Dashboard from '@/app/components/Dashboard';
import AdminPanel from '@/app/components/AdminPanel';
import UserPanel from '@/app/components/UserPanel';
import LoginDialog from '@/app/components/LoginDialog';
import Chatbox from '@/app/components/Chatbox';

// Initialize Supabase client
const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginMode, setLoginMode] = useState<'admin' | 'user'>('user');

  // Check session on mount
  useEffect(() => {
    checkSession();

    // Safety timeout in case checkSession fails
    const timeout = setTimeout(() => {
      console.log('Safety timeout triggered - setting loading to false');
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Fetch role from server
        try {
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-491d5b26/auth/session`,
            {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            }
          );
          const sessionData = await response.json();
          if (sessionData.authenticated) {
            setRole(sessionData.role);
          } else {
            setRole(session.user.user_metadata?.role || null);
          }
        } catch (err) {
          console.error('Failed to fetch role:', err);
          setRole(session.user.user_metadata?.role || null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      
      if (data.session?.user) {
        // onAuthStateChange will handle setting user and role
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-491d5b26/auth/signin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ email, password })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const { data: _sessionData, error } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token || data.access_token
      });

      if (error) throw error;

      // onAuthStateChange will handle setting user and role
      setShowLoginDialog(false);
      toast.success('Login berhasil!');
    } catch (error: any) {
      toast.error(error.message || 'Login gagal');
      throw error;
    }
  };

  const handleSignup = async (email: string, password: string, name: string, role: 'admin' | 'user') => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-491d5b26/auth/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ email, password, name, role })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      toast.success('Pendaftaran berhasil! Silakan login.');
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Pendaftaran gagal');
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRole(null);
      toast.success('Logout berhasil');
    } catch (error: any) {
      toast.error('Logout gagal');
    }
  };

  const openLoginDialog = (mode: 'admin' | 'user') => {
    setLoginMode(mode);
    setShowLoginDialog(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-green-700">Loading Sikuwat...</p>
        </div>
      </div>
    );
  }

  if (user && role === 'admin') {
    return (
      <>
        <AdminPanel user={user} onLogout={handleLogout} />
        <Chatbox />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  if (user && role === 'user') {
    return (
      <>
        <UserPanel user={user} onLogout={handleLogout} />
        <Chatbox />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <>
      <Dashboard onLoginClick={openLoginDialog} />
      <LoginDialog
        isOpen={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onLogin={handleLogin}
        onSignup={handleSignup}
        mode={loginMode}
      />
      <Toaster position="top-right" richColors />
    </>
  );
}