# Newsroom password reset

The newsroom uses the shared Supabase project `idkfmgdfzcsydrqnjcla`. Its reset
screen is the recovery mode of `news-app/src/pages/Login.jsx`, served at
`https://icue.vn/newsroom/login`. A recovery callback opens the new-password and
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

At the time of the redirect fix, these website changes had not been deployed:
the live reset-request endpoint still returned `503 config_missing`. Deploy the
website changes before verifying actual email delivery through the live form.
Request a fresh email afterward; an older email may already contain the HR
destination.
