-- Add authentication and badge tracking to vendors table

-- Add user authentication fields
alter table public.vendors
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists email text,
  add column if not exists is_anonymous boolean default true,
  add column if not exists claimed_at timestamp with time zone;

-- Add badge tracking fields
alter table public.vendors
  add column if not exists badge_status text check (badge_status in ('none', 'active', 'expired')) default 'none',
  add column if not exists badge_earned_at timestamp with time zone,
  add column if not exists badge_expires_at timestamp with time zone,
  add column if not exists highest_score integer default 0,
  add column if not exists total_analyses integer default 0,
  add column if not exists last_analysis_at timestamp with time zone;

-- Create index on user_id for faster lookups
create index if not exists idx_vendors_user_id on public.vendors(user_id);
create index if not exists idx_vendors_email on public.vendors(email);
create index if not exists idx_vendors_badge_status on public.vendors(badge_status);

-- Update RLS policies to allow authenticated users to manage their own vendors
drop policy if exists "Allow public insert to vendors" on public.vendors;
drop policy if exists "Allow public update to analysis_results" on public.vendors;

-- Allow anyone to read vendor info (for public badge display)
-- Policy already exists: "Allow public read access to vendors"

-- Allow authenticated users to insert their own vendor
create policy "Allow authenticated users to insert vendors"
  on public.vendors for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Allow unauthenticated users to insert anonymous vendors
create policy "Allow anonymous vendor creation"
  on public.vendors for insert
  to anon
  with check (is_anonymous = true and user_id is null);

-- Allow users to update their own vendor
create policy "Allow users to update own vendor"
  on public.vendors for update
  to authenticated
  using (auth.uid() = user_id);

-- Allow anonymous vendors to update themselves (for claiming)
create policy "Allow anonymous vendor updates"
  on public.vendors for update
  to anon
  using (is_anonymous = true and user_id is null);

-- Update analysis_results policies for authenticated users
drop policy if exists "Allow public insert to analysis_results" on public.analysis_results;
drop policy if exists "Allow public update to analysis_results" on public.analysis_results;

create policy "Allow authenticated insert to analysis_results"
  on public.analysis_results for insert
  to authenticated
  with check (
    vendor_id in (select id from public.vendors where user_id = auth.uid())
    or vendor_id is null
  );

create policy "Allow anonymous insert to analysis_results"
  on public.analysis_results for insert
  to anon
  with check (true);

create policy "Allow users to update own analysis_results"
  on public.analysis_results for update
  to authenticated
  using (
    vendor_id in (select id from public.vendors where user_id = auth.uid())
  );

create policy "Allow anonymous update to analysis_results"
  on public.analysis_results for update
  to anon
  using (true);

-- Create function to check and award badge
create or replace function check_and_award_badge(
  p_vendor_id uuid,
  p_score integer
)
returns void
language plpgsql
security definer
as $$
declare
  v_badge_duration_days integer := 90; -- Badge expires after 90 days
  v_badge_threshold integer := 80; -- 80% score to earn badge
begin
  -- Update vendor stats
  update public.vendors
  set
    highest_score = greatest(highest_score, p_score),
    total_analyses = total_analyses + 1,
    last_analysis_at = now()
  where id = p_vendor_id;

  -- Award badge if score meets threshold
  if p_score >= v_badge_threshold then
    update public.vendors
    set
      badge_status = 'active',
      badge_earned_at = now(),
      badge_expires_at = now() + (v_badge_duration_days || ' days')::interval
    where id = p_vendor_id;
  end if;
end;
$$;

-- Create function to update expired badges
create or replace function update_expired_badges()
returns void
language plpgsql
security definer
as $$
begin
  update public.vendors
  set badge_status = 'expired'
  where badge_status = 'active'
    and badge_expires_at < now();
end;
$$;

-- Create function to claim anonymous vendor
create or replace function claim_vendor(
  p_vendor_id uuid,
  p_user_id uuid,
  p_email text
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_is_anonymous boolean;
  v_existing_user_id uuid;
begin
  -- Check if vendor exists and is anonymous
  select is_anonymous, user_id into v_is_anonymous, v_existing_user_id
  from public.vendors
  where id = p_vendor_id;

  if not found then
    raise exception 'Vendor not found';
  end if;

  if not v_is_anonymous or v_existing_user_id is not null then
    raise exception 'Vendor already claimed';
  end if;

  -- Claim the vendor
  update public.vendors
  set
    user_id = p_user_id,
    email = p_email,
    is_anonymous = false,
    claimed_at = now()
  where id = p_vendor_id;

  return true;
end;
$$;
