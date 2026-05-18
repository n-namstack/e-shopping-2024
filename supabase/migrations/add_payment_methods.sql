create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('credit_card', 'debit_card', 'bank_account')),
  card_number text not null,
  card_holder text not null,
  expiry_date text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table payment_methods enable row level security;

create policy "Users can manage their own payment methods"
  on payment_methods
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
