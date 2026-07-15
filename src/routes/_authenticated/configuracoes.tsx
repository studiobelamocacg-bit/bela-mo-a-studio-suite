import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: () => (
    <PlaceholderPage
      icon={Settings}
      title="Configurações"
      description="Horário de funcionamento, dias trabalhados, tempo mínimo entre atendimentos, logo do studio, cores do sistema e integrações futuras."
      phase="Fase 1"
    />
  ),
});
