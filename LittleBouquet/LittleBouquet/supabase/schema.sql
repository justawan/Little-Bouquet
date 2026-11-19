begin;

create table if not exists public.bouquet_submissions (
  id uuid primary key,
  submitted_at timestamptz not null default now(),
  flower text not null check (flower in ('Roses','Tulips','Peonies','Lilies')),
  color text not null check (color in ('Pink','Red','White','Purple','Blue','Yellow','Orange','Light Blue','Green','Burgundy')),
  size text not null check (size in ('Small & Cute','Medium & Lovely','Big & Fluffy','Surprise Me!')),
  decoration text not null check (decoration in ('A Little Teddy Bear','A Ribbon','A Love Note','A Tiny Heart')),
  message text not null check (char_length(message) <= 1000),
  bouquet_config jsonb not null check (jsonb_typeof(bouquet_config) = 'object')
);
create index if not exists bouquet_submissions_recent on public.bouquet_submissions(submitted_at desc);
alter table public.bouquet_submissions enable row level security;
revoke all on public.bouquet_submissions from public, anon, authenticated, service_role;

create or replace function public.save_bouquet(
  p_id uuid,p_flower text,p_color text,p_size text,p_decoration text,p_message text,p_config jsonb
) returns text language plpgsql security definer set search_path = '' as $$
declare
  previous public.bouquet_submissions%rowtype;
  short_count integer;
  daily_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(505120189);
  select * into previous from public.bouquet_submissions where id=p_id;
  if found then
    if (previous.flower,previous.color,previous.size,previous.decoration,previous.message,previous.bouquet_config)
      is not distinct from (p_flower,p_color,p_size,p_decoration,p_message,p_config) then
      return 'saved';
    end if;
    return 'conflict';
  end if;

  select count(*) filter (where submitted_at >= now()-interval '10 minutes'), count(*)
    into short_count,daily_count
  from public.bouquet_submissions where submitted_at >= now()-interval '24 hours';
  if short_count >= 12 or daily_count >= 120 then return 'limited'; end if;

  insert into public.bouquet_submissions(id,flower,color,size,decoration,message,bouquet_config)
  values(p_id,p_flower,p_color,p_size,p_decoration,p_message,p_config);
  return 'saved';
end;
$$;
revoke all on function public.save_bouquet(uuid,text,text,text,text,text,jsonb) from public, anon, authenticated, service_role;
grant execute on function public.save_bouquet(uuid,text,text,text,text,text,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
