Gemini Chat Edge Function (Supabase)

This folder contains a Deno-based Supabase Edge Function scaffold (`gemini-chat`) which forwards chat requests to Google's Generative Language API (Gemini / text-bison).

Files
- `index.ts` - Edge Function entrypoint. Expects a POST JSON body: `{ message, systemPrompt, context, detail }`.

Environment
- Set `GOOGLE_API_KEY` in your Supabase project environment (or `GEN_API_KEY`). The function uses this key to call the Generative Language API.

Deployment (Supabase CLI)
1. Install Supabase CLI if you don't have it: https://supabase.com/docs/guides/cli
2. From project root run:

```bash
supabase login
supabase link --project-ref <your-project-ref>
cd supabase/functions/gemini-chat
supabase functions deploy gemini-chat --no-verify
```

3. Set the environment variable in Supabase (via Dashboard > Settings > API > Environment variables) or using the CLI / secrets.

Testing
- Call the function from your frontend (example using fetch):

```js
const res = await fetch(`https://${projectId}.supabase.co/functions/v1/gemini-chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Bagaimana teknik pemupukan cabai?', systemPrompt: 'You are an expert in Indonesian agriculture...', context: { articles: [], tips: [] }, detail: 'detailed' })
});
const data = await res.json();
console.log(data);
```

Notes & Next Steps
- The function uses the public `text-bison-001` model endpoint; if you prefer another Gemini model or the Vertex AI client, adjust the endpoint accordingly.
- For production, consider:
  - Caching frequent queries.
  - Rate-limiting + authentication.
  - Accepting a `source` param to cite sources explicitly.

Security
- Keep your `GOOGLE_API_KEY` secret and set it in Supabase Function environment variables, not in client code.

If you want, I can update the frontend to call this function endpoint explicitly and persist model-generated answers to the DB or add simple caching.