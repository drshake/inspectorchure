-- Create vendors table
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  created_at timestamp with time zone default now()
);

-- Create analysis_results table
create table if not exists public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  hygiene_score integer not null check (hygiene_score >= 0 and hygiene_score <= 100),
  video_duration integer, -- in seconds
  analyzed_at timestamp with time zone default now(),
  key_findings jsonb, -- array of findings
  improvement_suggestions jsonb, -- array of suggestions
  critical_violations jsonb, -- array of violations
  positive_observations jsonb, -- array of observations
  share_count integer default 0,
  created_at timestamp with time zone default now()
);

-- Create indexes for better query performance
create index if not exists idx_vendors_name on public.vendors(name);
create index if not exists idx_analysis_results_vendor_id on public.analysis_results(vendor_id);
create index if not exists idx_analysis_results_analyzed_at on public.analysis_results(analyzed_at desc);
create index if not exists idx_analysis_results_hygiene_score on public.analysis_results(hygiene_score desc);

-- Enable Row Level Security
alter table public.vendors enable row level security;
alter table public.analysis_results enable row level security;

-- Create policies for public read access (since this is a public inspection app)
-- Anyone can view vendors and analysis results
create policy "Allow public read access to vendors"
  on public.vendors for select
  using (true);

create policy "Allow public read access to analysis_results"
  on public.analysis_results for select
  using (true);

-- Only allow inserts from the application (no auth required for now)
create policy "Allow public insert to vendors"
  on public.vendors for insert
  with check (true);

create policy "Allow public insert to analysis_results"
  on public.analysis_results for insert
  with check (true);

-- Allow updates to share_count
create policy "Allow public update to analysis_results"
  on public.analysis_results for update
  using (true);
