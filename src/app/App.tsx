import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import Dashboard from '@/app/components/Dashboard';
import AdminPanel from '@/app/components/AdminPanel';
import UserPanel from '@/app/components/UserPanel';
import LoginDialog from '@/app/components/LoginDialog';

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

// Validate env vars
if (!process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase URL or ANON KEY are not set via env vars. Falling back to default values from utils/supabase/info.');
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginMode, setLoginMode] = useState<'admin' | 'user'>('user');
  const [error, setError] = useState<string | null>(null);

  // Check session on mount
  useEffect(() => {
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);

      if (session?.user) {
        await checkSession();
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      console.log('Checking initial session...');
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session check error:', error);
        setError('Session check failed: ' + error.message);
      }

      if (session?.user) {
        console.log('Found existing session for:', session.user.email);

        let profileRole: 'admin' | 'user' = session.user.user_metadata?.role === 'admin' ? 'admin' : 'user';
        let isApproved = false;
        let profileFound = false;

        try {
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            profileFound = true;
            if (profile.role) {
              profileRole = profile.role === 'admin' ? 'admin' : 'user';
            }
            isApproved = profile.is_approved ?? false;
          }
        } catch (profileError) {
          console.warn('Unable to load profile during session check, using auth metadata if available.', profileError);
        }

        setUser(session.user);
        setRole(profileRole);
        
        // Show warning if user is not approved yet
        if (profileRole !== 'admin' && !isApproved) {
          toast.warning('Akun Anda belum disetujui oleh admin. Tunggu persetujuan untuk menambah data baru.');
        }
      } else {
        console.log('No existing session');
        setUser(null);
        setRole(null);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setError('Session check error: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, is_approved')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile data:', error);
      throw error;
    }

    return data;
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email, 'mode:', loginMode);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        throw new Error(error.message);
      }

      const sessionResult = await supabase.auth.getSession();
      const loggedUser = data.user || sessionResult.data.session?.user;
      if (!loggedUser) {
        console.error('Login data:', data);
        console.error('Session data:', sessionResult.data.session);
        throw new Error('Login gagal: data pengguna tidak ditemukan');
      }

      let profileRole: 'admin' | 'user' = loggedUser.user_metadata?.role === 'admin' ? 'admin' : 'user';
      let isApproved = false;
      let profileFound = false;

      try {
        const profile = await fetchUserProfile(loggedUser.id);
        if (profile) {
          profileFound = true;
          if (profile.role) {
            profileRole = profile.role === 'admin' ? 'admin' : 'user';
          }
          isApproved = profile.is_approved ?? false;
        }
      } catch (profileError) {
        console.warn('Unable to load profile during login, using auth metadata if available.', profileError);
      }

      console.log('Login successful for:', loggedUser.email);
      setUser(loggedUser);
      setRole(profileRole);
      console.log('User role set to:', profileRole);

      setShowLoginDialog(false);
      
      if (profileRole !== 'admin' && !isApproved) {
        toast.warning('Akun Anda belum disetujui oleh admin. Tunggu persetujuan untuk menambah data baru.');
      } else {
        toast.success('Login berhasil!');
      }
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

      const signupUser = data.user || data.session?.user || (await supabase.auth.getSession()).data.session?.user;
      if (!signupUser) {
        toast.success('Pendaftaran berhasil! Silakan cek email untuk konfirmasi dan tunggu persetujuan admin.');
        setShowLoginDialog(false);
        return data;
      }

      if (role === 'user') {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([
            {
              id: signupUser.id,
              email,
              name,
              role: 'user',
              is_approved: false
            }
          ], { onConflict: 'id' })
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

  // Show error UI if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-lg p-8 max-w-md shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">❌ Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
          >
            Reload Halaman
          </button>
        </div>
      </div>
    );
  }

  if (user && role === 'admin') {
    return (
      <>
        <AdminPanel user={user} onLogout={handleLogout} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  if (user && role === 'user') {
    return (
      <>
        <UserPanel user={user} onLogout={handleLogout} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <>
      <Dashboard
        onLoginClick={openLoginDialog}
        role={role}
        showInstallButton={true}
        onInstall={() => window.dispatchEvent(new Event('sikuwat:show-install'))}
      />
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