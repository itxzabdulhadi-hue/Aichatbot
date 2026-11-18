create extension if not exists pgcrypto;
create table public.profiles (user_id uuid primary key references auth.users on delete cascade, email text, display_name text, created_at timestamptz not null default now());
create table public.conversations (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, title text not null default 'New conversation', provider text, model text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id));
create table public.messages (id uuid primary key default gen_random_uuid(), conversation_id uuid not null, user_id uuid not null references auth.users on delete cascade, role text not null check(role in ('user','assistant','system','tool')), content text not null, created_at timestamptz not null default now(), attachment_metadata jsonb, execution_metadata jsonb, foreign key(conversation_id,user_id) references public.conversations(id,user_id) on delete cascade);
create index messages_conversation_time on public.messages(conversation_id,created_at);
create table public.provider_configs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, provider text not null, active boolean not null default true, default_model text, temperature real not null default 0.7 check(temperature between 0 and 2), max_tokens integer not null default 1024 check(max_tokens between 1 and 32768), connection_status text not null default 'untested', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,provider));
-- Secrets are inaccessible to the anon and authenticated roles, even to their owner.
create table public.provider_secrets (user_id uuid not null references auth.users on delete cascade, provider text not null, ciphertext text not null, primary key(user_id,provider), foreign key(user_id,provider) references public.provider_configs(user_id,provider) on delete cascade);
create table public.preferences (user_id uuid primary key references auth.users on delete cascade, preferred_provider text, preferred_model text, preferred_voice text, speech_rate real not null default 1, voice_enabled boolean not null default false, personality text, interface_preferences jsonb not null default '{}');
create table public.memories (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, content text not null, created_at timestamptz not null default now());
create table public.usage_events (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, conversation_id uuid, provider text not null, model text not null, status text not null, input_tokens integer, output_tokens integer, created_at timestamptz not null default now());
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.provider_configs enable row level security;
alter table public.provider_secrets enable row level security;
alter table public.preferences enable row level security;
alter table public.memories enable row level security;
alter table public.usage_events enable row level security;
create policy own_profiles on public.profiles for all to authenticated using (user_id = auth.uid()) with check(user_id = auth.uid());
create policy own_conversations on public.conversations for all to authenticated using (user_id = auth.uid()) with check(user_id = auth.uid());
create policy own_messages on public.messages for all to authenticated using (user_id = auth.uid()) with check(user_id = auth.uid());
create policy own_configs on public.provider_configs for all to authenticated using (user_id = auth.uid()) with check(user_id = auth.uid());
create policy own_preferences on public.preferences for all to authenticated using (user_id = auth.uid()) with check(user_id = auth.uid());
create policy own_memories on public.memories for all to authenticated using (user_id = auth.uid()) with check(user_id = auth.uid());
create policy own_usage on public.usage_events for select to authenticated using (user_id = auth.uid());
revoke all on public.provider_secrets from public, anon, authenticated;
-- Only the trusted backend writes usage records and stores encrypted secrets.

-- Profiles are created by a trusted trigger when Supabase Auth creates an account.
create function public.create_profile_for_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(user_id,email,display_name) values (new.id,new.email,coalesce(new.raw_user_meta_data->>'display_name','')) on conflict (user_id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_user();
