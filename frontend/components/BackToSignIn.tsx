import Link from "next/link";


export default function BackToSignIn() {
  return (
    <Link href="/" className="mt-5 text-[13.5px] font-bold text-brand hover:underline">
      &larr; Back to Sign In
    </Link>
  );
}