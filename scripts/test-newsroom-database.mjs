import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const schema = path.join(root, 'news-app/supabase')
const container = `icue-newsroom-test-${randomUUID().slice(0, 8)}`
function docker(args, input) {
  const result = spawnSync('docker', args, { input, encoding: 'utf8', timeout: 30_000, maxBuffer: 10 * 1024 * 1024 })
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || result.stdout || `Docker failed: ${args[0]}`)
  return result.stdout
}
const sql = (database, input) => docker(['exec', '-i', container, 'psql', '-X', '-q', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1'], input)
const file = name => readFileSync(path.join(schema, name), 'utf8')
const bootstrap = readFileSync(path.join(root, 'scripts/fixtures/newsroom-postgres.sql'), 'utf8')
const tests = readdirSync(path.join(schema, 'tests')).filter(name => name.endsWith('.sql')).sort()
let started = false
try {
  docker(['run', '--rm', '-d', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17', '-c', 'wal_level=logical'])
  started = true
  for (let attempt = 0; ; attempt++) {
    try { docker(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']); break }
    catch (error) { if (attempt >= 50) throw error; await new Promise(resolve => setTimeout(resolve, 100)) }
  }
  for (const mode of ['fresh', 'upgrade']) {
    const database = `newsroom_${mode}`
    docker(['exec', container, 'createdb', '-U', 'postgres', database])
    sql(database, bootstrap)
    if (mode === 'fresh') sql(database, file('schema.sql'))
    else {
      sql(database, file('schema-base.sql'))
      const migrations = readdirSync(path.join(schema, 'migrations')).filter(name => name.endsWith('.sql')).sort()
      for (const name of migrations) {
        if (name.includes('secure_article_saves_and_drafts')) {
          sql(database, `insert into auth.users(id,email) values ('00000000-0000-4000-8000-000000000099','legacy-private@example.invalid');
            update public.profiles set full_name='legacy-private@example.invalid',display_name='legacy-private' where id='00000000-0000-4000-8000-000000000099';`)
        }
        sql(database, file(`migrations/${name}`))
      }
      sql(database, `do $$ begin assert (select full_name is null and display_name='Author' from public.profiles where id='00000000-0000-4000-8000-000000000099'), 'legacy email fallback was not repaired'; end $$;`)
    }
    // SQL Editor users can reapply this migration after running schema.sql or
    // after an earlier release. Preserve existing messages and dependent callers.
    sql(database, `
      insert into auth.users(id,email) values ('00000000-0000-4000-8000-000000008901','alert-rerun@example.invalid');
      update public.profiles set role='admin' where id='00000000-0000-4000-8000-000000008901';
      insert into icue_support.conversations(id,token_hash,locale)
        values ('00000000-0000-4000-8000-000000008902',sha256(convert_to('alert-rerun','UTF8')),'en');
      insert into icue_support.messages(conversation_id,client_id,sender,content)
        values ('00000000-0000-4000-8000-000000008902','00000000-0000-4000-8000-000000008903','visitor','Keep this message on migration rerun');
      create view icue_support.alert_migration_dependency as select public.support_chat_alerts() as data;
    `)
    sql(database, file('migrations/20261027180300_support_chat_alerts.sql'))
    sql(database, `
      begin;
      select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000008901',true);
      do $$ begin
        assert exists(select 1 from icue_support.messages where client_id='00000000-0000-4000-8000-000000008903'
          and content='Keep this message on migration rerun'), 'Rerunning the migration preserves messages';
        assert (select (data->>'unread')::integer from icue_support.alert_migration_dependency)=1,
          'Existing dependent callers still work after rerunning the migration';
        assert not has_function_privilege('anon','public.support_chat_alerts(bigint)','execute'), 'Rerunning must not expose staff alerts';
        assert has_function_privilege('authenticated','public.support_chat_alerts(bigint)','execute'), 'Staff RPC grants survive';
      end $$;
      drop view icue_support.alert_migration_dependency;
      delete from icue_support.conversations where id='00000000-0000-4000-8000-000000008902';
      delete from auth.users where id='00000000-0000-4000-8000-000000008901';
      commit;
    `)
    console.log(`${mode}: support alert migration reapplication passed`)
    for (const name of tests) { sql(database, file(`tests/${name}`)); console.log(`${mode}: ${name} passed`) }
  }
} finally {
  if (started) docker(['stop', container])
}
