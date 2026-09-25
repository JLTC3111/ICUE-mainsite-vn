begin;
do $$
begin
  assert (select relrowsecurity from pg_class where oid = 'public.chat_history_vaults'::regclass), 'RLS must be enabled';
  assert not has_table_privilege('anon', 'public.chat_history_vaults', 'SELECT,INSERT,UPDATE,DELETE'), 'anonymous access must be denied';
  assert not has_table_privilege('authenticated', 'public.chat_history_vaults', 'SELECT,INSERT,UPDATE,DELETE'), 'staff sessions must not expose visitor history';
  assert has_table_privilege('service_role', 'public.chat_history_vaults', 'SELECT,INSERT,UPDATE,DELETE'), 'the server requires explicit grants';
end $$;
set local role anon;
do $$ begin
  begin
    perform * from public.chat_history_vaults;
    raise exception 'Anonymous read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin
    perform * from public.chat_history_vaults;
    raise exception 'Authenticated read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role service_role;
insert into public.chat_history_vaults (id, revision, payload)
values (repeat('a',64), 1, jsonb_build_object('version',1,'iv',repeat('A',16),'data',repeat('B',32)));
do $$
declare affected integer;
begin
  update public.chat_history_vaults set revision = 2 where id = repeat('a',64) and revision = 1;
  get diagnostics affected = row_count;
  assert affected = 1, 'current revision must update';
  update public.chat_history_vaults set revision = 3 where id = repeat('a',64) and revision = 1;
  get diagnostics affected = row_count;
  assert affected = 0, 'stale revision must not overwrite';
  begin
    insert into public.chat_history_vaults (id,revision,payload) values (repeat('b',64),1,'{}');
    raise exception 'Malformed payload unexpectedly accepted';
  exception when check_violation then null;
  end;
end $$;
delete from public.chat_history_vaults where id = repeat('a',64);
rollback;
