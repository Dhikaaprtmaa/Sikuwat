import { useState } from 'react';
import { CalendarIcon, Sprout } from 'lucide-react';
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

export default function InputTanam({ user }: Props) {
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
    <div className="space-y-6 flex justify-center">
      <Card className="border-emerald-200 shadow-lg w-full max-w-2xl">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Sprout className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl md:text-3xl text-emerald-900">Input Penanaman</CardTitle>
              <CardDescription>Masukkan data bibit yang akan Anda tanam</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-5">
            <div>
              <Label htmlFor="seedType" className="text-base font-semibold text-gray-700">Jenis Bibit</Label>
              <p className="text-sm text-gray-500 mb-2">Contoh: Cabai Merah, Tomat, Sawi</p>
              <Input 
                id="seedType" 
                placeholder="Masukkan jenis bibit..." 
                value={form.seedType} 
                onChange={(e) => setForm({ ...form, seedType: e.target.value })} 
                className="mt-1 h-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="plantingDate" className="text-base font-semibold text-gray-700">Tanggal Tanam</Label>
                <div className="relative mt-2">
                  <Input 
                    id="plantingDate" 
                    type="date" 
                    value={form.plantingDate} 
                    onChange={(e) => setForm({ ...form, plantingDate: e.target.value })} 
                    className="pr-10 h-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" 
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <Label htmlFor="seedCount" className="text-base font-semibold text-gray-700">Jumlah Bibit</Label>
                <Input 
                  id="seedCount" 
                  type="number" 
                  placeholder="Contoh: 150" 
                  value={form.seedCount} 
                  onChange={(e) => setForm({ ...form, seedCount: e.target.value })} 
                  className="mt-2 h-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" 
                />
              </div>
            </div>

            <div>
              <Label htmlFor="harvestDateTarget" className="text-base font-semibold text-gray-700">Target Tanggal Panen <span className="text-gray-400">(Opsional)</span></Label>
              <div className="relative mt-2">
                <Input 
                  id="harvestDateTarget" 
                  type="date" 
                  value={form.harvestDate} 
                  onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} 
                  className="pr-10 h-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" 
                />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <Button 
              onClick={handleSubmit} 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-12 text-lg font-semibold text-white shadow-md hover:shadow-lg transition-all mt-6"
            >
              {loading ? 'Menyimpan...' : '✓ Simpan Data Penanaman'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
