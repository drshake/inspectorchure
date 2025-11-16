-- Add usage tracking and anonymous user support to vendors table

-- Add usage_count to track how many times vendor has used the service
alter table public.vendors 
add column if not exists usage_count integer default 0;

-- Add first_active_at to track when vendor first used the service
alter table public.vendors 
add column if not exists first_active_at timestamp with time zone default now();

-- Add is_anonymous to distinguish between authenticated and anonymous users
alter table public.vendors 
add column if not exists is_anonymous boolean default true;

-- Update subscription_status default from 'active' to 'trial'
-- First, update existing records to 'trial' if they are 'active'
update public.vendors 
set subscription_status = 'trial' 
where subscription_status = 'active';

-- Then alter the column default
alter table public.vendors 
alter column subscription_status set default 'trial';

-- Create index for usage tracking queries
create index if not exists idx_vendors_usage_count 
on public.vendors(usage_count desc);

-- Create index for first_active_at queries
create index if not exists idx_vendors_first_active_at 
on public.vendors(first_active_at desc);

-- Create index for anonymous user queries
create index if not exists idx_vendors_is_anonymous 
on public.vendors(is_anonymous);

-- Add comment to explain the schema
comment on column public.vendors.usage_count is 'Number of times vendor has used the analysis service';
comment on column public.vendors.first_active_at is 'Timestamp when vendor first used the service';
comment on column public.vendors.is_anonymous is 'Whether this is an anonymous user (true) or authenticated user (false)';
comment on column public.vendors.subscription_status is 'Subscription status: trial, active, cancelled, expired';
