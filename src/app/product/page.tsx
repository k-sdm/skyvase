"use client";

import { useState } from "react";
import { PRODUCT, formatPrice } from "@/lib/constants";
import { GradientPreview } from "@/components/gradient-preview";

function dayFractionFromDate(dateStr: string, lat: number): number {
  const d = new Date(dateStr + "T12:00:00Z");
  const dayOfYear =
    (d.getTime() - new Date(d.getUTCFullYear(), 0, 0).getTime()) / 86400000;
  const decl = 23.44 * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81));
  const latRad = (lat * Math.PI) / 180;
  const declRad = (decl * Math.PI) / 180;
  const cosHa = -Math.tan(latRad) * Math.tan(declRad);
  const clamped = Math.max(-1, Math.min(1, cosHa));
  const daylight = (2 * Math.acos(clamped)) / Math.PI;
  return Math.max(0, Math.min(1, daylight));
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ProductPage() {
  const [date, setDate] = useState(todayISO);
  const [location, setLocation] = useState("51.77, 0.10");
  const [loading, setLoading] = useState(false);

  const lat = parseFloat(location.split(",")[0]) || 51.77;
  const dayFraction = dayFractionFromDate(date, lat);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, location }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <div className="grid gap-16 lg:grid-cols-2">
        {/* Preview */}
        <div className="flex flex-col items-center gap-6">
          <GradientPreview
            className="h-96 w-32 rounded-2xl shadow-2xl transition-all duration-700"
            dayFraction={dayFraction}
          />
          <p className="text-center text-sm text-muted">
            {Math.round(dayFraction * 100)}% daylight &mdash; preview updates
            live
          </p>
        </div>

        {/* Configuration */}
        <div className="flex flex-col justify-center">
          <p className="text-sm font-medium uppercase tracking-widest text-muted">
            Configure
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {PRODUCT.name}
          </h1>
          <p className="mt-4 text-lg text-muted">
            {formatPrice(PRODUCT.priceAmount, PRODUCT.currency)}
          </p>

          <div className="mt-10 space-y-6">
            <div>
              <label htmlFor="date" className="block text-sm font-medium">
                Date to encode
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
              />
              <p className="mt-1.5 text-xs text-muted">
                The day length at your chosen date shapes the gradient
              </p>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium">
                Location (latitude, longitude)
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="51.77, 0.10"
                className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
              />
              <p className="mt-1.5 text-xs text-muted">
                Higher latitudes produce more dramatic seasonal variation
              </p>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="mt-10 w-full rounded-full bg-foreground px-8 py-3.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {loading ? "Redirecting to checkout\u2026" : "Purchase"}
          </button>

          <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-border pt-8 text-sm">
            <div>
              <dt className="text-muted">Dimensions</dt>
              <dd className="mt-0.5 font-medium">{PRODUCT.dimensions}</dd>
            </div>
            <div>
              <dt className="text-muted">Material</dt>
              <dd className="mt-0.5 font-medium">{PRODUCT.material}</dd>
            </div>
            <div>
              <dt className="text-muted">Process</dt>
              <dd className="mt-0.5 font-medium">{PRODUCT.process}</dd>
            </div>
            <div>
              <dt className="text-muted">Lead time</dt>
              <dd className="mt-0.5 font-medium">2 &ndash; 3 weeks</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
