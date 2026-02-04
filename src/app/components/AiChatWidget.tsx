import { useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { Card } from '@/app/components/ui/card';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

interface AiChatWidgetProps {
  contextData?: {
    articles: any[];
    tips: any[];
  };
}

export default function AiChatWidget({ contextData = { articles: [], tips: [] } }: AiChatWidgetProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; message: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const generateLocalAnswer = (userMessage: string, ctxArticles: any[], ctxTips: any[], detail: boolean) => {
    const kws = (userMessage || '')
      .replace(/[.,!?;:()"'\/\[\]]/g, ' ')
      .split(/\s+/)
      .map(s => s.toLowerCase())
      .filter(s => s.length > 3);

    const matchedTips: any[] = [];
    const matchedArticles: any[] = [];

    for (const t of ctxTips) {
      const text = (t.title + ' ' + (t.content || '')).toLowerCase();
      for (const kw of kws) {
        if (text.includes(kw)) {
          matchedTips.push(t);
          break;
        }
      }
    }

    for (const a of ctxArticles) {
      const text = (a.title + ' ' + (a.summary || '')).toLowerCase();
      for (const kw of kws) {
        if (text.includes(kw)) {
          matchedArticles.push(a);
          break;
        }
      }
    }

    let out = '';
    if (matchedTips.length === 0 && matchedArticles.length === 0) {
      out += 'Berikut beberapa panduan umum tentang pertanian yang mungkin membantu:\n\n';
      out += '- Tentukan jenis tanaman dan kebutuhan iklimnya.\n';
      out += '- Persiapkan lahan dengan baik: pH tanah, drainase, dan pemupukan dasar.\n';
      out += '- Gunakan bibit/pohon unggul dan perhatikan jarak tanam.\n';
      out += '- Kelola air dengan irigasi yang memadai; hindari genangan.\n';
      out += '- Pantau hama/penyakit secara rutin dan lakukan tindakan pengendalian sesuai panduan lokal.\n';
      out += '\nJika Anda bisa memberi detail lebih spesifik (jenis tanaman, gejala, atau tujuan), saya bisa bantu lebih terperinci.';
      return out;
    }

    out += 'Saya menemukan beberapa sumber lokal yang relevan:\n\n';
    if (matchedTips.length) {
      out += 'Tips relevan:\n';
      for (const t of matchedTips.slice(0, 4)) {
        out += `- ${t.title}: ${(t.content || '').slice(0, 120)}...\n`;
      }
      out += '\n';
    }
    if (matchedArticles.length) {
      out += 'Artikel relevan:\n';
      for (const a of matchedArticles.slice(0, 3)) {
        out += `- ${a.title}: ${(a.summary || '').slice(0, 140)}... ${a.url || ''}\n`;
      }
      out += '\n';
    }

    if (detail) {
      out += 'Rekomendasi langkah praktis:\n';
      out += '1) Identifikasi masalah utama (cek kelembaban tanah, daun, akar).\n';
      out += '2) Terapkan perbaikan: pemupukan berbasis kebutuhan tanaman, pengendalian hama terintegrasi, dan optimasi irigasi.\n';
      out += '3) Catat dan pantau hasil setiap 1-2 minggu dan sesuaikan tindakan.\n';
    } else {
      out += 'Jawaban singkat: sesuaikan pemupukan dan pengendalian hama sesuai panduan di atas.';
    }

    return out;
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setChatInput(prompt);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', message: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const systemPrompt = `Kamu adalah asisten ahli pertanian yang sangat berpengalaman dan ramah untuk petani Indonesia. Jawablah semua pertanyaan tentang pertanian secara lengkap, jelas, praktis, dan mudah dipahami. Fokus pada:
1. Pertanyaan seputar budidaya tanaman (teknik, varietas, waktu tanam)
2. Pengendalian hama dan penyakit 
3. Manajemen pupuk dan nutrisi tanaman
4. Irigasi dan pengelolaan air
5. Permintaan pasar dan harga tanaman
6. Teknologi pertanian modern yang terjangkau

Jika relevan, sertakan langkah-langkah, takaran, diagnosis masalah, penyebab umum, dan referensi ke sumber lokal yang tersedia. Gunakan bahasa Indonesia yang mudah dimengerti. Jika ada data atau sumber dari artikel atau tips yang diberikan, sebutkan sumber tersebut.`;

      const ctxArticles = contextData.articles.slice(0, 6).map(a => ({ id: a.id, title: a.title, summary: (a.content || '').slice(0, 300), url: a.url || a.article_url }));
      const ctxTips = contextData.tips.slice(0, 10).map(t => ({ id: t.id, title: t.title, content: t.content, category: t.category }));

            const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/gemini-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            message: userMessage,
            systemPrompt,
            context: { articles: ctxArticles, tips: ctxTips },
                  detail: 'detailed'
          })
        }
      );

      const data = await response.json();

      if (data.success && data.response) {
        setChatMessages(prev => [...prev, { role: 'ai', message: data.response }]);
      } else if (data && data.error) {
        throw new Error(data.error || 'Server error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      try {
        const ctxArticles = contextData.articles.slice(0, 6).map(a => ({ id: a.id, title: a.title, summary: (a.content || '').slice(0, 300), url: a.url || a.article_url }));
        const ctxTips = contextData.tips.slice(0, 10).map(t => ({ id: t.id, title: t.title, content: t.content, category: t.category }));
        const localAnswer = generateLocalAnswer(userMessage, ctxArticles, ctxTips, true);
        setChatMessages(prev => [...prev, { role: 'ai', message: localAnswer }]);
      } catch (fallbackErr) {
        console.error('Fallback answer failed:', fallbackErr);
        setChatMessages(prev => [...prev, { role: 'ai', message: 'Maaf, terjadi kesalahan. Silakan coba lagi.' }]);
      }
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!chatOpen ? (
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300 opacity-60"></div>
          <button
            onClick={() => setChatOpen(true)}
            className="relative bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 rounded-full shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <MessageCircle className="h-7 w-7" />
            <div className="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center animate-pulse shadow-lg">
              AI
            </div>
          </button>
        </div>
      ) : (
        <Card className="w-80 md:w-96 shadow-2xl border-0 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h3 className="font-bold">Sikuwat AI</h3>
                <p className="text-xs text-emerald-100">Asisten Pertanian</p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="h-80 overflow-y-auto p-4 bg-gradient-to-br from-gray-50 to-emerald-50/30 space-y-3">
            {chatMessages.length === 0 && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-sm text-gray-700 font-medium mb-1">Halo! Saya Sikuwat AI 🌾</p>
                  <p className="text-xs text-gray-600 mb-4">Tanyakan apapun tentang pertanian!</p>
                </div>
                
                {/* Suggested Prompts */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600 px-2">Contoh pertanyaan:</p>
                  {[
                    'Cara budidaya padi yang baik?',
                    'Bagaimana mengatasi hama cabai?',
                    'Berapa dosis pupuk untuk jagung?',
                    'Teknik irigasi yang efisien?',
                    'Tips meningkatkan hasil panen?',
                    'Harga pasar sayuran hari ini?'
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestedPrompt(prompt)}
                      className="w-full text-left text-xs p-2 rounded-lg bg-white border border-emerald-100 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 transition-colors shadow-sm"
                    >
                      💡 {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-sm shadow-lg'
                      : 'bg-white text-gray-900 rounded-bl-sm shadow-md border border-gray-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl rounded-bl-sm shadow-md">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 bg-white border-t border-gray-100 flex gap-2 flex-col">
            <div className="flex gap-2">
              <Input
                placeholder="Tanya tentang pertanian..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={chatLoading}
                className="text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
