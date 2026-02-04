import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

serve(async (req) => {
  try {
    const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEN_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'Missing GOOGLE_API_KEY (set in environment)' }), { status: 500 });
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
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 500 });
  }
});
