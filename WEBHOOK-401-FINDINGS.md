# Square webhook 401 findings (2026-09-13)

## Symptom

Square's webhook console (app `sq0idp-JtH1izTUBj7P3nnKhiEGww`, subscription
`sophisticated-sips-payments`) showed `payment.updated` retrying against
`https://www.sophisticatedsips.net/api/square/webhook` and getting HTTP 401 on
every attempt after a real $1 production test charge. Vercel runtime logs for
deployment `dpl_HMgzVKJ9v9HWrnqXbfWcasGtis61` confirm dozens of
`POST /api/square/webhook 401` entries. The card was charged; the `payments`
row never flipped to paid.

## Root cause

Square signs `notificationUrl + rawBody` with the subscription's signature key.
The route rebuilt the notification URL as
`${NEXT_PUBLIC_SITE_URL}/api/square/webhook`.

The production value of `NEXT_PUBLIC_SITE_URL` in Vercel ends with a trailing
slash. Evidence: the live `robots.txt` prints
`Sitemap: https://www.sophisticatedsips.net//sitemap.xml` (double slash), and
`src/app/robots.ts` builds that string the same way.

So the route verified against `https://www.sophisticatedsips.net//api/square/webhook`
while Square signed `https://www.sophisticatedsips.net/api/square/webhook`.
One extra character, different HMAC, 401 every time.

Everything else was already correct: the route reads the raw body with
`req.text()`, uses the `x-square-hmacsha256-signature` header, and the
signature key env var name matches. The signature key itself was not the
problem and does not need to be rotated.

## Code fix (this branch)

`src/lib/square/client.ts` gained `webhookNotificationUrls(headers)`, which
strips trailing slashes from `NEXT_PUBLIC_SITE_URL` and also includes the URL
Square actually posted to (scheme + forwarded host + path). The route verifies
the signature against each candidate. Trying more than one URL is safe because
each is still verified with the secret key.

Unit tests cover the trailing-slash case and the forwarded-host case.

## Manual step for William

In Vercel, project `sophisticated-sips`, Production environment variables:
set `NEXT_PUBLIC_SITE_URL` to `https://www.sophisticatedsips.net` with no
trailing slash, then redeploy. The code fix alone makes the webhook work, but
the trailing slash also produces the broken `//sitemap.xml` link in `robots.txt`
and is used by the unsubscribe link, the Square redirect URL, and the owner
transfer link, so it should be corrected at the source.

After merging and redeploying, use "Resend" on one of the failed deliveries in
the Square webhook console (or re-run a test event) and confirm a 200.
