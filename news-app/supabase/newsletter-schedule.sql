-- Run after the newsletter migration and Edge Function are deployed. The Vault
-- credential is generated in the database and never copied into client code.
-- This project URL matches the newsroom's public/supabase-config.json.
do $$ begin
 if not exists(select 1 from vault.secrets where name='icue_newsletter_dispatch_key') then
  perform vault.create_secret(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''), 'icue_newsletter_dispatch_key');
 end if;
end $$;

select cron.schedule('icue-newsletter-delivery','* * * * *', $job$
 select net.http_post(
  url:='https://idkfmgdfzcsydrqnjcla.supabase.co/functions/v1/newsletter?action=dispatch',
  headers:=jsonb_build_object('Content-Type','application/json','x-newsletter-key',
   (select decrypted_secret from vault.decrypted_secrets where name='icue_newsletter_dispatch_key')),
  body:='{}'::jsonb,
  timeout_milliseconds:=60000
 );
$job$);
