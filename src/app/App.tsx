import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Toaster, toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import Dashboard from '@/app/components/Dashboard';
import AdminPanel from '@/app/components/AdminPanel';
import UserPanel from '@/app/components/UserPanel';
import LoginDialog from '@/app/components/LoginDialog';
import Chatbox from '@/app/components/Chatbox';
import InputTanam from '@/app/components/InputTanam';
import InputPanen from '@/app/components/InputPanen';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('Error boundary caught error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);

      if (session?.user) {
        setUser(session.user);
        const userRole = session.user.user_metadata?.role || null;
        setRole(userRole);
        console.log('User role set to:', userRole);
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
      console.log('Checking initial session...');
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session check error:', error);
      }

      if (session?.user) {
        console.log('Found existing session for:', session.user.email);
        setUser(session.user);
        setRole(session.user.user_metadata?.role || null);
      } else {
        console.log('No existing session');
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email, 'mode:', loginMode);

      // Use Supabase client auth directly instead of custom endpoint
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        throw new Error(error.message);
      }

      console.log('Login successful for:', data.user?.email);

      // For admin login: ensure admin role is set in JWT
      if (loginMode === 'admin') {
        console.log('🔵 [LOGIN] Admin login - ensuring admin role is set in JWT');
        const { error: updateError } = await supabase.auth.updateUser({
          data: { role: 'admin' }
        });
        if (updateError) {
          console.error('❌ [LOGIN] Failed to set admin role in JWT:', updateError);
        } else {
          console.log('✅ [LOGIN] Admin role set in JWT successfully');
        }
      }

      setShowLoginDialog(false);
      toast.success('Login berhasil!');
    } catch (error: any) {
      console.error('Login failed:', error);
      toast.error(error.message || 'Login gagal');
      throw error;
    }
  };

  const handleSignup = async (email: string, password: string, name: string, role: 'admin' | 'user') => {
    try {
      console.log('🔵 [SIGNUP] Starting signup for:', email, 'role:', role);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } }
      });

      if (error) {
        console.error('❌ [SIGNUP] Signup auth error:', error);
        throw new Error(error.message);
      }

      console.log('✅ [SIGNUP] Auth account created for:', data.user?.email, 'ID:', data.user?.id);

      if (data.user && role === 'user') {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert([{ id: data.user.id, email, name, role, is_approved: false }])
          .select();

        if (profileError) {
          console.error('❌ [PROFILE] Profile creation error:', profileError);
          throw profileError;
        }

        await supabase.auth.signOut();
        setUser(null);
        setRole(null);
      }

      toast.success('Pendaftaran berhasil! Silakan tunggu persetujuan admin untuk mengaktifkan akun Anda.');
      setShowLoginDialog(false);
      return data;
    } catch (error: any) {
      console.error('❌ [SIGNUP] Signup failed:', error);
      toast.error(error.message || 'Pendaftaran gagal');
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Logging out...');
      await supabase.auth.signOut();
      setUser(null);
      setRole(null);
      toast.success('Logout berhasil');
    } catch (error: any) {
      console.error('Logout error:', error);
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
        <BrowserRouter>
          <Routes>
            <Route path="/input-tanam" element={<InputTanam user={user} onBack={() => window.location.href = '/'} />} />
            <Route path="/input-panen" element={<InputPanen user={user} onBack={() => window.location.href = '/'} />} />
            <Route path="/*" element={<UserPanel user={user} onLogout={handleLogout} />} />
          </Routes>
        </BrowserRouter>
        <Chatbox />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <>
      <Dashboard onLoginClick={openLoginDialog} role={role} showInstallButton={false} onInstall={() => {}} />
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