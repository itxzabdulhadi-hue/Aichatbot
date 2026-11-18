# Aether

A 3D companion interface with a Supabase-backed, per-account conversation service and server-side AI provider configuration.

## Prerequisites and setup

1. Install Node.js 20 or newer and run `npm install`.
2. Create a Supabase project. In its SQL editor, run the entire migration at `supabase/migrations/20261118000000_aether.sql` **once**. It creates the tables, ownership policies, and a private secrets table. Review the migration and policies before exposing the application.
3. Copy `.env.example` to `.env.local`. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project settings. Generate `CREDENTIAL_ENCRYPTION_KEY` with `openssl rand -hex 32`. Store it securely, back it up, and keep it stable across deployments: losing or changing it makes saved credentials unreadable. Never put service-role or encryption keys in `NEXT_PUBLIC_` variables or commit them.
4. In Supabase Auth URL Configuration, set your site URL and add `https://YOUR_DOMAIN/auth/callback` as an allowed redirect URL (for local development also allow `http://localhost:3000/auth/callback`). Enable email/password authentication. Configure a production email provider and review email confirmation and password recovery settings.
5. Run `npm run dev` and open `http://localhost:3000`. The setup screen checks the backend and database. Sign up/sign in, open Settings → AI Configuration, save a provider key, test it, retrieve or enter a model ID, and set it as your default. A saved key is **not** considered verified until a test succeeds.
6. `npm run build` builds the application; `npm start` runs the production server. Deploy on a Node-compatible platform with the above server environment variables and HTTPS. Production mutation requests require HTTPS; configure your trusted reverse proxy to set `X-Forwarded-Proto` and `X-Forwarded-Host` correctly. Add your production origin to Supabase Auth. Never expose this app over plain HTTP in production.

`GET /api/health` reports whether the backend configuration and database schema are reachable, without exposing secrets. The optional `OTHER_AI_BASE_URL` is a server-administrator configured HTTPS OpenAI-compatible endpoint. Ordinary users cannot supply URLs; only set this variable to a trusted provider. OpenAI, OpenRouter, Gemini (OpenAI compatibility API), Anthropic and Groq use their provider APIs. Model listing and parameter support can vary by provider and account. API keys are submitted over the application's HTTPS connection and encrypted with AES-256-GCM server-side; the service-role-only secret table is not accessible through Supabase's authenticated or anonymous APIs. No stored key is returned by the application. Review deployment security, RLS, TLS, rate limits, email configuration and your providers' terms before production. This implementation has not undergone a security audit.

## Conversations and voice

Messages are saved per account, and the last opened conversation is restored in the same browser after refresh. The last conversation pointer is local to the browser; the conversation itself is stored in Supabase and can be reopened from history on another device. Search, rename, and deletion are available in History. A user message is saved before a provider request; if the provider fails, retry it without duplicating the message. An interrupted streamed response may be saved as a partial message. Only the latest 20 messages are included in context; automatic summarization and fallback models are not implemented. Provider-reported token counts are recorded where available; costs are not estimated. Usage is limited to the latest 1,000 events in the dashboard.

Voice input and output use browser APIs; settings include voice, rate, and enabling responses. Browser support and permissions vary. The character reacts to actual listening, thinking, and speaking states, but the bundled model has no facial blendshapes, independent eye controls or viseme data, and browser speech synthesis does not provide phoneme timings. It does not perform accurate lip-sync or context-driven facial expressions.

## 3D companion

The room and character are rendered live in Three.js. Camera controls change framing. Settings can load a compatible `.glb` character for the current session. The bundled Michelle model is a Mixamo example distributed in the [three.js examples](https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_skinning.html); verify asset rights for production. It is a rigged demo character, not a photorealistic MetaHuman. A photograph cannot be converted to a 3D character by this app. Custom GLB models work best with Mixamo-named bones. Reduced visuals disable screen-space ambient occlusion and shadows.

## Existing local data

The earlier SQLite prototype's `data/aether.db` is not automatically migrated to Supabase. Keep a backup if it contains conversations you need. The old local database is not used by the new multi-user routes.
