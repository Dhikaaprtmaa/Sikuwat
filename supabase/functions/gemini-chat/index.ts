import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

serve(async (req) => {
  try {
    const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEN_API_KEY');
    if (!apiKey) {
      // Fall back to local answer generation if no API key
      const body = await req.json().catch(() => ({}));
      const message = body.message || '';
      const detail = body.detail || 'detailed';
      const fallbackAnswer = generateLocalAnswer(message, body.context?.articles || [], body.context?.tips || [], detail);
      return new Response(JSON.stringify({ success: true, response: fallbackAnswer, isLocal: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json().catch(() => ({}));
    const message = body.message || '';
    const systemPrompt = body.systemPrompt || '';
    const context = body.context || {};
    const detail = body.detail || 'detailed';

    // Try to enrich context server-side: query Supabase for related articles and tips
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_KEY');
    let serverArticles: any[] = [];
    let serverTips: any[] = [];

    if (supabaseUrl && serviceKey) {
      try {
        // Extract simple keywords from user message
        const kws = (message || '')
          .replace(/[.,!?;:\/()\[\]"']/g, ' ')
          .split(/\s+/)
          .map(s => s.trim().toLowerCase())
          .filter(s => s.length > 3)
          .slice(0, 6);

        const uniqueArticles: Record<string, boolean> = {};
        const uniqueTips: Record<string, boolean> = {};

        for (const kw of kws) {
          // Query articles where title or content matches keyword (ilike)
          try {
            const aRes = await fetch(`${supabaseUrl}/rest/v1/articles?select=id,title,content,url&or=(title.ilike.*${encodeURIComponent(kw)}*,content.ilike.*${encodeURIComponent(kw)}*)&limit=3`, {
              headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`
              }
            });
            if (aRes.ok) {
              const aJson = await aRes.json();
              for (const a of aJson) {
                if (!uniqueArticles[a.id]) {
                  serverArticles.push({ id: a.id, title: a.title, summary: (a.content || '').slice(0, 500), url: a.url });
                  uniqueArticles[a.id] = true;
                }
              }
            }
          } catch (e) {
            // ignore per-keyword failure
          }

          try {
            const tRes = await fetch(`${supabaseUrl}/rest/v1/tips?select=id,title,content,category&or=(title.ilike.*${encodeURIComponent(kw)}*,content.ilike.*${encodeURIComponent(kw)}*)&limit=3`, {
              headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`
              }
            });
            if (tRes.ok) {
              const tJson = await tRes.json();
              for (const t of tJson) {
                if (!uniqueTips[t.id]) {
                  serverTips.push({ id: t.id, title: t.title, content: (t.content || '').slice(0, 400), category: t.category });
                  uniqueTips[t.id] = true;
                }
              }
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // non-fatal
        console.warn('Server-side retrieval failed', e);
      }
    }

    // Merge provided context with server-found context (server results first)
    const mergedArticles = (serverArticles || []).concat(context.articles || []).slice(0, 8);
    const mergedTips = (serverTips || []).concat(context.tips || []).slice(0, 12);

    // Build a combined prompt for the model
    const parts: string[] = [];
    if (systemPrompt) parts.push(systemPrompt);
    if (mergedArticles && mergedArticles.length) {
      parts.push('Context - Relevant Articles:');
      for (const a of mergedArticles) {
        parts.push(`- ${a.title || ''}\n${(a.summary || '').slice(0,300)}\n${a.url || ''}`);
      }
    }
    if (mergedTips && mergedTips.length) {
      parts.push('Context - Relevant Tips:');
      for (const t of mergedTips) {
        parts.push(`- ${t.title || ''}: ${(t.content || '').slice(0,300)}`);
      }
    }
    parts.push('User question:');
    parts.push(message);
    if (detail === 'detailed') parts.push('Please answer in a detailed, step-by-step, practical manner in Indonesian.');

    const finalPrompt = parts.join('\n\n');

    // Call Google Generative Language API (Gemini / text-bison)
    // NOTE: Configure GOOGLE_API_KEY in your Supabase Function environment variables.
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: finalPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800
        }
      })
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      return new Response(JSON.stringify({ success: false, error: `Generative API error: ${resp.status} ${txt}` }), { status: 502 });
    }

    const data = await resp.json();
    // Try common response shapes
    const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.candidates?.[0]?.output || data?.candidates?.[0]?.content || data?.outputText || JSON.stringify(data);

    return new Response(JSON.stringify({ success: true, response: candidate }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    // Fallback on error
    try {
      const body = await req.json().catch(() => ({}));
      const message = body.message || '';
      const detail = body.detail || 'detailed';
      const fallbackAnswer = generateLocalAnswer(message, body.context?.articles || [], body.context?.tips || [], detail);
      return new Response(JSON.stringify({ success: true, response: fallbackAnswer, isLocal: true, error: String(err) }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (_) {
      return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 500 });
    }
  }
});

function generateLocalAnswer(question: string, articles: any[], tips: any[], detail: string): string {
  const q = question.toLowerCase();
  
  const knowledgeBase: Record<string, string> = {
    'budidaya|tanaman|padi|jagung|sayuran': detail === 'detailed' 
      ? `Untuk budidaya tanaman yang baik, ikuti langkah-langkah berikut:\n\n1. **Persiapan Lahan**: Bersihkan lahan dari gulma dan batu, kemudian bajak sedalam 20-25 cm. Tunggu 1-2 minggu hingga tanah menjadi subur.\n\n2. **Pemilihan Benih**: Gunakan benih berkualitas tinggi dari varietas yang sesuai dengan daerah Anda. Lakukan pengujian daya tumbuh sebelum menanam.\n\n3. **Penanaman**: \n   - Untuk padi: Semai di persemaian, tunggu 25-30 hari sebelum ditanam di sawah\n   - Untuk jagung: Tanam langsung dengan jarak 75cm x 20cm\n   - Untuk sayuran: Sesuaikan jarak tanam dengan ukuran tanaman dewasa\n\n4. **Pemupukan**: Berikan pupuk dasar (kompos/kandang) saat persiapan lahan. Lakukan pemupukan susulan sesuai tahap pertumbuhan.\n\n5. **Irigasi**: Berikan air secara konsisten tanpa membiarkan tanah kering berlebihan.\n\n6. **Pengendalian Hama & Penyakit**: Monitor berkala, gunakan pestisida alami jika mungkin.\n\n7. **Panen**: Lakukan pada saat yang tepat untuk hasil maksimal.\n\nTips: Manfaatkan artikel dan panduan lokal yang tersedia untuk hasil terbaik!`
      : `Budidaya tanaman memerlukan: persiapan lahan yang baik, pemilihan benih berkualitas, penanaman dengan jarak tepat, pemupukan teratur, irigasi konsisten, pengendalian hama, dan panen pada waktu optimal.`,
    
    'hama|penyakit|hewan pengganggu|kutu|ulat': detail === 'detailed'
      ? `Pengendalian Hama Tanaman:\n\n**1. Identifikasi Hama Umum**:\n   - Wereng (padi): Serangga kecil yang mengisap cairan tanaman\n   - Penggerek batang: Larva yang masuk ke dalam batang\n   - Kumbang bunga/buah: Merusak bunga dan buah\n   - Ulat: Memakan daun dan batang\n\n**2. Pengendalian Alami**:\n   - Tanam tanaman pengusir hama (bawang putih, bawang merah)\n   - Lepas musuh alami seperti laba-laba dan serangga predator\n   - Gunakan neem oil atau ekstrak daun serai\n   - Jauhkan tanaman yang sakit\n\n**3. Pengendalian Kimiawi** (jika diperlukan):\n   - Gunakan pestisida yang sesuai dengan hama target\n   - Ikuti dosis anjuran dan waktu penyemprotan\n   - Tunggu masa aman sebelum panen\n\n**4. Pencegahan**:\n   - Rotasi tanaman setiap musim\n   - Jaga kebersihan lahan dari sisa tanaman\n   - Gunakan varietas tahan hama jika tersedia\n   - Monitor tanaman secara rutin\n\n**5. Panen untuk Meminimalkan Hama**:\n   - Panen pada waktu yang tepat\n   - Buang buah/bagian yang terserang hama segera\n\nSaran: Prioritaskan pengendalian alami sebelum menggunakan pestisida untuk lingkungan yang lebih sehat!`
      : `Pengendalian hama: identifikasi jenis hama, gunakan metode alami terlebih dahulu (tanaman pengusir, musuh alami, neem oil), lalu kimiawi jika perlu. Pencegahan dengan rotasi tanaman dan kebersihan lahan sangat penting.`,
    
    'pupuk|pemupukan|nutrisi|unsur hara': detail === 'detailed'
      ? `Panduan Pemupukan Tanaman:\n\n**1. Jenis-Jenis Pupuk**:\n   - **Organik**: Kompos, pupuk kandang, pupuk hijau (menguntungkan jangka panjang)\n   - **Anorganik**: Urea (N), SP36 (P), KCl (K) - hasil cepat tapi biaya tinggi\n   - **Kombinasi**: Campuran keduanya untuk hasil optimal\n\n**2. Unsur Hara Penting**:\n   - **Nitrogen (N)**: Pertumbuhan daun dan batang, dosis 100-150 kg/ha\n   - **Fosfor (P)**: Pertumbuhan akar dan buah, dosis 50-100 kg/ha\n   - **Kalium (K)**: Kualitas buah dan ketahanan tanaman, dosis 50-100 kg/ha\n\n**3. Waktu Pemupukan**:\n   - **Dasar**: Saat persiapan lahan (kompos 10 ton/ha)\n   - **Susulan 1**: Saat tanaman berumur 4-6 minggu\n   - **Susulan 2**: Saat tanaman berbunga/berbuah\n\n**4. Dosis untuk Tanaman Umum**:\n   - **Padi**: Urea 100kg, SP36 75kg, KCl 75kg per hektar\n   - **Jagung**: Urea 150kg, SP36 100kg, KCl 100kg per hektar\n   - **Sayuran**: Organik 10 ton + urea 100kg per hektar\n\n**5. Aplikasi Pupuk**:\n   - Pupuk dasar: Aduk merata dengan tanah saat persiapan\n   - Pupuk susulan: Jauhkan dari batang (10-15cm), tutup dengan tanah\n   - Lakukan penyiraman setelah pemupukan\n\n**6. Tips Efisiensi Pupuk**:\n   - Gunakan pupuk organik untuk daya tahan jangka panjang\n   - Aplikasikan pada saat yang tepat untuk hasil maksimal\n   - Lakukan analisis tanah untuk pemupukan yang lebih presisi\n   - Hindari pemupukan berlebihan yang dapat merusak tanaman\n\nTips: Kombinasi pupuk organik dan anorganik memberikan hasil terbaik dengan biaya yang hemat!`
      : `Pemupukan: gunakan kombinasi pupuk organik (kompos) dan anorganik (urea, SP36, KCl). Aplikasikan pupuk dasar saat persiapan lahan, lalu susulan pada umur 4-6 minggu dan saat berbunga. Dosis tergantung jenis tanaman.`,
    
    'irigasi|air|pengairan|sistem air': detail === 'detailed'
      ? `Teknik Irigasi yang Efisien:\n\n**1. Jenis-Jenis Sistem Irigasi**:\n   - **Irigasi Gravitasi**: Air mengalir dari saluran utama ke petak sawah\n   - **Irigasi Sprinkler**: Air disemprotkan seperti hujan\n   - **Irigasi Tetes**: Air dialirkan setetes demi setetes ke akar tanaman\n   - **Irigasi Subsurface**: Air dialirkan di bawah permukaan tanah\n\n**2. Kebutuhan Air Tanaman**:\n   - **Padi**: 800-1200 mm per musim\n   - **Jagung**: 400-600 mm per musim\n   - **Sayuran**: 250-400 mm per musim\n   - Sesuaikan dengan curah hujan dan jenis tanah\n\n**3. Jadwal Penyiraman**:\n   - Pagi atau sore hari untuk mengurangi penguapan\n   - Sirami ketika tanah mulai kering pada kedalaman 3-5 cm\n   - Untuk padi: Pertahankan genangan air 5-10 cm\n   - Untuk tanaman lain: Tanah lembab tapi tidak tergenang\n\n**4. Cara Mengenali Kebutuhan Air**:\n   - Daun mulai layu ringan → butuh air\n   - Tanah keras dan retak → kekurangan air\n   - Tanah tergenang terus → kelebihan air\n   - Warna daun pucat → mungkin kekurangan air\n\n**5. Efisiensi Irigasi**:\n   - Gunakan mulsa untuk mengurangi penguapan\n   - Perbaiki sistem saluran untuk mengurangi kebocoran\n   - Tanam pada lahan yang rata\n   - Gunakan drip irrigation untuk tanaman hortikultura\n   - Manfaatkan curah hujan dengan kolam penampung\n\n**6. Pengelolaan Air Berkelanjutan**:\n   - Gunakan air yang tersedia secara optimal\n   - Hindari pemborosan air\n   - Jaga kualitas air pengairan (bebas logam berat)\n   - Pertimbangkan penghijauan di sekitar lahan untuk menjaga kelembaban\n\nTips: Irigasi pada pagi hari memberikan hasil terbaik karena penguapan lebih rendah!`
      : `Irigasi efisien: gunakan sistem sesuai tanaman (gravitasi untuk padi, drip untuk sayuran), berikan air ketika tanah mulai kering, hindari kelebihan atau kekurangan air. Jadwal pagi/sore dan penggunaan mulsa sangat membantu.`,
    
    'panen|hasil panen|waktu panen|hasil|produksi': detail === 'detailed'
      ? `Panduan Panen yang Optimal:\n\n**1. Tanda-Tanda Kesiapan Panen**:\n   - **Padi**: Bulir 90% kuning keemasan, gabah berisi penuh\n   - **Jagung**: Janggel berwarna kemerahan, biji manis dan keras saat digigit\n   - **Sayuran**: Sesuai dengan ukuran konsumsi yang diinginkan (jangan terlalu besar)\n   - **Cabai**: Warna merah cerah, permukaan mengkilat\n\n**2. Waktu Panen Terbaik**:\n   - **Pagi hari**: Hasil lebih segar, kadar air optimal\n   - **Hindari siang terik**: Kurangi kesegaran\n   - **Hindari hujan**: Hasil mudah membusuk\n   - Panen secara berkala untuk hasil berkelanjutan (sayuran)\n\n**3. Teknik Panen yang Benar**:\n   - Gunakan peralatan yang bersih dan tajam\n   - Hati-hati tidak merusak tanaman atau buah lain\n   - Untuk padi: Gunakan sabit atau combine harvester\n   - Untuk sayuran: Petik dengan tangan atau gunakan gunting\n   - Untuk buah: Gunakan tangkai tidak putus dari pohon\n\n**4. Penanganan Pasca Panen**:\n   - Keringkan padi di tempat yang terlindungi dari hujan\n   - Jaga kesegaran dengan menyimpan di tempat sejuk\n   - Buang hasil yang rusak atau terserang hama\n   - Kemasan rapi untuk memudahkan transportasi\n\n**5. Meningkatkan Hasil Panen**:\n   - Gunakan varietas yang tepat untuk daerah Anda\n   - Budidaya dengan teknik yang baik sesuai panduan\n   - Pengendalian hama dan penyakit yang efektif\n   - Pemupukan dan irigasi yang optimal\n   - Panen pada waktu yang tepat\n\n**6. Penyimpanan Hasil Panen**:\n   - Padi: Kadar air 12-13%, simpan di tempat sejuk dan kering\n   - Sayuran segar: Simpan di kulkas atau tempat sejuk\n   - Jagung kering: Kadar air 11-12%, simpan di tempat kering\n   - Jauhkan dari hama penyimpanan (tikus, serangga)\n\nTips: Panen pagi hari pada tingkat kematangan yang tepat adalah kunci hasil berkualitas tinggi!`
      : `Panen optimal: identifikasi tanda kesiapan (warna, ukuran, kekerasan), panen pagi hari, gunakan peralatan bersih, tangani dengan hati-hati. Penyimpanan di tempat sejuk dan kering mempertahankan kualitas hasil.`,
    
    'harga|pasar|penjualan|nilai|ekonomi': detail === 'detailed'
      ? `Informasi Harga Pasar & Strategi Penjualan:\n\n**1. Faktor yang Mempengaruhi Harga**:\n   - Musim panen (harga rendah saat panen raya)\n   - Kualitas hasil (hasil premium lebih tinggi harga)\n   - Lokasi pasar (kota lebih mahal dari desa)\n   - Permintaan konsumen\n   - Kondisi transportasi dan penyimpanan\n\n**2. Harga Pasar Umum** (dapat berfluktuasi):\n   - **Padi**: Rp 4,000 - Rp 5,500 per kg (gabah kering panen)\n   - **Jagung**: Rp 3,000 - Rp 4,500 per kg\n   - **Cabai merah**: Rp 20,000 - Rp 50,000 per kg\n   - **Tomat**: Rp 5,000 - Rp 15,000 per kg\n   - **Bawang merah**: Rp 15,000 - Rp 40,000 per kg\n\n**3. Strategi Pemasaran**:\n   - Jual langsung ke konsumen (harga lebih tinggi)\n   - Kerjasama dengan pedagang grosir\n   - Pasar tradisional vs pasar modern\n   - Pemasaran online untuk jangkauan lebih luas\n   - Pertahankan kualitas untuk reputasi baik\n\n**4. Cara Meningkatkan Nilai Jual**:\n   - Tingkatkan kualitas dengan teknik budidaya baik\n   - Panen pada waktu tepat dengan hasil optimal\n   - Pengemasan menarik dan higienis\n   - Bangun hubungan baik dengan pembeli\n   - Pertimbangkan diversifikasi produk olahan\n\n**5. Penanganan Pasca Panen untuk Nilai Lebih**:\n   - Grading: Pisahkan berdasarkan ukuran dan kualitas\n   - Sortir: Buang hasil yang rusak\n   - Kemasan menarik: Tingkatkan nilai jual\n   - Penyimpanan optimal: Pertahankan kesegaran\n   - Olahan sederhana: Buat produk samping (keripik, bubur, dll)\n\n**6. Tips Bisnis Tani**:\n   - Catat biaya produksi dengan detail\n   - Monitor harga pasar sebelum menanam\n   - Jangan menjual semua hasil sekaligus (jual bertahap)\n   - Bangun hubungan jangka panjang dengan pembeli\n   - Pertimbangkan group marketing dengan petani lain\n\nTips: Informasi harga pasar terkini dapat dilihat di situs e-commerce, pasar tradisional, atau kontak pembeli langsung!`
      : `Harga pasar berfluktuasi sesuai musim dan kualitas. Padi Rp 4-5.5k/kg, jagung Rp 3-4.5k/kg, cabai Rp 20-50k/kg. Tingkatkan nilai dengan panen tepat waktu, kemasan baik, dan penjualan langsung ke konsumen.`,
    
    'teknologi|modern|inovasi|smart|precision|sensor': detail === 'detailed'
      ? `Teknologi Pertanian Modern:\n\n**1. Teknologi Monitoring Tanaman**:\n   - **Sensor Kelembaban Tanah**: Monitor kadar air real-time untuk irigasi presisi\n   - **Sensor Suhu/Kelembaban Udara**: Prediksi penyakit tanaman\n   - **Drone Pertanian**: Monitoring luas lahan dengan detail\n   - **IoT Devices**: Pengumpulan data otomatis untuk analisis\n\n**2. Pertanian Presisi**:\n   - Pemetaan lahan digital untuk manajemen lebih baik\n   - Pemupukan berbasis variabilitas spasial\n   - Irigasi otomatis berdasarkan kebutuhan tanaman\n   - Pengendalian hama berbasis prediksi\n\n**3. Teknologi Greenhouse/Vertical Farming**:\n   - Kontrol iklim otomatis untuk hasil maksimal\n   - Hemat air dan lahan\n   - Produksi sepanjang tahun\n   - Kurangi penggunaan pestisida\n\n**4. Aplikasi Mobile untuk Petani**:\n   - Monitoring kondisi tanaman\n   - Prediksi cuaca dan hama\n   - Informasi harga pasar\n   - Panduan budidaya\n   - Pencatatan aktivitas pertanian\n\n**5. Sistem Pengelolaan Bisnis Pertanian**:\n   - Software akuntansi pertanian\n   - Manajemen inventori hasil panen\n   - Tracking penjualan dan pelanggan\n   - Analisis profitabilitas\n\n**6. Implementasi Teknologi**:\n   - Mulai dari teknologi sederhana (thermometer, pH meter)\n   - Upgrade bertahap sesuai kemampuan finansial\n   - Pelatihan untuk penggunaan teknologi\n   - Gabungkan dengan pengetahuan lokal untuk hasil optimal\n\n**7. Manfaat Teknologi Pertanian**:\n   - Peningkatan produktivitas 20-40%\n   - Efisiensi penggunaan air dan pupuk\n   - Pengurangan risiko gagal panen\n   - Produk berkualitas lebih tinggi\n   - Data untuk pengambilan keputusan lebih baik\n\nTips: Teknologi sebaiknya dikombinasikan dengan praktik budidaya tradisional yang sudah terbukti untuk hasil terbaik!`
      : `Teknologi pertanian modern: sensor IoT untuk monitoring real-time, drone untuk pemetaan lahan, sistem irigasi otomatis, aplikasi mobile untuk panduan dan pasar, greenhouse automation. Meningkatkan produktivitas 20-40% dengan efisiensi lebih baik.`,
  };
  
  let answer = '';
  for (const [key, value] of Object.entries(knowledgeBase)) {
    const keywords = key.split('|');
    if (keywords.some(kw => q.includes(kw.toLowerCase()))) {
      answer = value;
      break;
    }
  }
  
  if (!answer) {
    answer = detail === 'detailed'
      ? `Terima kasih atas pertanyaan tentang "${question}".\n\nSaya adalah asisten pertanian berbasis lokal. Untuk informasi spesifik tentang topik ini, saya sarankan:\n\n1. **Baca artikel pertanian** yang tersedia di aplikasi\n2. **Cek tips terbaru** dari petani berpengalaman\n3. **Hubungi ahli lokal** di dinas pertanian setempat\n4. **Ikuti forum petani** online atau offline\n\nTopik-topik utama yang saya bisa bantu:\n- Budidaya tanaman (padi, jagung, sayuran)\n- Pengendalian hama dan penyakit\n- Pemupukan dan manajemen nutrisi\n- Teknik irigasi yang efisien\n- Tips meningkatkan hasil panen\n- Informasi harga pasar\n- Teknologi pertanian modern\n\nBagaimana saya bisa membantu Anda hari ini?`
      : `Pertanyaan menarik! Silakan pilih topik dari saran di atas atau tanyakan secara lebih spesifik tentang budidaya tanaman Anda.`;
  }
  
  // Add relevant articles/tips to answer
  if (articles.length > 0 || tips.length > 0) {
    let references = '';
    if (articles.length > 0) {
      references += '\n\n**Artikel Terkait**: ' + articles.map((a: any) => a.title).join(', ');
    }
    if (tips.length > 0) {
      references += '\n**Tips Berguna**: ' + tips.map((t: any) => t.title).join(', ');
    }
    answer += references;
  }
  
  return answer;
}
