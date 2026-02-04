import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const message = body.message || '';
    const detail = body.detail !== 'concise';

    // Simple knowledge base
    const q = message.toLowerCase();
    let answer = '';

    if (q.includes('budidaya') || q.includes('tanaman') || q.includes('padi') || q.includes('jagung')) {
      answer = detail 
        ? `Untuk budidaya tanaman yang baik:\n\n1. Persiapan Lahan: Bersihkan dan bajak lahan 20-25cm, tunggu 1-2 minggu\n2. Pemilihan Benih: Gunakan benih berkualitas tinggi dari varietas sesuai daerah\n3. Penanaman: Padi disemaikan 25-30 hari, jagung tanam langsung\n4. Pemupukan: Kompos saat persiapan, susulan pada umur 4-6 minggu\n5. Irigasi: Konsisten tanpa kering berlebihan\n6. Pengendalian Hama: Monitor dan tangani secara dini\n7. Panen: Lakukan pada saat matang optimal\n\nTips: Kombinasikan dengan artikel lokal untuk hasil terbaik!`
        : 'Budidaya: persiapan lahan, benih berkualitas, pemupukan teratur, irigasi konsisten, pengendalian hama, panen optimal';
    } else if (q.includes('hama') || q.includes('penyakit')) {
      answer = detail
        ? `Pengendalian Hama Tanaman:\n\n1. Identifikasi: Wereng, penggerek batang, kumbang bunga, ulat\n2. Alami: Tanaman pengusir, musuh alami, neem oil, jauhkan tanaman sakit\n3. Kimiawi: Gunakan pestisida sesuai hama target, ikuti dosis, tunggu masa aman\n4. Pencegahan: Rotasi tanaman, kebersihan lahan, varietas tahan hama\n5. Monitoring: Lakukan pemeriksaan rutin\n\nPrioritaskan pengendalian alami sebelum kimiawi!`
        : 'Pengendalian hama: identifikasi jenis, alami dulu (musuh alami, neem), kimiawi jika perlu. Pencegahan: rotasi tanaman, kebersihan lahan.';
    } else if (q.includes('pupuk') || q.includes('nutrisi') || q.includes('unsur hara')) {
      answer = detail
        ? `Panduan Pemupukan:\n\n1. Jenis: Organik (kompos, kandang), Anorganik (N, P, K), Kombinasi\n2. Unsur: N untuk daun-batang (100-150kg/ha), P untuk akar-buah (50-100kg/ha), K untuk kualitas (50-100kg/ha)\n3. Waktu: Dasar (persiapan lahan), Susulan 1 (4-6 minggu), Susulan 2 (berbunga)\n4. Dosis Padi: 100kg urea, 75kg SP36, 75kg KCl per hektar\n5. Aplikasi: Aduk merata saat persiapan, jauhkan 10-15cm dari batang, tutup dengan tanah\n\nKombinasi organik-anorganik memberikan hasil terbaik dengan biaya hemat!`
        : 'Pemupukan: organik (kompos) + anorganik (urea, SP36, KCl). Dasar saat persiapan, susulan 4-6 minggu dan berbunga. Dosis tergantung tanaman.';
    } else if (q.includes('irigasi') || q.includes('air') || q.includes('pengairan')) {
      answer = detail
        ? `Teknik Irigasi Efisien:\n\n1. Sistem: Gravitasi (padi), Sprinkler, Tetes (sayuran), Subsurface\n2. Kebutuhan: Padi 800-1200mm, Jagung 400-600mm, Sayuran 250-400mm per musim\n3. Jadwal: Pagi/sore, sirami saat tanah kering 3-5cm, padi tetap 5-10cm genang\n4. Tanda: Layu ringan (butuh air), tanah retak (kekurangan), genang (kelebihan)\n5. Efisiensi: Mulsa, perbaiki saluran, lahan rata, drip irrigation, kolam tampung hujan\n\nIrigasi pagi hari menghasilkan kualitas terbaik!`
        : 'Irigasi: pagi/sore, berikan saat tanah kering, hindari genang terus. Gunakan mulsa kurangi penguapan. Sistem sesuai tanaman (drip untuk sayuran).';
    } else if (q.includes('panen') || q.includes('hasil') || q.includes('panen')) {
      answer = detail
        ? `Panduan Panen Optimal:\n\n1. Tanda Kesiapan: Padi 90% kuning, jagung berisi penuh, sayuran ukuran konsumsi, cabai merah cerah\n2. Waktu: Pagi hari (hasil segar, kadar air optimal), hindari siang terik dan hujan\n3. Teknik: Gunakan peralatan bersih, sabit/combine padi, petik sayuran dengan tangan\n4. Pasca Panen: Keringkan di tempat terlindungi, jaga kesegaran, buang rusak, kemasan rapi\n5. Penyimpanan: Padi 12-13% kadar air, sayuran di kulkas, jauhkan dari hama penyimpanan\n\nPanen pagi saat matang optimal adalah kunci hasil berkualitas tinggi!`
        : 'Panen: pagi hari saat matang, gunakan peralatan bersih, tangani hati-hati. Keringkan dan simpan di tempat sejuk-kering.';
    } else if (q.includes('harga') || q.includes('pasar') || q.includes('penjualan')) {
      answer = detail
        ? `Harga & Strategi Penjualan:\n\n1. Faktor: Musim (harga rendah saat panen raya), kualitas, lokasi, permintaan, transportasi\n2. Harga Umum: Padi Rp4-5.5k/kg, Jagung Rp3-4.5k/kg, Cabai Rp20-50k/kg, Tomat Rp5-15k/kg, Bawang Rp15-40k/kg\n3. Strategi: Jual langsung konsumen (harga lebih tinggi), grosir, pasar tradisional, online\n4. Nilai Lebih: Tingkatkan kualitas budidaya, panen optimal, kemasan menarik, hubungan baik pembeli\n5. Pasca Panen: Grading berdasarkan ukuran, sortir rusak, kemasan menarik, penyimpanan optimal, olahan samping\n\nMonitor harga pasar sebelum tanam, jual bertahap, bangun hubungan jangka panjang dengan pembeli!`
        : 'Harga fluktuatif sesuai musim. Padi Rp4-5.5k/kg, jagung Rp3-4.5k/kg, cabai Rp20-50k/kg. Tingkatkan nilai: panen tepat waktu, kemasan baik, jual langsung.';
    } else if (q.includes('teknologi') || q.includes('modern') || q.includes('inovasi') || q.includes('sensor')) {
      answer = detail
        ? `Teknologi Pertanian Modern:\n\n1. Monitoring: Sensor kelembaban tanah, suhu/kelembaban udara, drone pertanian, IoT devices\n2. Presisi: Pemetaan digital, pemupukan spasial, irigasi otomatis, prediksi hama\n3. Greenhouse: Kontrol iklim otomatis, hemat air dan lahan, produksi sepanjang tahun, kurangi pestisida\n4. Aplikasi Mobile: Monitoring tanaman, prediksi cuaca, harga pasar, panduan budidaya, pencatatan aktivitas\n5. Software: Akuntansi pertanian, inventori hasil, tracking penjualan, analisis profitabilitas\n6. Implementasi: Mulai sederhana (thermometer, pH meter), upgrade bertahap, pelatihan penggunaan\n\nTeknologi + pengetahuan lokal = hasil maksimal!`
        : 'Teknologi: sensor IoT, drone, irigasi otomatis, aplikasi mobile, greenhouse automation. Meningkatkan produktivitas 20-40% dengan efisiensi lebih baik.';
    } else {
      answer = detail
        ? `Terima kasih atas pertanyaan tentang "${message}".\n\nSaya asisten pertanian lokal. Topik yang saya bantu:\n• Budidaya tanaman (padi, jagung, sayuran)\n• Pengendalian hama dan penyakit\n• Pemupukan dan manajemen nutrisi\n• Teknik irigasi yang efisien\n• Tips meningkatkan hasil panen\n• Informasi harga pasar\n• Teknologi pertanian modern\n\nBagaimana saya bisa membantu?`
        : 'Silakan tanyakan tentang budidaya, hama, pupuk, irigasi, panen, harga pasar, atau teknologi pertanian!';
    }

    return new Response(JSON.stringify({ 
      success: true, 
      response: answer,
      isLocal: true,
      model: 'local-knowledge-base'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(err),
      hint: 'Sistem sedang dalam perbaikan. Silakan coba lagi nanti.'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
