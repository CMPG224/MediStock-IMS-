import Link from "next/link";

/** The "<- Back to Sign In" link shared by the three secondary auth screens. */
export default function BackToSignIn() {
  return (
    <Link
      href="/"
      style={{
        marginTop: 20,
        fontSize: 13.5,
        fontWeight: 700,
        color: "var(--c-brand)",
        textDecoration: "none",
      }}
    >
      &larr; Back to Sign In
    </Link>
  );
}