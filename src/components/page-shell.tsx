import Link from "next/link";
import type { ReactNode } from "react";

export function PageShell({
  children,
  eyebrow,
  title,
  action,
  titleAction,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  titleAction?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-5 sm:py-6">
        <header className="flex items-center justify-between gap-4 border-b border-line pb-4">
          <Link href="/restaurants" className="text-lg font-semibold">
            MenuDex
          </Link>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>

        <section className="py-6 sm:py-8">
          {eyebrow ? (
            <p className="text-sm font-medium text-leaf">{eyebrow}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-normal break-words sm:text-4xl">
              {title}
            </h1>
            {titleAction ? <div className="shrink-0">{titleAction}</div> : null}
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

export function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center bg-ink px-4 text-sm font-medium text-white"
    >
      {children}
    </Link>
  );
}

export function SecondaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center border border-line bg-white px-4 text-sm font-medium text-ink"
    >
      {children}
    </Link>
  );
}
