-- Allow 'admin' as a valid profile role
-- To grant yourself admin: UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
-- (run in Supabase SQL editor while logged in, or use the table editor)

-- Admin can view ALL payouts
create policy "Admin can view all payouts"
  on payouts for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Admin can update payout status (mark as paid)
create policy "Admin can update payouts"
  on payouts for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Admin can view all seller bank accounts (to know where to send money)
create policy "Admin can view all seller bank accounts"
  on seller_bank_accounts for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
