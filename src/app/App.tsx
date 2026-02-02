import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Toaster, toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import Dashboard from '@/app/components/Dashboard';
import AdminPanel from '@/app/components/AdminPanel';
import UserPanel from '@/app/components/UserPanel';
import LoginDialog from '@/app/components/LoginDialog';
import Chatbox from '@/app/components/Chatbox';

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
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

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

  // Handle PWA install prompt
  useEffect(() => {
    console.log('[PWA] Initializing install handler...');
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallButton(true);
      console.log('[PWA] beforeinstallprompt event triggered - button should be visible');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // ALWAYS show button for testing/development
    setShowInstallButton(true);
    console.log('[PWA] Install button enabled for all users');

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    console.log('[PWA] Install button clicked');
    console.log('[PWA] Has real installPrompt:', !!installPrompt);
    
    if (installPrompt) {
      // Browser supports PWA install - auto trigger install prompt
      try {
        console.log('[PWA] Triggering native install prompt...');
        installPrompt.prompt();
        
        const { outcome } = await installPrompt.userChoice;
        console.log('[PWA] User install choice:', outcome);
        
        if (outcome === 'accepted') {
          toast.success('✅ Aplikasi berhasil diinstall! Cek di home screen/desktop Anda', {
            duration: 4000
          });
          setShowInstallButton(false);
          setInstallPrompt(null);
        } else {
          toast.info('Install dibatalkan. Anda bisa install kapan saja melalui menu.', {
            duration: 3000
          });
        }
      } catch (error) {
        console.error('[PWA] Install prompt error:', error);
        toast.error('Gagal membuka install prompt');
      }
    } else {
      // Fallback - show instructions modal
      console.log('[PWA] No native install, showing instructions modal');
      setShowInstallModal(true);
    }
  };

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

      // Check if user is approved (for non-admin users)
      if (loginMode === 'user') {
        console.log('🔵 [LOGIN] User login - checking is_approved status');
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('is_approved')
          .eq('id', data.user?.id)
          .maybeSingle();

        console.log('🔵 [LOGIN] Query result:', profiles);
        console.log('🔵 [LOGIN] Query error:', profileError);

        if (profileError) {
          console.error('❌ [LOGIN] Profile check error:', profileError);
          await supabase.auth.signOut();
          toast.error('Gagal mengecek status akun');
          throw profileError;
        }

        if (!profiles) {
          console.error('❌ [LOGIN] Profile not found in database!');
          await supabase.auth.signOut();
          toast.error('Profil akun tidak ditemukan');
          throw new Error('Profile tidak ditemukan');
        }

        console.log('🔵 [LOGIN] is_approved value:', profiles.is_approved);

        if (!profiles.is_approved) {
          console.log('❌ [LOGIN] User not approved (is_approved = false) - logging out');
          await supabase.auth.signOut();
          toast.error('Akun Anda belum disetujui oleh admin. Silakan tunggu');
          throw new Error('Akun belum disetujui oleh admin');
        }
        console.log('✅ [LOGIN] User is_approved = true - login allowed');
      }

      // onAuthStateChange will handle setting user and role
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

      // Use Supabase client auth directly
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          }
        }
      });

      if (error) {
        console.error('❌ [SIGNUP] Signup auth error:', error);
        throw new Error(error.message);
      }

      console.log('✅ [SIGNUP] Auth account created for:', data.user?.email, 'ID:', data.user?.id);

      // Create profile with is_approved = false for user role
      if (data.user && role === 'user') {
        console.log('🔵 [PROFILE] Creating user profile with is_approved=false');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: email,
              name: name,
              role: role,
              is_approved: false, // User signup must be approved by admin
            }
          ])
          .select();

        if (profileError) {
          console.error('❌ [PROFILE] Profile creation error:', profileError);
          console.error('Error details:', profileError.message, profileError.details, profileError.hint);
          throw profileError;
        } else {
          console.log('✅ [PROFILE] User profile created successfully:', profileData);
        }

        // ⚠️ IMPORTANT: Logout user immediately after signup
        // User must wait for admin approval before login
        console.log('🔵 [SIGNUP] Logging out user after signup - waiting for admin approval');
        await supabase.auth.signOut();
        console.log('✅ [SIGNUP] User logged out - session cleared');
        
        // Reset user state to trigger logout in UI
        console.log('🔵 [SIGNUP] Resetting user state...');
        setUser(null);
        setRole(null);
        console.log('✅ [SIGNUP] User state cleared');

      } else if (data.user && role === 'admin') {
        // Admin profile (manual creation via Supabase)
        console.log('🔵 [PROFILE] Creating admin profile with is_approved=true');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: email,
              name: name,
              role: role,
              is_approved: true, // Admin already approved
            }
          ])
          .select();

        if (profileError) {
          console.error('❌ [PROFILE] Admin profile creation error:', profileError);
          throw profileError;
        } else {
          console.log('✅ [PROFILE] Admin profile created successfully:', profileData);
        }

        // Admin can stay logged in (auto-approved)
      }

      toast.success('Pendaftaran berhasil! Silakan tunggu persetujuan admin untuk mengaktifkan akun Anda.');
      
      // Close dialog
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
    console.log('Opening login dialog for mode:', mode);
    setLoginMode(mode);
    setShowLoginDialog(true);
  };

  console.log('App render - loading:', loading, 'user:', !!user, 'role:', role);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-green-700">Loading Sikuwat...</p>
          <p className="text-sm text-gray-500 mt-2">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Render appropriate panel based on role
  if (user && role === 'admin') {
    console.log('Rendering admin panel');
    try {
      return (
        <ErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><h2 className="text-xl font-bold text-red-600">Error Loading Admin Panel</h2><p className="text-gray-600 mt-2">Please refresh the page</p></div></div>}>
          <AdminPanel user={user} onLogout={handleLogout} />
          <Chatbox />
          <Toaster position="top-right" richColors />
        </ErrorBoundary>
      );
    } catch (error) {
      console.error('Error rendering admin panel:', error);
      toast.error('Terjadi kesalahan saat memuat panel admin');
      return (
        <>
          <Dashboard onLoginClick={openLoginDialog} role={role} showInstallButton={showInstallButton} onInstall={handleInstall} />
          <Toaster position="top-right" richColors />
          
          {/* Install Modal */}
          {showInstallModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-8 text-white text-center">
                  <div className="flex justify-center mb-4">
                    <div className="bg-white/20 p-3 rounded-full">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold">Install Sikuwat</h2>
                  <p className="text-emerald-100 text-sm mt-2">Akses aplikasi kapan saja, offline pun bisa</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                      Desktop (Chrome/Edge)
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                      <p>📍 Klik tombol menu <strong>(⋮)</strong> di pojok kanan atas</p>
                      <p>📍 Cari dan klik <strong>"Install Sikuwat"</strong></p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                      Mobile Android
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                      <p>📍 Klik tombol <strong>"Install App"</strong></p>
                      <p>📍 Tekan <strong>"Install"</strong> di dialog</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                      iPhone/iPad (Safari)
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                      <p>📍 Klik Share → "Add to Home Screen"</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 border-t flex gap-3">
                  <button
                    onClick={() => setShowInstallModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={() => {
                      setShowInstallModal(false);
                      toast.success('Aplikasi siap untuk diinstall!');
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium"
                  >
                    Mengerti
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }
  }

  if (user && role === 'user') {
    console.log('Rendering user panel');
    try {
      return (
        <ErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><h2 className="text-xl font-bold text-red-600">Error Loading User Panel</h2><p className="text-gray-600 mt-2">Please refresh the page</p></div></div>}>
          <UserPanel user={user} onLogout={handleLogout} />
          <Chatbox />
          <Toaster position="top-right" richColors />
        </ErrorBoundary>
      );
    } catch (error) {
      console.error('Error rendering user panel:', error);
      toast.error('Terjadi kesalahan saat memuat panel user');
      return (
        <>
          <Dashboard onLoginClick={openLoginDialog} role={role} showInstallButton={showInstallButton} onInstall={handleInstall} />
          <Toaster position="top-right" richColors />
          
          {/* Install Modal */}
          {showInstallModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-8 text-white text-center">
                  <div className="flex justify-center mb-4">
                    <div className="bg-white/20 p-3 rounded-full">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold">Install Sikuwat</h2>
                  <p className="text-emerald-100 text-sm mt-2">Akses aplikasi kapan saja, offline pun bisa</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                      Desktop (Chrome/Edge)
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                      <p>📍 Klik tombol menu <strong>(⋮)</strong> di pojok kanan atas</p>
                      <p>📍 Cari dan klik <strong>"Install Sikuwat"</strong></p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                      Mobile Android
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                      <p>📍 Klik tombol <strong>"Install App"</strong></p>
                      <p>📍 Tekan <strong>"Install"</strong> di dialog</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                      iPhone/iPad (Safari)
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                      <p>📍 Klik Share → "Add to Home Screen"</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 border-t flex gap-3">
                  <button
                    onClick={() => setShowInstallModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={() => {
                      setShowInstallModal(false);
                      toast.success('Aplikasi siap untuk diinstall!');
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium"
                  >
                    Mengerti
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }
  }

  // Render dashboard for non-logged-in users
  console.log('Rendering dashboard for guest');
  return (
    <ErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><h2 className="text-xl font-bold text-red-600">Error Loading Dashboard</h2><p className="text-gray-600 mt-2">Please refresh the page</p></div></div>}>
      <Dashboard onLoginClick={openLoginDialog} role={role} showInstallButton={showInstallButton} onInstall={handleInstall} />
      <LoginDialog
        isOpen={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onLogin={handleLogin}
        onSignup={handleSignup}
        mode={loginMode}
      />
      
      {/* Install Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-8 text-white text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold">Install Sikuwat</h2>
              <p className="text-emerald-100 text-sm mt-2">Akses aplikasi kapan saja, offline pun bisa</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Desktop Instructions */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                  Desktop (Chrome/Edge)
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                  <p>📍 Klik tombol menu <strong>(⋮)</strong> di pojok kanan atas</p>
                  <p>📍 Cari dan klik <strong>"Install Sikuwat"</strong></p>
                  <p>📍 Aplikasi akan otomatis terinstall di desktop Anda</p>
                </div>
              </div>

              {/* Mobile Instructions */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                  Mobile Android
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                  <p>📍 Klik tombol <strong>"Install App"</strong> atau tunggu prompt</p>
                  <p>📍 Tekan <strong>"Install"</strong> di dialog yang muncul</p>
                  <p>📍 Aplikasi akan muncul di home screen</p>
                </div>
              </div>

              {/* iOS Instructions */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-100 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                  iPhone/iPad (Safari)
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                  <p>📍 Klik tombol <strong>Share</strong> (kotak panah)</p>
                  <p>📍 Scroll dan pilih <strong>"Add to Home Screen"</strong></p>
                  <p>📍 Beri nama dan tekan <strong>"Add"</strong></p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t flex gap-3">
              <button
                onClick={() => setShowInstallModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setShowInstallModal(false);
                  toast.success('Aplikasi siap untuk diinstall! Ikuti instruksi di atas.');
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 transition-all"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" richColors />
    </ErrorBoundary>
  );
}