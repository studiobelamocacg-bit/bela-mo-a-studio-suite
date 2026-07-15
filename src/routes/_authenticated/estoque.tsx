import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/estoque")({
  component: () => (
    <PlaceholderPage
      icon={Package}
      title="Estoque"
      description="Controle de produtos com alerta de quantidade mínima, entradas, saídas, histórico, fornecedores e localização."
      phase="Fase 5"
    />
  ),
});
