import { createFileRoute } from "@tanstack/react-router";
import { Scissors } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/servicos")({
  component: () => (
    <PlaceholderPage
      icon={Scissors}
      title="Serviços"
      description="Catálogo de serviços: nome, categoria, duração, preço, descrição, cor na agenda, ativo/inativo e quais profissionais realizam cada serviço."
      phase="Fase 2"
    />
  ),
});
