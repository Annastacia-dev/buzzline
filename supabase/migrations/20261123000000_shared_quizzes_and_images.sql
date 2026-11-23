-- Share links and image questions.

-- A shared copy of a quiz, opened with /host?quiz=<id>. Written and read only by the Next.js server
-- (secret key); RLS is on with no policies, so the public key gets nothing.
create table public.buzz_shared_quizzes (
  id          text primary key check (id ~ '^[A-Za-z0-9]{10}$'),
  quiz        jsonb not null,
  created_at  timestamptz not null default now()
);
alter table public.buzz_shared_quizzes enable row level security;

-- Question pictures. Public bucket: anyone with a file's URL can view it (host screens and share links need that),
-- but only the server can upload. Small files and image types only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('buzz-images', 'buzz-images', true, 1572864, array['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
on conflict (id) do nothing;
