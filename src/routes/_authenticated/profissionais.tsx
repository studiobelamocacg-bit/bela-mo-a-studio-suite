import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  UserCog, Plus, Edit, Trash2, Search, Loader2, Phone, Calendar, Clock, DollarSign
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Professional } from "@/types/database.types";

export const Route = createFileRoute("/_authenticated/profissionais")({
  component: ProfissionaisPage,
});

const WEEKDAYS = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const STANDARD_SPECIALTIES = ["Cílios", "Sobrancelha", "Unhas", "Estética", "Maquiagem"];

function ProfissionaisPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [color, setColor] = useState("#0D9488");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [daysWorked, setDaysWorked] = useState<number[]>([1, 2, 3, 4, 5, 6]); // default Mon-Sat
  const [workHoursStart, setWorkHoursStart] = useState("09:00");
  const [workHoursEnd, setWorkHoursEnd] = useState("18:00");
  const [commissionPercent, setCommissionPercent] = useState(40.00);
  const [commissionFixed, setCommissionFixed] = useState(0.00);
  const [isActive, setIsActive] = useState(true);

  // Fetch Professionals
  const { data: professionals = [], isLoading: loadingProfessionals } = useQuery({
    queryKey: ["professionals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Professional[];
    },
  });

  const handleAddClick = () => {
    setEditingProfessional(null);
    setName("");
    setPhone("");
    setColor("#0D9488");
    setSpecialties(["Cílios"]);
    setDaysWorked([1, 2, 3, 4, 5, 6]);
    setWorkHoursStart("09:00");
    setWorkHoursEnd("18:00");
    setCommissionPercent(40.00);
    setCommissionFixed(0.00);
    setIsActive(true);
    setIsDialogOpen(true);
  };

  const handleEditClick = (prof: Professional) => {
    setEditingProfessional(prof);
    setName(prof.name);
    setPhone(prof.phone || "");
    setColor(prof.color || "#0D9488");
    setSpecialties(prof.specialties || []);
    setDaysWorked(prof.days_worked || []);
    setWorkHoursStart(prof.work_hours_start || "09:00");
    setWorkHoursEnd(prof.work_hours_end || "18:00");
    setCommissionPercent(Number(prof.commission_percent));
    setCommissionFixed(Number(prof.commission_fixed));
    setIsActive(prof.is_active);
    setIsDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        phone,
        color,
        specialties,
        days_worked: daysWorked,
        work_hours_start: workHoursStart,
        work_hours_end: workHoursEnd,
        commission_percent: commissionPercent,
        commission_fixed: commissionFixed,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      if (editingProfessional) {
        const { error } = await supabase
          .from("professionals")
          .update(payload)
          .eq("id", editingProfessional.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("professionals")
          .insert({
            ...payload,
            is_active: true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      toast.success(editingProfessional ? "Profissional atualizada!" : "Profissional cadastrada!");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao salvar profissional: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Deactivate instead of deleting
      const { error } = await supabase
        .from("professionals")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      toast.success("Profissional desativada!");
    },
    onError: (error) => {
      toast.error("Erro ao desativar: " + error.message);
    },
  });

  const handleWeekdayChange = (dayValue: number, checked: boolean) => {
    if (checked) {
      setDaysWorked((prev) => [...prev, dayValue].sort());
    } else {
      setDaysWorked((prev) => prev.filter((d) => d !== dayValue));
    }
  };

  const handleSpecialtyChange = (spec: string, checked: boolean) => {
    if (checked) {
      setSpecialties((prev) => [...prev, spec]);
    } else {
      setSpecialties((prev) => prev.filter((s) => s !== spec));
    }
  };

  const filteredProfessionals = professionals.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Profissionais
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie a equipe do estúdio, especialidades, horários de expediente e comissões.
          </p>
        </div>
        <Button onClick={handleAddClick} className="rounded-full bg-tiffany hover:bg-tiffany/90 text-tiffany-foreground font-medium">
          <Plus className="mr-2 h-4 w-4" /> Nova Profissional
        </Button>
      </div>

      {/* Filter */}
      <div className="relative max-w-md">
        <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar profissional pelo nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 rounded-full bg-card"
        />
      </div>

      {/* Table */}
      {loadingProfessionals ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-tiffany" />
        </div>
      ) : filteredProfessionals.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <UserCog className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 font-serif text-lg font-medium">Nenhuma profissional encontrada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre as profissionais do estúdio para habilitar o calendário e atendimentos.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Especialidades</TableHead>
                <TableHead>Dias Trabalhados</TableHead>
                <TableHead>Expediente</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Cor Agenda</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfessionals.map((prof) => (
                <TableRow key={prof.id} className={!prof.is_active ? "opacity-60" : ""}>
                  <TableCell className="font-semibold text-foreground">
                    {prof.name}
                  </TableCell>
                  <TableCell>
                    {prof.phone ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{prof.phone}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Sem telefone</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {prof.specialties?.map((spec, i) => (
                        <Badge key={i} variant="outline" className="px-1.5 py-0.2">
                          {spec}
                        </Badge>
                      )) || <span className="text-muted-foreground text-xs italic">Nenhuma</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {prof.days_worked?.length === 7 
                          ? "Todos os dias"
                          : prof.days_worked?.map(d => WEEKDAYS.find(w => w.value === d)?.label.substring(0, 3)).join(", ")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>{prof.work_hours_start} - {prof.work_hours_end}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex flex-col gap-0.5">
                      {Number(prof.commission_percent) > 0 && (
                        <span>Percentual: {Number(prof.commission_percent)}%</span>
                      )}
                      {Number(prof.commission_fixed) > 0 && (
                        <span>Fixa: R$ {Number(prof.commission_fixed).toFixed(2)}</span>
                      )}
                      {Number(prof.commission_percent) === 0 && Number(prof.commission_fixed) === 0 && (
                        <span className="text-muted-foreground italic">Sem comissão</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span 
                        className="h-4.5 w-4.5 rounded-full border border-border" 
                        style={{ backgroundColor: prof.color || "#0D9488" }}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {prof.is_active ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(prof)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {prof.is_active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Desativar profissional "${prof.name}"?`)) {
                              deleteMutation.mutate(prof.id);
                            }
                          }}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title="Desativar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit/Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingProfessional ? "Editar Profissional" : "Nova Profissional"}
            </DialogTitle>
            <DialogDescription>
              Insira os dados da profissional, horários de expediente e comissão.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome da profissional"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone">Telefone / Celular</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(67) 99999-9999"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="workHoursStart">Início do Expediente</Label>
                <Input
                  id="workHoursStart"
                  type="time"
                  required
                  value={workHoursStart}
                  onChange={(e) => setWorkHoursStart(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="workHoursEnd">Fim do Expediente</Label>
                <Input
                  id="workHoursEnd"
                  type="time"
                  required
                  value={workHoursEnd}
                  onChange={(e) => setWorkHoursEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="commissionPercent">Comissão (%)</Label>
                <Input
                  id="commissionPercent"
                  type="number"
                  step="0.1"
                  required
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="commissionFixed">Comissão Fixa (R$)</Label>
                <Input
                  id="commissionFixed"
                  type="number"
                  step="0.01"
                  required
                  value={commissionFixed}
                  onChange={(e) => setCommissionFixed(parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="space-y-1">
                <Label htmlFor="color">Cor da Agenda</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="color"
                    type="color"
                    className="h-9 w-12 p-0.5"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                  <span className="text-xs font-mono text-muted-foreground">{color}</span>
                </div>
              </div>
            </div>

            {/* Specialties */}
            <div className="space-y-2">
              <Label>Especialidades</Label>
              <div className="flex flex-wrap gap-2.5 rounded-lg border border-border p-3 bg-muted/10">
                {STANDARD_SPECIALTIES.map((spec) => {
                  const isChecked = specialties.includes(spec);
                  return (
                    <div key={spec} className="flex items-center space-x-1.5 bg-card border px-2.5 py-1 rounded-full shadow-xs">
                      <Checkbox
                        id={`spec-${spec}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleSpecialtyChange(spec, !!checked)}
                      />
                      <Label htmlFor={`spec-${spec}`} className="text-xs cursor-pointer">
                        {spec}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Days Worked */}
            <div className="space-y-2">
              <Label>Dias de Trabalho</Label>
              <div className="grid grid-cols-3 gap-2.5 rounded-lg border border-border p-3 bg-muted/10">
                {WEEKDAYS.map((day) => {
                  const isChecked = daysWorked.includes(day.value);
                  return (
                    <div key={day.value} className="flex items-center space-x-1.5">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleWeekdayChange(day.value, !!checked)}
                      />
                      <Label htmlFor={`day-${day.value}`} className="text-xs cursor-pointer select-none">
                        {day.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            {editingProfessional && (
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(!!checked)}
                />
                <Label htmlFor="isActive" className="cursor-pointer">Profissional ativa</Label>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-tiffany hover:bg-tiffany/90 text-tiffany-foreground"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
