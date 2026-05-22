import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { PRODUCT } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { date, location } = await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: PRODUCT.priceAmount,
          product_data: {
            name: PRODUCT.name,
            description: `Custom gradient for ${date} at ${location}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { date, location },
    shipping_address_collection: { allowed_countries: ["GB"] },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/product`,
  });

  return NextResponse.json({ url: session.url });
}
