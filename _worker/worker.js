/**
 * Ilè Solae — form sender (Cloudflare Worker)
 *
 * The website's two forms (contact + open call submission) POST here.
 * This Worker holds the Resend API key (as a secret, never in the website)
 * and sends the email to admin@ilesolae.org.
 *
 * Needs one secret in Cloudflare:  RESEND_API_KEY
 * Setup steps: see _worker/README.md
 *
 * (This folder starts with "_" so GitHub Pages doesn't publish it.)
 */

const TO = "admin@ilesolae.org";
const FROM = "Ilè Solae website <website@ilesolae.org>";

// Only these sites may use the form sender.
const ALLOWED_ORIGINS = [
  "https://ilesolae.org",
  "https://www.ilesolae.org",
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return reply({ ok: false, error: "Method not allowed" }, 405, cors);
    if (!allowed) return reply({ ok: false, error: "Forbidden" }, 403, cors);
    if (!env.RESEND_API_KEY) return reply({ ok: false, error: "Not configured" }, 500, cors);

    let d;
    try {
      d = await request.json();
    } catch {
      return reply({ ok: false, error: "Bad request" }, 400, cors);
    }

    // Hidden "website" field: real people leave it empty, spam bots fill it in.
    // Pretend it worked so bots don't retry.
    if (d.website) return reply({ ok: true }, 200, cors);

    const clean = (v, max = 5000) => String(v ?? "").trim().slice(0, max);
    const name = clean(d.name, 120);
    const email = clean(d.email, 254);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply({ ok: false, error: "Please add your name and a valid email." }, 400, cors);
    }

    let subject, rows;
    if (d.kind === "submission") {
      const title = clean(d.title, 200);
      const runtime = clean(d.runtime, 60);
      const link = clean(d.link, 500);
      const about = clean(d.about);
      if (!title || !link) return reply({ ok: false, error: "Missing film title or link." }, 400, cors);
      subject = `Open Call Submission — ${title}`;
      rows = [
        ["Name", name],
        ["Email", email],
        ["Film title", title],
        ["Running time", runtime],
        ["Link", link],
        ["About them & the film", about],
      ];
    } else {
      const topic = clean(d.topic, 100) || "Message";
      const message = clean(d.message);
      if (!message) return reply({ ok: false, error: "Missing message." }, 400, cors);
      subject = `${topic} — ${name}`;
      rows = [
        ["Name", name],
        ["Email", email],
        ["About", topic],
        ["Message", message],
      ];
    }

    const text = rows.map(([k, v]) => `${k}:\n${v}`).join("\n\n") + "\n\n— sent from ilesolae.org";
    const html =
      `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.55;color:#1c1128;max-width:560px">` +
      `<p style="font-size:22px;margin:0 0 18px">(Ilè Solae*)</p>` +
      rows
        .map(([k, v]) =>
          `<p style="margin:0 0 16px"><span style="font-family:'Courier New',monospace;font-size:13px;color:#6b5a7a">${esc(k)}</span><br>${esc(v).replace(/\n/g, "<br>")}</p>`)
        .join("") +
      `<p style="font-family:'Courier New',monospace;font-size:12px;color:#8a7a96;margin-top:28px">sent from ilesolae.org — reply to answer ${esc(name)} directly</p>` +
      `</div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,          // hitting "Reply" answers the person who wrote in
        subject: subject.replace(/[\r\n]+/g, " ").slice(0, 200),
        text,
        html,
      }),
    });

    if (!res.ok) {
      console.log("Resend error", res.status, await res.text());
      return reply({ ok: false, error: "Couldn’t send right now." }, 502, cors);
    }
    return reply({ ok: true }, 200, cors);
  },
};

function reply(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
