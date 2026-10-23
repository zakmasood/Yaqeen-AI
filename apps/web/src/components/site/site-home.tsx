"use client";

import { useRef } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScreeningPreview } from "@/components/site/screening-preview";
import { useSiteMotion } from "@/components/site/use-site-motion";

const nav = [
  { href: "#desk", label: "Desk" },
  { href: "#how", label: "How it works" },
  { href: "#statuses", label: "Statuses" },
];

const providers = ["Easypaisa", "JazzCash", "Raast", "Bank transfer"];
// ponytail: 8 copies keeps one half wider than a typical desktop. A wider screen can show the join.
const marqueeNames = Array.from({ length: 8 }, () => providers).flat();

const features = [
  {
    index: "01",
    title: "A link in the chat you already use",
    body: "Each order gets its own link. Paste it into WhatsApp. The customer uploads the screenshot and never makes an account.",
  },
  {
    index: "02",
    title: "A reference can only be claimed once",
    body: "The first time a reference shows up at your shop, Yaqeen keeps it. If the same reference comes in again, the new proof is flagged.",
  },
  {
    index: "03",
    title: "Other shops are not named",
    body: "If another Yaqeen merchant already submitted that reference, you see that it happened. You don't see who, and they don't see you.",
  },
];

const steps = [
  {
    index: "01",
    title: "Send the link",
    body: "Make a link for one order. It expires, and it can be used once.",
  },
  {
    index: "02",
    title: "They upload the screenshot",
    body: "PNG, JPEG, or WEBP. Yaqeen stores it privately and reads the amount, provider, and reference when the image is clear enough.",
  },
  {
    index: "03",
    title: "You get a status",
    body: "Ready, needs review, or suspicious. Even a clear result is not proof the transfer landed.",
  },
  {
    index: "04",
    title: "You note what you found",
    body: "Say whether the payment is in your own records. That note does not change the screening status.",
  },
];

const statuses = [
  {
    name: "Ready",
    tone: "text-ready",
    body: "The checks we can run came back clear. Confirm the transfer in your own records before you treat the order as paid.",
  },
  {
    name: "Needs review",
    tone: "text-review",
    body: "A field is missing, something doesn't line up, or a check could not run.",
  },
  {
    name: "Suspicious",
    tone: "text-danger",
    body: "This reference was already used at your shop, or the proof doesn't match the order. Pause here. It is not a finding that money moved.",
  },
];

export function SiteHome({ signedIn }: { signedIn: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useSiteMotion(rootRef);
  const enterHref = signedIn ? "/overview" : "/login";
  const enterLabel = signedIn ? "Open desk" : "Sign in";

  return (
    <div ref={rootRef} className="site-glow min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <Logo href="/" />
          <nav className="hidden items-center gap-6 md:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-muted transition hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href={enterHref}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:opacity-90"
            >
              {enterLabel}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:pt-24">
          <div>
            <p data-hero className="motion-in text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              For Pakistani merchants
            </p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[0.95] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              <span data-hero className="motion-in block">
                Screen the proof.
              </span>
              <span data-hero className="motion-in block text-muted">
                You confirm the money.
              </span>
            </h1>
            <p data-hero className="motion-in mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Customers send payment screenshots over WhatsApp. Yaqeen marks each one ready, needs review, or suspicious. It does not tell you the money arrived.
            </p>
            <div data-hero className="motion-in mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={enterHref}
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition hover:opacity-90"
              >
                {enterLabel}
              </Link>
              <a
                href="#how"
                className="rounded-full px-5 py-3 text-sm font-semibold text-ink ring-1 ring-inset ring-line transition hover:bg-lift"
              >
                How it works
              </a>
            </div>
          </div>
          <div data-panel className="motion-in">
            <ScreeningPreview />
          </div>
        </section>

        <section
          className="overflow-hidden border-y border-line py-4 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
          aria-label="Providers"
        >
          <div className="site-marquee flex w-max">
            {[0, 1].map((copy) => (
              <ul key={copy} className="flex shrink-0 items-center gap-12 pr-12" aria-hidden={copy === 1}>
                {marqueeNames.map((name, index) => (
                  <li
                    key={`${copy}-${index}`}
                    className="whitespace-nowrap font-display text-sm font-medium uppercase tracking-[0.22em] text-muted"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </section>

        <section id="desk" className="mx-auto max-w-6xl px-5 py-20">
          <div data-rise className="motion-in max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">The desk</p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              The proofs are here. You still decide.
            </h2>
          </div>
          <div data-rise className="mt-12 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.index}
                data-stagger
                className="motion-in rounded-2xl border border-line bg-surface p-6"
              >
                <p className="font-display text-sm text-accent">{feature.index}</p>
                <h3 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="border-t border-line">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr]">
            <div data-rise className="motion-in">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">How it works</p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                What you do after the screenshot arrives.
              </h2>
            </div>
            <ol data-rise className="space-y-3">
              {steps.map((step) => (
                <li
                  key={step.index}
                  data-stagger
                  className="motion-in grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-line bg-surface p-5"
                >
                  <span className="font-display text-2xl font-semibold text-accent">{step.index}</span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="statuses" className="border-t border-line">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <div data-rise className="motion-in max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Statuses</p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Three results. None of them means paid.
              </h2>
            </div>
            <div data-rise className="mt-12 grid gap-4 md:grid-cols-3">
              {statuses.map((status) => (
                <article
                  key={status.name}
                  data-stagger
                  className="motion-in rounded-2xl border border-line bg-surface p-6"
                >
                  <h3 className={`font-display text-2xl font-semibold ${status.tone}`}>{status.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{status.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div data-rise className="motion-in mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-20 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Open the desk.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
                Sign-in is for the shop. Customers use the link you send. They don&apos;t create an account.
              </p>
            </div>
            <Link
              href={enterHref}
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition hover:opacity-90"
            >
              {enterLabel}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Logo href="/" />
          <p className="max-w-md text-xs leading-relaxed text-muted">
            Payment proof screening for Pakistani merchants. Receipt of funds is not independently
            confirmed.
          </p>
        </div>
      </footer>
    </div>
  );
}
