-- Admin can view all seller verifications
create policy "Admin can view all seller verifications"
  on seller_verifications for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Admin can update verification status (approve / reject)
create policy "Admin can update seller verifications"
  on seller_verifications for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Admin can update profiles (to set is_verified = true on approval)
create policy "Admin can update profiles"
  on profiles for update
  using (
    exists (
      select 1 from profiles p2
      where p2.id = auth.uid()
        and p2.role = 'admin'
    )
  );
