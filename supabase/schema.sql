-- ============================================================
-- Troco — Schema Supabase
-- Execute este script no SQL Editor do Supabase (Projeto > SQL Editor)
-- ============================================================

-- ─── Extensões ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── 1. PROFILES (estende auth.users) ────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  role        text not null default 'member' check (role in ('admin', 'member')),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Trigger: cria perfil automaticamente ao registrar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── 2. CREDIT_CARDS ─────────────────────────────────────────
create table public.credit_cards (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  name            text not null,                  -- Ex: "Nubank Família"
  last_four       char(4),
  network         text default 'Visa',            -- Visa / Mastercard / Elo…
  credit_limit    numeric(12,2) not null default 0,
  current_balance numeric(12,2) not null default 0,  -- atualizado via trigger
  closing_day     smallint,                       -- dia do fechamento da fatura
  due_day         smallint,                       -- dia do vencimento
  created_at      timestamptz not null default now()
);

-- ─── 3. CARD_PERMISSIONS ─────────────────────────────────────
-- Define quais membros podem lançar compras em cada cartão
create table public.card_permissions (
  id         uuid primary key default uuid_generate_v4(),
  card_id    uuid not null references public.credit_cards(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  granted_at timestamptz not null default now(),
  unique (card_id, user_id)
);

-- ─── 4. TRANSACTIONS ─────────────────────────────────────────
create table public.transactions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  card_id     uuid references public.credit_cards(id) on delete set null,
  type        text not null check (type in ('expense', 'income')),
  amount      numeric(12,2) not null check (amount > 0),
  date        date not null,
  merchant    text not null,                  -- onde
  category    text not null,                  -- o quê
  reason      text not null,                  -- por quê
  receipt_url text,                           -- link do comprovante no Storage
  status      text not null default 'pending' check (status in ('pending', 'settled')),
  -- Recorrências
  is_recurring     boolean not null default false,
  recurrence_start date,
  recurrence_end   date,
  recurrence_id    uuid,                      -- agrupa lançamentos da mesma recorrência
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Índices para queries frequentes
create index transactions_user_date on public.transactions (user_id, date desc);
create index transactions_card_date on public.transactions (card_id, date desc);
create index transactions_status    on public.transactions (status);

-- Trigger: atualiza current_balance do cartão ao inserir/atualizar/deletar transação
create or replace function public.update_card_balance()
returns trigger language plpgsql security definer as $$
declare
  v_card_id uuid;
begin
  v_card_id := coalesce(new.card_id, old.card_id);
  if v_card_id is null then return new; end if;

  update public.credit_cards
  set current_balance = (
    select coalesce(sum(amount), 0)
    from   public.transactions
    where  card_id = v_card_id
      and  type = 'expense'
      and  date_trunc('month', date) = date_trunc('month', current_date)
  )
  where id = v_card_id;

  return new;
end;
$$;

create trigger trg_update_card_balance
  after insert or update or delete on public.transactions
  for each row execute procedure public.update_card_balance();

-- ─── 5. SAVINGS_ACCOUNTS (Caixinhas) ─────────────────────────
create table public.savings_accounts (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  emoji      text default '🐷',
  balance    numeric(12,2) not null default 0,
  goal       numeric(12,2),              -- meta opcional
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── 6. WISHLIST_ITEMS (Lista de Desejos) ────────────────────
create table public.wishlist_items (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  price      numeric(12,2) not null check (price > 0),
  emoji      text default '🛒',
  url        text,
  purchased  boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── 7. REMINDERS (Agenda) ────────────────────────────────────
create table public.reminders (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  due_date   date not null,
  note       text,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);

create index reminders_user_date on public.reminders (user_id, due_date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.credit_cards    enable row level security;
alter table public.card_permissions enable row level security;
alter table public.transactions    enable row level security;
alter table public.savings_accounts enable row level security;
alter table public.wishlist_items  enable row level security;
alter table public.reminders       enable row level security;

-- Helper: retorna o role do usuário autenticado
create or replace function public.current_user_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ─── PROFILES ───────────────────────────────────────────────
-- Usuário lê/atualiza apenas seu próprio perfil; admin lê todos
create policy "profiles: own read"   on public.profiles for select using (id = auth.uid() or public.current_user_role() = 'admin');
create policy "profiles: own update" on public.profiles for update using (id = auth.uid());

-- ─── CREDIT_CARDS ────────────────────────────────────────────
-- Admin (owner) tem controle total; membros leem os que têm permissão
create policy "cards: owner all" on public.credit_cards for all
  using (owner_id = auth.uid());

create policy "cards: member read" on public.credit_cards for select
  using (
    exists (
      select 1 from public.card_permissions
      where card_id = credit_cards.id and user_id = auth.uid()
    )
  );

-- ─── CARD_PERMISSIONS ────────────────────────────────────────
-- Apenas o dono do cartão gerencia permissões
create policy "card_permissions: owner all" on public.card_permissions for all
  using (
    exists (
      select 1 from public.credit_cards
      where id = card_permissions.card_id and owner_id = auth.uid()
    )
  );

create policy "card_permissions: member read own" on public.card_permissions for select
  using (user_id = auth.uid());

-- ─── TRANSACTIONS ─────────────────────────────────────────────
-- Membro vê apenas suas próprias transações
create policy "transactions: own read/write" on public.transactions for all
  using (user_id = auth.uid());

-- Admin vê todas as transações dos cartões que possui
create policy "transactions: admin read all" on public.transactions for select
  using (
    public.current_user_role() = 'admin' and (
      card_id is null or
      exists (
        select 1 from public.credit_cards
        where id = transactions.card_id and owner_id = auth.uid()
      )
    )
  );

-- ─── SAVINGS_ACCOUNTS ────────────────────────────────────────
create policy "savings: own all" on public.savings_accounts for all using (user_id = auth.uid());

-- ─── WISHLIST_ITEMS ──────────────────────────────────────────
create policy "wishlist: own all" on public.wishlist_items for all using (user_id = auth.uid());

-- ─── REMINDERS ───────────────────────────────────────────────
create policy "reminders: own all" on public.reminders for all using (user_id = auth.uid());

-- ============================================================
-- STORAGE — bucket para comprovantes
-- ============================================================
-- Execute no dashboard: Storage > New Bucket > nome: "receipts", Private: true
-- Ou via SQL:
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict do nothing;

-- Política: usuário sobe e lê apenas seus próprios comprovantes
create policy "receipts: own upload" on storage.objects for insert
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "receipts: own read" on storage.objects for select
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- Admin lê todos
create policy "receipts: admin read" on storage.objects for select
  using (bucket_id = 'receipts' and public.current_user_role() = 'admin');
