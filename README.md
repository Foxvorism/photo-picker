# Photo Picker

A Nuxt application for clients to select graduation photos from their assigned project. Clients sign in with an access code, pick their photos, and the selected filename list is sent to the photographer through WhatsApp using Fonnte.

## Tech Stack

- Nuxt 4
- Vue 3
- TypeScript
- Nuxt UI 4
- Tailwind CSS 4
- Supabase PostgreSQL
- Supabase Storage private bucket
- Fonnte WhatsApp API
- Google Drive API for photo imports
- Sharp for generating `.webp` previews

## Setup After Cloning

Install dependencies:

```bash
npm install
```

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Fill `.env` with your local environment values. Never commit `.env`.

```env
NUXT_ADMIN_SECRET_KEY=your-admin-secret-key

NUXT_SUPABASE_URL=https://your-project-ref.supabase.co
NUXT_SUPABASE_SECRET_KEY=your-server-secret-key
NUXT_SUPABASE_BUCKET=photo-previews
NUXT_SESSION_SECRET=replace-with-random-session-secret

NUXT_FONNTE_TOKEN=your-fonnte-api-token
NUXT_FONNTE_COUNTRY_CODE=62

GOOGLE_APPLICATION_CREDENTIALS=./secrets/google-service-account.json
```

Environment notes:

- `NUXT_SUPABASE_SECRET_KEY` must be the Supabase service role key, not the anon key.
- `NUXT_SESSION_SECRET` should be a long random string.
- `/admin/import` uses the owning vendor's `NUXT_SUTOORI_SECRET_KEY` or `NUXT_SINEMAYU_SECRET_KEY` password.
- `NUXT_FONNTE_TOKEN` is used by the server to send WhatsApp messages.
- `GOOGLE_APPLICATION_CREDENTIALS` is only required when running the local import CLI/worker.

## Setup Supabase

Create the following main tables in Supabase:

- `projects`
- `photos`
- `selections`
- `import_jobs`

Enable RLS for those tables. This app does not require public policies for `anon` or `authenticated`, because all database access is done through Nuxt server routes using the service role key.

Storage bucket:

- Create a private bucket, default: `photo-previews`.
- Set `NUXT_SUPABASE_BUCKET` to match the bucket name.

Required database functions:

- `verify_project_access(input_code text)`
- `verify_project_gallery_access(input_code text)`
- `verify_project_import_access(input_code text)`
- `finalize_project(input_project_id uuid)`

Those functions should only be executable by `service_role`.

## Setup Google Drive Import

To import photos from Google Drive:

1. Create a Google Cloud service account.
2. Enable the Google Drive API.
3. Download the JSON credential.
4. Save the credential file locally, for example:

```text
secrets/google-service-account.json
```

5. Add the path to `.env`:

```env
GOOGLE_APPLICATION_CREDENTIALS=./secrets/google-service-account.json
```

6. Share the project Google Drive folder with the service account email using viewer permission.

Original/RAW files stay in Google Drive. Supabase Storage only stores lightweight `.webp` previews.

## Development

```bash
npm run dev
```

Main page:

```text
http://localhost:3000
```

Admin import page:

```text
http://localhost:3000/admin/import
```

## Flow Client

1. The client opens `/`.
2. The client enters an access code.
3. The server verifies the access code through a Supabase RPC.
4. If valid, the server creates an HttpOnly session cookie.
5. The client is redirected to `/gallery`.
6. The client selects photos.
7. The client submits the selection.
8. The server saves the selections, finalizes the project, and sends a WhatsApp message through Fonnte.
9. The client session is cleared and the client returns to `/`.

If a project is already `submitted`, the access code can still open the gallery in read-only mode if `verify_project_gallery_access` is available. Read-only mode only displays the selected photos.

## Admin Create Project

Open `/admin/create-project`, select **Sutoori Production** or **Sinemayu**, then verify the vendor password. The project form opens after successful verification. Vendor passwords use private runtime config:

```env
NUXT_SUTOORI_SECRET_KEY=replace-with-sutoori-password
NUXT_SINEMAYU_SECRET_KEY=replace-with-sinemayu-password
```

`NUXT_SESSION_SECRET` must contain at least 32 characters. Vendor verification uses a separate HttpOnly cookie valid for 30 minutes. The create endpoint checks this session and binds the project to its verified vendor. The import page independently verifies the password for the vendor that owns the access code.

Before creating projects, review and run `supabase/create-vendor-project.sql` in Supabase SQL Editor, including when upgrading from the previous manual-code version. It replaces the old two-argument RPC with a service-role-only `create_vendor_project(input_project jsonb)` RPC. No tables or existing project data are changed. It requires `pgcrypto` in `extensions` and a `vendor` column accepting the exact vendor names above.

Access codes are generated inside PostgreSQL, following the existing project creation query: two independent `gen_random_bytes(4)` values become 8-character uppercase hexadecimal strings, joined as `PREFIX-SECRET`. The full code is hashed with `extensions.crypt` and bcrypt cost 10. The new code is returned after insertion for the admin to save; the hash is never returned.

Every new project starts as `draft`, with `selection_deadline = now() + interval '7 days'` using the database clock. The form only asks for the title, client/photographer names and phones, Drive folder, and selection limit. Browser-supplied codes, status, and deadlines are ignored. Creating a project does not import photos automatically; continue to `/admin/import` using the generated access code.

Checks:

```bash
node --import tsx --test tests/project-input.test.ts
npm run build
node --test tests/admin-project.test.mjs
```

The API test runs the production build with dummy secrets and a local mock Supabase endpoint; it does not write to a real database. Run the SQL against your database only after reviewing it, then verify one test project end to end with your deployed database functions.

## Photo Import

There are two ways to import photos.

### Direct CLI

Run this from the `photo-picker` repository root:

```bash
npm run import:drive -- --project="PROJECT-ID" --folder="DRIVE-FOLDER-LINK"
```

This directly reads the Drive folder, creates `.webp` previews, uploads them to Supabase Storage, and upserts `photos` rows.

### Admin Page + Worker

Run `supabase/create-vendor-import-job.sql` once before using the updated import page. It adds a service-role-only RPC that locks the project, rechecks its vendor/status, reuses an existing pending/processing job or creates one, and changes `draft` to `open` in one transaction. If the transaction fails, neither the new job nor the status change is committed. Existing open projects remain open. Vendor/password mismatches are rejected before this RPC; the generic admin password is no longer accepted.

Projects become open when the job is queued, so the gallery may initially be empty until the worker imports the photos. The selection deadline stays unchanged.

The admin page only creates a job so the heavy processing does not run inside a Vercel Function.

1. Start the website.
2. Open `/admin/import`.
3. Enter the project access code and the password of its owning vendor.
4. Submit the form to create an `import_jobs` row with `pending` status and change the project from `draft` to `open` atomically.
5. Run the worker from the admin laptop or a separate worker server:

```bash
npm run import:worker
```

To process one job and then stop:

```bash
npm run import:worker -- --once
```

To change the polling interval:

```bash
npm run import:worker -- --interval=30
```

The worker will update the job status:

```text
pending -> processing -> completed
```

If an error occurs:

```text
pending -> processing -> failed
```

Progress can be checked in these columns:

- `total_count`
- `success_count`
- `failed_count`
- `error`
- `started_at`
- `finished_at`

## Deploy to Vercel

Add these environment variables in the Vercel Project Settings for the `Production` environment:

```env
NUXT_ADMIN_SECRET_KEY
NUXT_SUPABASE_URL
NUXT_SUPABASE_SECRET_KEY
NUXT_SUPABASE_BUCKET
NUXT_SESSION_SECRET
NUXT_FONNTE_TOKEN
NUXT_FONNTE_COUNTRY_CODE
```

After changing environment variables, redeploy production.

Important notes:

- Do not process 500-photo imports directly inside a Vercel Function.
- Vercel only runs the website and lightweight endpoints.
- Heavy import processing should still run through `npm run import:worker` on the admin laptop or a separate worker server.
- Google credentials do not need to be uploaded to Vercel unless a dedicated worker actually runs there.

## Build and Preview

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Security

- Do not commit `.env`.
- Do not expose the Supabase service role key to the browser.
- Do not create public RLS policies for application tables.
- Do not send `project_id`, `access_code_hash`, Fonnte token, or unnecessary photographer data to the browser.
- All database access must go through server APIs or the local CLI.
- Client sessions use HttpOnly cookies.
- Photo signed URLs are created server-side and should expire quickly.
