import { createFileRoute, Link } from "@tanstack/react-router";
import { Instagram, MessageCircle, Sparkles, Calendar, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero.jpg";

const WHATSAPP_URL = "https://wa.me/5500000000000?text=Ol%C3%A1%2C%20gostaria%20de%20tirar%20uma%20d%C3%BAvida.";
const INSTAGRAM_URL = "https://instagram.com/studiobelamoca";

const servicos = [
  {
    nome: "Extensão de Cílios",
    descricao: "Volume brasileiro, russo, egípcio e mega volume com fios premium.",
    icon: Sparkles,
  },
  {
    nome: "Manutenção",
    descricao: "Retoques periódicos para manter seus cílios sempre impecáveis.",
    icon: Heart,
  },
  {
    nome: "Design de Sobrancelhas",
    descricao: "Modelagem personalizada com henna, brow lamination e mais.",
    icon: Sparkles,
  },
];

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-tiffany text-tiffany-foreground">
              <span className="font-serif text-lg font-semibold">B</span>
            </div>
            <span className="font-serif text-lg font-semibold tracking-tight sm:text-xl">
              Studio Bela Moça
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/auth"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Entrar
            </Link>
            <Button asChild size="sm" className="rounded-full">
              <Link to="/agendar">Agendar</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ background: "var(--gradient-tiffany)" }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-gold">
              <Sparkles className="h-3 w-3" />
              Beleza & Sofisticação
            </span>
            <h1 className="mt-6 font-serif text-4xl font-medium leading-tight text-foreground sm:text-5xl md:text-6xl">
              Realce seu olhar,{" "}
              <span className="italic text-tiffany-foreground/80">encante o mundo.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-base text-muted-foreground sm:text-lg lg:mx-0">
              No Studio Bela Moça cuidamos de cada detalhe para que você se sinta única.
              Extensão de cílios, design de sobrancelhas e experiências premium feitas
              sob medida para você.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
              <Button asChild size="lg" className="rounded-full bg-tiffany text-tiffany-foreground hover:bg-tiffany/90 font-medium">
                <Link to="/agendar">
                  <Calendar className="mr-2 h-4 w-4" />
                  Agendar horário
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Falar no WhatsApp
                </a>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-tiffany to-gold/30 opacity-30 blur-2xl" aria-hidden />
            <div
              className="relative overflow-hidden rounded-3xl border border-border/60"
              style={{ boxShadow: "var(--shadow-elegant)" }}
            >
              <img
                src={heroImage}
                alt="Extensão de cílios delicada e sofisticada — Studio Bela Moça"
                width={1600}
                height={1200}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="agendar" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-gold">
            Nossos serviços
          </span>
          <h2 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">
            Experiências que valorizam sua beleza
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Técnicas atualizadas, produtos premium e um espaço pensado para o seu conforto.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {servicos.map((s) => (
            <div
              key={s.nome}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-tiffany text-tiffany-foreground">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-medium">{s.nome}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.descricao}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button asChild size="lg" className="rounded-full bg-tiffany text-tiffany-foreground hover:bg-tiffany/90 font-medium">
            <Link to="/agendar">Agendar seu Horário Agora</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
          <p className="font-serif text-base text-foreground">Studio Bela Moça</p>
          <p>© {new Date().getFullYear()} — Feito com carinho para você.</p>
        </div>
      </footer>

      {/* Botões fixos */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram do Studio Bela Moça"
          className="grid h-12 w-12 place-items-center rounded-full bg-card text-foreground shadow-lg ring-1 ring-border transition-transform hover:scale-105"
        >
          <Instagram className="h-5 w-5" />
        </a>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 rounded-full bg-gold px-4 py-3 text-sm font-medium text-gold-foreground shadow-xl transition-transform hover:scale-105"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Tire suas dúvidas</span>
          <span className="sm:hidden">WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
