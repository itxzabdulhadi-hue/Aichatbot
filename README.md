# Aether

An immersive 3D companion with per-account chat history, server-side AI provider settings, and Neon PostgreSQL persistence.

## Set up Neon and run

1. Install Node.js 20 or newer and run `npm install`. Create a Neon PostgreSQL database and obtain a connection string with TLS (`sslmode=require`).
2. Copy `.env.example` to `.env.local`; set `DATABASE_URL` and generate `CREDENTIAL_ENCRYPTION_KEY` with `openssl rand -hex 32`. Keep both server-side and never commit them. Back up the encryption key and keep it identical across deployments and data migrations, or saved provider credentials cannot be decrypted.
3. Apply the versioned SQL migration once using a trusted terminal: `DATABASE_URL='your-neon-connection-string' npm run db:migrate`. This uses a migration table, a transaction and an advisory lock. Do not paste the database URL into the browser. The migration creates missing tables, but is not a general schema repair tool for incompatible pre-existing tables.
4. Run `npm run dev`. The setup screen blocks chat if the database, schema, or authenticated storage test fails. Sign up or sign in, then open Settings → AI Configuration to save, test, and select an AI model. The health endpoint `/api/health` checks that the database and required tables are reachable without returning credentials.
5. Optional password recovery requires `SMTP_URL`, `SMTP_FROM`, and `APP_URL` on the server. `APP_URL` must be the trusted HTTPS origin in production. Without these, password recovery reports that email is not configured. Accounts without a compatible password hash must use recovery after SMTP is configured. Registration does not currently verify email addresses; review this before exposing the app publicly.

## Vercel

Import the GitHub repository and branch. Add `DATABASE_URL` and `CREDENTIAL_ENCRYPTION_KEY` as server-only environment variables for the desired deployment environment; add optional SMTP settings and `OTHER_AI_BASE_URL` only when needed. Apply migrations to the target database from a trusted environment before deploying. Redeploy when environment variables change. A deployment without the database configuration or schema displays the setup screen. Vercel's serverless filesystem is not persistent, so database configuration is managed in deployment settings, not through the browser. The chat function requests a maximum duration of 120 seconds; actual limits depend on the Vercel plan.

## Import existing data from the prior Supabase deployment

This is an explicit, one-time administrative operation; **nothing is automatically copied or deleted**. Back up both databases and rehearse on a separate Neon database first. Apply `npm run db:migrate` to an empty target. Obtain a read-only source PostgreSQL connection that can read `auth.users` and the old public tables. Set `SOURCE_DATABASE_URL` and `DATABASE_URL` in a trusted terminal, then run `IMPORT_CONFIRM=import npm run db:import-legacy`. The importer copies accounts, profiles, conversations, messages, provider configs, encrypted secrets, preferences, memories, and usage events in a transaction; any conflict or unsupported source record rolls back the target import. It does not overwrite existing rows. It reads each source table into memory and is intended for modest datasets; use a reviewed bulk-transfer process for large databases. Verify row counts, permissions, authentication, and representative conversations before switching production.

User IDs, supported bcrypt password hashes and encrypted credentials are preserved. Use the **same** `CREDENTIAL_ENCRYPTION_KEY` on the target. Users without passwords must use the configured email recovery flow. Source users without email or with unsupported hashes cause an import rollback. Existing login sessions, OAuth identities, email verification state, authentication providers, and non-application tables are not migrated. Users must sign in again. The importer and data migration have not been verified against a live source or Neon project in this workspace.

## Security and behavior

The application uses bcrypt password hashes and random, hashed, server-side session tokens in HttpOnly cookies. Account-scoped SQL queries enforce ownership in trusted server code; Neon does not expose database credentials to the browser. Provider keys are encrypted with AES-256-GCM and returned only to server-side provider calls. Configure TLS, trusted proxy headers, SMTP, backups, monitoring and database privileges before production. This implementation has not received a security audit. Cross-account isolation should be verified with separate test accounts in your deployment.

Messages are saved per account. The last opened conversation pointer is local to the browser; the actual history is stored in PostgreSQL. A message is saved before calling the AI provider, and a failed request can be retried. The latest 20 messages are included as context. The dashboard displays provider-reported token counts where available, not estimated costs. Voice input/output uses browser APIs. The character reacts to listening, thinking and speaking, but the bundled model lacks facial blendshapes and viseme timing for accurate lip sync.

The bundled Michelle model is a Mixamo example distributed in the [three.js examples](https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_skinning.html); verify its rights for production. The model and room are real-time 3D, not photorealistic scans. The old local SQLite database is not automatically migrated.
