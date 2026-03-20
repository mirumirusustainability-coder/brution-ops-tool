-- Add naming to deliverable_type_enum for existing databases

do $$
begin
  if exists (
    select 1
    from pg_type
    where typname = 'deliverable_type_enum'
  ) then
    alter type public.deliverable_type_enum add value if not exists 'naming';
  end if;
end $$;
