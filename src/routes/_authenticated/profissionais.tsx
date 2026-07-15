import { createFileRoute } from "@tanstack/react-router";
import { UserCog } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/profissionais")({
  component: () => (
    <PlaceholderPage
      icon={UserCog}
      title="Profissionais"
      description="Cadastro da equipe: dados, especialidades, foto, cor da agenda, horário e dias de trabalho, comissão, e quais serviços cada uma executa."
      phase="Fase 2"
    />
  ),
});
