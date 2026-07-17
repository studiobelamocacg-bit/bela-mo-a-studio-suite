import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Scissors, Plus, Edit, Trash2, Search, Filter, Loader2, Sparkles, Check
} from "lucide-react";

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
import type { Service, Professional } from "@/types/database.types";

export const Route = createFileRoute("/_authenticated/servicos")({
  component: ServicosPage,
});

function ServicosPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Cílios");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState(100.00);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#AEE9E1");
  const [isActive, setIsActive] = useState(true);
  const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);

  // Fetch Services
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Service[];
    },
  });

  // Fetch Professionals
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

  // Fetch Service-Professional mappings
  const { data: mappings = [] } = useQuery({
    queryKey: ["professional_services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_services")
        .select("*");
      if (error) throw error;
      return data as { professional_id: string; service_id: string }[];
    },
  });

  // Open dialog to add new
  const handleAddClick = () => {
    setEditingService(null);
    setName("");
    setCategory("Cílios");
    setDuration(60);
    setPrice(100.00);
    setDescription("");
    setColor("#AEE9E1");
    setIsActive(true);
    setSelectedProfessionals([]);
    setIsDialogOpen(true);
  };

  // Open dialog to edit
  const handleEditClick = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setCategory(service.category);
    setDuration(service.duration);
    setPrice(Number(service.price));
    setDescription(service.description || "");
    setColor(service.color || "#AEE9E1");
    setIsActive(service.is_active);
    
    // Get professional links
    const assigned = mappings
      .filter((m) => m.service_id === service.id)
      .map((m) => m.professional_id);
    setSelectedProfessionals(assigned);
    
    setIsDialogOpen(true);
  };

  // Save Service (Create or Update)
  const saveMutation = useMutation({
    mutationFn: async () => {
      let serviceId = editingService?.id;

      if (editingService) {
        // Update existing
        const { error } = await supabase
          .from("services")
          .update({
            name,
            category,
            duration,
            price,
            description,
            color,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingService.id);
        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from("services")
          .insert({
            name,
            category,
            duration,
            price,
            description,
            color,
            is_active: true,
          })
          .select()
          .single();
        if (error) throw error;
        serviceId = data.id;
      }

      if (serviceId) {
        // Sync professional associations
        // First delete existing mappings for this service
        const { error: deleteError } = await supabase
          .from("professional_services")
          .delete()
          .eq("service_id", serviceId);
        if (deleteError) throw deleteError;

        // Insert selected ones
        if (selectedProfessionals.length > 0) {
          const insertData = selectedProfessionals.map((profId) => ({
            service_id: serviceId!,
            professional_id: profId,
          }));
          const { error: insertError } = await supabase
            .from("professional_services")
            .insert(insertData);
          if (insertError) throw insertError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["professional_services"] });
      toast.success(editingService ? "Serviço atualizado!" : "Serviço adicionado!");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao salvar serviço: " + error.message);
    },
  });

  // Delete Service (Toggle Status Active/Inactive or Delete if no mappings)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Deactivate instead of deleting to preserve history, or delete mapping first
      const { error } = await supabase
        .from("services")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Serviço desativado!");
    },
    onError: (error) => {
      toast.error("Erro ao desativar: " + error.message);
    },
  });

  const handleCheckboxChange = (profId: string, checked: boolean) => {
    if (checked) {
      setSelectedProfessionals((prev) => [...prev, profId]);
    } else {
      setSelectedProfessionals((prev) => prev.filter((id) => id !== profId));
    }
  };

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(services.map((s) => s.category)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Serviços
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastre os procedimentos oferecidos, seus valores, durações e profissionais.
          </p>
        </div>
        <Button onClick={handleAddClick} className="rounded-full bg-tiffany hover:bg-tiffany/90 text-tiffany-foreground font-medium">
          <Plus className="mr-2 h-4 w-4" /> Novo Serviço
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-full bg-card"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loadingServices ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-tiffany" />
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <Scissors className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 font-serif text-lg font-medium">Nenhum serviço encontrado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Experimente mudar a busca ou cadastrar um novo serviço.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Profissionais Habilitados</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map((service) => {
                const assignedProfs = mappings
                  .filter((m) => m.service_id === service.id)
                  .map((m) => professionals.find((p) => p.id === m.professional_id)?.name)
                  .filter(Boolean);

                return (
                  <TableRow key={service.id} className={!service.is_active ? "opacity-60" : ""}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{service.name}</p>
                        {service.description && (
                          <p className="text-xs font-normal text-muted-foreground line-clamp-1 max-w-[250px]">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{service.category}</Badge>
                    </TableCell>
                    <TableCell>{service.duration} min</TableCell>
                    <TableCell className="font-semibold text-foreground">
                      R$ {Number(service.price).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="h-4.5 w-4.5 rounded-full border border-border" 
                          style={{ backgroundColor: service.color || "#AEE9E1" }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.is_active ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {assignedProfs.length === 0 ? (
                          <span className="text-muted-foreground italic">Ninguém associado</span>
                        ) : (
                          assignedProfs.map((p, idx) => (
                            <Badge key={idx} variant="secondary" className="px-1.5 py-0">
                              {p}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(service)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {service.is_active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Desativar o serviço "${service.name}"?`)) {
                                deleteMutation.mutate(service.id);
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
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit/Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingService ? "Editar Serviço" : "Novo Serviço"}
            </DialogTitle>
            <DialogDescription>
              Preencha os campos para {editingService ? "salvar as alterações do" : "adicionar um novo"} serviço.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="name">Nome do Serviço</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Extensão de Cílios - Fio a Fio"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Cílios, Sobrancelha"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  required
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="color">Cor na Agenda</Label>
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

            <div className="space-y-1">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes adicionais sobre o procedimento"
                rows={2}
              />
            </div>

            {/* Professionals checklist */}
            <div className="space-y-2">
              <Label>Quem realiza este serviço?</Label>
              <div className="rounded-lg border border-border p-3 space-y-2.5 max-h-32 overflow-y-auto bg-muted/10">
                {professionals.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhuma profissional cadastrada.</p>
                ) : (
                  professionals.map((prof) => {
                    const isChecked = selectedProfessionals.includes(prof.id);
                    return (
                      <div key={prof.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`prof-${prof.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => handleCheckboxChange(prof.id, !!checked)}
                        />
                        <Label
                          htmlFor={`prof-${prof.id}`}
                          className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                        >
                          <span 
                            className="inline-block w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: prof.color }}
                          />
                          {prof.name}
                        </Label>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {editingService && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(!!checked)}
                />
                <Label htmlFor="isActive" className="cursor-pointer">Serviço ativo</Label>
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
