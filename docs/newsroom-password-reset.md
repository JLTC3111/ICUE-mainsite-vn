# Newsroom password reset

The newsroom uses the shared Supabase project `idkfmgdfzcsydrqnjcla`. Its reset
screen is the recovery mode of `news-app/src/pages/Login.jsx`, served at
`https://vi.icue.vn/newsroom/login`. A recovery callback opens the new-password and
confirmation fields. Password updates use the session established by Supabase.

## Production redirect configuration

On 2026-09-28, the shared project's Site URL was `https://hr.icue.vn`, and its
redirect allow list contained only HR and Contract URLs. Supabase therefore
fell back to HR for the unlisted newsroom callback.

Added these exact URLs to Authentication → URL Configuration → Redirect URLs
for the production site and the user's confirmed local newsroom preview:

```text
https://icue.vn/newsroom/login
http://localhost:5173/newsroom/login
```

The HR Site URL and the existing allowed URLs remain in place because other
applications use this project. The recovery email template uses
`{{ .ConfirmationURL }}`, which carries the allowed `redirect_to` from the
newsroom's reset request. A dashboard-generated reset without an explicit
newsroom callback still uses the shared default Site URL.

The saved configuration was read back successfully. Verification requests with
a deliberately invalid test token returned HTTP 303 to each corresponding
callback with `otp_expired`, confirming both redirect destinations without
issuing or consuming a real recovery token. The live form was also checked in
the browser in Vietnamese. The local preview passed browser checks for language
switching and completing recovery with a delayed modal and mocked auth responses.

## Domain move to vi.icue.vn

On 2026-10-28 the website was assigned `https://vi.icue.vn`, and `icue.vn` was
given to a separate landing page. On 2026-10-29 this wildcard was added to the
Redirect URLs. It covers every newsroom callback, including `/newsroom/login`
and `/newsroom/portal`, with or without a query string:

```text
https://vi.icue.vn/**
```

`https://icue.vn/newsroom/login` was removed the same day, after the reset
emails sent to it had expired. The Site URL stays `https://hr.icue.vn`, because
HR and Contract Manager rely on it.

The invalid-token check returned HTTP 303 to each `vi.icue.vn` address tested,
and the HR, Contract and local preview callbacks were unchanged.
`https://icue.vn/newsroom/login` now falls back to HR, so a reset or sign-up
started on `icue.vn` only returns to the newsroom once the build in which
`news-app/src/lib/authRedirect.js` maps `icue.vn` to `vi.icue.vn` is live.

## Related website fixes

The source changes in this workspace address two other failures:

- The Netlify reset function reads the bundled public Supabase config when
  Functions-scoped environment variables are absent.
- The client retains recovery intent before Supabase consumes the callback,
  so a delayed login component still shows the password-reset form.

Visible login and reset messages store translation keys and update when the
user changes languages. Regression coverage lives in
`tests/security/passwordReset.test.mjs`, `tests/security/authRecovery.test.mjs`,
and `tests/react/login.test.mjs`.

## Live verification on 2026-10-29

The deployed staff portal at
`https://vi.icue.vn/newsroom/portal?mode=staff` sends
`https://vi.icue.vn/newsroom/login` as its callback. A browser check intercepted
the reset requests and verified both the normal proxy request and the SDK
fallback after a mocked HTTP 404. Both showed the success notice without
leaving the staff portal. No reset email was sent by this check.

The live Auth logs also record a recovery request at 04:32:19 UTC and a
successful verification at 04:34:48 UTC with the Newsroom callback. An older
reset email, sent at 17:12:57 UTC on October 28, explicitly contains
`redirect_to=https://hr.icue.vn`; its matching Auth log records the HR callback.
That older message is evidence of an HR destination, but does not establish
that the current staff portal generated it. Changing the redirect allow list
does not rewrite a link already delivered in an email.

Request a fresh email from the staff portal after a callback configuration
change. Supabase intentionally returns success for a nonexistent Auth address
without sending it a reset email; keep that generic behavior. An address may
exist in this shared Auth project even if it has never signed in or has no
Newsroom profile. See the
[Supabase password reset documentation](https://supabase.com/docs/guides/auth/passwords).
