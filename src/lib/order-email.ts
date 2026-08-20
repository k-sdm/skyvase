import type Stripe from "stripe";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = process.env.ORDER_EMAIL_FROM || "Sky Vase <orders@skyva.se>";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

function wrap(inner: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#18181b;max-width:480px;margin:0 auto;line-height:1.6;font-weight:300;font-size:15px">${inner}</div>`;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`RESEND_API_KEY not set — skipping email: ${subject}`);
    return;
  }
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text().catch(() => "")}`);
  }
}

/**
 * Sends a branded confirmation to the customer and an order alert to the seller
 * (SELLER_EMAIL). Never throws — each send is isolated so one failure can't
 * fail the webhook (which would make Stripe retry and re-send the other email).
 */
export async function sendOrderEmails(session: Stripe.Checkout.Session): Promise<void> {
  const meta = session.metadata ?? {};
  const date = meta.date ?? "";
  const place = meta.placeName || meta.location || "";
  const customerEmail = session.customer_details?.email ?? null;
  const customerName = session.customer_details?.name ?? "";
  const piId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  const stripeLink = piId
    ? `https://dashboard.stripe.com/payments/${piId}`
    : "https://dashboard.stripe.com/payments";

  const tasks: Promise<void>[] = [];

  if (customerEmail) {
    tasks.push(
      send(
        customerEmail,
        "Your Sky Vase order is confirmed",
        wrap(`
          <p>Thank you${customerName ? `, ${escapeHtml(customerName)}` : ""}.</p>
          <p>Your titanium vase will be anodised with the sky of
             <strong>${escapeHtml(date)}</strong>${place ? ` in <strong>${escapeHtml(place)}</strong>` : ""}.</p>
          <p>Each piece is made to order, one of a limited edition of 40. Please allow
             up to 6 weeks before it ships — we'll be in touch when it's on its way.</p>
          <p style="color:rgba(24,24,27,0.55)">Sky Vase</p>
        `),
      ).catch((err) => console.error("Customer confirmation email failed:", err)),
    );
  }

  const sellerEmail = process.env.SELLER_EMAIL;
  if (sellerEmail) {
    tasks.push(
      send(
        sellerEmail,
        `New order — ${date}${place ? ` · ${place}` : ""}`,
        wrap(`
          <p><strong>New Sky Vase order</strong></p>
          <ul>
            <li>Date: ${escapeHtml(date)}</li>
            <li>Place: ${escapeHtml(place)}</li>
            <li>Coords: ${escapeHtml(meta.location ?? "")}</li>
            <li>Customer: ${escapeHtml(customerName)} &lt;${escapeHtml(customerEmail ?? "")}&gt;</li>
          </ul>
          <p><a href="${stripeLink}">Open in Stripe</a> for the shipping address and amount.</p>
        `),
      ).catch((err) => console.error("Seller alert email failed:", err)),
    );
  }

  await Promise.allSettled(tasks);
}
