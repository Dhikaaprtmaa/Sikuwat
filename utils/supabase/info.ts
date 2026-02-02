// Supabase configuration — read from Vite environment variables with secure fallback.
// For local development: Create `.env` with VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
// For production (Vercel): Set env vars in project settings
// Note: Public anon key is safe to hardcode (it's meant to be public/client-facing)

const _supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://vrqgbaeurwfkpcfpwvnk.supabase.co';
const _supabaseProjectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID || 'vrqgbaeurwfkpcfpwvnk';
const _anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycWdiYWV1cndma3BjZnB3dm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzg0NjYsImV4cCI6MjA4NDcxNDQ2Nn0.7-92orbryzC80qgMgQRz6WCIJJIDfVmBOOC2AAmHtRU';

function deriveProjectId(url: string, explicitId: string) {
	if (explicitId && explicitId.length > 0) return explicitId;
	try {
		if (!url) return '';
		const u = new URL(url);
		return u.hostname.split('.')[0] || '';
	} catch (e) {
		return '';
	}
}

export const projectId = deriveProjectId(_supabaseUrl, _supabaseProjectId);
export const publicAnonKey = _anonKey;

// Log warning if using fallback (for debugging)
if (typeof window !== 'undefined' && !import.meta.env.VITE_SUPABASE_URL) {
	console.warn('⚠️ Using fallback Supabase config. Set VITE_SUPABASE_* env vars for custom deployment.');
}
