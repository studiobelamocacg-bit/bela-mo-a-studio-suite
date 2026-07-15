import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: () => (
    <PlaceholderPage
      icon={Users}
      title="Clientes"
      description="Cadastro completo de clientes com ficha em abas: dados, anamnese com assinatura digital, autorização de uso de imagem em PDF, galeria de fotos, mapping técnico e histórico de atendimentos."
      phase="Fase 2"
    />
  ),
});
