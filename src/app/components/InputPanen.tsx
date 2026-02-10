import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, Wheat } from 'lucide-react';
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

export default function InputPanen({ user, onBack }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [plantings, setPlantings] = useState<any[]>([]);
  const [form, setForm] = useState({ plantingId: '', harvestDate: '', harvestYield: '', sellingPrice: '' });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('plantings').select('*').eq('user_id', user.id).is('harvest_date', null).order('created_at', { ascending: false });
      setPlantings(data || []);
    };
    load();
  }, [user.id]);

  const handleSubmit = async () => {
    if (!form.plantingId || !form.harvestDate || !form.harvestYield) {
      toast.error('Isi ID penanaman, tanggal panen, dan hasil panen');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        harvest_date: form.harvestDate,
        harvest_yield: parseFloat(form.harvestYield),
        sales_amount: form.sellingPrice ? parseFloat(form.sellingPrice) * parseFloat(form.harvestYield) : null
      };

      const { error } = await supabase.from('plantings').update(updateData).eq('id', form.plantingId).eq('user_id', user.id);
      if (error) {
        console.error('Update error:', error);
        toast.error('Gagal menyimpan data panen');
        return;
      }

      toast.success('Data panen berhasil disimpan');
      setForm({ plantingId: '', harvestDate: '', harvestYield: '', sellingPrice: '' });
      const { data } = await supabase.from('plantings').select('*').eq('user_id', user.id).is('harvest_date', null).order('created_at', { ascending: false });
      setPlantings(data || []);
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
          <h2 className="text-2xl font-bold flex items-center gap-2"><Wheat className="h-6 w-6" /> Input Panen</h2>
        </div>

        <div className="space-y-4 max-w-2xl">
          <div>
            <Label htmlFor="plantingId">Pilih Penanaman</Label>
            <select id="plantingId" value={form.plantingId} onChange={(e) => setForm({ ...form, plantingId: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md">
              <option value="">Pilih penanaman yang akan dipanen...</option>
              {plantings.map((p) => (
                <option key={p.id} value={p.id}>{p.seed_type} - {new Date(p.planting_date).toLocaleDateString('id-ID')} ({p.seed_count} bibit)</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="harvestDate">Tanggal Panen</Label>
            <div className="relative mt-1">
              <Input id="harvestDate" type="date" value={form.harvestDate} onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} className="pr-10" />
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="harvestYield">Hasil Panen (Kg)</Label>
              <Input id="harvestYield" type="number" value={form.harvestYield} onChange={(e) => setForm({ ...form, harvestYield: e.target.value })} className="mt-1" />
            </div>

            <div>
              <Label htmlFor="sellingPrice">Harga Jual/Kg (Rp)</Label>
              <Input id="sellingPrice" type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} className="mt-1" />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg font-semibold">
            {loading ? 'Menyimpan...' : 'Simpan Data Panen'}
          </Button>
        </div>
      </div>
    </div>
  );
}
