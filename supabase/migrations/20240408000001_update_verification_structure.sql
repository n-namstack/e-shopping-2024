-- Create seller_verifications table
create table if not exists seller_verifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  national_id_url text,
  selfie_url text,
  business_type text,
  has_physical_store boolean default false,
  physical_address text,
  additional_info text,
  status text default 'pending',
  submitted_at timestamp with time zone default now(),
  verified_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add verification status to shops table
alter table shops
add column verification_status text default 'unverified',
add column verification_id uuid references seller_verifications(id);

-- Create function to update shop verification status
create or replace function update_shop_verification_status()
returns trigger as $$
begin
  if new.status = 'verified' then
    update shops
    set verification_status = 'verified'
    where user_id = new.user_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for verification status updates
create trigger on_verification_status_change
  after update of status on seller_verifications
  for each row
  execute function update_shop_verification_status(); 