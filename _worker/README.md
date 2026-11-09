# Form sender: Resend + Cloudflare Worker

The site's two forms (contact, and "submit your film") send to a small Cloudflare
Worker at **https://forms.ilesolae.org**. The Worker holds your Resend API key and
emails everything to **admin@ilesolae.org**. When you hit "Reply" on one of those
emails, your reply goes straight to the person who wrote in.

Until the Worker is set up, the forms fall back to "Send with Gmail / Outlook / copy".
Nothing breaks in the meantime.

> This folder starts with `_`, so GitHub Pages doesn't publish it. It holds no secrets.

---

## 1. Verify ilesolae.org in Resend (one time)

1. Go to **resend.com**, then **Domains**, then **Add domain**, and enter `ilesolae.org`.
2. Resend shows a few DNS records: an MX record and TXT records on `send`, and a DKIM TXT record on `resend._domainkey`.
   - The easiest option is the **"Sign in to Cloudflare"** / auto-configure button, if Resend offers it.
   - Otherwise, add them by hand in Cloudflare under **DNS**, then **Records**. Set each one to **DNS only (grey cloud)**.
3. **Don't change your existing MX records** for `ilesolae.org` itself. Those deliver your email.
   Resend's records go on the `send` subdomain, so they don't clash.
4. Click **Verify** in Resend. The status should turn green after a few minutes.

## 2. Create an API key in Resend

**API Keys**, then **Create API key**. Choose **Sending access**, and set the domain to `ilesolae.org`. Copy the key.
It starts with `re_` and is shown only once. Don't put it in the website files.

## 3. Create the Worker in Cloudflare

1. In the Cloudflare dashboard, go to **Workers & Pages**, then **Create**, then **Create Worker**.
2. Name it `ilesolae-forms` and click **Deploy**.
3. Click **Edit code**. Delete what's there, paste everything from `_worker/worker.js`, and click **Deploy**.

## 4. Give the Worker the key

In the Worker, go to **Settings**, then **Variables and Secrets**, then **Add**:
- Type: **Secret**
- Name: `RESEND_API_KEY`
- Value: paste the key from step 2

Then click **Deploy**.

## 5. Put it at forms.ilesolae.org

In the Worker, go to **Settings**, then **Domains & Routes**, then **Add**, then **Custom domain**, and enter `forms.ilesolae.org`.
Cloudflare creates the DNS record for you.

## 6. Done: test it

Push the site, open ilesolae.org, and send a test message from the contact form.
It should say "Received — thank you", and the email should arrive at admin@ilesolae.org.

If it says "choose another way" instead, open the Worker in Cloudflare and look at **Logs**.
Look for a "Resend error" line, which explains what went wrong. The usual causes are a domain that isn't verified yet or a wrong key.

---

### Changing things later
- **Different address to receive mail:** edit `TO` at the top of `worker.js`, then re-deploy.
- **Different Worker URL:** edit `FORM_ENDPOINT` at the top of `assets/site.js`.
- **Testing the site on your own computer:** the Worker only accepts requests from ilesolae.org.
  To test locally, add `"http://localhost:5519"` (or whatever address you use) to `ALLOWED_ORIGINS` in `worker.js`.
