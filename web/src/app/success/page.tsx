import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center sm:py-32">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <svg
          className="h-8 w-8 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </div>

      <h1 className="mt-6 text-3xl font-bold tracking-tight">
        Order confirmed
      </h1>
      <p className="mt-4 text-muted">
        Thank you for your order. We&apos;ll send a confirmation email with your
        unique gradient profile and estimated delivery date.
      </p>

      <Link
        href="/"
        className="mt-10 rounded-full border border-border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-foreground hover:text-background"
      >
        Back to home
      </Link>
    </div>
  );
}
