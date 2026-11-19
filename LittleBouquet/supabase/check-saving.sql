-- Read-only check. Run in the SQL Editor of the project linked to your website.
with objects as (
  select to_regclass('public.bouquet_submissions') as submissions,
         to_regprocedure('public.save_bouquet(uuid,text,text,text,text,text,jsonb)') as save_function
)
select
  submissions is not null as table_exists,
  save_function is not null as function_exists,
  coalesce((select relrowsecurity from pg_class where oid = submissions), false) as rls_enabled,
  coalesce(has_function_privilege('service_role', save_function, 'EXECUTE'), false) as server_can_save,
  not coalesce(has_function_privilege('anon', save_function, 'EXECUTE'), false) as anonymous_rpc_blocked,
  not coalesce(has_table_privilege('anon', submissions, 'SELECT'), false) as anonymous_read_blocked
from objects;
