# SkyVase — Web Store

E-commerce front-end for the SkyVase anodised titanium vase project.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Stripe** (Checkout Sessions + Webhooks)
- **Vercel** for deployment

## Getting started

```bash
cp .env.local.example .env.local   # fill in your Stripe keys
npm install
npm run dev                        # http://localhost:3000
```

## Stripe setup

1. Create a Stripe account and grab your test-mode keys.
2. Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local`.
3. For local webhook testing, install the Stripe CLI and run:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook
   ```
   Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Deploying to Vercel

When connecting this repo to Vercel, leave **Root Directory** as `.` (default). Vercel will auto-detect the Next.js framework.

Add the same environment variables from `.env.local.example` in the Vercel dashboard (use your live-mode Stripe keys for production).

## Project structure

```
src/
    app/
      page.tsx                  # Homepage — hero, how-it-works, palette
      product/page.tsx          # Product config — date/location picker, live preview
      success/page.tsx          # Post-checkout confirmation
      api/
        checkout/route.ts       # Creates Stripe Checkout Session
        webhook/route.ts        # Handles Stripe webhook events
      layout.tsx                # Root layout with header/footer
      globals.css               # Tailwind + custom properties
    components/
      gradient-preview.tsx      # CSS gradient matching anodisation zones
    lib/
      stripe.ts                 # Server-side Stripe client
      constants.ts              # Product info, voltage-colour map, price
```
