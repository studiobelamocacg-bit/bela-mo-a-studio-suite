import type { LucideIcon } from "lucide-react";

export function PlaceholderPage({
  icon: Icon,
  title,
  description,
  phase,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div
        className="rounded-2xl border border-border bg-card p-8 text-center sm:p-12"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-tiffany text-tiffany-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <h1 className="mt-5 font-serif text-2xl font-medium sm:text-3xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
          {description}
        </p>
        <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-gold">
          Em breve · {phase}
        </span>
      </div>
    </div>
  );
}
