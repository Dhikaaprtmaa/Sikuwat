import { useState, useEffect } from 'react';
import { LogOut, CalendarIcon, Leaf, TrendingUp, DollarSign, BarChart3, BookOpen, Plus, Download, Sprout, Wheat, Target, Sparkles, Award, Orange } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/app/components/ui/alert-dialog';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { createClient } from '@supabase/supabase-js';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import * as XLSX from 'xlsx';

interface UserPanelProps {
  user: any;
  onLogout: () => void;
}

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export default function UserPanel({ user, onLogout }: UserPanelProps) {
  // Safety check for user prop
  if (!user || !user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600">User Session Error</h2>
          <p className="text-gray-600 mt-2">User information not available. Please login again.</p>
          <button 
            onClick={onLogout}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const [plantings, setPlantings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'input' | 'reports'>('dashboard');
  const [dashboardMetrics, setDashboardMetrics] = useState({
    totalPlantings: 0,
    totalSeeds: 0,
    totalHarvest: 0,
    totalRevenue: 0,
    avgProductivity: 0,
    successRate: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'planted' | 'harvested'>('all');

  // Form state for planting
  const [plantingForm, setPlantingForm] = useState({
    seedType: '',
    seedCount: '',
    plantingDate: '',
    harvestDate: '',
    harvestYield: '',
    salesAmount: ''
  });

  // Form state for harvest
  const [harvestForm, setHarvestForm] = useState({
    plantingId: '',
    harvestDate: '',
    harvestYield: '',
    quality: '',
    notes: '',
    expenses: '',
    weatherCondition: '',
    sellingPrice: '',
    harvestMethod: '',
    additionalExpenses: ''
  });

  // State untuk edit harvest
  const [editingHarvest, setEditingHarvest] = useState<any>(null);
  const [editHarvestForm, setEditHarvestForm] = useState({
    harvestDate: '',
    harvestYield: '',
    salesAmount: ''
  });

  // State untuk edit planting
  const [editingPlanting, setEditingPlanting] = useState<any>(null);
  const [editPlantingForm, setEditPlantingForm] = useState({
    seedType: '',
    seedCount: '',
    plantingDate: '',
    harvestDate: ''
  });

  useEffect(() => {
    // Debug: Check user session on component mount
    const checkUserSession = async () => {
      console.log('UserPanel - Checking user session...');
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user) {
        console.log('UserPanel - Current user:', session.session.user.email);
        console.log('UserPanel - User ID:', session.session.user.id);
        console.log('UserPanel - User metadata:', session.session.user.user_metadata);
        loadPlantings();
      } else {
        console.log('UserPanel - No active session');
      }
    };
    checkUserSession();
  }, []);

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || '';
  };

  const loadPlantings = async () => {
    try {
      console.log('Loading plantings...');
      console.log('User object:', user);
      console.log('User ID:', user?.id);
      
      const token = await getAccessToken();
      if (!token) {
        console.warn('No access token available');
        setPlantings([]);
        return;
      }

      let data;

      try {
        // Coba load via Edge Function
        console.log('Trying Edge Function...');
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-491d5b26/user/plantings`,
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

        // Fallback: Load langsung dari database
        console.log('Trying direct database query for user:', user?.id);
        const { data: plantingsData, error } = await supabase
          .from('plantings')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Direct database query failed:', error);
          console.error('Error details:', error.message, error.details, error.hint);
          // Don't throw error for initial load - just set empty array
          setPlantings([]);
          return;
        }

        console.log('Direct database query success, records:', plantingsData?.length || 0);
        data = { success: true, data: plantingsData };
      }

      if (data && data.success) {
        console.log('Plantings loaded:', data.data?.length || 0, 'records');
        setPlantings(data.data || []);
        calculateMetrics(data.data || []);
        prepareChartData(data.data || []);
      } else {
        console.error('Failed to load plantings:', data?.error);
        setPlantings([]);
      }
    } catch (error) {
      console.error('Error loading plantings:', error);
      setPlantings([]);
    }
  };

  const calculateMetrics = (plantingsData: any[]) => {
    const totalPlantings = plantingsData.length;
    const totalSeeds = plantingsData.reduce((sum, p) => sum + (parseInt(p.seed_count) || 0), 0);
    const harvestedPlantings = plantingsData.filter(p => p.harvest_yield);
    const totalHarvest = harvestedPlantings.reduce((sum, p) => sum + (parseFloat(p.harvest_yield) || 0), 0);
    const totalRevenue = harvestedPlantings.reduce((sum, p) => sum + (parseFloat(p.sales_amount) || 0), 0);
    const avgProductivity = harvestedPlantings.length > 0 ? totalHarvest / harvestedPlantings.length : 0;
    const successRate = totalPlantings > 0 ? (harvestedPlantings.length / totalPlantings) * 100 : 0;

    setDashboardMetrics({
      totalPlantings,
      totalSeeds,
      totalHarvest,
      totalRevenue,
      avgProductivity: Math.round(avgProductivity * 100) / 100,
      successRate: Math.round(successRate * 100) / 100
    });
  };

  const prepareChartData = (plantingsData: any[]) => {
    // Group by month for productivity chart
    const monthlyData: { [key: string]: any } = {};

    plantingsData.forEach(planting => {
      if (planting.harvest_date) {
        const date = new Date(planting.harvest_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            harvest: 0,
            revenue: 0,
            count: 0
          };
        }

        monthlyData[monthKey].harvest += parseFloat(planting.harvest_yield) || 0;
        monthlyData[monthKey].revenue += parseFloat(planting.sales_amount) || 0;
        monthlyData[monthKey].count += 1;
      }
    });

    const chartData = Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month));
    setChartData(chartData);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID').format(price);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handlePlantingSubmit = async () => {
    if (!plantingForm.seedType || !plantingForm.seedCount || !plantingForm.plantingDate) {
      toast.error('Jenis bibit, jumlah, dan tanggal tanam harus diisi');
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Sesi login telah berakhir. Silakan login kembali.');
        return;
      }

      console.log('=== PLANTING SUBMISSION DEBUG ===');
      console.log('Submitting planting data:', plantingForm);
      console.log('Current user:', user);
      console.log('User ID:', user?.id);
      console.log('User Email:', user?.email);

      // Validasi user ID
      if (!user?.id) {
        toast.error('User ID tidak ditemukan. Silakan login kembali.');
        return;
      }

      // Get current session for extra validation
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Current session user ID:', sessionData.session?.user?.id);
      console.log('Session auth state:', { 
        hasSession: !!sessionData.session,
        sessionUser: sessionData.session?.user?.email,
        sessionUID: sessionData.session?.user?.id
      });

      // Coba simpan via Edge Function terlebih dahulu
      let response;
      let data;

      try {
        response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-491d5b26/user/plantings`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              seedType: plantingForm.seedType,
              seedCount: parseInt(plantingForm.seedCount),
              plantingDate: plantingForm.plantingDate,
              userId: user?.id // Tambahkan userId untuk Edge Function
            })
          }
        );

        console.log('Edge Function response status:', response.status);

        if (response.ok) {
          data = await response.json();
          console.log('Edge Function response:', data);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (edgeError) {
        console.warn('Edge Function failed, trying direct database insert:', edgeError);

        // Fallback: Simpan langsung ke database menggunakan Supabase client
        const userName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'Unknown User';
        const plantingData = {
          id: `planting_${user.id}_${Date.now()}`,
          seed_type: plantingForm.seedType,
          seed_count: parseInt(plantingForm.seedCount),
          planting_date: plantingForm.plantingDate,
          user_id: user.id,
          user_name: userName
        };

        console.log('=== DIRECT DB INSERT ===');
        console.log('Insert data:', plantingData);
        console.log('Insert data types:', {
          id: typeof plantingData.id,
          seed_type: typeof plantingData.seed_type,
          seed_count: typeof plantingData.seed_count,
          planting_date: typeof plantingData.planting_date,
          user_id: typeof plantingData.user_id,
          user_name: typeof plantingData.user_name
        });

        // Pastikan kita menggunakan session yang valid
        if (!sessionData.session) {
          throw new Error('Session tidak valid. Silakan login kembali.');
        }

        const { error: insertError } = await supabase
          .from('plantings')
          .insert([plantingData]);

        if (insertError) {
          console.error('=== DATABASE INSERT ERROR ===');
          console.error('Full error object:', insertError);
          console.error('Error code:', insertError.code);
          console.error('Error message:', insertError.message);
          console.error('Error details:', insertError.details);
          console.error('Error hint:', insertError.hint);
          console.error('Error status:', insertError.status);
          console.error('Tried to insert:', plantingData);
          console.error('Current auth.uid():', sessionData.session?.user?.id);
          
          // Provide specific error message to user
          let userMessage = 'Gagal menyimpan data penanaman';
          
          if (insertError.message.includes('violates row level security')) {
            userMessage = '❌ Akses ditolak oleh RLS Policy.\n\nSolusi:\n1. Pastikan sudah login\n2. Jalankan SQL fix di Supabase\n3. Login ulang aplikasi';
          } else if (insertError.message.includes('duplicate')) {
            userMessage = 'Data dengan informasi yang sama sudah ada.';
          } else if (insertError.message.includes('unauthorized') || insertError.message.includes('permission denied')) {
            userMessage = '❌ Permission ditolak.\n\nSolusi:\n1. Lihat file TROUBLESHOOTING_PERMISSION_ERROR.md\n2. Jalankan SUPABASE_RLS_FIX.sql di Supabase console\n3. Login ulang di aplikasi';
          } else if (insertError.message.includes('invalid input syntax')) {
            userMessage = 'Format data tidak valid. Periksa semua field.';
          } else if (insertError.message.includes('invalid request')) {
            userMessage = 'Request tidak valid. Pastikan semua field sudah diisi dengan benar.';
          } else {
            userMessage = `Error: ${insertError.message}`;
          }
          
          toast.error(userMessage);
          throw insertError;
        }

        // Verify insert success by fetching the inserted data
        const { data: verifyData, error: verifyError } = await supabase
          .from('plantings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (verifyError) {
          console.warn('Could not verify insert:', verifyError);
        } else {
          console.log('✓ Direct insert success, verified data:', verifyData);
        }

        data = { success: true, data: verifyData };
      }

      if (data && data.success) {
        console.log('✓ Planting data saved successfully');
        toast.success('Data penanaman berhasil disimpan');

        // Verify data was actually saved to database
        const { data: verifyData, error: verifyError } = await supabase
          .from('plantings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (verifyError) {
          console.warn('Could not verify data save:', verifyError);
        } else {
          console.log('✓ Verification: Data found in database:', verifyData);
        }

        setPlantingForm({
          seedType: '',
          seedCount: '',
          plantingDate: '',
          harvestDate: '',
          harvestYield: '',
          salesAmount: ''
        });
        loadPlantings();
      } else {
        console.error('Failed to save planting data:', data);
        toast.error(data.error || 'Gagal menyimpan data');
      }
    } catch (error) {
      console.error('Error submitting planting data:', error);

      // Berikan pesan error yang lebih spesifik
      let errorMessage = 'Terjadi kesalahan saat menyimpan data';

      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
        } else if (error.message.includes('permission') || error.message.includes('policy')) {
          errorMessage = 'Anda tidak memiliki izin untuk menyimpan data.';
        } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMessage = 'Data dengan informasi yang sama sudah ada.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleHarvestSubmit = async () => {
    console.log('=== HARVEST SUBMIT CLICKED ===');
    console.log('Form data:', harvestForm);
    console.log('Current user ID:', user?.id);
    
    if (!harvestForm.plantingId || !harvestForm.harvestDate || !harvestForm.harvestYield) {
      const missing = [];
      if (!harvestForm.plantingId) missing.push('ID penanaman');
      if (!harvestForm.harvestDate) missing.push('tanggal panen');
      if (!harvestForm.harvestYield) missing.push('hasil panen');
      const message = `Kolom berikut harus diisi: ${missing.join(', ')}`;
      console.log('VALIDATION ERROR:', message);
      toast.error(message);
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Sesi login telah berakhir. Silakan login kembali.');
        return;
      }

      console.log('✓ Token obtained');
      
      // Verify plantingId exists and belongs to user
      const { data: plantingData, error: plantingError } = await supabase
        .from('plantings')
        .select('id, user_id, seed_type, harvest_date')
        .eq('id', harvestForm.plantingId)
        .single();

      console.log('Planting verification:', { plantingData, plantingError });
      
      if (plantingError || !plantingData) {
        console.error('Planting not found:', plantingError);
        toast.error('ID penanaman tidak ditemukan. Silakan pilih penanaman lain.');
        setLoading(false);
        return;
      }

      if (plantingData.user_id !== user.id) {
        console.error('User ID mismatch:', { plantingUserId: plantingData.user_id, currentUserId: user.id });
        toast.error('Anda tidak memiliki hak untuk mengubah data penanaman ini.');
        setLoading(false);
        return;
      }

      if (plantingData.harvest_date) {
        console.warn('Planting already harvested');
        toast.error('Penanaman ini sudah dipanen sebelumnya.');
        setLoading(false);
        return;
      }

      // Update planting record with harvest data
      // Note: Only include columns that exist in the plantings table
      const harvestData = {
        harvest_date: harvestForm.harvestDate,
        harvest_yield: parseFloat(harvestForm.harvestYield),
        sales_amount: harvestForm.sellingPrice ? parseFloat(harvestForm.sellingPrice) * parseFloat(harvestForm.harvestYield) : null
      };

      console.log('=== HARVEST UPDATE ===');
      console.log('Planting ID:', harvestForm.plantingId);
      console.log('User ID:', user.id);
      console.log('Harvest data to save:', harvestData);

      let updateError = null;

      try {
        // Try via Edge Function first
        const edgeFunctionUrl = `https://${projectId}.supabase.co/functions/v1/make-server-491d5b26/user/plantings/${harvestForm.plantingId}`;
        console.log('Calling Edge Function:', edgeFunctionUrl);
        
        const response = await fetch(edgeFunctionUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(harvestData)
        });

        console.log('Edge Function response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.log('Edge Function error response:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('Edge Function response:', data);

        if (!data.success) {
          throw new Error(data.error || 'Edge Function returned error');
        }
        
        console.log('✓ Edge Function update successful');
      } catch (edgeError) {
        console.warn('Edge Function failed, trying direct database update:', edgeError);

        // Fallback: Direct database update
        const { error } = await supabase
          .from('plantings')
          .update(harvestData)
          .eq('id', harvestForm.plantingId);
          // Note: RLS policy will enforce user_id match automatically

        if (error) {
          console.error('=== HARVEST UPDATE ERROR (DIRECT DB) ===');
          console.error('Full error object:', JSON.stringify(error, null, 2));
          console.error('Error message:', error.message);
          console.error('Error code:', error.code);
          console.error('Error details:', error.details);
          console.error('Error hint:', error.hint);
          updateError = error;
        } else {
          console.log('✓ Direct database update success');
        }
      }

      if (updateError) {
        let errorMessage = 'Gagal menyimpan data panen';
        
        if (updateError.message?.includes('violates row level security')) {
          errorMessage = '❌ Akses ditolak oleh RLS Policy. Silakan login ulang.';
        } else if (updateError.message?.includes('permission')) {
          errorMessage = '❌ Permission ditolak. Silakan login ulang.';
        } else if (updateError.message?.includes('duplicate')) {
          errorMessage = 'Data panen untuk tanggal ini sudah ada.';
        } else if (updateError.code === 'PGRST301') {
          errorMessage = '❌ RLS Policy memblokir operasi. Silakan login ulang.';
        }
        
        console.error('Final error message:', errorMessage);
        toast.error(errorMessage);
        return;
      }

      toast.success('Data panen berhasil disimpan');
      setHarvestForm({
        plantingId: '',
        harvestDate: '',
        harvestYield: '',
        quality: '',
        notes: '',
        expenses: '',
        weatherCondition: '',
        sellingPrice: '',
        harvestMethod: '',
        additionalExpenses: ''
      });
      loadPlantings();
    } catch (error) {
      console.error('=== HARVEST SUBMIT EXCEPTION ===');
      console.error('Error object:', error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
      
      let errorMessage = 'Terjadi kesalahan saat menyimpan data panen';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
        } else if (error.message.includes('permission') || error.message.includes('policy')) {
          errorMessage = 'Anda tidak memiliki izin untuk menyimpan data panen.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle Edit Harvest
  const handleEditHarvest = (planting: any) => {
    setEditingHarvest(planting);
    setEditHarvestForm({
      harvestDate: planting.harvest_date || planting.harvestDate || '',
      harvestYield: planting.harvest_yield || planting.harvestYield || '',
      salesAmount: planting.sales_amount || planting.salesAmount || ''
    });
  };

  const handleUpdateHarvest = async () => {
    if (!editHarvestForm.harvestDate || !editHarvestForm.harvestYield) {
      toast.error('Tanggal panen dan hasil panen harus diisi');
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Sesi login telah berakhir. Silakan login kembali.');
        return;
      }

      const updateData = {
        harvest_date: editHarvestForm.harvestDate,
        harvest_yield: parseFloat(editHarvestForm.harvestYield),
        sales_amount: editHarvestForm.salesAmount ? parseFloat(editHarvestForm.salesAmount) : null
      };

      console.log('=== HARVEST UPDATE (EDIT) ===');
      console.log('Planting ID:', editingHarvest.id);
      console.log('Update data:', updateData);

      let updateError = null;

      // Direct database update (RLS will enforce user_id match)
      const { error } = await supabase
        .from('plantings')
        .update(updateData)
        .eq('id', editingHarvest.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('=== HARVEST UPDATE ERROR ===');
        console.error('Error:', JSON.stringify(error, null, 2));
        updateError = error;
      }

      if (updateError) {
        let errorMessage = 'Gagal mengubah data panen';
        
        if (updateError.message?.includes('violates row level security')) {
          errorMessage = '❌ Akses ditolak. Silakan login ulang.';
        } else if (updateError.message?.includes('permission')) {
          errorMessage = '❌ Permission ditolak. Silakan login ulang.';
        }
        
        toast.error(errorMessage);
        return;
      }

      toast.success('Data panen berhasil diubah');
      setEditingHarvest(null);
      loadPlantings();
    } catch (error) {
      console.error('Error updating harvest:', error);
      toast.error('Terjadi kesalahan saat mengubah data panen');
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete Harvest
  const handleDeleteHarvest = async (plantingId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data panen ini? Data yang sudah dihapus tidak bisa dikembalikan.')) {
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Sesi login telah berakhir. Silakan login kembali.');
        return;
      }

      console.log('=== HARVEST DELETE ===');
      console.log('Planting ID:', plantingId);

      let deleteError = null;

      // Reset harvest data (set to null instead of delete)
      const { error } = await supabase
        .from('plantings')
        .update({
          harvest_date: null,
          harvest_yield: null,
          sales_amount: null
        })
        .eq('id', plantingId)
        .eq('user_id', user.id);

      if (error) {
        console.error('=== HARVEST DELETE ERROR ===');
        console.error('Error:', JSON.stringify(error, null, 2));
        deleteError = error;
      }

      if (deleteError) {
        let errorMessage = 'Gagal menghapus data panen';
        
        if (deleteError.message?.includes('violates row level security')) {
          errorMessage = '❌ Akses ditolak. Silakan login ulang.';
        } else if (deleteError.message?.includes('permission')) {
          errorMessage = '❌ Permission ditolak. Silakan login ulang.';
        }
        
        toast.error(errorMessage);
        return;
      }

      toast.success('Data panen berhasil dihapus');
      loadPlantings();
    } catch (error) {
      console.error('Error deleting harvest:', error);
      toast.error('Terjadi kesalahan saat menghapus data panen');
    } finally {
      setLoading(false);
    }
  };

  // Handle Edit Planting
  const handleEditPlanting = (planting: any) => {
    setEditingPlanting(planting);
    setEditPlantingForm({
      seedType: planting.seed_type || planting.seedType || '',
      seedCount: (planting.seed_count || planting.seedCount || '').toString(),
      plantingDate: planting.planting_date || planting.plantingDate || '',
      harvestDate: planting.harvest_date || planting.harvestDate || ''
    });
  };

  const handleUpdatePlanting = async () => {
    if (!editPlantingForm.seedType || !editPlantingForm.seedCount || !editPlantingForm.plantingDate) {
      toast.error('Jenis bibit, jumlah bibit, dan tanggal tanam harus diisi');
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Sesi login telah berakhir. Silakan login kembali.');
        return;
      }

      const updateData = {
        seed_type: editPlantingForm.seedType,
        seed_count: parseInt(editPlantingForm.seedCount),
        planting_date: editPlantingForm.plantingDate,
        harvest_date: editPlantingForm.harvestDate || null
      };

      console.log('=== PLANTING UPDATE (EDIT) ===');
      console.log('Planting ID:', editingPlanting.id);
      console.log('Update data:', updateData);

      let updateError = null;

      // Direct database update (RLS will enforce user_id match)
      const { error } = await supabase
        .from('plantings')
        .update(updateData)
        .eq('id', editingPlanting.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('=== PLANTING UPDATE ERROR ===');
        console.error('Error:', JSON.stringify(error, null, 2));
        updateError = error;
      }

      if (updateError) {
        let errorMessage = 'Gagal mengubah data tanam';
        
        if (updateError.message?.includes('violates row level security')) {
          errorMessage = '❌ Akses ditolak. Silakan login ulang.';
        } else if (updateError.message?.includes('permission')) {
          errorMessage = '❌ Permission ditolak. Silakan login ulang.';
        }
        
        toast.error(errorMessage);
        return;
      }

      toast.success('Data tanam berhasil diubah');
      setEditingPlanting(null);
      loadPlantings();
    } catch (error) {
      console.error('Error updating planting:', error);
      toast.error('Terjadi kesalahan saat mengubah data tanam');
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete Planting
  const handleDeletePlanting = async (plantingId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data tanam ini? Data yang sudah dihapus tidak bisa dikembalikan.')) {
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Sesi login telah berakhir. Silakan login kembali.');
        return;
      }

      console.log('=== PLANTING DELETE ===');
      console.log('Planting ID:', plantingId);

      let deleteError = null;

      // Delete the entire planting record
      const { error } = await supabase
        .from('plantings')
        .delete()
        .eq('id', plantingId)
        .eq('user_id', user.id);

      if (error) {
        console.error('=== PLANTING DELETE ERROR ===');
        console.error('Error:', JSON.stringify(error, null, 2));
        deleteError = error;
      }

      if (deleteError) {
        let errorMessage = 'Gagal menghapus data tanam';
        
        if (deleteError.message?.includes('violates row level security')) {
          errorMessage = '❌ Akses ditolak. Silakan login ulang.';
        } else if (deleteError.message?.includes('permission')) {
          errorMessage = '❌ Permission ditolak. Silakan login ulang.';
        }
        
        toast.error(errorMessage);
        return;
      }

      toast.success('Data tanam berhasil dihapus');
      loadPlantings();
    } catch (error) {
      console.error('Error deleting planting:', error);
      toast.error('Terjadi kesalahan saat menghapus data tanam');
    } finally {
      setLoading(false);
    }
  };

  // Handle Export to Excel
  const handleExportExcel = () => {
    try {
      if (plantings.length === 0) {
        toast.error('Tidak ada data untuk diekspor');
        return;
      }

      console.log('=== EXPORT EXCEL ===');
      console.log('Total records:', plantings.length);

      // Prepare data for export
      const exportData = plantings
        .filter(planting => {
          const matchesSearch = (planting.seedType || planting.seed_type || '').toLowerCase().includes(searchTerm.toLowerCase());
          const matchesStatus = statusFilter === 'all' ||
                               (statusFilter === 'planted' && !(planting.harvestYield || planting.harvest_yield)) ||
                               (statusFilter === 'harvested' && (planting.harvestYield || planting.harvest_yield));
          return matchesSearch && matchesStatus;
        })
        .map((planting) => ({
          'Jenis Bibit': planting.seed_type || planting.seedType || '-',
          'Tanggal Tanam': formatDate(planting.planting_date || planting.plantingDate || ''),
          'Jumlah Bibit': planting.seed_count || planting.seedCount || 0,
          'Status': (planting.harvestYield || planting.harvest_yield) ? 'Sudah Panen' : 'Belum Panen',
          'Tanggal Panen': formatDate(planting.harvest_date || planting.harvestDate || '') || '-',
          'Hasil Panen (kg)': planting.harvest_yield || planting.harvestYield || '-',
          'Pendapatan (Rp)': planting.sales_amount || planting.salesAmount ? formatPrice(planting.sales_amount || planting.salesAmount) : '-'
        }));

      console.log('Export data prepared:', exportData.length, 'records');

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData, {
        header: ['Jenis Bibit', 'Tanggal Tanam', 'Jumlah Bibit', 'Status', 'Tanggal Panen', 'Hasil Panen (kg)', 'Pendapatan (Rp)']
      });

      // Set column widths
      const columnWidths = [
        { wch: 15 }, // Jenis Bibit
        { wch: 15 }, // Tanggal Tanam
        { wch: 12 }, // Jumlah Bibit
        { wch: 12 }, // Status
        { wch: 15 }, // Tanggal Panen
        { wch: 15 }, // Hasil Panen
        { wch: 15 }  // Pendapatan
      ];
      worksheet['!cols'] = columnWidths;

      // Set header styling (bold, background color)
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

      // Freeze first row (header)
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Tanam');

      // Generate filename with date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const filename = `Laporan_Tanam_${user.email?.split('@')[0]}_${dateStr}_${timeStr}.xlsx`;

      console.log('Exporting file:', filename);

      // Write file
      XLSX.writeFile(workbook, filename);

      console.log('✓ Export Excel successful');
      toast.success('Laporan berhasil diekspor ke Excel');
    } catch (error) {
      console.error('=== EXPORT EXCEL ERROR ===');
      console.error('Error:', error);
      toast.error('Gagal mengekspor laporan. Silakan coba lagi.');
    }
  };

  const stats = {
    totalPlantings: plantings.length,
    totalHarvested: plantings.filter(p => p.harvest_yield || p.harvestYield).length,
    totalYield: plantings.reduce((sum, p) => sum + (parseFloat(p.harvest_yield || p.harvestYield) || 0), 0),
    totalRevenue: plantings.reduce((sum, p) => sum + (parseFloat(p.sales_amount || p.salesAmount) || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
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
                  SIKUWAT
                </h1>
                <p className="text-xs text-gray-600 hidden md:block">
                  Halo, {user.user_metadata?.name || user.email}! 👋
                </p>
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
      <main className="container mx-auto px-4 py-8 relative">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { 
              icon: Target, 
              label: 'Total Tanam', 
              value: stats.totalPlantings,
              color: 'from-emerald-500 to-teal-600',
              bgColor: 'from-emerald-500/10 to-teal-600/10'
            },
            { 
              icon: TrendingUp, 
              label: 'Sudah Panen', 
              value: stats.totalHarvested,
              color: 'from-blue-500 to-cyan-600',
              bgColor: 'from-blue-500/10 to-cyan-600/10'
            },
            { 
              icon: Leaf, 
              label: 'Total Hasil', 
              value: `${stats.totalYield} kg`,
              color: 'from-amber-500 to-orange-600',
              bgColor: 'from-amber-500/10 to-orange-600/10'
            },
            { 
              icon: DollarSign, 
              label: 'Penjualan', 
              value: `Rp ${formatPrice(stats.totalRevenue)}`,
              color: 'from-green-500 to-emerald-600',
              bgColor: 'from-green-500/10 to-emerald-600/10'
            },
          ].map((stat, idx) => (
            <div key={idx} className="group relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} rounded-2xl blur-sm group-hover:blur-md transition-all duration-300 opacity-20`}></div>
              <Card className="relative p-5 backdrop-blur-sm bg-white/90 border-0 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.bgColor} rounded-bl-full opacity-50`}></div>
                <div className="relative flex flex-col gap-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Chart Section */}
        {chartData.length > 0 && (
          <Card className="mb-8 border-0 shadow-xl backdrop-blur-sm bg-white/90 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Riwayat Tanam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    label={{ value: 'Hasil Panen (kg)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [`${value} kg`, 'Hasil Panen']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorYield)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Form Section */}
        <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 overflow-hidden mb-8">
          <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white pb-8">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2 mb-2">
                  <Sparkles className="h-6 w-6" />
                  Catat Hasil Tani Anda
                </CardTitle>
                <p className="text-emerald-100 text-sm">Input data penanaman untuk monitoring yang lebih baik</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'dashboard' | 'input' | 'reports')} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border border-emerald-100 rounded-xl p-1 mb-6">
                <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="input" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg">
                  <Plus className="h-4 w-4" />
                  Input Data
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg">
                  <BookOpen className="h-4 w-4" />
                  Laporan
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Tanam</CardTitle>
                      <Leaf className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardMetrics.totalPlantings}</div>
                      <p className="text-xs text-muted-foreground">
                        Kali penanaman
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Bibit</CardTitle>
                      <Sprout className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardMetrics.totalSeeds}</div>
                      <p className="text-xs text-muted-foreground">
                        kg bibit digunakan
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Panen</CardTitle>
                      <Wheat className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardMetrics.totalHarvest.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">
                        kg hasil panen
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">Rp {formatPrice(dashboardMetrics.totalRevenue)}</div>
                      <p className="text-xs text-muted-foreground">
                        dari penjualan
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Produktivitas Rata-rata</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardMetrics.avgProductivity}</div>
                      <p className="text-xs text-muted-foreground">
                        kg per tanaman
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tingkat Keberhasilan</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardMetrics.successRate}%</div>
                      <p className="text-xs text-muted-foreground">
                        tanaman berhasil panen
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Tren Produktivitas Bulanan
                    </CardTitle>
                    <CardDescription>
                      Performa panen dan pendapatan per bulan
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="harvest" fill="#22c55e" name="Hasil Panen (kg)" />
                        <Bar yAxisId="right" dataKey="revenue" fill="#3b82f6" name="Pendapatan (Rp)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="input" className="space-y-6 mt-6">
                {/* Input Tanam Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Input Tanam
                  </h3>

                  <div className="space-y-4">
                    {/* Jenis Bibit */}
                    <div>
                      <Label htmlFor="seedType">Jenis Bibit (Cabai, Tomat, Sawi)</Label>
                      <Input
                        id="seedType"
                        placeholder="Contoh: Cabai Merah"
                        value={plantingForm.seedType}
                        onChange={(e) => setPlantingForm({ ...plantingForm, seedType: e.target.value })}
                        className="mt-1"
                      />
                    </div>

                    {/* Tanggal Tanam */}
                    <div>
                      <Label htmlFor="plantingDate">Tanggal Tanam</Label>
                      <div className="relative mt-1">
                        <Input
                          id="plantingDate"
                          type="date"
                          value={plantingForm.plantingDate}
                          onChange={(e) => setPlantingForm({ ...plantingForm, plantingDate: e.target.value })}
                          className="pr-10"
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Jumlah Bibit */}
                      <div>
                        <Label htmlFor="seedCount">Jumlah Bibit</Label>
                        <Input
                          id="seedCount"
                          type="number"
                          placeholder="150"
                          value={plantingForm.seedCount}
                          onChange={(e) => setPlantingForm({ ...plantingForm, seedCount: e.target.value })}
                          className="mt-1"
                        />
                      </div>

                      {/* Target Harvest Date */}
                      <div>
                        <Label htmlFor="harvestDateTarget">Target Tanggal Panen (Opsional)</Label>
                        <div className="relative mt-1">
                          <Input
                            id="harvestDateTarget"
                            type="date"
                            value={plantingForm.harvestDate}
                            onChange={(e) => setPlantingForm({ ...plantingForm, harvestDate: e.target.value })}
                            className="pr-10"
                          />
                          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handlePlantingSubmit}
                      disabled={loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg font-semibold"
                    >
                      {loading ? 'Menyimpan...' : 'Simpan Data Tanam'}
                    </Button>
                  </div>
                </div>

                {/* Input Panen Section */}
                <div className="mt-12 pt-8 border-t">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Wheat className="h-5 w-5" />
                    Input Panen
                  </h3>

                  <div className="space-y-4">
                    {/* Pilih Penanaman */}
                    <div>
                      <Label htmlFor="plantingId">Pilih Penanaman</Label>
                      <select
                        id="plantingId"
                        value={harvestForm.plantingId}
                        onChange={(e) => setHarvestForm({ ...harvestForm, plantingId: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Pilih penanaman yang akan dipanen...</option>
                        {plantings.filter(p => !p.harvest_date).map((planting) => (
                          <option key={planting.id} value={planting.id}>
                            {planting.seed_type} - {new Date(planting.planting_date).toLocaleDateString('id-ID')} ({planting.seed_count} bibit)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tanggal Panen */}
                    <div>
                      <Label htmlFor="harvestDate">Tanggal Panen</Label>
                      <div className="relative mt-1">
                        <Input
                          id="harvestDate"
                          type="date"
                          value={harvestForm.harvestDate}
                          onChange={(e) => setHarvestForm({ ...harvestForm, harvestDate: e.target.value })}
                          className="pr-10"
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Hasil Panen */}
                      <div>
                        <Label htmlFor="harvestYield">Hasil Panen (Kg)</Label>
                        <Input
                          id="harvestYield"
                          type="number"
                          placeholder="25"
                          value={harvestForm.harvestYield}
                          onChange={(e) => setHarvestForm({ ...harvestForm, harvestYield: e.target.value })}
                          className="mt-1"
                        />
                      </div>

                      {/* Kualitas */}
                      <div>
                        <Label htmlFor="quality">Kualitas</Label>
                        <select
                          id="quality"
                          value={harvestForm.quality}
                          onChange={(e) => setHarvestForm({ ...harvestForm, quality: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">Pilih kualitas...</option>
                          <option value="Baik">Baik</option>
                          <option value="Sedang">Sedang</option>
                          <option value="Kurang">Kurang</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      {/* Harga Jual per Kg */}
                      <div>
                        <Label htmlFor="sellingPrice">Harga Jual/Kg (Rp)</Label>
                        <Input
                          id="sellingPrice"
                          type="number"
                          placeholder="50000"
                          value={harvestForm.sellingPrice || ''}
                          onChange={(e) => setHarvestForm({ ...harvestForm, sellingPrice: e.target.value })}
                          className="mt-1"
                        />
                      </div>

                      {/* Metode Panen */}
                      <div>
                        <Label htmlFor="harvestMethod">Metode Panen</Label>
                        <select
                          id="harvestMethod"
                          value={harvestForm.harvestMethod || ''}
                          onChange={(e) => setHarvestForm({ ...harvestForm, harvestMethod: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">Pilih metode...</option>
                          <option value="Manual">Manual</option>
                          <option value="Semi Mekanis">Semi Mekanis</option>
                          <option value="Mekanis">Mekanis</option>
                        </select>
                      </div>

                      {/* Pengeluaran Tambahan */}
                      <div>
                        <Label htmlFor="additionalExpenses">Pengeluaran Tambahan (Rp)</Label>
                        <Input
                          id="additionalExpenses"
                          type="number"
                          placeholder="10000"
                          value={harvestForm.additionalExpenses || ''}
                          onChange={(e) => setHarvestForm({ ...harvestForm, additionalExpenses: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Catatan */}
                    <div>
                      <Label htmlFor="notes">Catatan</Label>
                      <textarea
                        id="notes"
                        placeholder="Catatan tambahan tentang panen..."
                        value={harvestForm.notes}
                        onChange={(e) => setHarvestForm({ ...harvestForm, notes: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        rows={3}
                      />
                    </div>

                    {/* Cuaca */}
                    <div>
                      <Label htmlFor="weatherCondition">Kondisi Cuaca</Label>
                      <select
                        id="weatherCondition"
                        value={harvestForm.weatherCondition}
                        onChange={(e) => setHarvestForm({ ...harvestForm, weatherCondition: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Pilih kondisi cuaca...</option>
                        <option value="Cerah">Cerah</option>
                        <option value="Berawan">Berawan</option>
                        <option value="Hujan">Hujan</option>
                        <option value="Mendung">Mendung</option>
                      </select>
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleHarvestSubmit}
                      disabled={loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg font-semibold"
                    >
                      {loading ? 'Menyimpan...' : 'Simpan Data Panen'}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reports" className="space-y-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-4">
                    <Input
                      placeholder="Cari berdasarkan jenis bibit..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'all' | 'planted' | 'harvested')}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">Semua Status</option>
                      <option value="planted">Belum Panen</option>
                      <option value="harvested">Sudah Panen</option>
                    </select>
                  </div>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={handleExportExcel}
                  >
                    <Download className="h-4 w-4" />
                    Export Excel
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Laporan Detail Penanaman</CardTitle>
                    <CardDescription>
                      Data lengkap semua aktivitas penanaman dan panen Anda
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Jenis Bibit</TableHead>
                            <TableHead>Tgl Tanam</TableHead>
                            <TableHead>Jumlah Bibit</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Tgl Panen</TableHead>
                            <TableHead>Hasil Panen</TableHead>
                            <TableHead>Pendapatan</TableHead>
                            <TableHead>Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {plantings
                            .filter(planting => {
                              const matchesSearch = (planting.seedType || planting.seed_type || '').toLowerCase().includes(searchTerm.toLowerCase());
                              const matchesStatus = statusFilter === 'all' ||
                                                   (statusFilter === 'planted' && !(planting.harvestYield || planting.harvest_yield)) ||
                                                   (statusFilter === 'harvested' && (planting.harvestYield || planting.harvest_yield));
                              return matchesSearch && matchesStatus;
                            })
                            .map((planting) => (
                              <TableRow key={planting.id}>
                                <TableCell className="font-medium">
                                  {planting.seedType || planting.seed_type}
                                </TableCell>
                                <TableCell>
                                  {formatDate(planting.plantingDate || planting.planting_date)}
                                </TableCell>
                                <TableCell>{planting.seedCount || planting.seed_count}</TableCell>
                                <TableCell>
                                  {(planting.harvestYield || planting.harvest_yield) ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                      Sudah Panen
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                                      Belum Panen
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {formatDate(planting.harvestDate || planting.harvest_date)}
                                </TableCell>
                                <TableCell>
                                  {(planting.harvestYield || planting.harvest_yield) ? 
                                    `${planting.harvestYield || planting.harvest_yield} kg` : 
                                    '-'
                                  }
                                </TableCell>
                                <TableCell>
                                  {(planting.salesAmount || planting.sales_amount) ? 
                                    `Rp ${formatPrice(planting.salesAmount || planting.sales_amount)}` : 
                                    '-'
                                  }
                                </TableCell>
                                <TableCell className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditPlanting(planting)}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    Edit Tanam
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeletePlanting(planting.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    Hapus
                                  </Button>
                                  {(planting.harvestYield || planting.harvest_yield) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditHarvest(planting)}
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                      Edit Panen
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* History Section */}
        {plantings.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Riwayat Penanaman</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {plantings.slice(0, 5).map((planting) => (
                  <div
                    key={planting.id}
                    className="p-4 border rounded-lg hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900">{planting.seed_type || planting.seedType}</h4>
                        <p className="text-sm text-gray-600">{formatDate(planting.created_at || planting.createdAt)}</p>
                      </div>
                      {(planting.harvestYield || planting.harvest_yield) && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                          Sudah Panen
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-gray-600">Jumlah</p>
                        <p className="font-semibold">{planting.seed_count || planting.seedCount}</p>
                      </div>

                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-gray-600">Tgl Tanam</p>
                        <p className="font-semibold">{formatDate(planting.planting_date || planting.plantingDate)}</p>
                      </div>

                      {(planting.harvestYield || planting.harvest_yield) && (
                        <>
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-gray-600">Hasil</p>
                            <p className="font-semibold">{planting.harvestYield || planting.harvest_yield} kg</p>
                          </div>

                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-gray-600">Penjualan</p>
                            <p className="font-semibold">
                              Rp. {formatPrice(planting.salesAmount || planting.sales_amount || 0)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditPlanting(planting)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        Edit Tanam
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeletePlanting(planting.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Hapus
                      </Button>
                      {(planting.harvestYield || planting.harvest_yield) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditHarvest(planting)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          Edit Panen
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {plantings.length > 5 && (
                <div className="text-center mt-4">
                  <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                    Lihat Semua Riwayat →
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Edit Harvest Dialog */}
      <Dialog open={!!editingHarvest} onOpenChange={(open) => !open && setEditingHarvest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Panen</DialogTitle>
          </DialogHeader>
          {editingHarvest && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-seed-type">Jenis Bibit</Label>
                <Input
                  id="edit-seed-type"
                  value={editingHarvest.seed_type || editingHarvest.seedType || ''}
                  disabled
                  className="mt-1 bg-gray-100"
                />
              </div>

              <div>
                <Label htmlFor="edit-planting-date">Tanggal Tanam</Label>
                <Input
                  id="edit-planting-date"
                  value={formatDate(editingHarvest.planting_date || editingHarvest.plantingDate || '')}
                  disabled
                  className="mt-1 bg-gray-100"
                />
              </div>

              <div>
                <Label htmlFor="edit-harvest-date">Tanggal Panen *</Label>
                <Input
                  id="edit-harvest-date"
                  type="date"
                  value={editHarvestForm.harvestDate}
                  onChange={(e) => setEditHarvestForm({ ...editHarvestForm, harvestDate: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-harvest-yield">Hasil Panen (kg) *</Label>
                <Input
                  id="edit-harvest-yield"
                  type="number"
                  step="0.01"
                  value={editHarvestForm.harvestYield}
                  onChange={(e) => setEditHarvestForm({ ...editHarvestForm, harvestYield: e.target.value })}
                  className="mt-1"
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="edit-sales-amount">Pendapatan (Rp)</Label>
                <Input
                  id="edit-sales-amount"
                  type="number"
                  step="0.01"
                  value={editHarvestForm.salesAmount}
                  onChange={(e) => setEditHarvestForm({ ...editHarvestForm, salesAmount: e.target.value })}
                  className="mt-1"
                  placeholder="0"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingHarvest(null)} disabled={loading}>
              Batal
            </Button>
            <Button onClick={handleUpdateHarvest} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Planting Dialog */}
      <Dialog open={!!editingPlanting} onOpenChange={(open) => !open && setEditingPlanting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Tanam</DialogTitle>
          </DialogHeader>
          {editingPlanting && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-planting-seed-type">Jenis Bibit *</Label>
                <Input
                  id="edit-planting-seed-type"
                  value={editPlantingForm.seedType}
                  onChange={(e) => setEditPlantingForm({ ...editPlantingForm, seedType: e.target.value })}
                  className="mt-1"
                  placeholder="Contoh: Cabai, Tomat, Sawi"
                />
              </div>

              <div>
                <Label htmlFor="edit-planting-seed-count">Jumlah Bibit *</Label>
                <Input
                  id="edit-planting-seed-count"
                  type="number"
                  value={editPlantingForm.seedCount}
                  onChange={(e) => setEditPlantingForm({ ...editPlantingForm, seedCount: e.target.value })}
                  className="mt-1"
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="edit-planting-date">Tanggal Tanam *</Label>
                <Input
                  id="edit-planting-date"
                  type="date"
                  value={editPlantingForm.plantingDate}
                  onChange={(e) => setEditPlantingForm({ ...editPlantingForm, plantingDate: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-target-harvest-date">Target Tanggal Panen (Opsional)</Label>
                <Input
                  id="edit-target-harvest-date"
                  type="date"
                  value={editPlantingForm.harvestDate}
                  onChange={(e) => setEditPlantingForm({ ...editPlantingForm, harvestDate: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlanting(null)} disabled={loading}>
              Batal
            </Button>
            <Button onClick={handleUpdatePlanting} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
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
      `}</style>
    </div>
  );
}
