-- Add improvements column to store AI-generated improvement suggestions
alter table public.analysis_results 
add column if not exists improvements text;

-- Add comment to explain the column
comment on column public.analysis_results.improvements is 'AI-generated improvement suggestions based on hygiene analysis';
