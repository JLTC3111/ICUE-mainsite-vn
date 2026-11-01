# Newsroom newsletter

Visitors subscribe on the newsroom landing page or an article page. A
confirmation email verifies ownership before any article notifications are
sent. Confirmation links expire after 24 hours. Both confirmation and
unsubscribe links open `/newsroom/newsletter`, requiring a button press, so mail link
scanners do not change consent. Mail clients can also use one-click unsubscribe.

The private `icue_newsletter` schema holds addresses, consent, and delivery
jobs. Browser roles cannot read the subscriber list or call worker RPCs.
Subscriptions are limited to one confirmation email per address per five
minutes and five requests per IP per hour. Address cooldowns return the same
acknowledgement as an active subscription. Only a salted IP hash is stored;
request counters are removed after 24 hours on the next subscription request.

The article publication trigger queues mail for confirmed subscribers once per
article. Existing articles are not announced on installation. Drafts, article
edits, and republishing do not send another announcement. The worker skips
withdrawn/deleted articles and revoked subscriptions. Each recipient receives
an individual message with a private unsubscribe link.

Deploy in order:

1. Apply the `newsletter_subscriptions` migration under
   `news-app/supabase/migrations/` to the newsroom project.
2. Deploy `news-app/supabase/functions/newsletter/` as the `newsletter` Edge
   Function with gateway JWT checks disabled. Public signup uses double opt-in;
   confirmation/unsubscribe require private capabilities; worker requests must
   pass the server-side Vault credential check. GET capability links redirect to
   the website review page; POST responses are JSON. Supabase's hosted gateway
   serves function-generated HTML as plain text, so the website renders these pages.
3. Configure `NEWSLETTER_SMTP_HOST`, `PORT`, `USER`, `PASSWORD`, and `FROM` in
   Edge Function secrets, or reuse the existing `FEEDBACK_SMTP_*` sender. These
   are server credentials and must never have a `VITE_` prefix. TLS is required.
   Optional `NEWSLETTER_SITE_URL` defaults to `https://vi.icue.vn`.
4. Run `news-app/supabase/newsletter-schedule.sql` to generate a Vault credential
   and schedule delivery every minute. Update its project URL if moving projects.
5. Build and release the site using the existing deployment process.

Signup attempts immediate confirmation delivery; saved jobs survive mail
failures. Cron processes five recipients per minute, with five-minute leases
and exponential retry delays up to ten attempts. Stable Message-IDs and leases
reduce duplicate delivery. SMTP has no transactional acknowledgement with
Postgres, so a lost acknowledgement can still cause a retry after acceptance.
Failed jobs remain inspectable by administrators in the private schema.

Use `npm test`, `npm run build:newsroom`, and `npm run test:database` to verify.
The HTTP tests mock mail delivery and never email real subscribers. For a live
acceptance check, subscribe an address you control, confirm it, publish an
article through the editor, then unsubscribe and verify a later publication
does not send mail. Do not use actual subscribers for test publications.
