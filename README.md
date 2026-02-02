
  # Sikuwat Web App

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
## Data Storage Setup

Untuk mengaktifkan penyimpanan data, Anda perlu deploy Supabase Edge Functions terlebih dahulu. Lihat file `DEPLOYMENT.md` untuk instruksi lengkap.

### Fitur Penyimpanan Data:

**Untuk Admin:**
- Menambah/mengedit harga pasar komoditas
- Menambah artikel dan tips pertanian
- Melihat data semua pengguna

**Untuk User:**
- Menyimpan data penanaman (jenis bibit, jumlah, tanggal tanam)
- Mencatat hasil panen dan penjualan
- Melihat riwayat aktivitas pertanian

### Testing Data Storage:

1. Login sebagai admin/user
2. Isi form yang tersedia
3. Klik tombol "Simpan" atau "Tambah"
4. Data akan muncul di tabel/daftar
5. Refresh halaman untuk memastikan data tersimpan

## Tech Stack

- React + TypeScript + Vite
- Supabase (Database & Auth)
- Tailwind CSS + shadcn/ui
- Lucide Icons  
