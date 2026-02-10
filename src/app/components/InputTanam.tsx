import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

interface Props {
  user: any;
  onBack: () => void;
}

export default function InputTanam({ user, onBack }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ seedType: '', seedCount: '', plantingDate: '', harvestDate: '' });

  const handleSubmit = async () => {
    if (!form.seedType || !form.seedCount || !form.plantingDate) {
      toast.error('Jenis bibit, jumlah, dan tanggal tanam harus diisi');
      return;
    }

    setLoading(true);
    try {
      const plantingData = {
        id: `planting_${user.id}_${Date.now()}`,
        seed_type: form.seedType,
        seed_count: parseInt(form.seedCount, 10),
        planting_date: form.plantingDate,
        harvest_date: form.harvestDate || null,
        user_id: user.id
      };

      const { error } = await supabase.from('plantings').insert([plantingData]);
      if (error) {
        console.error('Insert error:', error);
        toast.error('Gagal menyimpan data tanam');
        return;
      }

      toast.success('Data penanaman berhasil disimpan');
      setForm({ seedType: '', seedCount: '', plantingDate: '', harvestDate: '' });
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" onClick={() => { if (onBack) onBack(); else navigate('/'); }} className="px-3">Kembali</Button>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Plus className="h-6 w-6" /> Input Tanam</h2>
        </div>

        <div className="space-y-4 max-w-2xl">
          <div>
            <Label htmlFor="seedType">Jenis Bibit (Cabai, Tomat, Sawi)</Label>
            <Input id="seedType" placeholder="Contoh: Cabai Merah" value={form.seedType} onChange={(e) => setForm({ ...form, seedType: e.target.value })} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="plantingDate">Tanggal Tanam</Label>
            <div className="relative mt-1">
              <Input id="plantingDate" type="date" value={form.plantingDate} onChange={(e) => setForm({ ...form, plantingDate: e.target.value })} className="pr-10" />
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="seedCount">Jumlah Bibit</Label>
              <Input id="seedCount" type="number" placeholder="150" value={form.seedCount} onChange={(e) => setForm({ ...form, seedCount: e.target.value })} className="mt-1" />
            </div>

            <div>
              <Label htmlFor="harvestDateTarget">Target Tanggal Panen (Opsional)</Label>
              <div className="relative mt-1">
                <Input id="harvestDateTarget" type="date" value={form.harvestDate} onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} className="pr-10" />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg font-semibold">
            {loading ? 'Menyimpan...' : 'Simpan Data Tanam'}
          </Button>
        </div>
      </div>
    </div>
  );
}
