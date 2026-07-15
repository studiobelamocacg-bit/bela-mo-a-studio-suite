import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: () => (
    <PlaceholderPage
      icon={Wallet}
      title="Financeiro"
      description="Fluxo de caixa completo: entradas, saídas, categorias, contas fixas e variáveis, formas de pagamento, relatórios por período e gráficos de faturamento."
      phase="Fase 4"
    />
  ),
});
