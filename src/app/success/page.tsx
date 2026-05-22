import Link from "next/link";

export default function SuccessPage() {
  return (
    <div
      className="viewport-fill"
      style={{
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(1.25rem, 4vw, 1.75rem)",
        padding: "clamp(1.5rem, 5vw, 2rem)",
        fontFamily: "inherit",
        color: "#18181b",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "9999px",
          background: "#18181b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-hidden
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h1
        style={{
          fontSize: "clamp(1.4rem, 5vw, 1.8rem)",
          fontWeight: 300,
          letterSpacing: "0.01em",
          lineHeight: 1.25,
        }}
      >
        memory embedded
      </h1>

      <p
        style={{
          fontSize: "clamp(0.9rem, 3vw, 1rem)",
          color: "rgba(0,0,0,0.55)",
          lineHeight: 1.5,
          fontWeight: 300,
          maxWidth: "36ch",
        }}
      >
        thank you for your order. you&apos;ll receive a confirmation email
        shortly with your unique gradient profile and an estimated delivery
        date.
      </p>

      <Link
        href="/"
        style={{
          marginTop: "clamp(0.5rem, 2vw, 1rem)",
          background: "#000",
          color: "#fff",
          border: "none",
          borderRadius: "9999px",
          padding: "0.85rem 2rem",
          fontFamily: "inherit",
          fontSize: "clamp(0.9rem, 3vw, 1rem)",
          fontWeight: 300,
          letterSpacing: "0.01em",
          textDecoration: "none",
          width: "clamp(180px, 55vw, 220px)",
          textAlign: "center",
        }}
      >
        back to home
      </Link>
    </div>
  );
}
