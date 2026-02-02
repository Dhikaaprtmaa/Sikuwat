import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { User, Shield, Leaf, Sparkles, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, password: string, name: string, role: 'admin' | 'user') => Promise<any>;
  mode: 'admin' | 'user';
}

export default function LoginDialog({ isOpen, onClose, onLogin, onSignup, mode }: LoginDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Email dan password harus diisi');
      return;
    }

    setLoading(true);
    try {
      await onLogin(email, password);
      setEmail('');
      setPassword('');
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !name) {
      toast.error('Semua field harus diisi');
      return;
    }

    if (password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setLoading(true);
    try {
      await onSignup(email, password, name, mode);
      setEmail('');
      setPassword('');
      setName('');
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 shadow-2xl backdrop-blur-sm bg-white/95 overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-6 -mx-6 -mt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              {mode === 'admin' ? (
                <Shield className="h-6 w-6" />
              ) : (
                <User className="h-6 w-6" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg">
                {mode === 'admin' ? 'Login Admin' : 'Login Petani'}
              </DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs">
                {mode === 'admin' 
                  ? 'Akses panel administratif' 
                  : 'Kelola data penanaman Anda'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {mode === 'admin' ? (
          // Admin login form tanpa tabs
          <div className="space-y-5 px-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-sm font-semibold text-gray-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-11 h-11 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-sm font-semibold text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  disabled={loading}
                  className="pl-11 h-11 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
                />
              </div>
            </div>
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-11 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] rounded-xl"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Loading...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Login Admin
                </div>
              )}
            </Button>
            <div className="text-xs text-center text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
              ⚠️ Hanya untuk administrator sistem
            </div>
          </div>
        ) : (
          // User login/signup dengan tabs
          <div className="px-6 py-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm border border-emerald-100 rounded-xl p-1 mb-6">
                <TabsTrigger value="login" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg">
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg">
                  Daftar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-5 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-semibold text-gray-700">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="contoh@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="pl-11 h-11 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-semibold text-gray-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                      disabled={loading}
                      className="pl-11 h-11 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full h-11 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] rounded-xl"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Leaf className="h-5 w-5" />
                      Masuk Sekarang
                    </div>
                  )}
                </Button>
              </TabsContent>

              {mode !== 'admin' && (
                <TabsContent value="signup" className="space-y-5 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-semibold text-gray-700">
                      Nama Lengkap
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Nama Anda"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      className="h-11 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-semibold text-gray-700">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="contoh@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="pl-11 h-11 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-semibold text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Minimal 6 karakter"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        className="pl-11 h-11 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleSignup}
                    disabled={loading}
                    className="w-full h-11 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] rounded-xl"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Loading...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Daftar Sekarang
                      </div>
                    )}
                  </Button>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
