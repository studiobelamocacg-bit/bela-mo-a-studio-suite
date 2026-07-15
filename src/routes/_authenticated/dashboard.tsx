import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: () => (
    <PlaceholderPage
      icon={LayoutDashboard}
      title="Dashboard"
      description="Aqui viverão os indicadores em tempo real do estúdio: clientes ativas, aniversariantes, faturamento, aplicações e manutenções do dia, mês e ano, com gráficos de evolução."
      phase="Fase 4"
    />
  ),
});
