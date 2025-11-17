-- Create function to increment share count
create or replace function increment_share_count(analysis_id uuid)
returns void
language plpgsql
as $$
begin
  update public.analysis_results
  set share_count = share_count + 1
  where id = analysis_id;
end;
$$;
