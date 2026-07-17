import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CalendarDays, Plus, Loader2, Clock, CheckCircle2, XCircle, AlertTriangle, HelpCircle, ChevronLeft, ChevronRight, User, List, Calendar, Sliders
} from "lucide-react";
import { addDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Appointment, Professional, Service, Client } from "@/types/database.types";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaPage,
});

const STATUS_OPTIONS = [
  { value: "agendado", label: "Agendado", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { value: "confirmado", label: "Confirmado", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  { value: "concluido", label: "Concluído", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  { value: "cancelado", label: "Cancelado", color: "bg-rose-500/10 text-rose-600 border-rose-200" },
  { value: "falta", label: "Falta", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
];

function AgendaPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<"day" | "week" | "month" | "list">("day");
  
  // Dialog State
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  
  // Form State for new appointment
  const [clientId, setClientId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [price, setPrice] = useState(0.00);

  // Form State for completion (Phase 4 integration)
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [commissionPaid, setCommissionPaid] = useState(0.00);
  const [showCompletionForm, setShowCompletionForm] = useState(false);

  // Realtime subscription to appointments
  useEffect(() => {
    const channel = supabase
      .channel("agenda-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch active professionals
  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data as Professional[];
    },
  });

  // Fetch active services
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data as Service[];
    },
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Client[];
    },
  });

  // Fetch appointments
  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          client:clients(*),
          professional:professionals(*),
          service:services(*)
        `);
      if (error) throw error;
      return data;
    },
  });

  // Helper: auto-update price when service changes
  useEffect(() => {
    if (serviceId) {
      const selected = services.find((s) => s.id === serviceId);
      if (selected) setPrice(Number(selected.price));
    }
  }, [serviceId, services]);

  // Save Mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      const startDateTime = new Date(selectedDate);
      const [sh, sm] = startTime.split(":");
      startDateTime.setHours(parseInt(sh), parseInt(sm), 0, 0);

      const endDateTime = new Date(selectedDate);
      const [eh, em] = endTime.split(":");
      endDateTime.setHours(parseInt(eh), parseInt(em), 0, 0);

      const service = services.find(s => s.id === serviceId);
      const duration = service ? service.duration : 60;

      const { error } = await supabase.from("appointments").insert({
        client_id: clientId,
        professional_id: professionalId,
        service_id: serviceId,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: "agendado",
        price,
        duration,
        notes,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Agendamento criado com sucesso!");
      setIsNewDialogOpen(false);
      // Clear fields
      setClientId("");
      setProfessionalId("");
      setServiceId("");
      setStartTime("");
      setEndTime("");
      setNotes("");
    },
    onError: (err) => {
      toast.error("Erro ao agendar: " + err.message);
    },
  });

  // Update Status Mutation
  const updateAppointmentStatusMutation = useMutation({
    mutationFn: async ({ id, status, pMethod, commPaid }: { id: string; status: string; pMethod?: string; commPaid?: number }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      
      if (status === "concluido") {
        updates.payment_method = pMethod;
        updates.commission_paid = commPaid || 0;
      }

      const { error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      // PHASE 4: Financial record auto-generation
      if (status === "concluido" && selectedAppointment) {
        const clientName = selectedAppointment.client?.name || "Cliente";
        const serviceName = selectedAppointment.service?.name || "Serviço";
        const profName = selectedAppointment.professional?.name || "Profissional";

        // Create revenue record
        const { error: financeError } = await supabase
          .from("financial_records")
          .insert({
            type: "entrada",
            category: "Atendimento",
            amount: selectedAppointment.price,
            payment_method: pMethod,
            description: `Atendimento de ${clientName} - ${serviceName}`,
            record_date: format(new Date(selectedAppointment.start_time), "yyyy-MM-dd"),
          });
        if (financeError) console.error("Erro ao registrar entrada financeira:", financeError);

        // Create commission record if any
        if (commPaid && commPaid > 0) {
          const { error: commissionError } = await supabase
            .from("financial_records")
            .insert({
              type: "saida",
              category: "Comissão",
              amount: commPaid,
              payment_method: pMethod,
              description: `Comissão paga a ${profName} - Cliente ${clientName}`,
              record_date: format(new Date(selectedAppointment.start_time), "yyyy-MM-dd"),
            });
          if (commissionError) console.error("Erro ao registrar comissão no financeiro:", commissionError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["financial_records"] });
      toast.success("Status do agendamento atualizado!");
      setIsDetailsDialogOpen(false);
      setShowCompletionForm(false);
    },
    onError: (err) => {
      toast.error("Erro ao atualizar status: " + err.message);
    },
  });

  // Calculate comission suggestion on completion form load
  useEffect(() => {
    if (selectedAppointment && isDetailsDialogOpen) {
      const prof = selectedAppointment.professional;
      const priceVal = Number(selectedAppointment.price);
      if (prof) {
        const sugg = (priceVal * (Number(prof.commission_percent) / 100)) + Number(prof.commission_fixed);
        setCommissionPaid(Number(sugg.toFixed(2)));
      }
    }
  }, [selectedAppointment, isDetailsDialogOpen]);

  // Filter appointments for selected day
  const dailyAppointments = appointments.filter((appt) =>
    isSameDay(new Date(appt.start_time), selectedDate)
  );

  const prevDate = () => setSelectedDate((d) => addDays(d, -1));
  const nextDate = () => setSelectedDate((d) => addDays(d, 1));
  const today = () => setSelectedDate(new Date());

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "concluido": return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case "cancelado": return <XCircle className="h-4 w-4 text-rose-600" />;
      case "falta": return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case "confirmado": return <CheckCircle2 className="h-4 w-4 text-purple-600" />;
      default: return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Agenda
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os atendimentos do estúdio.
          </p>
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)} className="rounded-full bg-tiffany hover:bg-tiffany/90 text-tiffany-foreground font-medium">
          <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
        </Button>
      </div>

      {/* Control bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="icon" onClick={prevDate} className="rounded-full">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-serif text-lg font-medium min-w-[140px] text-center capitalize">
            {format(selectedDate, "eeee, dd/MM", { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" onClick={nextDate} className="rounded-full">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={today} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
            Hoje
          </Button>
        </div>

        {/* View Toggles */}
        <div className="flex items-center gap-1.5 border-t border-border pt-3 sm:border-t-0 sm:pt-0">
          <Button 
            variant={view === "day" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setView("day")}
            className="rounded-full text-xs"
          >
            <Calendar className="mr-1.5 h-3.5 w-3.5" /> Dia
          </Button>
          <Button 
            variant={view === "list" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setView("list")}
            className="rounded-full text-xs"
          >
            <List className="mr-1.5 h-3.5 w-3.5" /> Lista Geral
          </Button>
        </div>
      </div>

      {/* Main Agenda Grid / List */}
      {loadingAppointments ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-tiffany" />
        </div>
      ) : view === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <Table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-semibold text-muted-foreground">
                <th className="p-3">Data/Hora</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Serviço</th>
                <th className="p-3">Profissional</th>
                <th className="p-3">Preço</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground italic">
                    Nenhum agendamento cadastrado.
                  </td>
                </tr>
              ) : (
                appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-muted/10">
                    <td className="p-3 font-medium">
                      {new Date(appt.start_time).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="p-3">{appt.client?.name}</td>
                    <td className="p-3">
                      <Badge variant="outline" style={{ borderColor: appt.service?.color, backgroundColor: appt.service?.color + "15" }}>
                        {appt.service?.name}
                      </Badge>
                    </td>
                    <td className="p-3">{appt.professional?.name}</td>
                    <td className="p-3 font-semibold">R$ {Number(appt.price).toFixed(2)}</td>
                    <td className="p-3">
                      <Badge className={STATUS_OPTIONS.find(o => o.value === appt.status)?.color}>
                        {appt.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setSelectedAppointment(appt); setIsDetailsDialogOpen(true); }}
                        className="rounded-full h-8"
                      >
                        Ver Detalhes
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      ) : (
        /* DAY COLUMNS VIEW */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {professionals.length === 0 ? (
            <div className="col-span-full border rounded-2xl p-12 text-center bg-card">
              <p className="text-muted-foreground font-serif">Cadastre profissionais para visualizar as colunas de atendimento.</p>
            </div>
          ) : (
            professionals.map((prof) => {
              const profAppts = dailyAppointments.filter((a) => a.professional_id === prof.id);
              // sort by hour
              profAppts.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

              return (
                <div key={prof.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: prof.color }} />
                    <h3 className="font-serif font-semibold text-lg">{prof.name}</h3>
                  </div>

                  <div className="space-y-2.5 min-h-[220px]">
                    {profAppts.length === 0 ? (
                      <div className="h-full flex items-center justify-center border border-dashed rounded-xl p-8 text-center text-xs text-muted-foreground italic">
                        Sem agendamentos para hoje
                      </div>
                    ) : (
                      profAppts.map((appt) => {
                        const opt = STATUS_OPTIONS.find(o => o.value === appt.status);
                        
                        return (
                          <div 
                            key={appt.id} 
                            onClick={() => { setSelectedAppointment(appt); setIsDetailsDialogOpen(true); }}
                            className="group relative cursor-pointer border rounded-xl p-3 bg-muted/10 hover:bg-muted/20 hover:border-tiffany/60 transition-all text-xs"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-foreground">
                                {format(new Date(appt.start_time), "HH:mm")} - {format(new Date(appt.end_time), "HH:mm")}
                              </span>
                              <Badge variant="outline" className={`px-1.5 py-0 text-[10px] ${opt?.color}`}>
                                {appt.status}
                              </Badge>
                            </div>
                            <h4 className="font-serif text-sm font-semibold text-foreground mt-1">{appt.client?.name}</h4>
                            <p className="text-muted-foreground mt-0.5">{appt.service?.name}</p>
                            {appt.notes && (
                              <p className="text-[10px] text-muted-foreground italic line-clamp-1 mt-1 border-t pt-1 border-border/40">
                                {appt.notes}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* NEW APPOINTMENT DIALOG */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Novo Agendamento</DialogTitle>
            <DialogDescription>Selecione os dados do atendimento.</DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); createAppointmentMutation.mutate(); }} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="client">Cliente</Label>
              <select
                id="client"
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione a cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="professional">Profissional</Label>
                <select
                  id="professional"
                  required
                  value={professionalId}
                  onChange={(e) => setProfessionalId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="service">Serviço</Label>
                <select
                  id="service"
                  required
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.duration}min)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="start">Horário Início</Label>
                <Input
                  id="start"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="end">Horário Fim</Label>
                <Input
                  id="end"
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="price-val">Preço (Sugestão do Serviço)</Label>
              <Input
                id="price-val"
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Ex: alergias, mapping desejado, etc."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsNewDialogOpen(false)}>Cancelar</Button>
              <Button 
                type="submit" 
                className="bg-tiffany hover:bg-tiffany/90 text-tiffany-foreground"
                disabled={createAppointmentMutation.isPending}
              >
                {createAppointmentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agendar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* APPOINTMENT DETAILS / COMPLETE DIALOG */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={(open) => { setIsDetailsDialogOpen(open); if(!open) setShowCompletionForm(false); }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              {selectedAppointment ? getStatusIcon(selectedAppointment.status) : null}
              Detalhes do Agendamento
            </DialogTitle>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4 py-2 text-sm text-foreground">
              <div className="grid grid-cols-2 gap-4 border-b pb-3">
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground block">Cliente</span>
                  <span className="font-serif text-base font-semibold">{selectedAppointment.client?.name}</span>
                  <span className="text-xs text-muted-foreground block">{selectedAppointment.client?.phone || "Sem fone"}</span>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground block">Profissional</span>
                  <span className="font-serif text-base font-semibold">{selectedAppointment.professional?.name}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground block">Serviço</span>
                  <Badge variant="outline" style={{ borderColor: selectedAppointment.service?.color }}>
                    {selectedAppointment.service?.name}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground block">Data & Hora</span>
                  <span className="font-medium">
                    {new Date(selectedAppointment.start_time).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground block">Preço</span>
                <span className="text-lg font-bold">R$ {Number(selectedAppointment.price).toFixed(2)}</span>
              </div>

              {selectedAppointment.notes && (
                <div className="bg-muted/30 p-2.5 rounded-lg border">
                  <span className="text-xs font-semibold text-muted-foreground block">Observações:</span>
                  <p className="text-xs whitespace-pre-wrap">{selectedAppointment.notes}</p>
                </div>
              )}

              {/* Status Update Actions */}
              {!showCompletionForm && (
                <div className="border-t pt-3.5 space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground block">Atualizar Status para:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedAppointment.status !== "confirmado" && selectedAppointment.status !== "concluido" && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateAppointmentStatusMutation.mutate({ id: selectedAppointment.id, status: "confirmado" })}
                        className="rounded-full"
                      >
                        Confirmar Presença
                      </Button>
                    )}
                    {selectedAppointment.status !== "concluido" && (
                      <Button 
                        type="button" 
                        onClick={() => setShowCompletionForm(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                        size="sm"
                      >
                        Concluir Atendimento
                      </Button>
                    )}
                    {selectedAppointment.status !== "falta" && selectedAppointment.status !== "concluido" && (
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => updateAppointmentStatusMutation.mutate({ id: selectedAppointment.id, status: "falta" })}
                        className="text-amber-600 hover:bg-amber-500/10 border-amber-200 rounded-full"
                        size="sm"
                      >
                        Falta da Cliente
                      </Button>
                    )}
                    {selectedAppointment.status !== "cancelado" && selectedAppointment.status !== "concluido" && (
                      <Button 
                        type="button" 
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Deseja realmente cancelar este agendamento?")) {
                            updateAppointmentStatusMutation.mutate({ id: selectedAppointment.id, status: "cancelado" });
                          }
                        }}
                        className="text-rose-600 hover:bg-rose-500/10 rounded-full"
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Phase 4 Integration Completion Form */}
              {showCompletionForm && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateAppointmentStatusMutation.mutate({
                      id: selectedAppointment.id,
                      status: "concluido",
                      pMethod: paymentMethod,
                      commPaid: commissionPaid
                    });
                  }}
                  className="border-t pt-3.5 space-y-3"
                >
                  <span className="text-xs font-semibold text-emerald-600 block">Finalizar Atendimento (Gera Financeiro):</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="payment-meth">Forma de Pagamento</Label>
                      <select
                        id="payment-meth"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                      >
                        <option value="PIX">PIX</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartao_Credito">Cartão de Crédito</option>
                        <option value="Cartao_Debito">Cartão de Débito</option>
                        <option value="Transferencia">Transferência</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="comm-suggest">Comissão Profissional (R$)</Label>
                      <Input
                        id="comm-suggest"
                        type="number"
                        step="0.01"
                        value={commissionPaid}
                        onChange={(e) => setCommissionPaid(parseFloat(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-1.5">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowCompletionForm(false)}>
                      Voltar
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                      size="sm"
                      disabled={updateAppointmentStatusMutation.isPending}
                    >
                      {updateAppointmentStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Recebimento"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
