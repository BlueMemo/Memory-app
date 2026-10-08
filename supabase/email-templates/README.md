# Account emails

BlueMemo's branded versions of the emails Supabase Auth sends. Each template holds both languages:
Swedish when the account's user metadata says `lang: "sv"`, English otherwise. The site stores
`lang` on sign-up and updates it whenever a signed-in learner switches language (`AuthSync.tsx`), so
accounts made before this get theirs the next time they visit while signed in.

## Installing (Supabase dashboard)

Authentication → **Emails** (Email Templates). For each template below, paste the **Subject** line and
the whole HTML file as the **Body**, then **Save**:

| Supabase template | File | Subject |
| --- | --- | --- |
| Confirm sign up | `confirm-signup.html` | `{{ if .Data.lang }}{{ if eq .Data.lang "sv" }}Bekräfta din e-post för BlueMemo{{ else }}Confirm your email for BlueMemo{{ end }}{{ else }}Confirm your email for BlueMemo{{ end }}` |
| Reset password | `reset-password.html` | `{{ if .Data.lang }}{{ if eq .Data.lang "sv" }}Återställ ditt lösenord för BlueMemo{{ else }}Reset your BlueMemo password{{ end }}{{ else }}Reset your BlueMemo password{{ end }}` |
| Change email address | `change-email.html` | `{{ if .Data.lang }}{{ if eq .Data.lang "sv" }}Bekräfta din nya e-postadress för BlueMemo{{ else }}Confirm your new BlueMemo email address{{ end }}{{ else }}Confirm your new BlueMemo email address{{ end }}` |
| Magic link | `magic-link.html` | `{{ if .Data.lang }}{{ if eq .Data.lang "sv" }}Din inloggningslänk till BlueMemo{{ else }}Your BlueMemo sign-in link{{ end }}{{ else }}Your BlueMemo sign-in link{{ end }}` |

The site doesn't use magic links today; the template is there so nothing unbranded goes out if it ever does.
"Invite user" and "Reauthentication" aren't used and are left as they are.

After saving, test each one: sign up with a throwaway address, use "Forgot password", and change an
email, once with the site in Swedish and once in English.

## Notes

- Links go to **`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…`** (since 2026-10-08), not
  `{{ .ConfirmationURL }}`: the default link (PKCE) only works in the browser where the account was made,
  so opening the email on a phone failed. The token-hash link is verified on the server and works on any
  device. **Site URL** (Authentication → URL Configuration) must be `https://bluememo.eu`. Until these
  templates are pasted in, the old links still confirm the email; the site then says "confirmed, sign in".
- The logo is loaded from `https://bluememo.eu/apple-icon`, so it shows once the site is live there.
- `{{ if .Data.lang }}` comes before `eq` on purpose: comparing a missing value fails in Go templates.
- Light colours on purpose: many email apps break dark backgrounds.
- The sender is still Supabase's own address and its low hourly sending limit applies. A custom SMTP
  sender (for example `noreply@bluememo.eu` through a provider like Resend) fixes both; Supabase may also
  require custom SMTP before custom templates are used. Set it under Authentication → Emails → SMTP.
