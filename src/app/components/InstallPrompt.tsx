import React, { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Determine if user previously dismissed the banner
    const dismissed = localStorage.getItem('sikuwat_install_prompt_dismissed') === '1';

    const handler = (e: Event) => {
      // beforeinstallprompt is fired on supported Android/Chrome browsers
      e.preventDefault();
      setDeferredPrompt(e);
      // only auto-show if user hasn't dismissed before
      if (!dismissed) setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);

    // Simple iOS detection (Safari A2HS flow) - only auto-show when not dismissed
    const ua = navigator.userAgent || '';
    const ios = /iphone|ipad|ipod/i.test(ua);
    const isStandalone = (window as any).navigator && (window as any).navigator.standalone;
    if (ios && !isStandalone && !dismissed) {
      setIsIOS(true);
      setVisible(true);
    }

    // Always register custom show handler so clicking the install button
    // will open the instructions even if the user dismissed earlier.
    const showHandler = () => setVisible(true);
    window.addEventListener('sikuwat:show-install', showHandler as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
      window.removeEventListener('sikuwat:show-install', showHandler as EventListener);
    };
  }, []);

  // We intentionally do NOT call the browser prompt. When the app's
  // install button is pressed we show manual platform instructions
  // (iOS / Android / Desktop) instead of a native prompt.

  const onClose = () => {
    localStorage.setItem('sikuwat_install_prompt_dismissed', '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl overflow-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M12 4v8m0 0l-3-3m3 3l3-3M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold">Cara Menginstal Sikuwat</h3>
              <p className="text-sm text-gray-600">Pilih panduan sesuai perangkat Anda.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border rounded-lg p-3">
            <h4 className="font-semibold mb-2">Android (Chrome/Edge)</h4>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
              <li>Buka menu browser (titik tiga / ⋮) di pojok kanan atas.</li>
              <li>Pilih "Add to Home screen" atau "Install app".</li>
              <li>Konfirmasi dengan <span className="font-medium">Add</span> / <span className="font-medium">Install</span>.</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">Jika tersedia, Anda juga dapat menemukan opsi "Install" di bilah alamat (ikon unduh).</p>
          </div>

          <div className="border rounded-lg p-3">
            <h4 className="font-semibold mb-2">iOS (Safari)</h4>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
              <li>Ketuk ikon <span className="font-medium">Share</span> (kotak dengan panah ke atas) di bagian bawah.</li>
              <li>Gulir dan pilih <span className="font-medium">Add to Home Screen</span>.</li>
              <li>Ketuk <span className="font-medium">Add</span> di pojok kanan atas.</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">Safari di iOS tidak menampilkan dialog otomatis — ikuti langkah di atas.</p>
          </div>

          <div className="border rounded-lg p-3">
            <h4 className="font-semibold mb-2">Desktop (Chrome / Edge)</h4>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
              <li>Buka menu browser (⋮) atau perhatikan ikon install di bilah alamat.</li>
              <li>Pilih <span className="font-medium">Install app</span> atau <span className="font-medium">Install Sikuwat</span>.</li>
              <li>Konfirmasi instalasi; aplikasi akan terbuka di jendela terpisah.</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">Pastikan situs diakses via HTTPS untuk opsi pemasangan otomatis.</p>
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-3">
          {deferredPrompt && (
            <div className="text-xs text-gray-600 mr-auto">Catatan: Browser Anda mendukung pemasangan otomatis.</div>
          )}
          <button onClick={onClose} className="px-3 py-2 bg-emerald-600 text-white rounded-md">Selesai</button>
        </div>
      </div>
    </div>
  );
}
