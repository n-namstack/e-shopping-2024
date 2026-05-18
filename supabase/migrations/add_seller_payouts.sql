-- Seller bank accounts (where sellers receive their DPO payouts)
create table if not exists seller_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_name text not null,
  account_number text not null,
  account_holder text not null,
  branch_code text,
  account_type text not null default 'savings' check (account_type in ('savings', 'current', 'cheque')),
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);

alter table seller_bank_accounts enable row level security;

create policy "Sellers manage their own bank accounts"
  on seller_bank_accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Payouts created when a DPO card payment is confirmed
create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id),
  order_id uuid not null references orders(id),
  amount numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid')),
  transaction_id text,
  bank_account_id uuid references seller_bank_accounts(id),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table payouts enable row level security;

create policy "Sellers view their own payouts"
  on payouts for select
  using (auth.uid() = seller_id);
