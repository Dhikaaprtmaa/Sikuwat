import { useEffect, useState } from 'react';
import { CalendarIcon, Wheat } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

interface Props {
  user: any;
}

export default function InputPanen({ user }: Props) {
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
    <div className="space-y-6">
      <Card className="border-amber-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600 p-2 rounded-lg">
              <Wheat className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl md:text-3xl text-amber-900">Input Panen</CardTitle>
              <CardDescription>Masukkan data hasil panen Anda</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-5 max-w-3xl">
            <div>
              <Label htmlFor="plantingId" className="text-base font-semibold text-gray-700">Pilih Penanaman</Label>
              <p className="text-sm text-gray-500 mb-2">Pilih penanaman yang akan dipanen</p>
              {plantings.length === 0 ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
                  Tidak ada penanaman yang belum dipanen
                </div>
              ) : (
                <select 
                  id="plantingId" 
                  value={form.plantingId} 
                  onChange={(e) => setForm({ ...form, plantingId: e.target.value })} 
                  className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:border-amber-500 focus:ring-amber-500 h-10 bg-white"
                >
                  <option value="">-- Pilih penanaman --</option>
                  {plantings.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.seed_type} ({p.seed_count} bibit) - Tanam: {new Date(p.planting_date).toLocaleDateString('id-ID')}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="harvestDate" className="text-base font-semibold text-gray-700">Tanggal Panen</Label>
                <div className="relative mt-2">
                  <Input 
                    id="harvestDate" 
                    type="date" 
                    value={form.harvestDate} 
                    onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} 
                    className="pr-10 h-10 border-gray-300 focus:border-amber-500 focus:ring-amber-500" 
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <Label htmlFor="harvestYield" className="text-base font-semibold text-gray-700">Hasil Panen <span className="text-gray-500">(Kg)</span></Label>
                <Input 
                  id="harvestYield" 
                  type="number" 
                  placeholder="Contoh: 50" 
                  value={form.harvestYield} 
                  onChange={(e) => setForm({ ...form, harvestYield: e.target.value })} 
                  className="mt-2 h-10 border-gray-300 focus:border-amber-500 focus:ring-amber-500" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="sellingPrice" className="text-base font-semibold text-gray-700">Harga Jual <span className="text-gray-500">(Rp/Kg)</span></Label>
                <Input 
                  id="sellingPrice" 
                  type="number" 
                  placeholder="Contoh: 25000" 
                  value={form.sellingPrice} 
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} 
                  className="mt-2 h-10 border-gray-300 focus:border-amber-500 focus:ring-amber-500" 
                />
              </div>

              <div className="flex items-end">
                <div className="w-full">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Total Penjualan</p>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-lg font-bold text-amber-900">
                    Rp {(parseFloat(form.harvestYield || 0) * parseFloat(form.sellingPrice || 0)).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSubmit} 
              disabled={loading || plantings.length === 0} 
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 h-12 text-lg font-semibold text-white shadow-md hover:shadow-lg transition-all mt-6 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : '✓ Simpan Data Panen'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
