import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { PRODUCT } from "@/lib/constants";
import { SHIPPING_COUNTRIES } from "@/lib/shipping";

type CheckoutCreateParams = NonNullable<
  Parameters<typeof stripe.checkout.sessions.create>[0]
>;
type AllowedCountry = NonNullable<
  CheckoutCreateParams["shipping_address_collection"]
>["allowed_countries"][number];

export async function POST(req: NextRequest) {
  const { date, location, placeName } = await req.json();

  if (typeof date !== "string" || typeof location !== "string") {
    return NextResponse.json(
      { error: "Missing date or location" },
      { status: 400 }
    );
  }

  const description = placeName
    ? `${placeName} \u2014 ${date}`
    : `Custom gradient for ${date} at ${location}`;

  const metadata: Record<string, string> = { date, location };
  if (typeof placeName === "string" && placeName.length > 0) {
    metadata.placeName = placeName;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: PRODUCT.priceAmount,
          product_data: {
            name: PRODUCT.name,
            description,
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
