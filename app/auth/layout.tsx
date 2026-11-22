import Link from "next/link";

// Sign-in, sign-up and password pages: a centered card on the gray canvas,
// with the wordmark above it linking home.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-svh">
      <Link
        href="/"
        className="absolute left-1/2 top-8 -translate-x-1/2 rounded-md text-[19px] font-semibold tracking-[-0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        NutritionalNibbles
      </Link>
      {children}
    </div>
  );
}
