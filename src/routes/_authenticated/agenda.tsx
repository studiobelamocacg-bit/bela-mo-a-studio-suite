import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: () => (
    <PlaceholderPage
      icon={CalendarDays}
      title="Agenda"
      description="Agenda estilo Google Calendar com visualização por dia, semana, mês e lista. Uma coluna por profissional, drag & drop para reagendar, bloqueios e horários recorrentes, sincronizada em tempo real com o site público."
      phase="Fase 3"
    />
  ),
});
