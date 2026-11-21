import Link from "next/link";

// Placeholder so the landing page CTA has somewhere to go.
// The recipe form and results UI get built here.
export default function OptimizePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-4">
      <h1 className="font-display text-5xl tracking-tight">
        Optimize a recipe
      </h1>
      <p className="text-muted-foreground">
        The recipe form is coming soon.
      </p>
      <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
        Back to home
      </Link>
    </main>
  );
}
