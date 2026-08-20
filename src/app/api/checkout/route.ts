import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { PRODUCT } from "@/lib/constants";
import { SHIPPING_COUNTRIES } from "@/lib/shipping";

// Reads live order counts from Stripe — must run at request time.
export const dynamic = "force-dynamic";

// Every payment is tagged with this so we can count edition sales via the
// Stripe Search API (limited edition of PRODUCT.editionSize).
const EDITION_ID = "sky-vase-ed50";

type CheckoutCreateParams = NonNullable<
  Parameters<typeof stripe.checkout.sessions.create>[0]
>;
type AllowedCountry = NonNullable<
  CheckoutCreateParams["shipping_address_collection"]
>["allowed_countries"][number];

/**
 * Number of completed (paid) edition orders. Uses the Stripe Search API, which
 * is eventually consistent (~up to 1 min lag). `limit: 100` is plenty since we
 * stop selling at PRODUCT.editionSize. Fails open (returns 0) so a transient
 * Stripe error never blocks all sales — overselling is handled by refunding.
 */
async function soldCount(): Promise<number> {
  try {
    const res = await stripe.paymentIntents.search({
      query: `status:'succeeded' AND metadata['edition']:'${EDITION_ID}'`,
      limit: 100,
    });
    return res.data.length;
  } catch (err) {
    console.error("Edition sold-count lookup failed:", err);
    return 0;
  }
}

// Sold-out status for the UI.
export async function GET() {
  const sold = await soldCount();
  const remaining = Math.max(0, PRODUCT.editionSize - sold);
  return NextResponse.json({
    soldOut: remaining <= 0,
    remaining,
    editionSize: PRODUCT.editionSize,
  });
}

export async function POST(req: NextRequest) {
  const { date, location, placeName } = await req.json();

  if (typeof date !== "string" || typeof location !== "string") {
    return NextResponse.json(
      { error: "Missing date or location" },
      { status: 400 }
    );
  }

  if ((await soldCount()) >= PRODUCT.editionSize) {
    return NextResponse.json({ error: "sold_out" }, { status: 409 });
  }

  const description = placeName
    ? `${placeName} \u2014 ${date}`
    : `Custom gradient for ${date} at ${location}`;

  const metadata: Record<string, string> = { date, location, edition: EDITION_ID };
  if (typeof placeName === "string" && placeName.length > 0) {
    metadata.placeName = placeName;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    // Present/charge in the buyer's local currency, converted from the GBP
    // base. Requires Adaptive Pricing to be enabled on the Stripe account.
    adaptive_pricing: { enabled: true },
    line_items: [
      {
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: PRODUCT.priceAmount,
          product_data: {
            name: PRODUCT.name,
            description,
            images: [`${process.env.NEXT_PUBLIC_BASE_URL}/vase.png`],
          },
        },
        quantity: 1,
      },
    ],
    metadata,
    payment_intent_data: {
      metadata,
      description,
    },
    shipping_address_collection: {
      allowed_countries: SHIPPING_COUNTRIES as unknown as AllowedCountry[],
    },
    billing_address_collection: "required",
    phone_number_collection: { enabled: true },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
  });

  return NextResponse.json({ url: session.url });
}
