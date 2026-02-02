import React, { useState } from 'react';
import { Send, MessageCircle, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ScrollArea } from '@/app/components/ui/scroll-area';

interface Message {
  id: number;
  user: string;
  ai: string;
  timestamp: Date;
}

const Chatbox = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fungsi untuk menghasilkan respons AI simulasi tentang pertanian
  const generateAIResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();

    // Database respons yang lebih komprehensif
    const knowledgeBase = {
      // Tanaman Pangan Utama
      'padi': {
        budidaya: 'Budidaya padi membutuhkan persiapan lahan yang matang. Pilih varietas unggul seperti Inpari 32, Ciherang, atau IR64 yang tahan terhadap hama dan penyakit. Lakukan pengolahan tanah minimal untuk menjaga struktur tanah. Sistem tanam legowo dengan jarak 25x25x50 cm dapat meningkatkan produktivitas hingga 20%.',
        hama: 'Hama utama padi: wereng batang coklat, penggerek batang, dan tikus. Gunakan varietas tahan, tanam serempak, dan aplikasikan pestisida nabati seperti ekstrak mimba.',
        pupuk: 'Dosis pupuk NPK untuk padi: 200-250 kg/ha urea, 100-150 kg/ha SP36, dan 50-100 kg/ha KCl. Lakukan pemupukan bertahap: 1/3 saat tanam, 1/3 saat vegetatif, 1/3 saat generatif.',
        panen: 'Panen padi saat 80-90% gabah telah menguning. Produktivitas optimal 6-8 ton/ha dengan teknologi tepat guna.'
      },
      'jagung': {
        budidaya: 'Jagung cocok ditanam di dataran tinggi atau sedang. Pilih varietas hibrida seperti Bisi 18 atau NK 33. Jarak tanam 75x20 cm dengan 2 benih per lubang. Populasi tanaman optimal 66.000-80.000 tanaman/ha.',
        hama: 'Hama jagung: ulat grayak, penggerek batang, dan burung. Kontrol dengan rotasi tanaman, penggunaan feromon, dan tanaman perangkap.',
        pupuk: 'Jagung membutuhkan pupuk tinggi: 300-400 kg/ha urea, 150-200 kg/ha SP36, 100-150 kg/ha KCl. Tambahkan pupuk organik 5-10 ton/ha.',
        panen: 'Panen jagung saat tongkol telah mengeras dan daun mulai mengering. Produktivitas 8-12 ton/ha tongkol basah.'
      },
      'kedelai': {
        budidaya: 'Kedelai toleran kekeringan dan cocok untuk lahan kering. Varietas unggul: Anjasmoro, Grobogan, atau Wilis. Tanam dengan sistem tumpang sari atau monokultur. Populasi 400.000-500.000 tanaman/ha.',
        hama: 'Hama kedelai: kacang-kacangan, ulat penggulung daun, dan penyakit karat daun. Gunakan varietas tahan dan lakukan pengendalian hayati.',
        pupuk: 'Dosis pupuk: 50-100 kg/ha urea, 100-150 kg/ha SP36, 50-75 kg/ha KCl. Kedelai membutuhkan rhizobium untuk fiksasi nitrogen.',
        panen: 'Panen saat 75-80% polong telah menguning. Produktivitas 2-3 ton/ha biji kering.'
      },

      // Tanaman Hortikultura
      'cabai': {
        budidaya: 'Cabai membutuhkan iklim tropis dengan sinar matahari penuh. Varietas: Cabe rawit, cabe merah besar. Gunakan mulsa plastik hitam untuk menekan gulma dan menjaga kelembaban.',
        hama: 'Hama cabai: thrips, kutu daun, dan lalat buah. Kontrol dengan insektisida nabati dan predator alami seperti kepik.',
        pupuk: 'Pupuk lengkap NPK 16-16-16 dengan dosis 200-300 kg/ha. Tambahkan kalsium dan magnesium untuk mencegah busuk buah.',
        panen: 'Panen cabai muda untuk konsumsi segar. Produktivitas 10-15 ton/ha dengan perawatan intensif.'
      },
      'tomat': {
        budidaya: 'Tomat membutuhkan tanah gembur dengan pH 6-7. Varietas: Ratna, Intan, atau hibrida F1. Gunakan ajir untuk menyangga tanaman dan meningkatkan sirkulasi udara.',
        hama: 'Hama tomat: ulat grayak, thrips, dan penyakit layu bakteri. Gunakan fungisida tembaga dan rotasi tanaman.',
        pupuk: 'Dosis pupuk: 200 kg/ha urea, 300 kg/ha SP36, 200 kg/ha KCl. Tambahkan pupuk daun untuk nutrisi cepat.',
        panen: 'Panen tomat saat buah mencapai ukuran optimal dengan warna merah tua. Produktivitas 20-30 ton/ha.'
      },
      'bawang': {
        budidaya: 'Bawang merah cocok di dataran tinggi dengan iklim kering. Varietas: Bima Brebes, Kuning. Tanam dengan jarak 15x20 cm.',
        hama: 'Hama bawang: thrips dan penyakit busuk umbi. Gunakan varietas tahan dan jaga kebersihan lahan.',
        pupuk: 'Dosis pupuk: 150 kg/ha urea, 200 kg/ha SP36, 100 kg/ha KCl. Fokus pada fosfor untuk pembentukan umbi.',
        panen: 'Panen saat 70-80% daun menguning. Produktivitas 10-15 ton/ha umbi kering.'
      },

      // Tanaman Perkebunan
      'kelapa': {
        budidaya: 'Kelapa membutuhkan iklim tropis basah dengan curah hujan 2000-3000 mm/tahun. Jarak tanam 9x9x9 meter. Pemeliharaan meliputi pemangkasan, pemupukan, dan pengendalian hama.',
        hama: 'Hama kelapa: penggerek buah, ulat kantong, dan penyakit busuk pangkal batang. Kontrol dengan sanitasi kebun dan aplikasi pestisida.',
        pupuk: 'Pupuk organik 50 kg/pohon/tahun ditambah NPK 1-2 kg/pohon. Fokus pada kalium untuk meningkatkan produksi.',
        panen: 'Panen kelapa saat buah mencapai 12 bulan. Produktivitas 60-80 butir/pohon/tahun.'
      },
      'kopi': {
        budidaya: 'Kopi arabika cocok di dataran tinggi 1000-2000 mdpl. Varietas: Typica, Catimor. Gunakan naungan 40-50% untuk melindungi dari sinar matahari berlebih.',
        hama: 'Hama kopi: penggerek buah, karat daun, dan nematoda. Kontrol dengan pruning rutin dan aplikasi fungisida.',
        pupuk: 'Dosis pupuk: 200-300 gram NPK per pohon per tahun. Tambahkan bahan organik untuk memperbaiki struktur tanah.',
        panen: 'Panen cherry merah dengan metode stripping. Produktivitas 1-2 ton biji kering per hektar.'
      },
      'coklat': {
        budidaya: 'Kakao membutuhkan iklim tropis lembab dengan curah hujan 1500-2500 mm/tahun. Varietas: Sulawesi 1, Sulawesi 2. Jarak tanam 3x3 meter.',
        hama: 'Hama kakao: penggerek buah, vaskular streak dieback (VSD), dan black pod. Kontrol dengan sanitasi dan fungisida.',
        pupuk: 'Dosis pupuk: 1-2 kg NPK per pohon per tahun. Tambahkan kapur dolomit untuk menetralkan pH tanah.',
        panen: 'Panen buah masak dengan warna kuning-orange. Produktivitas 1-2 ton biji kering per hektar.'
      },

      // Hama dan Penyakit Spesifik
      'wereng': {
        identifikasi: 'Wereng batang coklat (Nilaparvata lugens) adalah hama utama padi. Gejala: tanaman menguning, kerdil, dan mati mendadak.',
        pengendalian: 'Gunakan varietas tahan seperti IR64. Aplikasikan insektisida sistemik saat populasi 10 ekor/meter persegi. Tanam serempak untuk mengurangi populasi.',
        pencegahan: 'Jaga kebersihan sawah, hindari pemupukan nitrogen berlebih, dan gunakan perangkap feromon.'
      },
      'ulat': {
        identifikasi: 'Ulat grayak menyerang berbagai tanaman. Gejala: daun berlubang-lubang, tanaman layu.',
        pengendalian: 'Gunakan Bacillus thuringiensis (Bt) sebagai pestisida hayati. Aplikasi pada pagi atau sore hari.',
        pencegahan: 'Rotasi tanaman, tanam varietas tahan, dan jaga kebersihan lahan.'
      },
      'karat': {
        identifikasi: 'Penyakit karat disebabkan jamur Puccinia spp. Gejala: bercak karat pada daun.',
        pengendalian: 'Gunakan fungisida triazol seperti propikonazol. Aplikasi preventif setiap 2 minggu.',
        pencegahan: 'Tanam varietas tahan, jaga jarak tanam, dan hindari kelembaban berlebih.'
      },
      'thrips': {
        identifikasi: 'Thrips adalah hama kecil yang menghisap cairan tanaman. Gejala: daun keriting, bercak perak.',
        pengendalian: 'Gunakan insektisida sistemik seperti imidakloprid. Aplikasi pada pagi hari.',
        pencegahan: 'Gunakan mulsa perak, tanam varietas tahan, dan jaga kebersihan kebun.'
      },

      // Pupuk dan Nutrisi
      'urea': {
        penggunaan: 'Urea mengandung 46% nitrogen dan cocok untuk tanaman yang membutuhkan nitrogen tinggi seperti padi dan jagung.',
        dosis: 'Padi: 200-250 kg/ha, jagung: 300-400 kg/ha. Aplikasikan bertahap untuk menghindari kehilangan nitrogen.',
        tips: 'Aplikasikan di pagi hari saat tanah lembab. Jangan campur langsung dengan pupuk fosfat.'
      },
      'sp36': {
        penggunaan: 'SP36 mengandung 36% P2O5 dan penting untuk pembentukan akar dan biji.',
        dosis: 'Umum: 100-200 kg/ha tergantung jenis tanaman. Aplikasikan saat tanam atau sebagai pupuk dasar.',
        tips: 'Larutkan dalam air untuk aplikasi foliar. Cocok untuk tanah berpasir yang kekurangan fosfor.'
      },
      'kcl': {
        penggunaan: 'KCl mengandung 60% K2O dan meningkatkan ketahanan tanaman terhadap hama penyakit.',
        dosis: '50-150 kg/ha tergantung kebutuhan tanaman. Aplikasikan saat pembentukan buah.',
        tips: 'Jangan berlebihan karena dapat menyebabkan akumulasi klorida yang berbahaya.'
      },
      'organik': {
        jenis: 'Pupuk kandang, kompos, pupuk hijau, dan biochar. Kaya akan unsur hara makro dan mikro.',
        keuntungan: 'Memperbaiki struktur tanah, meningkatkan aktivitas mikroba, ramah lingkungan.',
        aplikasi: 'Aplikasikan 5-10 ton/ha setahun. Campur dengan pupuk anorganik untuk hasil optimal.'
      },

      // Irigasi dan Pengairan
      'tetes': {
        keuntungan: 'Sistem irigasi tetes menghemat air hingga 50% dan memberikan nutrisi langsung ke akar.',
        penerapan: 'Gunakan untuk tanaman hortikultura seperti cabai dan tomat. Debit 2-4 liter/jam per tanaman.',
        perawatan: 'Bersihkan filter secara berkala dan gunakan air bersih untuk menghindari penyumbatan.'
      },
      'sprinkler': {
        keuntungan: 'Sprinkler memberikan distribusi air merata dan cocok untuk lahan berbukit.',
        penerapan: 'Gunakan untuk tanaman semusim seperti jagung dan kedelai. Tekanan kerja 2-3 bar.',
        perawatan: 'Periksa nozzle secara rutin dan kalibrasi debit air setiap musim.'
      },
      'sawah': {
        sistem: 'Sistem irigasi sawah menggunakan pintu air dan saluran. Jaga tinggi muka air 5-10 cm.',
        manfaat: 'Efisien untuk padi, mengurangi kebutuhan pengolahan tanah, mengontrol gulma.',
        tantangan: 'Risiko kehilangan nutrisi terlarut, membutuhkan pemeliharaan saluran rutin.'
      },

      // Cuaca dan Iklim
      'musim hujan': {
        tanaman: 'Cocok untuk: padi, jagung, kedelai. Tanam awal musim untuk menghindari banjir akhir musim.',
        persiapan: 'Siapkan drainase, gunakan varietas tahan genangan, dan monitor kelembaban tanah.',
        risiko: 'Risiko banjir, penyakit jamur meningkat. Gunakan fungisida preventif.'
      },
      'musim kemarau': {
        tanaman: 'Cocok untuk: cabai, tomat, kelapa sawit. Fokus pada tanaman toleran kekeringan.',
        persiapan: 'Siapkan sistem irigasi, gunakan mulsa untuk menjaga kelembaban, dan tanam pagi/sore.',
        risiko: 'Risiko kekeringan, serangan hama meningkat. Pastikan pasokan air memadai.'
      },
      'el nino': {
        dampak: 'Kekeringan berkepanjangan, penurunan produktivitas tanaman, peningkatan harga pangan.',
        mitigasi: 'Tanam varietas tahan kekeringan, siapkan sumur bor, diversifikasi tanaman.',
        adaptasi: 'Sistem irigasi tetes, penggunaan mulsa, dan asuransi pertanian.'
      },

      // Teknologi dan Inovasi
      'pertanian organik': {
        keuntungan: 'Meningkatkan kesuburan tanah jangka panjang, ramah lingkungan, produk lebih sehat.',
        praktik: 'Gunakan pupuk kandang, kompos, dan pestisida nabati. Sertifikasi organik untuk nilai jual tinggi.',
        tantangan: 'Produktivitas awal lebih rendah, membutuhkan pengetahuan khusus, biaya lebih tinggi.'
      },
      'hidroponik': {
        keuntungan: 'Hemat lahan, kontrol nutrisi presisi, panen lebih cepat, bebas hama tanah.',
        sistem: 'NFT (Nutrient Film Technique), DWC (Deep Water Culture), atau Vertical Farming.',
        tantangan: 'Investasi awal tinggi, membutuhkan listrik stabil, pengetahuan teknis khusus.'
      },
      'vertikultur': {
        keuntungan: 'Maksimalisasi lahan terbatas, cocok untuk urban farming, produksi tinggi per unit lahan.',
        teknik: 'Gunakan rak bertingkat dengan sistem irigasi tetes otomatis dan lampu LED.',
        aplikasi: 'Sayuran daun seperti selada, kangkung, dan herbs. Produktivitas 10-20 kali lipat.'
      },

      // Bisnis dan Pemasaran
      'harga pasar': {
        faktor: 'Dipengaruhi oleh: musim, pasokan, permintaan, biaya produksi, dan kebijakan pemerintah.',
        strategi: 'Pantau harga melalui aplikasi Sikuwat, jual saat harga tinggi, diversifikasi produk.',
        tips: 'Buat kontrak jual beli, ikuti program pemerintah, dan bergabung dengan kelompok tani.'
      },
      'ekspor': {
        persyaratan: 'Sertifikasi phytosanitary, kebersihan produk, kemasan sesuai standar internasional.',
        pasar: 'Tujuan utama: Malaysia, Singapura, Timur Tengah. Komoditas: sawit, kakao, kopi.',
        tantangan: 'Biaya logistik tinggi, persaingan ketat, fluktuasi kurs mata uang.'
      },
      'koperasi': {
        manfaat: 'Akses modal bersama, bargaining power lebih tinggi, pembelian input bersama.',
        jenis: 'Koperasi primer (petani), sekunder (gabungan koperasi), dan unit desa.',
        tips: 'Pilih pengurus yang kompeten, buat AD/ART jelas, dan lakukan audit rutin.'
      },

      // Lahan dan Tanah
      'ph tanah': {
        optimal: 'Kebanyakan tanaman optimal pada pH 6-7. Tanah asam (pH <5.5) perlu dikapurkan.',
        pengukuran: 'Gunakan kertas lakmus atau alat pH meter. Ukur pada kedalaman 15-20 cm.',
        koreksi: 'Tanah asam: kapur dolomit 2-5 ton/ha. Tanah alkalin: gypsum atau sulfur.'
      },
      'tekstur tanah': {
        jenis: 'Lempung: retensi air tinggi, drainase buruk. Pasir: drainase baik, retensi air rendah.',
        pengelolaan: 'Tanah lempung: tambah bahan organik. Tanah pasir: irigasi intensif, pupuk sering.',
        identifikasi: 'Lempung: lengket saat basah. Pasir: berpasir, tidak lengket.'
      },

      // Bibit dan Benih
      'varietas unggul': {
        keuntungan: 'Produktivitas tinggi, tahan hama penyakit, kualitas hasil baik.',
        sumber: 'Balai Benih, kios pertanian, atau distributor resmi. Pastikan sertifikat.',
        penyimpanan: 'Simpan di tempat sejuk kering, gunakan kotak kedap udara, jangan campur varietas.'
      },
      'benih hibrida': {
        karakteristik: 'Produktivitas sangat tinggi, seragam, tapi benih F2 tidak bisa digunakan lagi.',
        aplikasi: 'Cocok untuk jagung, cabai, tomat. Biaya benih lebih tinggi tapi ROI baik.',
        perhatian: 'Jangan simpan benih untuk tanam berikutnya, beli benih baru setiap musim.'
      }
    };

    // Fungsi untuk mencari respons yang relevan
    const findRelevantResponse = (query: string) => {
      const words = query.split(' ');
      let bestMatch = null;
      let bestScore = 0;

      for (const [key, data] of Object.entries(knowledgeBase)) {
        if (typeof data === 'object') {
          let score = 0;
          const subKeys = Object.keys(data);

          // Cek kecocokan kata kunci utama
          if (query.includes(key)) score += 10;

          // Cek kecocokan dengan sub-topik
          for (const word of words) {
            if (word.length > 2) { // Hindari kata-kata pendek
              for (const subKey of subKeys) {
                if (subKey.includes(word) || word.includes(subKey)) {
                  score += 5;
                }
              }
              if (key.includes(word)) score += 3;
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestMatch = { key, data };
          }
        }
      }

      return bestMatch;
    };

    // Cari respons yang relevan
    const match = findRelevantResponse(message);

    if (match) {
      const { key, data } = match;
      let response = `**${key.toUpperCase()}:**\n\n`;

      if (typeof data === 'object') {
        for (const [subKey, content] of Object.entries(data)) {
          response += `**${subKey.charAt(0).toUpperCase() + subKey.slice(1)}:** ${content}\n\n`;
        }
      }

      return response.trim();
    }

    // Respons default yang lebih informatif
    const defaultResponses = [
      'Saya adalah asisten pertanian Sikuwat yang siap membantu Anda. Saya memiliki pengetahuan tentang berbagai aspek pertanian Indonesia. Coba tanyakan tentang:\n\n• Budidaya tanaman (padi, jagung, kedelai, cabai, tomat)\n• Pengendalian hama dan penyakit\n• Pupuk dan nutrisi tanaman\n• Sistem irigasi dan pengairan\n• Cuaca dan perencanaan tanam\n• Teknologi pertanian modern\n• Harga pasar dan pemasaran\n\nAjukan pertanyaan spesifik Anda!',
      'Pertanyaan Anda sangat menarik! Untuk memberikan jawaban yang akurat, bisa lebih spesifik? Misalnya:\n\n• "Bagaimana cara menanam padi di lahan sawah?"\n• "Apa hama utama jagung dan cara mengatasinya?"\n• "Berapa dosis pupuk NPK untuk cabai?"\n• "Kapan waktu panen tomat yang optimal?"\n\nSaya siap membantu dengan informasi pertanian praktis!',
      'Sebagai AI pertanian, saya dilatih dengan pengetahuan komprehensif tentang praktik pertanian di Indonesia. Saya bisa membantu dengan:\n\n🌾 **Budidaya Tanaman**: Teknik tanam, varietas unggul, perawatan\n🐛 **Hama & Penyakit**: Identifikasi, pengendalian, pencegahan\n🌱 **Pupuk & Nutrisi**: Dosis, jenis, aplikasi\n💧 **Irigasi**: Sistem, efisiensi, perawatan\n🌤️ **Cuaca**: Perencanaan berdasarkan musim\n💼 **Bisnis**: Harga, pemasaran, ekspor\n\nSilakan ajukan pertanyaan spesifik tentang topik yang Anda minati!'
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Simulasi delay untuk respons AI
    setTimeout(() => {
      const aiResponse = generateAIResponse(userMessage);
      const newMessage: Message = {
        id: Date.now(),
        user: userMessage,
        ai: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, newMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-12 h-12 bg-green-600 hover:bg-green-700 shadow-lg"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 h-96 shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-green-700">
              Asisten Pertanian Sikuwat
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-72 px-4">
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 text-sm py-4">
                  Halo! Saya siap membantu dengan pertanyaan pertanian Anda.
                  Coba tanyakan tentang padi, jagung, hama, atau pupuk!
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <div className="flex justify-end">
                    <div className="bg-green-600 text-white rounded-lg px-3 py-2 max-w-xs text-sm">
                      {msg.user}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 rounded-lg px-3 py-2 max-w-xs text-sm whitespace-pre-line">
                      {msg.ai}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tanya tentang pertanian..."
                className="flex-1 text-sm"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Chatbox;
