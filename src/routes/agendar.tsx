import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Sparkles, Calendar as CalendarIcon, Clock, User, Check, ChevronLeft, ChevronRight, Loader2, MessageCircle
} from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { Service, Professional, Appointment, Client } from "@/types/database.types";

export const Route = createFileRoute("/agendar")({
  component: PublicSchedulingPage,
});

function PublicSchedulingPage() {
  const [step, setStep] = useState(1);
  
  // Selected Data
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null | "any">(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  
  // Customer Form Data
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");

  // Step names
  const steps = [
    "Serviço",
    "Profissional",
    "Data",
    "Horário",
    "Seus Dados",
    "Confirmar"
  ];

  // Fetch active services
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["public-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data as Service[];
    },
  });

  // Fetch active professionals
  const { data: professionals = [], isLoading: loadingProfessionals } = useQuery({
    queryKey: ["public-professionals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data as Professional[];
    },
  });

  // Fetch existing appointments on selected date to calculate slot availability
  const { data: appointments = [] } = useQuery({
    queryKey: ["public-appointments", selectedDate?.toDateString()],
    queryFn: async () => {
      if (!selectedDate) return [];
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .neq("status", "cancelado");
      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!selectedDate,
  });

  // Automatically fetch service-professional links to filter professionals
  const { data: profServiceLinks = [] } = useQuery({
    queryKey: ["public-prof-service-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_services")
        .select("*");
      if (error) throw error;
      return data as { professional_id: string; service_id: string }[];
    },
  });

  // Filter professionals who perform the selected service
  const eligibleProfessionals = professionals.filter((p) => {
    if (!selectedService) return true;
    return profServiceLinks.some(
      (link) => link.professional_id === p.id && link.service_id === selectedService.id
    );
  });

  // Helper: Generate date selection choices (next 14 days, excluding Sundays if no professional works)
  const availableDates: Date[] = [];
  const startDay = new Date();
  for (let i = 0; i < 21; i++) {
    const d = addDays(startDay, i);
    const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday
    
    // Check if any professional works on this day of week
    let dayWorks = false;
    if (selectedProfessional && selectedProfessional !== "any") {
      dayWorks = selectedProfessional.days_worked.includes(dayOfWeek);
    } else {
      // If "any", check if at least one eligible professional works on this day
      dayWorks = eligibleProfessionals.some((p) => p.days_worked.includes(dayOfWeek));
    }
    
    if (dayWorks) {
      availableDates.push(d);
    }
  }

  // Calculate available time slots for selectedDate
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  useEffect(() => {
    if (!selectedDate || !selectedService) return;

    // Helper: parse "HH:MM" to minutes from midnight
    const toMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    // Helper: format minutes from midnight as "HH:MM"
    const toTimeStr = (totalMinutes: number) => {
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    const slots: string[] = [];
    const duration = selectedService.duration;

    // Identify target professionals
    const targetProfs = selectedProfessional && selectedProfessional !== "any" 
      ? [selectedProfessional] 
      : eligibleProfessionals;

    // Check availability for each slot across professionals
    // Work hours are between 08:00 and 20:00 (or customized by professional)
    const minStart = 8 * 60; // 08:00
    const maxEnd = 20 * 60;  // 20:00

    // Loop through 30-minute intervals
    for (let current = minStart; current + duration <= maxEnd; current += 30) {
      const slotStartStr = toTimeStr(current);
      const slotEndStr = toTimeStr(current + duration);

      const slotStart = new Date(selectedDate);
      const [sh, sm] = slotStartStr.split(":");
      slotStart.setHours(Number(sh), Number(sm), 0, 0);

      const slotEnd = new Date(selectedDate);
      const [eh, em] = slotEndStr.split(":");
      slotEnd.setHours(Number(eh), Number(em), 0, 0);

      // Check if AT LEAST ONE professional works this day, works this slot, and has no overlap
      const hasAvailability = targetProfs.some((prof) => {
        // 1. Works on this day of the week
        const dayOfWeek = selectedDate.getDay();
        if (!prof.days_worked.includes(dayOfWeek)) return false;

        // 2. Fits within professional's work hours
        const profStart = toMinutes(prof.work_hours_start);
        const profEnd = toMinutes(prof.work_hours_end);
        if (current < profStart || current + duration > profEnd) return false;

        // 3. No overlap with existing appointments for this professional
        const profAppts = appointments.filter((a) => a.professional_id === prof.id);
        const overlaps = profAppts.some((appt) => {
          const apptStart = new Date(appt.start_time).getTime();
          const apptEnd = new Date(appt.end_time).getTime();
          
          return (slotStart.getTime() < apptEnd && slotEnd.getTime() > apptStart);
        });

        return !overlaps;
      });

      if (hasAvailability) {
        // Prevent booking past times if date is today
        if (isSameDay(selectedDate, new Date())) {
          const now = new Date();
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          if (current > nowMinutes + 45) { // 45 minutes advance booking notice
            slots.push(slotStartStr);
          }
        } else {
          slots.push(slotStartStr);
        }
      }
    }

    setTimeSlots(slots);
  }, [selectedDate, selectedService, selectedProfessional, eligibleProfessionals, appointments]);

  // Complete Booking Mutation
  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedService || !selectedDate || !selectedTimeSlot) return;

      // 1. Select a professional if "any" was selected
      let assignedProfId: string | null = null;
      if (selectedProfessional === "any") {
        const toMinutes = (timeStr: string) => {
          const [h, m] = timeStr.split(":").map(Number);
          return h * 60 + m;
        };

        const sh = Number(selectedTimeSlot.split(":")[0]);
        const sm = Number(selectedTimeSlot.split(":")[1]);
        const slotStart = new Date(selectedDate);
        slotStart.setHours(sh, sm, 0, 0);
        const slotEnd = new Date(selectedDate);
        slotEnd.setHours(sh, sm + selectedService.duration, 0, 0);

        // Find first available eligible professional
        for (const prof of eligibleProfessionals) {
          const dayOfWeek = selectedDate.getDay();
          if (!prof.days_worked.includes(dayOfWeek)) continue;

          const profStart = toMinutes(prof.work_hours_start);
          const profEnd = toMinutes(prof.work_hours_end);
          const current = sh * 60 + sm;
          if (current < profStart || current + selectedService.duration > profEnd) continue;

          const profAppts = appointments.filter((a) => a.professional_id === prof.id);
          const overlaps = profAppts.some((appt) => {
            const apptStart = new Date(appt.start_time).getTime();
            const apptEnd = new Date(appt.end_time).getTime();
            return (slotStart.getTime() < apptEnd && slotEnd.getTime() > apptStart);
          });

          if (!overlaps) {
            assignedProfId = prof.id;
            break;
          }
        }
      } else {
        assignedProfId = selectedProfessional?.id || null;
      }

      if (!assignedProfId) {
        throw new Error("Não encontramos profissionais disponíveis para esse horário.");
      }

      // 2. Upsert Client (check by name/whatsapp/phone first)
      let finalClientId = "";
      const { data: existingClients, error: checkError } = await supabase
        .from("clients")
        .select("id")
        .or(`phone.eq.${phone},whatsapp.eq.${whatsapp || phone}`);

      if (checkError) throw checkError;

      if (existingClients && existingClients.length > 0) {
        finalClientId = existingClients[0].id;
      } else {
        // Create new client
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            name,
            phone: phone || null,
            whatsapp: whatsapp || phone || null,
            instagram: instagram || null,
            email: email || null,
            status: "Ativa",
          })
          .select()
          .single();
        if (clientError) throw clientError;
        finalClientId = newClient.id;
      }

      // 3. Create Appointment
      const [sh, sm] = selectedTimeSlot.split(":").map(Number);
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(sh, sm, 0, 0);
      
      const endDateTime = new Date(selectedDate);
      endDateTime.setHours(sh, sm + selectedService.duration, 0, 0);

      const { error: apptError } = await supabase.from("appointments").insert({
        client_id: finalClientId,
        professional_id: assignedProfId,
        service_id: selectedService.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: "agendado",
        price: selectedService.price,
        duration: selectedService.duration,
      });

      if (apptError) throw apptError;
    },
    onSuccess: () => {
      toast.success("Seu agendamento foi confirmado!");
      setStep(7); // success page
    },
    onError: (err) => {
      toast.error("Erro ao agendar: " + err.message);
    },
  });

  const goNext = () => setStep((s) => s + 1);
  const goPrev = () => setStep((s) => s - 1);

  // Quick select helper
  const handleSelectService = (s: Service) => {
    setSelectedService(s);
    goNext();
  };

  const handleSelectProf = (p: Professional | "any") => {
    setSelectedProfessional(p);
    goNext();
  };

  const handleSelectDate = (d: Date) => {
    setSelectedDate(d);
    setSelectedTimeSlot(null);
    goNext();
  };

  const handleSelectTime = (t: string) => {
    setSelectedTimeSlot(t);
    goNext();
  };

  return (
    <div className="relative min-h-screen bg-background pb-12">
      {/* Background decoration */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-30"
        style={{ background: "var(--gradient-tiffany)" }}
        aria-hidden
      />

      <header className="relative border-b border-border/40 bg-background/80 py-4 backdrop-blur-lg">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-tiffany text-tiffany-foreground font-serif font-semibold">
              B
            </div>
            <span className="font-serif text-base font-semibold tracking-tight">Studio Bela Moça</span>
          </Link>
          {step > 1 && step < 7 && (
            <Button variant="ghost" size="sm" onClick={goPrev} className="rounded-full text-xs">
              <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
          )}
        </div>
      </header>

      <main className="relative mx-auto mt-6 max-w-xl px-4">
        {step < 7 && (
          <div className="mb-6">
            {/* Horizontal progress indicators */}
            <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              <span>Etapa {step} de 6</span>
              <span className="text-foreground">{steps[step - 1]}</span>
            </div>
            <div className="mt-2 flex gap-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              {steps.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`flex-1 rounded-full transition-colors ${idx + 1 <= step ? "bg-tiffany" : "bg-border"}`} 
                />
              ))}
            </div>
          </div>
        )}

        {/* STEP 1: SELECT SERVICE */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="font-serif text-xl font-medium sm:text-2xl text-foreground">O que faremos hoje?</h2>
              <p className="text-xs text-muted-foreground mt-1">Selecione o serviço ideal para realçar seu olhar.</p>
            </div>

            {loadingServices ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-tiffany" /></div>
            ) : (
              <div className="grid gap-3.5 mt-2">
                {services.map((s) => (
                  <Card 
                    key={s.id} 
                    onClick={() => handleSelectService(s)}
                    className="cursor-pointer border-border/80 hover:border-tiffany transition-all hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-serif text-sm font-semibold text-foreground">{s.name}</h4>
                        {s.description && <p className="text-xs text-muted-foreground line-clamp-1">{s.description}</p>}
                        <div className="flex items-center gap-1.5 pt-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{s.duration} minutos</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-foreground">R$ {Number(s.price).toFixed(2)}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/60 inline-block ml-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SELECT PROFESSIONAL */}
        {step === 2 && selectedService && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="font-serif text-xl font-medium sm:text-2xl text-foreground">Escolha a profissional</h2>
              <p className="text-xs text-muted-foreground mt-1">Selecione quem irá cuidar de você ou escolha qualquer horário disponível.</p>
            </div>

            <div className="grid gap-3 mt-2">
              <Card 
                onClick={() => handleSelectProf("any")}
                className="cursor-pointer hover:border-tiffany transition-all"
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tiffany/20 text-tiffany-foreground">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-semibold">Tanto faz / Qualquer Profissional</h4>
                    <p className="text-xs text-muted-foreground">Garante mais opções de horários disponíveis.</p>
                  </div>
                </CardContent>
              </Card>

              {loadingProfessionals ? (
                <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-tiffany" /></div>
              ) : (
                eligibleProfessionals.map((p) => (
                  <Card 
                    key={p.id} 
                    onClick={() => handleSelectProf(p)}
                    className="cursor-pointer hover:border-tiffany transition-all"
                  >
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted font-serif text-sm font-semibold">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-serif text-sm font-semibold">{p.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">{p.specialties.join(", ")}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* STEP 3: SELECT DATE */}
        {step === 3 && selectedService && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="font-serif text-xl font-medium sm:text-2xl text-foreground">Escolha a data</h2>
              <p className="text-xs text-muted-foreground mt-1">Selecione o dia do seu atendimento nas próximas semanas.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2 sm:grid-cols-3">
              {availableDates.map((date) => {
                const isSelected = selectedDate && isSameDay(selectedDate, date);
                return (
                  <Card 
                    key={date.toDateString()} 
                    onClick={() => handleSelectDate(date)}
                    className={`cursor-pointer text-center hover:border-tiffany transition-all ${isSelected ? "border-tiffany ring-1 ring-tiffany/50 bg-tiffany/5" : ""}`}
                  >
                    <CardContent className="p-4.5 flex flex-col items-center">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-widest">
                        {format(date, "eee", { locale: ptBR })}
                      </span>
                      <span className="text-2xl font-bold text-foreground mt-1">{format(date, "d")}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                        {format(date, "MMMM", { locale: ptBR })}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: SELECT HOUR */}
        {step === 4 && selectedDate && selectedService && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="font-serif text-xl font-medium sm:text-2xl text-foreground">Escolha o horário</h2>
              <p className="text-xs text-muted-foreground mt-1">Horários disponíveis para {format(selectedDate, "dd/MM")}.</p>
            </div>

            {timeSlots.length === 0 ? (
              <div className="border border-dashed rounded-2xl p-10 text-center bg-card">
                <p className="text-sm text-muted-foreground font-serif">Não encontramos horários disponíveis para esta data.</p>
                <Button variant="outline" size="sm" onClick={goPrev} className="mt-4 rounded-full">Escolher outra data</Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 mt-2 sm:grid-cols-4">
                {timeSlots.map((time) => {
                  const isSelected = selectedTimeSlot === time;
                  return (
                    <Button 
                      key={time}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => handleSelectTime(time)}
                      className={`h-11 rounded-xl text-xs font-semibold ${isSelected ? "bg-tiffany hover:bg-tiffany/90 text-tiffany-foreground" : "border-border/80 hover:border-tiffany"}`}
                    >
                      {time}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 5: CUSTOMER INFORMATION */}
        {step === 5 && selectedTimeSlot && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="font-serif text-xl font-medium sm:text-2xl text-foreground">Falta pouco! Seus dados</h2>
              <p className="text-xs text-muted-foreground mt-1">Preencha seus dados para finalizar e confirmar o agendamento.</p>
            </div>

            <Card className="mt-2 border-border/80 bg-card">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="cust-name">Nome Completo</Label>
                  <Input 
                    id="cust-name" 
                    placeholder="Seu nome completo" 
                    required 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="cust-phone">WhatsApp / Celular</Label>
                    <Input 
                      id="cust-phone" 
                      placeholder="(67) 99999-9999" 
                      required 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cust-insta">Instagram (Opcional)</Label>
                    <Input 
                      id="cust-insta" 
                      placeholder="@usuario" 
                      value={instagram} 
                      onChange={(e) => setInstagram(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cust-email">E-mail (Opcional)</Label>
                  <Input 
                    id="cust-email" 
                    type="email" 
                    placeholder="voce@exemplo.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={goNext}
              disabled={!name || !phone}
              className="w-full mt-4 bg-tiffany hover:bg-tiffany/90 text-tiffany-foreground rounded-full h-11 font-medium"
            >
              Avançar
            </Button>
          </div>
        )}

        {/* STEP 6: CONFIRMATION */}
        {step === 6 && selectedService && selectedDate && selectedTimeSlot && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="font-serif text-xl font-medium sm:text-2xl text-foreground">Confirmação do Agendamento</h2>
              <p className="text-xs text-muted-foreground mt-1">Revise os detalhes antes de confirmar.</p>
            </div>

            <Card className="mt-2 border-tiffany bg-card overflow-hidden">
              <div className="bg-tiffany/10 px-5 py-3 border-b border-tiffany/20 text-center">
                <span className="text-[10px] uppercase font-bold text-tiffany-foreground/80 tracking-widest">Resumo do Serviço</span>
              </div>
              <CardContent className="p-5 space-y-4.5 text-sm text-foreground">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground">Procedimento:</span>
                  <span className="font-serif font-bold text-base">{selectedService.name}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground">Profissional:</span>
                  <span className="font-semibold">
                    {selectedProfessional === "any" ? "Qualquer Profissional" : selectedProfessional?.name}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground">Horário:</span>
                  <span className="font-bold text-tiffany-foreground/90">{selectedTimeSlot}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-bold text-foreground">R$ {Number(selectedService.price).toFixed(2)}</span>
                </div>
                <div className="pt-2 text-xs text-muted-foreground space-y-1">
                  <p><span className="font-medium text-foreground">Nome:</span> {name}</p>
                  <p><span className="font-medium text-foreground">WhatsApp:</span> {phone}</p>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={() => bookingMutation.mutate()}
              disabled={bookingMutation.isPending}
              className="w-full mt-4 bg-tiffany hover:bg-tiffany/90 text-tiffany-foreground rounded-full h-11 font-medium"
            >
              {bookingMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar Agendamento"}
            </Button>
          </div>
        )}

        {/* STEP 7: SUCCESS PAGE */}
        {step === 7 && selectedService && selectedDate && selectedTimeSlot && (
          <div className="text-center py-10 space-y-5">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 shadow-md">
              <Check className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">Agendamento Realizado!</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Tudo certo, {name}! Seu horário está reservado e confirmado em nosso sistema.
              </p>
            </div>

            <Card className="border-border bg-card max-w-sm mx-auto text-left text-xs shadow-sm">
              <CardContent className="p-4 space-y-2 text-foreground">
                <p><span className="text-muted-foreground">Procedimento:</span> <strong className="float-right">{selectedService.name}</strong></p>
                <p><span className="text-muted-foreground">Profissional:</span> <strong className="float-right">{selectedProfessional === "any" ? "Definida pelo salão" : selectedProfessional?.name}</strong></p>
                <p><span className="text-muted-foreground">Data:</span> <strong className="float-right">{format(selectedDate, "dd/MM/yyyy")}</strong></p>
                <p><span className="text-muted-foreground">Horário:</span> <strong className="float-right text-tiffany-foreground">{selectedTimeSlot}</strong></p>
                <p><span className="text-muted-foreground">Valor:</span> <strong className="float-right">R$ {Number(selectedService.price).toFixed(2)}</strong></p>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 pt-6 max-w-sm mx-auto">
              <Button asChild className="rounded-full bg-gold hover:bg-gold/90 text-gold-foreground font-medium h-11">
                <a 
                  href={`https://wa.me/5500000000000?text=Olá,%20acabei%20de%20agendar%20um%20atendimento%20de%20${selectedService.name}%20dia%20${format(selectedDate, "dd/MM")}%20às%20${selectedTimeSlot}.`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="mr-2 h-4.5 w-4.5" /> Enviar mensagem no WhatsApp
                </a>
              </Button>
              <Button asChild variant="ghost" className="rounded-full text-xs">
                <Link to="/">Voltar para a página inicial</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
