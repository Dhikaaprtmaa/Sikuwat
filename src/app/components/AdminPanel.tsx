import { useState, useEffect } from 'react';
import { LogOut, Plus, Eye, Edit2, Search, Download, Leaf, TrendingUp, Newspaper, Lightbulb, Users, BarChart3, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

interface AdminPanelProps {
  user: any;
  onLogout: () => void;
}

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [marketPrices, setMarketPrices] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [tips, setTips] = useState<any[]>([]);
  const [userData, setUserData] = useState<any[]>([]);
  const [filteredUserData, setFilteredUserData] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stats state
  const [stats, setStats] = useState({
    totalPlantings: 0,
    totalHarvested: 0,
    totalYield: 0,
    totalRevenue: 0
  });
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [showArticleDialog, setShowArticleDialog] = useState(false);
  const [showTipDialog, setShowTipDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);

  // Form states
  const [priceForm, setPriceForm] = useState({
    commodity: '',
    price: '',
    unit: '',
    date: ''
  });

  const [articleForm, setArticleForm] = useState({
    title: '',
    content: '',
    source: '',
    url: '',
    image_url: '',
    article_url: '' // NEW: URL untuk di-fetch
  });

  const [fetchingArticle, setFetchingArticle] = useState(false);

  const [tipForm, setTipForm] = useState({
    title: '',
    content: '',
    category: ''
  });

  // Image upload states
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  // Helper: get current Supabase access token
  const getAccessToken = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || '';
    } catch (e) {
      return '';
    }
  };

  // Helper: handle image file selection and preview
  const handleImageFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string || '');
      reader.readAsDataURL(file);
    }
  };

  // Helper: upload image to Supabase storage and return public URL
  const uploadImageToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `articles/${fileName}`;

    const { error } = await supabase.storage.from('images').upload(filePath, file);
    if (error) throw error;

    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Helper: resolve real DB id when optimistic "temp_" id is present
  const resolveRealId = async (table: string, candidateId: string, matchFields: Record<string, any>) => {
    try {
      if (!candidateId || typeof candidateId !== 'string') return candidateId;
      if (!candidateId.startsWith('temp_')) return candidateId;

      // Try to find a matching record in DB using provided matchFields
      const query = supabase.from(table).select('id');
      // Use match if fields provided
      const { data, error } = await query.match(matchFields).limit(1).maybeSingle();
      if (error) {
        console.warn(`⚠️ [RESOLVE] Could not resolve real id for table=${table}`, error);
        return null;
      }
      return data?.id || null;
    } catch (e) {
      console.warn('⚠️ [RESOLVE] Unexpected error resolving id:', e);
      return null;
    }
  };

  // Helper: generate a temporary optimistic id for offline/local entries
  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

  // Edit states
  const [editingPrice, setEditingPrice] = useState<any>(null);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [editingTip, setEditingTip] = useState<any>(null);

  useEffect(() => {
    // Load all data on component mount
    loadMarketPrices();
    loadArticles();
    loadTips();
    loadUserData();
    loadPendingUsers();

    // Listen for data updates from other components
    window.addEventListener('dataUpdated', () => {
      loadMarketPrices();
      loadArticles();
      loadTips();
      loadUserData();
    });

    return () => {
      window.removeEventListener('dataUpdated', () => {});
    };
  }, []);

  // Fetch artikel dari URL dengan ekstraksi konten yang lebih baik
  const fetchArticleFromUrl = async (articleUrl: string) => {
    if (!articleUrl) {
      toast.error('Masukkan URL artikel terlebih dahulu');
      return;
    }

    setFetchingArticle(true);
    try {
      console.log('🔵 [ARTICLE] Fetching artikel dari URL:', articleUrl);

      let html: string | null = null;

      // Try jina.ai first (markdown extraction)
      try {
        const jina = await fetch(`https://r.jina.ai/${articleUrl}`, {
          headers: { 'Accept': 'text/markdown' }
        });
        if (jina.ok) {
          const markdown = await jina.text();
          const lines = markdown.split('\n').filter(l => l.trim());
          const titleMatch = markdown.match(/^#{1,2}\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1].trim() : (lines[0] || '').replace(/^#+\s*/, '').trim();
          const paragraphs = lines.filter(line => !line.startsWith('#') && !line.startsWith('[') && line.length > 20).slice(0,5).join('\n\n');
          if (title && title.length >= 3) {
            const source = new URL(articleUrl).hostname.replace('www.', '');
            setArticleForm(prev => ({
              ...prev,
              title,
              content: paragraphs || `Artikel dari ${source}`,
              url: articleUrl,
              article_url: articleUrl,
              source,
            }));
            toast.success('✅ Artikel berhasil di-fetch!');
            return;
          }
        }
      } catch (e) {
        console.warn('Jina.ai failed:', e);
      }

      // Fallback to AllOrigins to fetch HTML
      try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(articleUrl)}`);
        if (res.ok) {
          const payload = await res.json();
          html = payload.contents;
        }
      } catch (e) {
        console.warn('AllOrigins failed:', e);
      }

      if (!html) throw new Error('Tidak bisa fetch HTML dari URL');

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const cleanText = (text: string | null | undefined) => {
        if (!text) return '';
        return text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
      };

      const ogTitle = doc.querySelector("meta[property='og:title']")?.getAttribute('content');
      const twitterTitle = doc.querySelector("meta[name='twitter:title']")?.getAttribute('content');
      const titleTag = doc.querySelector('title')?.textContent;
      const h1 = doc.querySelector('h1')?.textContent;
      const title = cleanText(ogTitle || twitterTitle || titleTag || h1 || '');

      const ogDesc = doc.querySelector("meta[property='og:description']")?.getAttribute('content');
      const twitterDesc = doc.querySelector("meta[name='twitter:description']")?.getAttribute('content');
      const metaDesc = doc.querySelector("meta[name='description']")?.getAttribute('content');
      const description = cleanText(ogDesc || twitterDesc || metaDesc || '');

      // Extract content
      let contentText = '';
      const articleEl = doc.querySelector('article') || doc.querySelector('main') || doc.querySelector('[role="main"]');
      if (articleEl) {
        const items = Array.from(articleEl.querySelectorAll('p, li, h2, h3')).map(el => cleanText(el.textContent)).filter(t => t.length > 20).slice(0,4);
        contentText = items.join('\n\n');
      }
      if (!contentText) {
        const paragraphs = Array.from(doc.querySelectorAll('p')).map(p => cleanText(p.textContent)).filter(t => t.length > 30).slice(0,3);
        contentText = paragraphs.join('\n\n');
      }

      // Image
      let imageUrl = doc.querySelector("meta[property='og:image']")?.getAttribute('content') || doc.querySelector("meta[name='twitter:image']")?.getAttribute('content') || doc.querySelector('img')?.getAttribute('src') || '';
      if (imageUrl && imageUrl.startsWith('//')) imageUrl = window.location.protocol + imageUrl;
      if (imageUrl && !imageUrl.startsWith('http')) {
        try { const base = new URL(articleUrl); imageUrl = imageUrl.startsWith('/') ? base.origin + imageUrl : base.origin + '/' + imageUrl; } catch(e) { imageUrl = ''; }
      }

      // Try upload image to storage (best-effort)
      let uploadedImage = '';
      if (imageUrl) {
        try {
          const r = await fetch(imageUrl);
          if (r.ok) {
            const blob = await r.blob();
            const file = new File([blob], `article-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
            uploadedImage = await uploadImageToStorage(file);
          }
        } catch (e) {
          console.warn('Image upload failed, using original URL', e);
          uploadedImage = imageUrl;
        }
      }

      const source = (() => { try { return new URL(articleUrl).hostname.replace('www.', ''); } catch(e) { return ''; } })();

      setArticleForm(prev => ({
        ...prev,
        title: title || (prev.title || ''),
        content: contentText || description || (prev.content || ''),
        url: articleUrl,
        article_url: articleUrl,
        image_url: uploadedImage || imageUrl || prev.image_url,
        source: source || prev.source
      }));

      toast.success('✅ Artikel berhasil di-fetch!');
    } catch (error: any) {
      console.error('❌ [ARTICLE] Error fetching:', error);
      toast.error(error?.message || 'Gagal fetch artikel');
      try { const source = new URL(articleUrl).hostname.replace('www.', ''); setArticleForm(prev => ({ ...prev, url: articleUrl, article_url: articleUrl, source, title: prev.title || 'Silakan masukkan judul manual', content: prev.content || 'Silakan masukkan konten manual' })); } catch(e) {}
    } finally {
      setFetchingArticle(false);
    }
  };

  const loadMarketPrices = async () => {
    try {
      let data;

      try {
        // Coba load via Edge Function
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-491d5b26/market-prices`,
          {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
          }
        );

        if (response.ok) {
          const responseData = await response.json();
          if (responseData.success) {
            data = responseData;
          } else {
            throw new Error('Edge Function returned error');
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (edgeError) {
        console.warn('Edge Function failed, trying direct database query:', edgeError);

        // Fallback: Load langsung dari database
        const { data: pricesData, error } = await supabase
          .from('market_prices')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Direct database query failed:', error);
          throw error;
        }

        data = { success: true, data: pricesData };
        console.log('Direct database query success:', data);
      }

      if (data.success && data.data) {
        // For AdminPanel: Show database data first, then localStorage data (for newly added items)
        const localPrices = JSON.parse(localStorage.getItem('marketPrices') || '[]');
        const mergedPrices = [...data.data, ...localPrices];
        setMarketPrices(mergedPrices);
      } else {
        // If no database data, show localStorage data
        const localPrices = JSON.parse(localStorage.getItem('marketPrices') || '[]');
        setMarketPrices(localPrices);
      }
    } catch (error) {
      console.error('Error loading market prices:', error);
      // Fallback: Load from localStorage only
      const localPrices = JSON.parse(localStorage.getItem('marketPrices') || '[]');
      setMarketPrices(localPrices);
    }
  };

  const loadArticles = async () => {
    try {
      let data;

      try {
        // Coba load via Edge Function
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-491d5b26/articles`,
          {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
          }
        );

        if (response.ok) {
          const responseData = await response.json();
          if (responseData.success) {
            data = responseData;
          } else {
            throw new Error('Edge Function returned error');
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (edgeError) {
        console.warn('Edge Function failed, trying direct database query:', edgeError);

        // Fallback: Load langsung dari database
        const { data: articlesData, error } = await supabase
          .from('articles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Direct database query failed:', error);
          throw error;
        }

        data = { success: true, data: articlesData };
        console.log('Direct database query success:', data);
      }

      if (data.success && data.data) {
        // For AdminPanel: Show database data first, then localStorage data (for newly added items)
        const localArticles = JSON.parse(localStorage.getItem('articles') || '[]');
        const mergedArticles = [...data.data, ...localArticles];
        setArticles(mergedArticles);
      } else {
        // If no database data, show localStorage data
        const localArticles = JSON.parse(localStorage.getItem('articles') || '[]');
        setArticles(localArticles);
      }
    } catch (error) {
      console.error('Error loading articles:', error);
      // Fallback: Load from localStorage only
      const localArticles = JSON.parse(localStorage.getItem('articles') || '[]');
      setArticles(localArticles);
    }
  };

  const loadTips = async () => {
    try {
      let tips = [];

      try {
        // Coba load via Edge Function
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-491d5b26/tips`,
          {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
          }
        );

        if (response.ok) {
          const responseData = await response.json();
          if (responseData.success && responseData.data) {
            tips = responseData.data;
            console.log('✅ [TIPS-Admin] Loaded from edge function:', tips.length);
          } else {
            throw new Error('Edge Function returned no data');
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (edgeError) {
        console.warn('⚠️ [TIPS-Admin] Edge Function failed, trying direct database query:', edgeError);

        // Fallback: Load langsung dari database
        const { data: tipsData, error } = await supabase
          .from('tips')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ [TIPS-Admin] Direct database query failed:', error);
          throw error;
        }

        tips = tipsData || [];
        console.log('✅ [TIPS-Admin] Loaded from database:', tips.length);
      }

      // Set state with DB data (prioritize database over localStorage)
      setTips(tips);
      
    } catch (error) {
      console.error('❌ [TIPS-Admin] Error loading tips:', error);
      // Fallback: Load from localStorage only
      try {
        const localTips = JSON.parse(localStorage.getItem('tips') || '[]');
        if (localTips.length > 0) {
          console.log('⚠️ [TIPS-Admin] Using localStorage fallback:', localTips.length);
          setTips(localTips);
        } else {
          setTips([]);
        }
      } catch (e) {
        console.error('❌ [TIPS-Admin] Failed to parse localStorage:', e);
        setTips([]);
      }
    }
  };

  const loadUserData = async () => {
    try {
      const token = await getAccessToken();
      let data;

      try {
        // Coba load via Edge Function
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-491d5b26/admin/user-data`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );

        if (response.ok) {
          const responseData = await response.json();
          if (responseData.success) {
            data = responseData;
          } else {
            throw new Error('Edge Function returned error');
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (edgeError) {
        console.warn('Edge Function failed, trying direct database query:', edgeError);

        // Fallback: Load semua user plantings data untuk admin monitor
        const { data: plantingsData, error } = await supabase
          .from('plantings')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Direct database query for plantings failed:', error);
          console.error('Error details:', error.message, error.details, error.hint);
          throw error;
        }

        data = { success: true, data: plantingsData };
        console.log('Direct database query success - Plantings:', data.data?.length || 0, 'records');
      }

      if (data.success && data.data) {
        setUserData(data.data);
        setFilteredUserData(data.data);
        
        // Calculate stats
        const totalPlantings = data.data.length;
        const harvested = data.data.filter((p: any) => p.harvest_yield || p.harvestYield);
        const totalHarvested = harvested.length;
        const totalYield = harvested.reduce((sum: number, p: any) => sum + (parseFloat(p.harvest_yield || p.harvestYield) || 0), 0);
        const totalRevenue = harvested.reduce((sum: number, p: any) => sum + (parseFloat(p.sales_amount || p.salesAmount) || 0), 0);
        
        setStats({
          totalPlantings,
          totalHarvested,
          totalYield: parseFloat(totalYield.toFixed(2)),
          totalRevenue: parseFloat(totalRevenue.toFixed(2))
        });
        
        console.log('✓ Stats calculated:', { totalPlantings, totalHarvested, totalYield, totalRevenue });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }

    // Load pending users
    loadPendingUsers();
  };

  const loadPendingUsers = async () => {
    try {
      console.log('🔵 [PENDING] Loading pending users from profiles table...');
      console.log('🔵 [PENDING] Admin user ID:', (await supabase.auth.getSession()).data.session?.user?.id);
      
      // First, let's check if we can read ANY profiles (to diagnose RLS)
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('id, email, name, role, is_approved')
        .limit(5);

      if (allError) {
        console.error('❌ [PENDING] Cannot read ANY profiles (RLS issue?):', allError.message);
      } else {
        console.log('✅ [PENDING] Can read profiles, sample:', allProfiles?.length || 0, 'records');
      }

      // Now load pending users specifically
      const { data: pending, error } = await supabase
        .from('profiles')
        .select('id, email, name, role, created_at, is_approved')
        .eq('is_approved', false)
        .eq('role', 'user')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ [PENDING] Error loading pending users:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details, error.hint);
        return;
      }

      console.log('✅ [PENDING] Loaded pending users:', pending?.length || 0);
      if (pending && pending.length > 0) {
        console.log('🔍 [PENDING] Pending users list:', pending.map(u => ({ 
          id: u.id, 
          email: u.email, 
          name: u.name, 
          is_approved: u.is_approved 
        })));
      } else {
        console.warn('⚠️ [PENDING] No pending users found. Check:');
        console.warn('  - Are there any users with is_approved = false?');
        console.warn('  - Are they all role = "user"?');
      }
      setPendingUsers(pending || []);
    } catch (error) {
      console.error('❌ [PENDING] Unexpected error:', error);
    }
  };

  const handleApproveUser = async (userId: string, userName: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', userId);

      if (error) {
        console.error('Error approving user:', error);
        throw error;
      }

      toast.success(`Akun ${userName} telah disetujui`);
      loadPendingUsers();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal menyetujui akun');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectUser = async (userId: string, _userEmail: string, userName: string) => {
    setLoading(true);
    try {
      console.log('🔵 [REJECT] Rejecting user:', userName, 'ID:', userId);
      
      // Delete profile (auth user akan tetap ada tapi tidak bisa login karena is_approved = false)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error('❌ [REJECT] Error deleting profile:', profileError);
        throw profileError;
      }

      console.log('✅ [REJECT] User profile deleted:', userName);
      toast.success(`Akun ${userName} telah ditolak`);
      
      // Reload pending users list
      loadPendingUsers();
    } catch (error) {
      console.error('❌ [REJECT] Error:', error);
      toast.error('Gagal menolak akun');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrice = async () => {
    if (!priceForm.commodity || !priceForm.price || !priceForm.unit) {
      toast.error('Semua field harus diisi');
      return;
    }

    // Validasi harga
    const price = parseFloat(priceForm.price);
    if (isNaN(price) || price <= 0) {
      toast.error('Harga harus berupa angka positif');
      return;
    }

    setLoading(true);
    try {
      console.log('💾 [PRICE] Saving market price to Supabase...');
      console.log('📊 Data yang dikirim:', {
        commodity: priceForm.commodity.trim(),
        price: price,
        unit: priceForm.unit.trim(),
        date: priceForm.date || new Date().toISOString()
      });

      // Insert langsung ke Supabase (primary method)
      const { data: insertedData, error: dbError } = await supabase
        .from('market_prices')
        .insert({
          commodity: priceForm.commodity.trim(),
          price: price,
          unit: priceForm.unit.trim(),
          date: priceForm.date || new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ [PRICE] ERROR RESPONSE FROM SUPABASE:');
        console.error('Full error object:', JSON.stringify(dbError, null, 2));
        console.error('Error code:', dbError.code);
        console.error('Error message:', dbError.message);
        console.error('Error details:', dbError.details);
        console.error('Error hint:', dbError.hint);
        
        // Throw untuk pergi ke catch block
        throw new Error(`[${dbError.code}] ${dbError.message}${dbError.hint ? ' - ' + dbError.hint : ''}`);
      }

      console.log('✅ [PRICE] Saved to Supabase:', insertedData);
      
      // Success - update UI and trigger reload
      toast.success('✅ Harga pasar berhasil disimpan ke database');
      setPriceForm({ commodity: '', price: '', unit: '', date: '' });
      
      // Reload data to show immediately
      await loadMarketPrices();
      
      // Notify all listeners
      window.dispatchEvent(new Event('dataUpdated'));
      
      // Close dialog if open
      setShowPriceDialog(false);
    } catch (error: any) {
      console.error('🔴 CATCH BLOCK ERROR:', error);
      console.error('Error message:', error?.message);
      console.error('Error string:', String(error));
      console.error('Error stack:', error?.stack);
      
      let errorMessage = 'Terjadi kesalahan saat menyimpan harga pasar';

      // Try multiple ways to extract error message
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error_description) {
        errorMessage = error.error_description;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      console.log('📢 Error message yang ditampilkan:', errorMessage);
      toast.error(errorMessage);

      // Fallback: save price locally with a temp id so admin still sees it
      try {
        const tempId = generateTempId();
        const localPrice = {
          id: tempId,
          commodity: priceForm.commodity.trim(),
          price: price,
          unit: priceForm.unit.trim(),
          date: priceForm.date || new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: null
        };
        const existing = JSON.parse(localStorage.getItem('marketPrices') || '[]');
        const updated = [localPrice, ...existing];
        localStorage.setItem('marketPrices', JSON.stringify(updated));
        setMarketPrices((prev: any[]) => [localPrice, ...prev]);
        setPriceForm({ commodity: '', price: '', unit: '', date: '' });
        toast.success('✅ Harga pasar disimpan secara lokal (offline).');
        window.dispatchEvent(new Event('dataUpdated'));
      } catch (lsErr) {
        console.error('❌ [PRICE] Failed to save locally:', lsErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddArticle = async () => {
    // Validasi form
    if (!articleForm.title?.trim()) {
      toast.error('Judul artikel harus diisi');
      return;
    }
    if (!articleForm.content?.trim()) {
      toast.error('Konten artikel harus diisi');
      return;
    }
    if (articleForm.title.length < 5) {
      toast.error('Judul terlalu pendek (min 5 karakter)');
      return;
    }
    if (articleForm.content.length < 20) {
      toast.error('Konten terlalu pendek (min 20 karakter)');
      return;
    }

    setLoading(true);
    try {
      console.log('💾 [ARTICLE] Validasi & saving artikel...');
      
      let finalImageUrl = articleForm.image_url || '';

      // Upload gambar jika user memilih file
      if (selectedImageFile) {
        try {
          console.log('⬆️ [ARTICLE] Uploading selected file...');
          finalImageUrl = await uploadImageToStorage(selectedImageFile);
          console.log('✅ [ARTICLE] File uploaded:', finalImageUrl);
        } catch (uploadError: any) {
          console.error('❌ [ARTICLE] Upload failed:', uploadError);
          toast.error(`Gagal upload gambar: ${uploadError.message || 'Unknown error'}`);
          setLoading(false);
          return;
        }
      }

      // Generate UUID untuk id
      const generateId = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      // Siapkan data untuk database
      const articleData = {
        id: generateId(),
        title: articleForm.title.trim(),
        content: articleForm.content.trim(),
        source: (articleForm.source || '').trim(),
        url: (articleForm.url || '').trim(),
        image_url: finalImageUrl
      };

      console.log('📝 [ARTICLE] Data to save:', articleData);

      // Insert ke Supabase
      const { data: insertedData, error: dbError } = await supabase
        .from('articles')
        .insert([articleData])
        .select();

      if (dbError) {
        console.error('❌ [ARTICLE] DB error:', dbError);
        throw new Error(dbError.message || 'Gagal menyimpan ke database');
      }

      if (!insertedData || insertedData.length === 0) {
        throw new Error('Artikel tidak tersimpan (response kosong)');
      }

      const savedArticle = insertedData[0];
      console.log('✅ [ARTICLE] Saved successfully:', savedArticle);
      
      // Success flow
      toast.success('✅ Artikel berhasil disimpan!');
      
      // Reset form
      setArticleForm({ 
        title: '', 
        content: '', 
        source: '', 
        url: '', 
        image_url: '', 
        article_url: '' 
      });
      setSelectedImageFile(null);
      setImagePreview('');
      
      // Reload & notify
      await loadArticles();
      window.dispatchEvent(new Event('dataUpdated'));
      setShowArticleDialog(false);
      
    } catch (error: any) {
      console.error('❌ [ARTICLE] Error saving:', error);
      
      let errorMessage = 'Gagal menyimpan artikel';
      if (error?.message) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMessage = 'Artikel dengan judul ini sudah ada';
        } else if (error.message.includes('permission') || error.message.includes('policy')) {
          errorMessage = 'Anda tidak memiliki izin untuk menyimpan data';
        } else if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
          errorMessage = 'Tidak bisa terhubung ke server, periksa internet';
        } else {
          errorMessage = error.message;
        }
      }
      toast.error(errorMessage);

      // Fallback: save article locally with temp id
      try {
        const tempId = generateTempId();
        const localArticle = {
          id: tempId,
          title: articleForm.title.trim(),
          content: articleForm.content.trim(),
          source: (articleForm.source || '').trim(),
          url: (articleForm.url || '').trim(),
          article_url: (articleForm.article_url || '').trim(),
          image_url: articleForm.image_url || '',
          created_at: new Date().toISOString(),
          updated_at: null
        };
        const existing = JSON.parse(localStorage.getItem('articles') || '[]');
        const updated = [localArticle, ...existing];
        localStorage.setItem('articles', JSON.stringify(updated));
        setArticles((prev: any[]) => [localArticle, ...prev]);
        setArticleForm({ title: '', content: '', source: '', url: '', image_url: '', article_url: '' });
        setSelectedImageFile(null);
        setImagePreview('');
        setShowArticleDialog(false);
        toast.success('✅ Artikel disimpan secara lokal (offline).');
        window.dispatchEvent(new Event('dataUpdated'));
      } catch (lsErr) {
        console.error('❌ [ARTICLE] Failed to save locally:', lsErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddTip = async () => {
    if (!tipForm.title || !tipForm.content) {
      toast.error('Title dan content harus diisi');
      return;
    }

    setLoading(true);
    try {
      console.log('💾 [TIP] Saving tip to Supabase...');
      console.log('📝 Data yang dikirim:', {
        id: `tip_${Date.now()}`,
        title: tipForm.title.trim(),
        content: tipForm.content.trim(),
        category: tipForm.category?.trim() || 'general'
      });

      // Try server-side insertion first (edge function) to ensure service-role insertion
      const tipId = `tip_${Date.now()}`;
      try {
        console.log('💡 [TIP] Attempting server-side insert via edge function');
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token;

        if (accessToken) {
          const fnUrl = `https://${projectId}.supabase.co/functions/v1/make-server-491d5b26/admin/tips`;
          const resp = await fetch(fnUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              title: tipForm.title.trim(),
              content: tipForm.content.trim(),
              category: tipForm.category?.trim() || 'general'
            })
          });

          const json = await resp.json();
          if (resp.ok && json?.success) {
            console.log('✅ [TIP] Server-side insert succeeded:', json.data || json);
            // Reload data to show immediately
            toast.success('✅ Tips berhasil disimpan ke database (server)');
            setTipForm({ title: '', content: '', category: '' });
            await loadTips();
            window.dispatchEvent(new Event('dataUpdated'));
            setShowTipDialog(false);
            return;
          }

          console.warn('⚠️ [TIP] Server-side insert returned non-success:', json);
        } else {
          console.warn('⚠️ [TIP] No access token available for server-side insert, falling back to client insert');
        }
      } catch (fnErr) {
        console.error('❌ [TIP] Edge function insert failed, falling back to client insert:', fnErr);
      }

      // Fallback: Insert langsung ke Supabase dengan ID explisit (client-side)
      console.log('💾 [TIP] Performing client-side insert as fallback');
      const { data: insertedData, error: dbError } = await supabase
        .from('tips')
        .insert({
          id: tipId,
          title: tipForm.title.trim(),
          content: tipForm.content.trim(),
          category: tipForm.category?.trim() || 'general',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ [TIP] ERROR RESPONSE FROM SUPABASE:');
        console.error('Full error object:', JSON.stringify(dbError, null, 2));
        console.error('Error code:', dbError.code);
        console.error('Error message:', dbError.message);
        console.error('Error details:', dbError.details);
        console.error('Error hint:', dbError.hint);
        throw new Error(`[${dbError.code}] ${dbError.message}${dbError.hint ? ' - ' + dbError.hint : ''}`);
      }

      console.log('✅ [TIP] Saved to Supabase (client):', insertedData);
      
      // Success - update UI and trigger reload
      toast.success('✅ Tips berhasil disimpan ke database');
      setTipForm({ title: '', content: '', category: '' });
      
      // Reload data to show immediately
      await loadTips();
      
      // Notify all listeners
      window.dispatchEvent(new Event('dataUpdated'));
      
      // Close dialog if open
      setShowTipDialog(false);
    } catch (error: any) {
      console.error('🔴 CATCH BLOCK ERROR:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);

      let errorMessage = 'Terjadi kesalahan saat menyimpan tips';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error_description) {
        errorMessage = error.error_description;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      console.log('📢 Error message yang ditampilkan:', errorMessage);
      toast.error(errorMessage);

      // Fallback: save tip locally with a temp id so admin still sees it
      try {
        const tempId = generateTempId();
        const localTip = {
          id: tempId,
          title: tipForm.title.trim(),
          content: tipForm.content.trim(),
          category: tipForm.category?.trim() || 'general',
          created_at: new Date().toISOString(),
          updated_at: null
        };
        const existing = JSON.parse(localStorage.getItem('tips') || '[]');
        const updated = [localTip, ...existing];
        localStorage.setItem('tips', JSON.stringify(updated));
        setTips((prev: any[]) => [localTip, ...prev]);
        setTipForm({ title: '', content: '', category: '' });
        toast.success('✅ Tips disimpan secara lokal (offline). Akan disinkronkan saat koneksi tersedia.');
        window.dispatchEvent(new Event('dataUpdated'));
      } catch (lsErr) {
        console.error('❌ [TIP] Failed to save locally:', lsErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Edit functions
  const handleEditPrice = (price: any) => {
    setEditingPrice(price);
    setPriceForm({
      commodity: price.commodity,
      price: price.price.toString(),
      unit: price.unit,
      date: price.date
    });
  };

  const handleUpdatePrice = async () => {
    if (!priceForm.commodity || !priceForm.price || !priceForm.unit) {
      toast.error('Semua field harus diisi');
      return;
    }

    const price = parseFloat(priceForm.price);
    if (isNaN(price) || price <= 0) {
      toast.error('Harga harus berupa angka positif');
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 [PRICE] Updating market price...');
      
      const updateData = {
        commodity: priceForm.commodity.trim(),
        price: price,
        unit: priceForm.unit.trim(),
        date: priceForm.date || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Data update:', updateData);

      // If editing a local optimistic entry, update localStorage/state instead
      let targetId = editingPrice?.id;
      if (typeof targetId === 'string' && targetId.startsWith('temp_')) {
        try {
          const localPrices = JSON.parse(localStorage.getItem('marketPrices') || '[]');
          const updatedLocal = localPrices.map((p: any) => (p.id === targetId ? { ...p, ...updateData } : p));
          localStorage.setItem('marketPrices', JSON.stringify(updatedLocal));
          setMarketPrices((prev: any[]) => prev.map(p => (p.id === targetId ? { ...p, ...updateData } : p)));
          toast.success('✅ Harga pasar lokal berhasil diperbarui');
          setPriceForm({ commodity: '', price: '', unit: '', date: '' });
          setEditingPrice(null);
          setShowPriceDialog(false);
          setLoading(false);
          return;
        } catch (lsErr) {
          console.error('❌ [PRICE] Failed updating local price:', lsErr);
          toast.error('Gagal memperbarui harga lokal');
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('market_prices')
        .update(updateData)
        .eq('id', targetId)
        .select()
        .single();

      if (error) {
        console.error('❌ [PRICE] Update failed:', error);
        throw error;
      }

      console.log('✅ [PRICE] Updated:', data);
      toast.success('✅ Harga pasar berhasil diupdate');

      // Reset form
      setPriceForm({ commodity: '', price: '', unit: '', date: '' });
      setEditingPrice(null);
      setShowPriceDialog(false);

      // Reload data
      await loadMarketPrices();
      window.dispatchEvent(new Event('dataUpdated'));
    } catch (error: any) {
      console.error('❌ [PRICE] Error:', error);
      let errorMessage = 'Gagal update harga pasar';
      if (error?.message) errorMessage = error.message;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrice = async (priceId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus harga pasar ini?')) return;

    setLoading(true);
    try {
      console.log('🗑️ [PRICE] Deleting market price:', priceId);

      // If this is a local optimistic item, remove locally
      if (typeof priceId === 'string' && priceId.startsWith('temp_')) {
        try {
          const localPrices = JSON.parse(localStorage.getItem('marketPrices') || '[]');
          const updatedLocal = localPrices.filter((p: any) => p.id !== priceId);
          localStorage.setItem('marketPrices', JSON.stringify(updatedLocal));
          setMarketPrices((prev: any[]) => prev.filter(p => p.id !== priceId));
          toast.success('✅ Harga pasar lokal berhasil dihapus');
          setLoading(false);
          return;
        } catch (lsErr) {
          console.error('❌ [PRICE] Failed deleting local price:', lsErr);
          toast.error('Gagal menghapus harga lokal');
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('market_prices')
        .delete()
        .eq('id', priceId);

      if (error) {
        console.error('❌ [PRICE] Delete failed:', error);
        throw error;
      }

      console.log('✅ [PRICE] Deleted');
      toast.success('✅ Harga pasar berhasil dihapus');

      // Reload data
      await loadMarketPrices();
      window.dispatchEvent(new Event('dataUpdated'));
    } catch (error: any) {
      console.error('❌ [PRICE] Error:', error);
      let errorMessage = 'Gagal hapus harga pasar';
      if (error?.message) errorMessage = error.message;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditArticle = (article: any) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title,
      content: article.content,
      source: article.source || '',
      url: article.url || '',
      image_url: article.image_url || '',
      article_url: article.article_url || ''
    });
  };

  const handleUpdateArticle = async () => {
    // Validasi form
    if (!articleForm.title?.trim()) {
      toast.error('Judul artikel harus diisi');
      return;
    }
    if (!articleForm.content?.trim()) {
      toast.error('Konten artikel harus diisi');
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 [ARTICLE] Updating article...');

      let imageUrl = articleForm.image_url;

      // Upload image file if selected
      if (selectedImageFile) {
        try {
          imageUrl = await uploadImageToStorage(selectedImageFile);
          console.log('✅ [ARTICLE] Image uploaded:', imageUrl);
        } catch (uploadError: any) {
          console.error('❌ [ARTICLE] Image upload failed:', uploadError);
          toast.error(`Gagal upload gambar: ${uploadError.message}`);
          setLoading(false);
          return;
        }
      }

      const updateData = {
        title: articleForm.title.trim(),
        content: articleForm.content.trim(),
        source: articleForm.source || '',
        url: articleForm.url || '',
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      };

      console.log('Data update:', updateData);

      // Resolve real ID if optimistic/temp id was used
      let targetArticleId = editingArticle.id;
      if (typeof targetArticleId === 'string' && targetArticleId.startsWith('temp_')) {
        // Update local optimistic article instead of failing
        try {
          const localArticles = JSON.parse(localStorage.getItem('articles') || '[]');
          const updatedLocal = localArticles.map((a: any) => (a.id === targetArticleId ? { ...a, ...updateData } : a));
          localStorage.setItem('articles', JSON.stringify(updatedLocal));
          setArticles((prev: any[]) => prev.map(a => (a.id === targetArticleId ? { ...a, ...updateData } : a)));
          toast.success('✅ Artikel lokal berhasil diperbarui');
          setArticleForm({ title: '', content: '', source: '', url: '', image_url: '', article_url: '' });
          setSelectedImageFile(null);
          setImagePreview('');
          setEditingArticle(null);
          setShowArticleDialog(false);
          setLoading(false);
          return;
        } catch (lsErr) {
          console.error('❌ [ARTICLE] Failed updating local article:', lsErr);
          toast.error('Gagal memperbarui artikel lokal');
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('articles')
        .update(updateData)
        .eq('id', targetArticleId)
        .select()
        .single();

      if (error) {
        console.error('❌ [ARTICLE] Update failed:', error);
        throw error;
      }

      console.log('✅ [ARTICLE] Updated:', data);
      toast.success('✅ Artikel berhasil diupdate');

      // Reset form
      setArticleForm({ title: '', content: '', source: '', url: '', image_url: '', article_url: '' });
      setSelectedImageFile(null);
      setImagePreview('');
      setEditingArticle(null);
      setShowArticleDialog(false);

      // Reload data
      await loadArticles();
      window.dispatchEvent(new Event('dataUpdated'));
    } catch (error: any) {
      console.error('❌ [ARTICLE] Error:', error);
      let errorMessage = 'Gagal update artikel';
      if (error?.message) errorMessage = error.message;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus artikel ini?')) return;

    setLoading(true);
    try {
      console.log('🗑️ [ARTICLE] Deleting article:', articleId);

      // If this is an optimistic/temp item, just remove locally
      if (articleId && articleId.startsWith && articleId.startsWith('temp_')) {
        const localArticles = JSON.parse(localStorage.getItem('articles') || '[]');
        const updatedLocal = localArticles.filter((a: any) => a.id !== articleId);
        localStorage.setItem('articles', JSON.stringify(updatedLocal));
        // Also remove from in-memory state
        setArticles((prev: any[]) => prev.filter(a => a.id !== articleId));
        toast.success('✅ Artikel lokal berhasil dihapus');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId);

      if (error) {
        console.error('❌ [ARTICLE] Delete failed:', error);
        throw error;
      }

      console.log('✅ [ARTICLE] Deleted');
      toast.success('✅ Artikel berhasil dihapus');

      // Reload data
      await loadArticles();
      window.dispatchEvent(new Event('dataUpdated'));
    } catch (error: any) {
      console.error('❌ [ARTICLE] Error:', error);
      let errorMessage = 'Gagal hapus artikel';
      if (error?.message) errorMessage = error.message;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTip = (tip: any) => {
    setEditingTip(tip);
    setTipForm({
      title: tip.title,
      content: tip.content,
      category: tip.category || ''
    });
  };

  const handleUpdateTip = async () => {
    if (!tipForm.title?.trim()) {
      toast.error('Judul tips harus diisi');
      return;
    }
    if (!tipForm.content?.trim()) {
      toast.error('Konten tips harus diisi');
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 [TIP] Updating tip...');

      const updateData = {
        title: tipForm.title.trim(),
        content: tipForm.content.trim(),
        category: tipForm.category?.trim() || 'general',
        updated_at: new Date().toISOString()
      };

      console.log('Data update:', updateData);

      // If this is a local optimistic tip, update it in localStorage/state
      let targetTipId = editingTip.id;
      if (typeof targetTipId === 'string' && targetTipId.startsWith('temp_')) {
        try {
          const localTips = JSON.parse(localStorage.getItem('tips') || '[]');
          const updatedLocalTips = localTips.map((t: any) => {
            if (t.id === targetTipId) {
              return { ...t, ...updateData };
            }
            return t;
          });
          localStorage.setItem('tips', JSON.stringify(updatedLocalTips));
          setTips((prev: any[]) => prev.map((t) => (t.id === targetTipId ? { ...t, ...updateData } : t)));
          toast.success('✅ Tips lokal berhasil diperbarui');
          setTipForm({ title: '', content: '', category: '' });
          setEditingTip(null);
          setShowTipDialog(false);
          setLoading(false);
          return;
        } catch (lsErr) {
          console.error('❌ [TIP] Failed updating local tip:', lsErr);
          toast.error('Gagal memperbarui tips lokal');
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('tips')
        .update(updateData)
        .eq('id', targetTipId)
        .select()
        .single();

      if (error) {
        console.error('❌ [TIP] Update failed:', error);
        throw error;
      }

      console.log('✅ [TIP] Updated:', data);
      toast.success('✅ Tips berhasil diupdate');

      // Reset form
      setTipForm({ title: '', content: '', category: '' });
      setEditingTip(null);
      setShowTipDialog(false);

      // Reload data
      await loadTips();
      window.dispatchEvent(new Event('dataUpdated'));
    } catch (error: any) {
      console.error('❌ [TIP] Error:', error);
      let errorMessage = 'Gagal update tips';
      if (error?.message) errorMessage = error.message;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTip = async (tipId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tips ini?')) return;

    setLoading(true);
    try {
      console.log('🗑️ [TIP] Deleting tip:', tipId);

      // If optimistic/temp id, remove locally
      if (typeof tipId === 'string' && tipId.startsWith('temp_')) {
        const localTips = JSON.parse(localStorage.getItem('tips') || '[]');
        const updatedLocalTips = localTips.filter((t: any) => t.id !== tipId);
        localStorage.setItem('tips', JSON.stringify(updatedLocalTips));
        setTips((prev: any[]) => prev.filter(t => t.id !== tipId));
        toast.success('✅ Tips lokal berhasil dihapus');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('tips')
        .delete()
        .eq('id', tipId);

      if (error) {
        console.error('❌ [TIP] Delete failed:', error);
        throw error;
      }

      console.log('✅ [TIP] Deleted');
      toast.success('✅ Tips berhasil dihapus');

      // Reload data
      await loadTips();
      window.dispatchEvent(new Event('dataUpdated'));
    } catch (error: any) {
      console.error('❌ [TIP] Error:', error);
      let errorMessage = 'Gagal hapus tips';
      if (error?.message) errorMessage = error.message;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const viewDetail = (item: any) => {
    setSelectedDetail(item);
    setShowDetailDialog(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  // Handle Export to Excel (Admin)
  const handleExportExcelAdmin = () => {
    try {
      if (userData.length === 0) {
        toast.error('Tidak ada data untuk diekspor');
        return;
      }

      console.log('=== ADMIN EXPORT EXCEL ===');
      console.log('Total records:', userData.length);

      // Prepare data for export
      const exportData = userData.map((planting) => ({
        'Nama Petani': planting.user_name || '-',
        'Jenis Bibit': planting.seed_type || '-',
        'Tanggal Tanam': formatDate(planting.planting_date || ''),
        'Jumlah Bibit': planting.seed_count || 0,
        'Status': (planting.harvest_yield) ? 'Sudah Panen' : 'Belum Panen',
        'Tanggal Panen': formatDate(planting.harvest_date || '') || '-',
        'Hasil Panen (kg)': planting.harvest_yield || '-',
        'Pendapatan (Rp)': planting.sales_amount ? formatPrice(planting.sales_amount) : '-'
      }));

      console.log('Export data prepared:', exportData.length, 'records');

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const columnWidths = [
        { wch: 20 }, // Nama Petani
        { wch: 15 }, // Jenis Bibit
        { wch: 15 }, // Tanggal Tanam
        { wch: 12 }, // Jumlah Bibit
        { wch: 12 }, // Status
        { wch: 15 }, // Tanggal Panen
        { wch: 15 }, // Hasil Panen
        { wch: 15 }  // Pendapatan
      ];
      worksheet['!cols'] = columnWidths;

      // Set header styling
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!worksheet[address]) continue;
        worksheet[address].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '16a34a' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }

      // Format data cells
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[address]) continue;
          worksheet[address].s = {
            alignment: { horizontal: 'left', vertical: 'center' },
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' }
            }
          };
        }
      }

      // Freeze first row
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Tanam');

      // Generate filename with date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `Laporan_Admin_Semua_Petani_${dateStr}_${timeStr}.xlsx`;

      console.log('Exporting file:', filename);

      // Write file
      XLSX.writeFile(workbook, filename);

      console.log('✓ Export Excel successful');
      toast.success('Laporan semua petani berhasil diekspor ke Excel');
    } catch (error) {
      console.error('=== EXPORT EXCEL ERROR ===');
      console.error('Error:', error);
      toast.error('Gagal mengekspor laporan. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
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
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  SIKUWAT Admin
                </h1>
                <p className="text-xs text-gray-600 hidden md:block">Panel Administrasi</p>
              </div>
            </div>
            <Button
              onClick={onLogout}
              variant="outline"
              className="gap-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
          {[
            { icon: TrendingUp, label: 'Harga Pasar', value: marketPrices.length, color: 'from-emerald-500 to-teal-600' },
            { icon: Newspaper, label: 'Artikel', value: articles.length, color: 'from-blue-500 to-cyan-600' },
            { icon: Lightbulb, label: 'Tips', value: tips.length, color: 'from-purple-500 to-pink-600' },
            { icon: Users, label: 'Data Petani', value: userData.length, color: 'from-orange-500 to-red-600' },
            { icon: BarChart3, label: 'Dipanen', value: stats.totalHarvested, color: 'from-amber-500 to-yellow-600' },
            { icon: Calendar, label: 'Revenue', value: `${(stats.totalRevenue / 1000000).toFixed(1)}M`, color: 'from-green-500 to-emerald-600' },
          ].map((stat, idx) => (
            <div key={idx} className="group">
              <div className="relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} rounded-2xl blur-sm group-hover:blur-md transition-all duration-300 opacity-20`}></div>
                <Card className="relative p-3 sm:p-4 backdrop-blur-sm bg-white/90 border-0 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <stat.icon className={`h-7 sm:h-8 w-7 sm:w-8 mb-3 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} />
                  <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </Card>
              </div>
            </div>
          ))}
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tanam</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalPlantings}</p>
                <p className="text-xs text-gray-500 mt-1">Semua data penanaman</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Leaf className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Panen</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalHarvested}</p>
                <p className="text-xs text-gray-500 mt-1">Berhasil dipanen</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hasil</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">{stats.totalYield.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">kg</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-lg">
                <Leaf className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Penghasilan</p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    notation: 'compact',
                    minimumFractionDigits: 0
                  }).format(stats.totalRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Dari semua petani</p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="monitoring" className="space-y-6">
          <TabsList className="flex w-full gap-2 overflow-x-auto bg-white/80 backdrop-blur-sm border border-emerald-100 rounded-xl p-1">
            <TabsTrigger value="monitoring" className="min-w-[110px] flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg text-sm sm:text-base">Monitoring</TabsTrigger>
            <TabsTrigger value="approval" className="min-w-[140px] flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg text-sm sm:text-base">Persetujuan Akun ({pendingUsers.length})</TabsTrigger>
            <TabsTrigger value="prices" className="min-w-[110px] flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg text-sm sm:text-base">Harga Pasar</TabsTrigger>
            <TabsTrigger value="articles" className="min-w-[110px] flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg text-sm sm:text-base">Artikel</TabsTrigger>
            <TabsTrigger value="tips" className="min-w-[110px] flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg text-sm sm:text-base">Tips</TabsTrigger>
          </TabsList>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Monitoring Aktivitas Pengguna</CardTitle>
                    <CardDescription>Data penanaman dari semua petani</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleExportExcelAdmin}
                      variant="outline"
                      className="gap-2"
                      disabled={userData.length === 0}
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Export Excel</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cari nama petani atau jenis bibit..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Table - Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Petani</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Tgl Tanam</TableHead>
                        <TableHead>Tgl Panen</TableHead>
                        <TableHead>Hasil</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUserData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                            {searchQuery ? 'Tidak ada data yang cocok' : 'Belum ada data'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUserData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.user_name}</TableCell>
                            <TableCell>{item.seed_type}</TableCell>
                            <TableCell>{item.seed_count} bibit</TableCell>
                            <TableCell>{formatDate(item.planting_date)}</TableCell>
                            <TableCell>{item.harvest_date ? formatDate(item.harvest_date) : '-'}</TableCell>
                            <TableCell>{item.harvest_yield ? item.harvest_yield + ' kg' : '-'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => viewDetail(item)}
                                >
                                  <Eye className="h-3 w-3" />
                                  Detail
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Cards - Mobile */}
                <div className="md:hidden space-y-3">
                  {filteredUserData.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      {searchQuery ? 'Tidak ada data yang cocok' : 'Belum ada data'}
                    </p>
                  ) : (
                    filteredUserData.map((item) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{item.user_name}</h4>
                            <p className="text-sm text-gray-600">{item.seed_type}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewDetail(item)}
                          >
                            Detail
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Jumlah:</span>
                            <div className="font-medium">{item.seed_count} bibit</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Tgl Tanam:</span>
                            <div className="font-medium">{formatDate(item.planting_date)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Tgl Panen:</span>
                            <div className="font-medium">{item.harvest_date ? formatDate(item.harvest_date) : '-'}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Hasil:</span>
                            <div className="font-medium">{item.harvest_yield ? item.harvest_yield + ' kg' : '-'}</div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Approval Tab */}
          <TabsContent value="approval">
            <Card>
              <CardHeader>
                <CardTitle>Persetujuan Akun User Baru</CardTitle>
                <CardDescription>
                  {pendingUsers.length === 0 ? 'Tidak ada akun yang menunggu persetujuan' : `${pendingUsers.length} akun menunggu persetujuan Anda`}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>Semua akun telah disetujui</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingUsers.map((user) => (
                      <Card key={user.id} className="border-l-4 border-l-amber-500">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="font-semibold text-lg">{user.name}</p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              <p className="text-xs text-gray-500 mt-2">
                                Mendaftar: {new Date(user.created_at).toLocaleDateString('id-ID', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleApproveUser(user.id, user.name)}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                Setujui
                              </Button>
                              <Button
                                onClick={() => {
                                  if (confirm(`Tolak akun ${user.name}? Akun ini akan dihapus.`)) {
                                    handleRejectUser(user.id, user.email, user.name);
                                  }
                                }}
                                disabled={loading}
                                variant="destructive"
                              >
                                Tolak
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Market Prices Tab */}
          <TabsContent value="prices">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Kelola Harga Pasar</CardTitle>
                  <Dialog open={showPriceDialog} onOpenChange={(open) => {
                    setShowPriceDialog(open);
                    if (!open) {
                      setEditingPrice(null);
                      setPriceForm({ commodity: '', price: '', unit: '', date: '' });
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Tambah Harga</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-full sm:max-w-md sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                      <DialogHeader>
                        <DialogTitle>{editingPrice ? 'Edit Harga Pasar' : 'Tambah Harga Pasar'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Komoditas</Label>
                          <Input
                            placeholder="Contoh: Cabai Merah"
                            value={priceForm.commodity}
                            onChange={(e) => setPriceForm({ ...priceForm, commodity: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Harga</Label>
                          <Input
                            type="number"
                            placeholder="43000"
                            value={priceForm.price}
                            onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Satuan</Label>
                          <Input
                            placeholder="kg"
                            value={priceForm.unit}
                            onChange={(e) => setPriceForm({ ...priceForm, unit: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            onClick={editingPrice ? handleUpdatePrice : handleAddPrice}
                            disabled={loading}
                            className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            {loading ? 'Loading...' : (editingPrice ? 'Update' : 'Simpan')}
                          </Button>
                          {editingPrice && (
                            <Button
                              onClick={() => {
                                setEditingPrice(null);
                                setPriceForm({ commodity: '', price: '', unit: '', date: '' });
                              }}
                              variant="outline"
                              className="w-full sm:w-auto"
                            >
                              Batal
                            </Button>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="space-y-2">
                  {marketPrices.map((price) => (
                    <div key={price.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">{price.commodity}</span>
                        <span className="text-emerald-600 font-semibold ml-4">
                          {formatPrice(price.price)}/{price.unit}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleEditPrice(price);
                            setShowPriceDialog(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePrice(price.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Articles Tab */}
          <TabsContent value="articles">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Kelola Artikel</CardTitle>
                  <Dialog open={showArticleDialog} onOpenChange={(open) => {
                    setShowArticleDialog(open);
                    if (!open) {
                      // Reset form ketika dialog ditutup
                      setEditingArticle(null);
                      setArticleForm({ title: '', content: '', source: '', url: '', image_url: '', article_url: '' });
                      setSelectedImageFile(null);
                      setImagePreview('');
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Tambah Artikel</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingArticle ? '✏️ Edit Artikel' : '📝 Tambah Artikel Baru'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-5">
                        {/* Section 1: Konten Utama */}
                        <div>
                          <Label className="text-base font-semibold mb-2 block">📌 Judul Artikel</Label>
                          <Input
                            placeholder="Masukkan judul artikel (min 5 karakter)"
                            value={articleForm.title}
                            onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-base font-semibold mb-2 block">📄 Konten Artikel</Label>
                          <Textarea
                            placeholder="Isi artikel lengkap (min 20 karakter)..."
                            rows={5}
                            value={articleForm.content}
                            onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                            className="mt-1"
                          />
                        </div>

                        {/* Divider */}
                        <div className="border-t pt-5">
                          <h3 className="font-semibold text-emerald-700 mb-4 flex items-center gap-2">
                            📥 Sumber Artikel
                          </h3>
                          
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <Label className="text-sm font-semibold mb-1 block\">Auto-Fetch dari URL (Opsional)</Label>\n                            <p className="text-xs text-gray-600 mb-3">Paste URL artikel untuk auto-extract konten dan gambar dari website</p>
                            <div className="flex gap-2">
                              <Input
                                placeholder="https://example.com/artikel"
                                value={articleForm.article_url || articleForm.url}
                                onChange={(e) => setArticleForm({ ...articleForm, article_url: e.target.value })}
                                className="flex-1"
                              />
                              <Button
                                onClick={() => fetchArticleFromUrl(articleForm.article_url || articleForm.url)}
                                disabled={fetchingArticle || !articleForm.article_url}
                                className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                                title="Auto-fetch artikel dari URL"
                              >
                                {fetchingArticle ? '⏳ Loading' : '🔗 Fetch'}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t pt-5">
                          <h3 className="font-semibold text-emerald-700 mb-4 flex items-center gap-2">
                            🖼️ Gambar Artikel
                          </h3>

                          {/* URL Gambar */}
                          <div className="mb-4">
                            <Label className="text-sm font-semibold mb-1 block">URL Gambar (Opsional)</Label>
                            <Input
                              placeholder="https://example.com/image.jpg"
                              value={articleForm.image_url}
                              onChange={(e) => setArticleForm({ ...articleForm, image_url: e.target.value })}
                              className="mt-1"
                            />
                          </div>

                          {/* Upload Gambar */}
                          <div className="mb-4">
                            <Label className="text-sm font-semibold mb-2 block\">Atau Upload Gambar dari Device</Label>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageFileSelect}
                              className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                            />
                          </div>

                          {/* Preview */}
                          {(imagePreview || articleForm.image_url) && (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <p className="text-xs font-semibold text-gray-700 mb-2\">Preview Gambar:</p>
                              <img
                                src={imagePreview || articleForm.image_url}
                                alt="Preview"
                                className="w-full max-w-xs sm:w-48 h-auto sm:h-40 object-cover rounded-lg border border-emerald-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="border-t pt-5 flex flex-col sm:flex-row gap-2">
                          <Button
                            onClick={editingArticle ? handleUpdateArticle : handleAddArticle}
                            disabled={loading}
                            className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          >
                            {loading ? '⏳ Menyimpan...' : (editingArticle ? '✏️ Update Artikel' : '💾 Simpan Artikel')}
                          </Button>
                          {editingArticle && (
                            <Button
                              onClick={() => {
                                setEditingArticle(null);
                                setArticleForm({ title: '', content: '', source: '', url: '', image_url: '', article_url: '' });
                                setSelectedImageFile(null);
                                setImagePreview('');
                              }}
                              variant="outline"
                              className="w-full sm:w-auto px-6"
                            >
                              ✕ Batal
                            </Button>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="space-y-3">
                  {articles.map((article) => (
                    <div key={article.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold flex-1">{article.title}</h4>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleEditArticle(article);
                              setShowArticleDialog(true);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteArticle(article.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{article.content}</p>
                      <span className="text-xs text-emerald-600">{article.source}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Kelola Tips</CardTitle>
                  <Dialog open={showTipDialog} onOpenChange={(open) => {
                    setShowTipDialog(open);
                    if (!open) {
                      setEditingTip(null);
                      setTipForm({ title: '', content: '', category: '' });
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Tambah Tips</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-full sm:max-w-md sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                      <DialogHeader>
                        <DialogTitle>{editingTip ? 'Edit Tips' : 'Tambah Tips'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Judul</Label>
                          <Input
                            placeholder="5 Cara Menanam Hidroponik"
                            value={tipForm.title}
                            onChange={(e) => setTipForm({ ...tipForm, title: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Konten</Label>
                          <Textarea
                            placeholder="Isi tips..."
                            rows={4}
                            value={tipForm.content}
                            onChange={(e) => setTipForm({ ...tipForm, content: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Kategori</Label>
                          <Input
                            placeholder="Hidroponik"
                            value={tipForm.category}
                            onChange={(e) => setTipForm({ ...tipForm, category: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            onClick={editingTip ? handleUpdateTip : handleAddTip}
                            disabled={loading}
                            className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            {loading ? 'Loading...' : (editingTip ? 'Update' : 'Simpan')}
                          </Button>
                          {editingTip && (
                            <Button
                              onClick={() => {
                                setEditingTip(null);
                                setTipForm({ title: '', content: '', category: '' });
                              }}
                              variant="outline"
                              className="w-full sm:w-auto"
                            >
                              Batal
                            </Button>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="grid md:grid-cols-2 gap-3">
                  {tips.map((tip) => (
                    <div key={tip.id} className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold flex-1">{tip.title}</h4>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleEditTip(tip);
                              setShowTipDialog(true);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTip(tip.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-2 line-clamp-2">{tip.content}</p>
                      <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                        {tip.category}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="w-full sm:max-w-lg sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Detail Data Penanaman</DialogTitle>
          </DialogHeader>
          {selectedDetail && (
            <div className="space-y-4">
              <div>
                <Label className="text-gray-600">Nama Petani</Label>
                <div className="font-semibold">{selectedDetail.user_name}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Jenis Bibit</Label>
                  <div className="font-semibold">{selectedDetail.seed_type}</div>
                </div>
                <div>
                  <Label className="text-gray-600">Jumlah Bibit</Label>
                  <div className="font-semibold">{selectedDetail.seed_count}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Tanggal Tanam</Label>
                  <div className="font-semibold">{formatDate(selectedDetail.planting_date)}</div>
                </div>
                <div>
                  <Label className="text-gray-600">Tanggal Panen</Label>
                  <div className="font-semibold">
                    {selectedDetail.harvest_date ? formatDate(selectedDetail.harvest_date) : '-'}
                  </div>
                </div>
              </div>
              {selectedDetail.harvest_yield && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Hasil Panen</Label>
                    <div className="font-semibold">{selectedDetail.harvest_yield} kg</div>
                  </div>
                  <div>
                    <Label className="text-gray-600">Penjualan</Label>
                    <div className="font-semibold">
                      {selectedDetail.sales_amount ? formatPrice(selectedDetail.sales_amount) : '-'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
