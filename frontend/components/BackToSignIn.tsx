import Link from "next/link";

/** The "← Back to Sign In" link shared by the three secondary auth screens. */
export default function BackToSignIn() {
  return (
    <Link href="/login" className="mt-5 text-[13.5px] font-bold text-brand hover:underline">
      &larr; Back to Sign In
    </Link>
  );
}
