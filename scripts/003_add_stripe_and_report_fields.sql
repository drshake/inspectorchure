-- Add stripe_customer_id to vendors table
alter table public.vendors 
add column if not exists stripe_customer_id text unique;

-- Add email field to vendors table
alter table public.vendors 
add column if not exists email text;

-- Add subscription_status field to vendors table
alter table public.vendors 
add column if not exists subscription_status text default 'active';

-- Add report_url to analysis_results table
alter table public.analysis_results 
add column if not exists report_url text;

-- Create index for stripe_customer_id lookups
create index if not exists idx_vendors_stripe_customer_id 
on public.vendors(stripe_customer_id);

-- Create index for report_url
create index if not exists idx_analysis_results_report_url 
on public.analysis_results(report_url);

-- Create index for email lookups
create index if not exists idx_vendors_email 
on public.vendors(email);
