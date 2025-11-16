-- Add categories column to store categorized analysis data
alter table public.analysis_results 
add column if not exists categories jsonb;

-- Add frame_count to track number of frames analyzed
alter table public.analysis_results 
add column if not exists frame_count integer;

-- Add vision_raw to store raw vision API response (nullable for backward compatibility)
alter table public.analysis_results 
add column if not exists vision_raw jsonb;

-- Create index for categories queries
create index if not exists idx_analysis_results_categories 
on public.analysis_results using gin(categories);

-- Create index for frame_count
create index if not exists idx_analysis_results_frame_count 
on public.analysis_results(frame_count);

-- Add comment to explain the columns
comment on column public.analysis_results.categories is 'Categorized analysis data from vision AI';
comment on column public.analysis_results.frame_count is 'Number of video frames analyzed';
comment on column public.analysis_results.vision_raw is 'Raw response from vision API for debugging';
