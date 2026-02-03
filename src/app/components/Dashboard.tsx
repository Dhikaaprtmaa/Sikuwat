import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Menu, X, MessageCircle, Send, Leaf, TrendingUp, Newspaper, Lightbulb, Wrench, Sparkles, ArrowRight, DollarSign, Home, ShoppingCart, Mail, MapPin, Instagram, Youtube, Music } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

// Initialize Supabase client
const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

interface DashboardProps {
  onLoginClick: (mode: 'admin' | 'user') => void;
  role?: 'admin' | 'user' | null;
  showInstallButton?: boolean;
  onInstall?: () => void;
}

export default function Dashboard({ onLoginClick, role, showInstallButton, onInstall }: DashboardProps) {
  const [marketPrices, setMarketPrices] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [tips, setTips] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; message: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [selectedTip, setSelectedTip] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<'home' | 'prices' | 'articles' | 'tips'>('home');
  const [chatDetailed, setChatDetailed] = useState(true);
  const [showNewTipModal, setShowNewTipModal] = useState(false);
  const [newTipTitle, setNewTipTitle] = useState('');
  const [newTipCategory, setNewTipCategory] = useState('');
  const [newTipContent, setNewTipContent] = useState('');
  const [savingTip, setSavingTip] = useState(false);

  useEffect(() => {
    loadMarketPrices();
    loadArticles();
    loadTips();

    // Custom event for local data updates (with debouncing)
    let timeoutId: NodeJS.Timeout;
    const handleDataUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        loadMarketPrices();
        loadArticles();
        loadTips();
      }, 100); // Debounce for 100ms
    };

    window.addEventListener('dataUpdated', handleDataUpdate);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('dataUpdated', handleDataUpdate);
    };
  }, []);

  const loadMarketPrices = async () => {
    try {
      let prices = [];

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-491d5b26/market-prices`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      const data = await response.json();
      if (data.success && data.data) {
        prices = data.data;
      } else {
        // Fallback: Load directly from database
        console.warn('Edge Function failed, trying direct database query');
        const { data: dbPrices, error } = await supabase
          .from('market_prices')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(9);

        if (!error && dbPrices) {
          prices = dbPrices;
        }
      }

      // Always merge with localStorage data (local data takes priority for recency)
      const localPrices = JSON.parse(localStorage.getItem('marketPrices') || '[]');
      const mergedPrices = [...localPrices, ...prices].slice(0, 9);
      setMarketPrices(mergedPrices);

    } catch (error) {
      console.error('Error loading market prices:', error);
      // Final fallback: Load directly from database
      try {
        const { data: prices, error } = await supabase
          .from('market_prices')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(9);

        if (!error && prices) {
          // Merge with localStorage data
          const localPrices = JSON.parse(localStorage.getItem('marketPrices') || '[]');
          const mergedPrices = [...localPrices, ...prices].slice(0, 9);
          setMarketPrices(mergedPrices);
        }
      } catch (dbError) {
        console.error('Database fallback failed:', dbError);
        // Last resort: just use localStorage data
        const localPrices = JSON.parse(localStorage.getItem('marketPrices') || '[]');
        setMarketPrices(localPrices.slice(0, 9));
      }
    }
  };

  const loadArticles = async () => {
    try {
      let articles = [];

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-491d5b26/articles`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      const data = await response.json();
      if (data.success && data.data) {
        articles = data.data;
      } else {
        // Fallback: Load directly from database
        console.warn('Edge Function failed, trying direct database query');
        const { data: dbArticles, error } = await supabase
          .from('articles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);

        if (!error && dbArticles) {
          articles = dbArticles;
        }
      }

      // Always merge with localStorage data (local data takes priority for recency)
      const localArticles = JSON.parse(localStorage.getItem('articles') || '[]');
      const mergedArticles = [...localArticles, ...articles].slice(0, 4);
      setArticles(mergedArticles);

      // Populate missing images for articles that have a URL but no image_url
      (async function populateArticleImages() {
        const toFetch = mergedArticles.filter(a => (!a.image_url || a.image_url === '') && (a.url || a.article_url));
        if (toFetch.length === 0) return;

        for (const art of toFetch) {
          try {
            const image = await fetchOgImageFromUrl(art.url || art.article_url);
            if (image) {
              setArticles(prev => prev.map(p => (p.id === art.id ? { ...p, image_url: image } : p)));
              // Update localStorage entry if present
              try {
                const local = JSON.parse(localStorage.getItem('articles') || '[]');
                const updatedLocal = local.map((l: any) => (l.id === art.id ? { ...l, image_url: image } : l));
                localStorage.setItem('articles', JSON.stringify(updatedLocal));
              } catch (e) {
                // ignore localStorage update errors
              }
            }
          } catch (e) {
            console.warn('Failed to fetch OG image for article', art.url || art.article_url, e);
          }
        }
      })();

    } catch (error) {
      console.error('Error loading articles:', error);
      // Final fallback: Load directly from database
      try {
        const { data: articles, error } = await supabase
          .from('articles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);

        if (!error && articles) {
          // Merge with localStorage data
          const localArticles = JSON.parse(localStorage.getItem('articles') || '[]');
          const mergedArticles = [...localArticles, ...articles].slice(0, 4);
          setArticles(mergedArticles);
        }
      } catch (dbError) {
        console.error('Database fallback failed:', dbError);
        // Last resort: just use localStorage data
        const localArticles = JSON.parse(localStorage.getItem('articles') || '[]');
        setArticles(localArticles.slice(0, 4));
      }
    }
  };

  const loadTips = async () => {
    try {
      let tips = [];

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-491d5b26/tips`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      const data = await response.json();
      if (data.success && data.data) {
        tips = data.data;
      } else {
        // Fallback: Load directly from database
        console.warn('Edge Function failed, trying direct database query');
        const { data: dbTips, error } = await supabase
          .from('tips')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);

        if (!error && dbTips) {
          tips = dbTips;
        }
      }

      // Always merge with localStorage data (local data takes priority for recency)
      const localTips = JSON.parse(localStorage.getItem('tips') || '[]');
      const mergedTips = [...localTips, ...tips].slice(0, 4);
      setTips(mergedTips);

    } catch (error) {
      console.error('Error loading tips:', error);
      // Final fallback: Load directly from database
      try {
        const { data: tips, error } = await supabase
          .from('tips')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);

        if (!error && tips) {
          // Merge with localStorage data
          const localTips = JSON.parse(localStorage.getItem('tips') || '[]');
          const mergedTips = [...localTips, ...tips].slice(0, 4);
          setTips(mergedTips);
        }
      } catch (dbError) {
        console.error('Database fallback failed:', dbError);
        // Last resort: just use localStorage data
        const localTips = JSON.parse(localStorage.getItem('tips') || '[]');
        setTips(localTips.slice(0, 4));
      }
    }
  };

  // Helper to check if current user is admin (from props)
  const propsIsAdmin = () => {
    return role === 'admin';
  };

  // Save new tip to Supabase and refresh tips
  const saveNewTip = async () => {
    if (!newTipTitle.trim() || !newTipContent.trim()) {
      alert('Judul dan konten tip harus diisi');
      return;
    }
    setSavingTip(true);
    try {
      const tipId = `tip_${Date.now()}`;
      const payload: any = {
        id: tipId,
        title: newTipTitle.trim(),
        content: newTipContent.trim(),
        category: newTipCategory.trim() || 'general',
        created_at: new Date().toISOString()
      };
      console.log('💾 [TIP-Dashboard] Saving tip:', payload);
      
      const { data: inserted, error } = await supabase.from('tips').insert([payload]).select().maybeSingle();
      
      if (error) {
        console.error('❌ [TIP-Dashboard] Error inserting:', error);
        throw error;
      }
      
      console.log('✅ [TIP-Dashboard] Saved successfully:', inserted);
      
      // Merge into local state and localStorage
      setTips(prev => [inserted, ...prev].slice(0, 20));
      try {
        const local = JSON.parse(localStorage.getItem('tips') || '[]');
        localStorage.setItem('tips', JSON.stringify([inserted, ...local]));
      } catch (e) {
        // ignore localStorage errors
      }
      
      alert('✅ Tips berhasil disimpan ke database!');
      setShowNewTipModal(false);
      setNewTipTitle('');
      setNewTipCategory('');
      setNewTipContent('');
      
      // Reload tips to ensure fresh data
      await loadTips();
      window.dispatchEvent(new Event('dataUpdated'));
    } catch (err: any) {
      console.error('❌ Failed to save tip:', err);
      alert(`Gagal menyimpan tip: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingTip(false);
    }
  };

  // Helper: fetch og:image (or first image) from an article URL via AllOrigins proxy
  const fetchOgImageFromUrl = async (articleUrl: string) => {
    if (!articleUrl) return null;
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(articleUrl)}`);
      if (!res.ok) return null;
      const payload = await res.json();
      const html = payload.contents as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const ogImage = doc.querySelector("meta[property='og:image']")?.getAttribute('content');
      const twitterImage = doc.querySelector("meta[name='twitter:image']")?.getAttribute('content');
      const firstImg = doc.querySelector('img')?.getAttribute('src') || '';

      let imageUrl = ogImage || twitterImage || firstImg || null;
      if (imageUrl && imageUrl.startsWith('//')) imageUrl = window.location.protocol + imageUrl;
      if (imageUrl && !imageUrl.startsWith('http')) {
        try {
          const base = new URL(articleUrl);
          imageUrl = imageUrl.startsWith('/') ? base.origin + imageUrl : base.origin + '/' + imageUrl;
        } catch (e) {
          // leave as-is
        }
      }

      return imageUrl;
    } catch (e) {
      console.warn('fetchOgImageFromUrl error:', e);
      return null;
    }
  };

  // Fallback local answer generator when remote LLM fails
  const generateLocalAnswer = (userMessage: string, ctxArticles: any[], ctxTips: any[], detail: boolean) => {
    const kws = (userMessage || '')
      .replace(/[.,!?;:()"'\/\[\]]/g, ' ')
      .split(/\s+/)
      .map(s => s.toLowerCase())
      .filter(s => s.length > 3);

    const matchedTips: any[] = [];
    const matchedArticles: any[] = [];

    for (const t of ctxTips) {
      const text = (t.title + ' ' + (t.content || '')).toLowerCase();
      for (const kw of kws) {
        if (text.includes(kw)) {
          matchedTips.push(t);
          break;
        }
      }
    }

    for (const a of ctxArticles) {
      const text = (a.title + ' ' + (a.summary || '')).toLowerCase();
      for (const kw of kws) {
        if (text.includes(kw)) {
          matchedArticles.push(a);
          break;
        }
      }
    }

    let out = '';
    if (matchedTips.length === 0 && matchedArticles.length === 0) {
      out += 'Berikut beberapa panduan umum tentang pertanian yang mungkin membantu:\n\n';
      out += '- Tentukan jenis tanaman dan kebutuhan iklimnya.\n';
      out += '- Persiapkan lahan dengan baik: pH tanah, drainase, dan pemupukan dasar.\n';
      out += '- Gunakan bibit/pohon unggul dan perhatikan jarak tanam.\n';
      out += '- Kelola air dengan irigasi yang memadai; hindari genangan.\n';
      out += '- Pantau hama/penyakit secara rutin dan lakukan tindakan pengendalian sesuai panduan lokal.\n';
      out += '\nJika Anda bisa memberi detail lebih spesifik (jenis tanaman, gejala, atau tujuan), saya bisa bantu lebih terperinci.';
      return out;
    }

    out += 'Saya menemukan beberapa sumber lokal yang relevan:\n\n';
    if (matchedTips.length) {
      out += 'Tips relevan:\n';
      for (const t of matchedTips.slice(0,4)) {
        out += `- ${t.title}: ${(t.content||'').slice(0,120)}...\n`;
      }
      out += '\n';
    }
    if (matchedArticles.length) {
      out += 'Artikel relevan:\n';
      for (const a of matchedArticles.slice(0,3)) {
        out += `- ${a.title}: ${(a.summary||'').slice(0,140)}... ${a.url || ''}\n`;
      }
      out += '\n';
    }

    if (detail) {
      out += 'Rekomendasi langkah praktis:\n';
      out += '1) Identifikasi masalah utama (cek kelembaban tanah, daun, akar).\n';
      out += '2) Terapkan perbaikan: pemupukan berbasis kebutuhan tanaman, pengendalian hama terintegrasi, dan optimasi irigasi.\n';
      out += '3) Catat dan pantau hasil setiap 1-2 minggu dan sesuaikan tindakan.\n';
    } else {
      out += 'Jawaban singkat: sesuaikan pemupukan dan pengendalian hama sesuai panduan di atas.';
    }

    out += '\n\nKeterangan: jawaban dihasilkan dari data lokal (artikel & tips). Untuk jawaban yang lebih komprehensif, tolong aktifkan layanan AI (konfigurasi API pada server).';
    return out;
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', message: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      // Build a system prompt instructing the model to act as agriculture expert
      const systemPrompt = `Kamu adalah asisten ahli pertanian yang sangat berpengalaman. Jawablah semua pertanyaan tentang pertanian secara lengkap, jelas, dan praktis. Jika relevan, sertakan langkah-langkah, takaran, diagnosis masalah, penyebab umum, dan referensi ke sumber lokal yang tersedia. Gunakan bahasa Indonesia. Jika ada data atau sumber dari artikel atau tips yang diberikan, sebutkan sumber tersebut.`;

      // Provide compact context from local articles and tips to improve answers
      const ctxArticles = articles.slice(0, 6).map(a => ({ id: a.id, title: a.title, summary: (a.content || '').slice(0, 300), url: a.url || a.article_url }));
      const ctxTips = tips.slice(0, 10).map(t => ({ id: t.id, title: t.title, content: t.content, category: t.category }));

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/gemini-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            message: userMessage,
            systemPrompt,
            context: { articles: ctxArticles, tips: ctxTips },
            detail: chatDetailed ? 'detailed' : 'concise'
          })
        }
      );

      const data = await response.json();

      if (data.success && data.response) {
        setChatMessages(prev => [...prev, { role: 'ai', message: data.response }]);
      } else if (data && data.error) {
        throw new Error(data.error || 'Server error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Use local fallback composer to give a helpful response even when server fails
      try {
        const ctxArticles = articles.slice(0, 6).map(a => ({ id: a.id, title: a.title, summary: (a.content || '').slice(0, 300), url: a.url || a.article_url }));
        const ctxTips = tips.slice(0, 10).map(t => ({ id: t.id, title: t.title, content: t.content, category: t.category }));
        const localAnswer = generateLocalAnswer(userMessage, ctxArticles, ctxTips, chatDetailed);
        setChatMessages(prev => [...prev, { role: 'ai', message: localAnswer }]);
      } catch (fallbackErr) {
        console.error('Fallback answer failed:', fallbackErr);
        setChatMessages(prev => [...prev, { role: 'ai', message: 'Maaf, terjadi kesalahan. Silakan coba lagi.' }]);
      }
    } finally {
      setChatLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getTipIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'penanaman':
      case 'hidroponik':
        return <Leaf className="h-6 w-6" />;
      case 'pupuk':
      case 'organik':
        return <Lightbulb className="h-6 w-6" />;
      case 'hama':
      case 'pestisida':
        return <Wrench className="h-6 w-6" />;
      default:
        return <Leaf className="h-6 w-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-emerald-100/50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl blur-sm"></div>
                <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  SIKUWAT
                </h1>
                <p className="text-xs text-gray-600 hidden sm:block">Sistem Informasi Kelompok Usaha Wanita Tani</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
              <button
                onClick={() => setActiveSection('home')}
                className={`text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeSection === 'home'
                    ? 'text-emerald-700 border-b-2 border-emerald-700 pb-1'
                    : 'text-gray-600 hover:text-emerald-600'
                }`}
              >
                <Home className="h-4 w-4" />
                Beranda
              </button>
              <button
                onClick={() => setActiveSection('prices')}
                className={`text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeSection === 'prices'
                    ? 'text-emerald-700 border-b-2 border-emerald-700 pb-1'
                    : 'text-gray-600 hover:text-emerald-600'
                }`}
              >
                <ShoppingCart className="h-4 w-4" />
                Harga Pasar
              </button>
              <button
                onClick={() => setActiveSection('articles')}
                className={`text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeSection === 'articles'
                    ? 'text-emerald-700 border-b-2 border-emerald-700 pb-1'
                    : 'text-gray-600 hover:text-emerald-600'
                }`}
              >
                <Newspaper className="h-4 w-4" />
                Artikel
              </button>
              <button
                onClick={() => setActiveSection('tips')}
                className={`text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeSection === 'tips'
                    ? 'text-emerald-700 border-b-2 border-emerald-700 pb-1'
                    : 'text-gray-600 hover:text-emerald-600'
                }`}
              >
                <Lightbulb className="h-4 w-4" />
                Tips
              </button>
            </div>

            {/* Desktop Login Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {onInstall && (
                <Button
                  onClick={onInstall}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                  title="Install aplikasi Sikuwat di perangkat Anda"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Install App
                </Button>
              )}
              <Button
                onClick={() => onLoginClick('user')}
                variant="outline"
                className="border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300"
              >
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent font-semibold">
                  User
                </span>
              </Button>
              <Button
                onClick={() => onLoginClick('admin')}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105"
              >
                Admin
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-emerald-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
              <Button
                onClick={() => {
                  setActiveSection('home');
                  setMobileMenuOpen(false);
                }}
                variant="outline"
                className="w-full border-emerald-200 hover:bg-emerald-50"
              >
                <Home className="h-4 w-4 mr-2" />
                Beranda
              </Button>
              <Button
                onClick={() => {
                  setActiveSection('prices');
                  setMobileMenuOpen(false);
                }}
                variant="outline"
                className="w-full border-emerald-200 hover:bg-emerald-50"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Harga Pasar
              </Button>
              <Button
                onClick={() => {
                  setActiveSection('articles');
                  setMobileMenuOpen(false);
                }}
                variant="outline"
                className="w-full border-emerald-200 hover:bg-emerald-50"
              >
                <Newspaper className="h-4 w-4 mr-2" />
                Artikel
              </Button>
              <Button
                onClick={() => {
                  setActiveSection('tips');
                  setMobileMenuOpen(false);
                }}
                variant="outline"
                className="w-full border-emerald-200 hover:bg-emerald-50"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Tips
              </Button>
              <div className="pt-2 space-y-2 border-t">
                {onInstall && (
                  <Button
                    onClick={() => {
                      onInstall();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 flex items-center justify-center gap-2"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Install App
                  </Button>
                )}
                <Button
                  onClick={() => {
                    onLoginClick('user');
                    setMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full border-emerald-200 hover:bg-emerald-50"
                >
                  Login User
                </Button>
                <Button
                  onClick={() => {
                    onLoginClick('admin');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
                >
                  Login Admin
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-auto md:h-[500px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 via-emerald-800/80 to-teal-900/90 z-10"></div>
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1710563159928-83611beece71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1920"
          alt="Wanita Tani"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 flex items-center justify-center text-center px-3 sm:px-4">
          <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 backdrop-blur-sm rounded-full mb-3 sm:mb-6 border border-white/30">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-300" />
              <span className="text-white text-xs sm:text-sm font-medium">Pemberdayaan Petani Indonesia</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              Wujudkan Ketahanan Pangan<br />
              <span className="bg-gradient-to-r from-yellow-300 to-emerald-300 bg-clip-text text-transparent">
                Bersama Wanita Tani
              </span>
            </h2>
            <p className="text-xs sm:text-base md:text-lg lg:text-xl text-emerald-100 mb-4 sm:mb-8 max-w-2xl mx-auto">
              Platform digital untuk mendukung produktivitas dan kesejahteraan petani Indonesia
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => onLoginClick('user')}
                size="lg"
                className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                Mulai Sekarang
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="w-full px-3 sm:px-4 py-6 sm:py-12 md:py-16 space-y-6 sm:space-y-12 md:space-y-16 relative max-w-7xl mx-auto">
        {activeSection === 'home' && (
          <>
        {/* Harga Pasar Section */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between mb-6 sm:mb-8 gap-2">
            <div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1 sm:mb-2">
                Harga Pasar Terkini
              </h3>
              <p className="text-xs sm:text-sm md:text-base text-gray-600">Update harga komoditas pertanian hari ini</p>
            </div>
            <TrendingUp className="h-10 w-10 text-emerald-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketPrices.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada data harga pasar</p>
              </div>
            ) : (
              marketPrices.slice(0, 3).map((price, idx) => (
                <div
                  key={price.id}
                  className="group relative"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl blur-sm group-hover:blur-md transition-all duration-300 opacity-20"></div>
                  <Card className="relative p-6 backdrop-blur-sm bg-white/90 border-emerald-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                        <Leaf className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex items-center gap-1 text-emerald-600">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs font-medium">Live</span>
                      </div>
                    </div>
                    <h4 className="font-bold text-sm sm:text-base md:text-lg text-gray-800 mb-2">{price.commodity}</h4>
                    <div className="flex items-baseline gap-1 sm:gap-2">
                      <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        {formatPrice(price.price)}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-600">/{price.unit}</span>
                    </div>
                  </Card>
                </div>
              ))
            )}
          </div>
          {marketPrices.length > 3 && (
            <div className="text-center mt-6">
              <button
                onClick={() => setActiveSection('prices')}
                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium inline-flex items-center gap-2"
              >
                Lihat Semua Harga Pasar
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        {/* Berita Section */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 animation-delay-200">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                Berita Pertanian
              </h3>
              <p className="text-gray-600">Informasi terkini seputar dunia pertanian</p>
            </div>
            <Newspaper className="h-10 w-10 text-emerald-500" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {articles.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Newspaper className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada artikel</p>
              </div>
            ) : (
              articles.slice(0, 3).map((article, idx) => (
                <div
                  key={article.id}
                  className="group cursor-pointer"
                  onClick={() => setSelectedArticle(article)}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <Card className="overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 h-full border-0 bg-white">
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500">
                      <ImageWithFallback
                        src={article.image_url && article.image_url.length > 0 ? article.image_url : "https://images.unsplash.com/photo-1638261583636-29872e94bcd1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-emerald-600">
                        {article.source}
                      </div>
                    </div>
                    <div className="p-4 sm:p-6">
                      <h4 className="font-bold text-sm sm:text-base md:text-lg text-gray-900 mb-2 sm:mb-3 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                        {article.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-3 mb-3 sm:mb-4">{article.content}</p>
                      <div className="flex items-center text-emerald-600 font-medium text-xs sm:text-sm group-hover:gap-2 transition-all">
                        Baca Selengkapnya
                        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Card>
                </div>
              ))
            )}
          </div>
          {articles.length > 3 && (
            <div className="text-center mt-6">
              <button
                onClick={() => setActiveSection('articles')}
                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium inline-flex items-center gap-2"
              >
                Lihat Semua Artikel
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        {/* Tips Section */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 animation-delay-400">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                Tips & Tricks Pertanian
              </h3>
              <p className="text-gray-600">Panduan praktis untuk hasil panen maksimal</p>
            </div>
            <div className="flex items-center gap-4">
              <Lightbulb className="h-10 w-10 text-emerald-500" />
              {/* Admin-only: Add Tip button */}
              {propsIsAdmin() && (
                <Button onClick={() => setShowNewTipModal(true)} className="bg-emerald-600 text-white hidden md:inline-flex">Tambah Tip</Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {tips.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Lightbulb className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada tips tersedia</p>
              </div>
            ) : (
              tips.slice(0, 4).map((tip, idx) => (
                <div
                  key={tip.id}
                  className="group"
                  style={{ animationDelay: `${idx * 100}ms` }}
                  onClick={() => setSelectedTip(tip)}
                >
                  <Card className="p-4 sm:p-6 text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-0 bg-gradient-to-br from-white to-emerald-50/30 h-full">
                    <div className="relative inline-block mb-3 sm:mb-4">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-white transform group-hover:scale-110 transition-transform duration-300">
                        {getTipIcon(tip.category)}
                      </div>
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900 mb-2 line-clamp-2">{tip.title}</h4>
                    <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                      {tip.category}
                    </span>
                  </Card>
                </div>
              ))
            )}
          </div>
          {tips.length > 4 && (
            <div className="text-center mt-6">
              <button
                onClick={() => setActiveSection('tips')}
                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium inline-flex items-center gap-2"
              >
                Lihat Semua Tips
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>
          </>
        )}

        {activeSection === 'prices' && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <ShoppingCart className="h-8 w-8 text-emerald-600" />
              <h3 className="text-3xl font-bold text-gray-800">Semua Harga Pasar Pertanian</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketPrices.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Belum ada data harga pasar</p>
                </div>
              ) : (
                marketPrices.map((price, idx) => (
                  <div
                    key={price.id}
                    className="group relative"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl blur-sm group-hover:blur-md transition-all duration-300 opacity-20"></div>
                    <Card className="relative p-6 backdrop-blur-sm bg-white/90 border-emerald-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                          <Leaf className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-xs font-medium">Live</span>
                        </div>
                      </div>
                      <h4 className="font-bold text-lg text-gray-800 mb-2">{price.commodity}</h4>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                          {formatPrice(price.price)}
                        </span>
                        <span className="text-sm text-gray-600">/{price.unit}</span>
                      </div>
                    </Card>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeSection === 'articles' && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Newspaper className="h-8 w-8 text-emerald-600" />
              <h3 className="text-3xl font-bold text-gray-800">Semua Artikel Pertanian</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {articles.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Newspaper className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Belum ada artikel</p>
                </div>
              ) : (
                articles.map((article, idx) => (
                  <div
                    key={article.id}
                    className="group cursor-pointer"
                    onClick={() => setSelectedArticle(article)}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <Card className="overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 h-full border-0 bg-white">
                      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500">
                        <ImageWithFallback
                          src={article.image_url && article.image_url.length > 0 ? article.image_url : "https://images.unsplash.com/photo-1638261583636-29872e94bcd1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"}
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-emerald-600">
                          {article.source}
                        </div>
                      </div>
                      <div className="p-6">
                        <h4 className="font-bold text-lg text-gray-900 mb-3 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                          {article.title}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-3 mb-4">{article.content}</p>
                        <div className="flex items-center text-emerald-600 font-medium text-sm group-hover:gap-2 transition-all">
                          Baca Selengkapnya
                          <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Card>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeSection === 'tips' && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Lightbulb className="h-8 w-8 text-emerald-600" />
              <h3 className="text-3xl font-bold text-gray-800">Semua Tips & Tricks Pertanian</h3>
              {propsIsAdmin() && (
                <div className="ml-auto">
                  <Button onClick={() => setShowNewTipModal(true)} className="bg-emerald-600 text-white">Tambah Tip</Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tips.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Lightbulb className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Belum ada tips tersedia</p>
                </div>
              ) : (
                tips.map((tip, idx) => (
                    <div
                      key={tip.id}
                      className="group"
                      style={{ animationDelay: `${idx * 100}ms` }}
                      onClick={() => setSelectedTip(tip)}
                    >
                      <Card className="p-6 text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-0 bg-gradient-to-br from-white to-emerald-50/30 h-full">
                      <div className="relative inline-block mb-4">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
                        <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-white transform group-hover:scale-110 transition-transform duration-300">
                          {getTipIcon(tip.category)}
                        </div>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">{tip.title}</h4>
                      <p className="text-sm text-gray-600 mb-3">{tip.description}</p>
                      <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                        {tip.category}
                      </span>
                    </Card>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

      {/* New Tip Modal (admin only) */}
      {showNewTipModal && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-xl my-auto mx-auto">
            <div className="p-4 sm:p-6 relative">
              <button
                onClick={() => setShowNewTipModal(false)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 z-10"
              >
                <X className="h-6 w-6" />
              </button>

              <h2 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-4">Tambah Tip Baru</h2>

              <div className="space-y-3">
                <input value={newTipTitle} onChange={(e) => setNewTipTitle(e.target.value)} placeholder="Judul tip" className="w-full border px-3 py-2 rounded" />
                <input value={newTipCategory} onChange={(e) => setNewTipCategory(e.target.value)} placeholder="Kategori (mis. penanaman, pupuk)" className="w-full border px-3 py-2 rounded" />
                <textarea value={newTipContent} onChange={(e) => setNewTipContent(e.target.value)} placeholder="Konten / langkah-langkah" className="w-full border px-3 py-2 rounded h-40 max-h-[60vh]" />
                <div className="flex gap-2">
                  <Button onClick={saveNewTip} disabled={savingTip} className="bg-emerald-600 text-white">{savingTip ? 'Menyimpan...' : 'Simpan ke Database'}</Button>
                  <Button variant="ghost" onClick={() => setShowNewTipModal(false)}>Batal</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
      </main>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl my-auto mx-auto">
            <div className="p-4 sm:p-6 relative">
              {/* Close Button */}
              <button
                onClick={() => setSelectedArticle(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
              >
                <X className="h-6 w-6" />
              </button>

              {/* Article Image */}
              {selectedArticle.image_url && (
                <div className="mb-6 rounded-lg overflow-hidden bg-emerald-100 h-64 sm:h-80">
                  <ImageWithFallback
                    src={selectedArticle.image_url}
                    alt={selectedArticle.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Article Header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">
                    {selectedArticle.source}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  {selectedArticle.title}
                </h2>
              </div>

              {/* Article Content */}
              <div className="prose prose-sm max-w-none mb-6">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedArticle.content}
                </p>
              </div>

              {/* Article Link */}
              {selectedArticle.url && (
                <div className="flex items-center gap-3 pt-4 border-t mb-4">
                  <a
                    href={selectedArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
                  >
                    Baca Artikel Lengkap →
                  </a>
                </div>
              )}

              {/* Close Button - Footer */}
              <button
                onClick={() => setSelectedArticle(null)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Tip Detail Modal */}
      {selectedTip && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-xl my-auto mx-auto">
            <div className="p-4 sm:p-6 relative">
              <button
                onClick={() => setSelectedTip(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">
                    {selectedTip.category}
                  </span>
                </div>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
                  {selectedTip.title}
                </h2>
              </div>

              <div className="prose prose-sm max-w-none mb-6">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedTip.content || selectedTip.description || 'Tidak ada detail tersedia.'}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t mb-4">
                {selectedTip.source && (
                  <a
                    href={selectedTip.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
                  >
                    Sumber →
                  </a>
                )}
              </div>

              <button
                onClick={() => setSelectedTip(null)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Floating Chat AI Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!chatOpen ? (
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300 opacity-60"></div>
            <button
              onClick={() => setChatOpen(true)}
              className="relative bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 rounded-full shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-110 active:scale-95"
            >
              <MessageCircle className="h-7 w-7" />
              <div className="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center animate-pulse shadow-lg">
                AI
              </div>
            </button>
          </div>
        ) : (
          <Card className="w-80 md:w-96 shadow-2xl border-0 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h3 className="font-bold">Sikuwat AI</h3>
                  <p className="text-xs text-emerald-100">Asisten Pertanian</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-80 overflow-y-auto p-4 bg-gradient-to-br from-gray-50 to-emerald-50/30 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-sm text-gray-700 font-medium mb-2">Halo! Saya Sikuwat AI 🌾</p>
                  <p className="text-xs text-gray-600">Tanyakan apapun tentang pertanian!</p>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-sm shadow-lg'
                        : 'bg-white text-gray-900 rounded-bl-sm shadow-md border border-gray-100'
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-bl-sm shadow-md">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
              <div className="flex items-center gap-3 mr-2">
                <label className="flex items-center text-sm gap-2">
                  <input type="checkbox" checked={chatDetailed} onChange={(e) => setChatDetailed(e.target.checked)} className="h-4 w-4" />
                  <span className="text-xs text-gray-600">Jawaban detail</span>
                </label>
              </div>
              <Input
                placeholder="Ketik pertanyaan..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={chatLoading}
                className="flex-1 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
              <Button
                onClick={handleSendMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Footer */}
      <footer className="relative mt-20 bg-gradient-to-br from-emerald-600 to-teal-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="relative container mx-auto px-4 py-16">
          {/* Footer Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Leaf className="h-8 w-8" />
                <span className="text-2xl font-bold">SIKUWAT</span>
              </div>
              <p className="text-emerald-100 text-sm mb-2">Sistem Informasi Kelompok Usaha Wanita Tani</p>
              <p className="text-xs text-emerald-200">Pemberdayaan wanita tani untuk ketahanan pangan</p>
            </div>

            {/* Contact Section */}
            <div>
              <h4 className="text-lg font-bold mb-4 text-white">Hubungi Kami</h4>
              <div className="space-y-3">
                <a
                  href="mailto:cibiruwetan2006@gmail.com"
                  className="flex items-center gap-3 text-emerald-100 hover:text-white transition-colors"
                >
                  <Mail className="h-5 w-5 text-emerald-300" />
                  <span className="text-sm">cibiruwetan2006@gmail.com</span>
                </a>
                <div className="flex items-start gap-3 text-emerald-100">
                  <MapPin className="h-5 w-5 text-emerald-300 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Jl. Cibangkonol No. 28<br />Cileunyi, Kecamatan Cileunyi<br />Kabupaten Bandung - Jawa Barat 40625</span>
                </div>
              </div>
            </div>

            {/* About Us Section */}
            <div>
              <h4 className="text-lg font-bold mb-4 text-white">Tentang Kami</h4>
              <div className="space-y-2">
                <a
                  href="https://cibiruwetan.desa.id/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-emerald-100 hover:text-white transition-colors group"
                >
                  <span className="text-sm group-hover:underline">Website Desa Cibiru Wetan</span>
                  <span className="text-xs">→</span>
                </a>
                <p className="text-xs text-emerald-200 mt-3">Klik untuk mengunjungi website resmi Desa Cibiru Wetan dan dapatkan informasi lebih lengkap.</p>
              </div>
            </div>

            {/* Social Media Section */}
            <div>
              <h4 className="text-lg font-bold mb-4 text-white">Ikuti Kami</h4>
              <div className="space-y-3">
                <a
                  href="https://www.instagram.com/desa_cibiruwetan/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-emerald-100 hover:text-white transition-colors group"
                >
                  <Instagram className="h-5 w-5 text-emerald-300 group-hover:text-pink-400" />
                  <span className="text-sm">Instagram</span>
                </a>
                <a
                  href="https://www.youtube.com/channel/UCZkoecQJPaqrZderyHehgUw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-emerald-100 hover:text-white transition-colors group"
                >
                  <Youtube className="h-5 w-5 text-emerald-300 group-hover:text-red-500" />
                  <span className="text-sm">YouTube</span>
                </a>
                <a
                  href="https://www.tiktok.com/@desa_cibiruwetan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-emerald-100 hover:text-white transition-colors group"
                >
                  <Music className="h-5 w-5 text-emerald-300 group-hover:text-white" />
                  <span className="text-sm">TikTok</span>
                </a>
              </div>
            </div>
          </div>

          {/* Footer Divider */}
          <div className="border-t border-emerald-600 pt-8 mt-8 text-center">
            <p className="text-sm text-emerald-200">© 2026 SIKUWAT - Sistem Informasi Kelompok Usaha Wanita Tani</p>
            <p className="text-xs text-emerald-300 mt-2">Dibuat dengan dedikasi untuk memberdayakan wanita tani Indonesia</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        .animation-delay-400 {
          animation-delay: 400ms;
        }
      `}</style>
    </div>
  );
}
