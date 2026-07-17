import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { 
  Users, Plus, Edit, Trash2, Search, Loader2, Phone, Calendar, Mail, 
  BookOpen, FileText, Camera, Route as MapIcon, History, Save, RotateCcw, Download, PlusCircle
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Client, Professional, ClientAnamnesis, ClientConsent, ClientPhoto, ClientMapping, Appointment } from "@/types/database.types";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesPage,
});

function ClientesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [retornoFilter, setRetornoFilter] = useState("all"); // 'all', '30', '60', '90'
  const [anivFilter, setAnivFilter] = useState(false);
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("dados");

  // Form states for basic client data
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [preferredProfId, setPreferredProfId] = useState("");
  const [status, setStatus] = useState("Ativa");

  // Canvas Refs for Signatures
  const anamnesisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const consentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Fetch Professionals (for dropdown)
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

  // Fetch Clients with Appointments joined
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          appointments:appointments(start_time, status, service:services(name), professional:professionals(name))
        `)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Anamnesis query
  const { data: anamnesis = null, refetch: refetchAnamnesis } = useQuery({
    queryKey: ["anamnesis", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return null;
      const { data, error } = await supabase
        .from("client_anamnesis")
        .select("*")
        .eq("client_id", selectedClient.id)
        .maybeSingle();
      if (error) throw error;
      return data as ClientAnamnesis;
    },
    enabled: !!selectedClient?.id,
  });

  // Consent query
  const { data: consent = null, refetch: refetchConsent } = useQuery({
    queryKey: ["consent", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return null;
      const { data, error } = await supabase
        .from("client_consent")
        .select("*")
        .eq("client_id", selectedClient.id)
        .maybeSingle();
      if (error) throw error;
      return data as ClientConsent;
    },
    enabled: !!selectedClient?.id,
  });

  // Photos query
  const { data: photos = [], refetch: refetchPhotos } = useQuery({
    queryKey: ["photos", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const { data, error } = await supabase
        .from("client_photos")
        .select("*")
        .eq("client_id", selectedClient.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ClientPhoto[];
    },
    enabled: !!selectedClient?.id,
  });

  // Mappings query
  const { data: clientMappings = [], refetch: refetchMappings } = useQuery({
    queryKey: ["mappings", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const { data, error } = await supabase
        .from("client_mappings")
        .select("*")
        .eq("client_id", selectedClient.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ClientMapping[];
    },
    enabled: !!selectedClient?.id,
  });

  // Client Mutations
  const saveClientMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        phone,
        whatsapp,
        instagram,
        email: email || null,
        birth_date: birthDate || null,
        cpf: cpf || null,
        preferred_professional_id: preferredProfId || null,
        status,
        updated_at: new Date().toISOString(),
      };

      if (selectedClient?.id) {
        const { error } = await supabase
          .from("clients")
          .update(payload)
          .eq("id", selectedClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("clients")
          .insert({
            ...payload,
            status: "Ativa",
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(selectedClient?.id ? "Dados salvos!" : "Cliente cadastrada!");
      if (!selectedClient?.id) setIsDialogOpen(false);
    },
    onError: (err) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  // Anamnesis Save Mutation
  const saveAnamnesisMutation = useMutation({
    mutationFn: async (data: Partial<ClientAnamnesis>) => {
      if (!selectedClient?.id) return;
      const { error } = await supabase
        .from("client_anamnesis")
        .upsert({
          client_id: selectedClient.id,
          ...data,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchAnamnesis();
      toast.success("Anamnese salva com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao salvar anamnese: " + err.message);
    },
  });

  // Consent Save Mutation
  const saveConsentMutation = useMutation({
    mutationFn: async (data: Partial<ClientConsent>) => {
      if (!selectedClient?.id) return;
      const { error } = await supabase
        .from("client_consent")
        .upsert({
          client_id: selectedClient.id,
          ...data,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchConsent();
      toast.success("Consentimento salvo!");
    },
    onError: (err) => {
      toast.error("Erro ao salvar consentimento: " + err.message);
    },
  });

  // Add photo mutation
  const addPhotoMutation = useMutation({
    mutationFn: async (photo: { url: string; category: string }) => {
      const { error } = await supabase
        .from("client_photos")
        .insert({
          client_id: selectedClient.id,
          url: photo.url,
          category: photo.category,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchPhotos();
      toast.success("Foto adicionada!");
    },
  });

  // Add mapping mutation
  const addMappingMutation = useMutation({
    mutationFn: async (m: Partial<ClientMapping>) => {
      const { error } = await supabase
        .from("client_mappings")
        .insert({
          client_id: selectedClient.id,
          ...m,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchMappings();
      toast.success("Mapping adicionado!");
    },
  });

  // Delete Client
  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente removida!");
      setIsDialogOpen(false);
    },
    onError: (err) => {
      toast.error("Erro ao remover: " + err.message);
    },
  });

  const handleAddClick = () => {
    setSelectedClient(null);
    setName("");
    setPhone("");
    setWhatsapp("");
    setInstagram("");
    setEmail("");
    setBirthDate("");
    setCpf("");
    setPreferredProfId("");
    setStatus("Ativa");
    setActiveTab("dados");
    setIsDialogOpen(true);
  };

  const handleEditClick = (client: any) => {
    setSelectedClient(client);
    setName(client.name);
    setPhone(client.phone || "");
    setWhatsapp(client.whatsapp || "");
    setInstagram(client.instagram || "");
    setEmail(client.email || "");
    setBirthDate(client.birth_date || "");
    setCpf(client.cpf || "");
    setPreferredProfId(client.preferred_professional_id || "");
    setStatus(client.status);
    setActiveTab("dados");
    setIsDialogOpen(true);
  };

  // Filter clients
  const filteredClients = clients.filter((client) => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone && client.phone.includes(searchTerm)) ||
      (client.whatsapp && client.whatsapp.includes(searchTerm)) ||
      (client.cpf && client.cpf.includes(searchTerm)) ||
      (client.instagram && client.instagram.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || client.status === statusFilter;

    // Check last service date
    let matchesRetorno = true;
    const history = client.appointments || [];
    const validAppts = history.filter((a: any) => a.status === 'concluido' || a.status === 'agendado' || a.status === 'confirmado');
    const sortedAppts = [...validAppts].sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    const lastApptTime = sortedAppts[0] ? new Date(sortedAppts[0].start_time).getTime() : 0;
    const daysSinceLast = lastApptTime ? (Date.now() - lastApptTime) / (1000 * 60 * 60 * 24) : 9999;

    if (retornoFilter === "30") {
      matchesRetorno = daysSinceLast >= 30 && daysSinceLast < 60;
    } else if (retornoFilter === "60") {
      matchesRetorno = daysSinceLast >= 60 && daysSinceLast < 90;
    } else if (retornoFilter === "90") {
      matchesRetorno = daysSinceLast >= 90;
    }

    // Check birthday month
    let matchesAniv = true;
    if (anivFilter) {
      if (client.birth_date) {
        const birthMonth = new Date(client.birth_date).getMonth();
        const currentMonth = new Date().getMonth();
        matchesAniv = birthMonth === currentMonth;
      } else {
        matchesAniv = false;
      }
    }

    return matchesSearch && matchesStatus && matchesRetorno && matchesAniv;
  });

  // Drawing signature logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    
    // Support Touch/Mouse
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    if (!isDrawing) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault(); // prevent scrolling
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Convert canvas signature to Base64
  const getCanvasData = (canvas: HTMLCanvasElement | null): string | null => {
    if (!canvas) return null;
    // Check if canvas is empty
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      return null;
    }
    return canvas.toDataURL("image/png");
  };

  // PDF Export for Consent
  const exportConsentPDF = () => {
    if (!selectedClient) return;
    
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("AUTORIZACAO DE USO DE IMAGEM", 105, 20, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    const text = consent?.text_content || 
      `Eu, ${selectedClient.name}, portadora do CPF ${selectedClient.cpf || "____"}, autorizo o Studio Bela Moça a utilizar fotos e vídeos dos meus cílios/procedimentos para fins de divulgação em mídias sociais, portfolios e publicidades diversas.`;
    
    const splitText = doc.splitTextToSize(text, 180);
    doc.text(splitText, 15, 40);

    doc.text(`Data de assinatura: ${new Date(consent?.signed_at || Date.now()).toLocaleDateString("pt-BR")}`, 15, 120);

    if (consent?.signature) {
      doc.text("Assinatura da Cliente:", 15, 140);
      try {
        doc.addImage(consent.signature, "PNG", 15, 145, 80, 40);
      } catch (e) {
        console.error("Erro ao adicionar imagem ao PDF", e);
      }
    } else {
      doc.line(15, 160, 95, 160);
      doc.text("Assinatura da Cliente", 15, 165);
    }
    
    doc.save(`Consentimento_Imagem_${selectedClient.name.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Clientes
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastro de clientes, fichas de anamnese, assinaturas digitais, mapping e fotos.
          </p>
        </div>
        <Button onClick={handleAddClick} className="rounded-full bg-tiffany hover:bg-tiffany/90 text-tiffany-foreground font-medium">
          <Plus className="mr-2 h-4 w-4" /> Nova Cliente
        </Button>
      </div>

      {/* Filters grid */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, fone, insta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-full bg-card text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-full border border-border bg-card px-3 py-1.5 text-sm outline-none"
          >
            <option value="all">Todos os status</option>
            <option value="Ativa">Ativa</option>
            <option value="Inativa">Inativa</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={retornoFilter}
            onChange={(e) => setRetornoFilter(e.target.value)}
            className="w-full rounded-full border border-border bg-card px-3 py-1.5 text-sm outline-none"
          >
            <option value="all">Qualquer período</option>
            <option value="30">Sem retorno há 30+ dias</option>
            <option value="60">Sem retorno há 60+ dias</option>
            <option value="90">Sem retorno há 90+ dias</option>
          </select>
        </div>

        <div className="flex items-center justify-start space-x-2 px-2">
          <Checkbox
            id="aniv-month"
            checked={anivFilter}
            onCheckedChange={(c) => setAnivFilter(!!c)}
          />
          <Label htmlFor="aniv-month" className="text-sm cursor-pointer select-none">
            Aniversariantes do mês
          </Label>
        </div>
      </div>

      {/* Clients Table */}
      {loadingClients ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-tiffany" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 font-serif text-lg font-medium">Nenhuma cliente encontrada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Altere os filtros ou adicione uma nova cliente.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone / WhatsApp</TableHead>
                <TableHead>Instagram</TableHead>
                <TableHead>CPF / Aniversário</TableHead>
                <TableHead>Última Visita</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Fichas e Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => {
                // Find last appointment date
                const appts = client.appointments || [];
                const doneAppts = appts.filter((a: any) => a.status === 'concluido');
                const sorted = [...doneAppts].sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
                const lastDate = sorted[0] ? new Date(sorted[0].start_time).toLocaleDateString("pt-BR") : "Nenhum atendimento";

                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-semibold text-foreground">
                      {client.name}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {client.whatsapp ? (
                          <a 
                            href={`https://wa.me/55${client.whatsapp.replace(/\D/g, "")}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-teal-600 hover:underline"
                          >
                            {client.whatsapp} (WhatsApp)
                          </a>
                        ) : (
                          client.phone || <span className="text-muted-foreground italic text-xs">Sem contato</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.instagram ? (
                        <a 
                          href={`https://instagram.com/${client.instagram.replace("@", "")}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="hover:underline text-muted-foreground text-sm"
                        >
                          {client.instagram}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>CPF: {client.cpf || "-"}</div>
                      {client.birth_date && (
                        <div>Aniversário: {new Date(client.birth_date).toLocaleDateString("pt-BR")}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{lastDate}</TableCell>
                    <TableCell>
                      {client.status === "Ativa" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20">Ativa</Badge>
                      ) : (
                        <Badge variant="secondary">Inativa</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(client)}
                          className="rounded-full border-tiffany/60 text-tiffany-foreground hover:bg-tiffany/10 hover:text-tiffany-foreground"
                        >
                          <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Ficha
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Remover cliente "${client.name}" e todas as suas fichas permanentemente?`)) {
                              deleteClientMutation.mutate(client.id);
                            }
                          }}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Ficha Cliente Dialog / Tabs */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[700px] w-full max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl flex items-center gap-2">
              <Users className="h-6 w-6 text-tiffany" />
              {selectedClient ? `Ficha de ${selectedClient.name}` : "Cadastrar Cliente"}
            </DialogTitle>
            <DialogDescription>
              {selectedClient ? "Acesse dados cadastrais, questionário de cílios, autorizações e fotos." : "Preencha as informações básicas para iniciar o cadastro."}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onOpenChange={setActiveTab} className="w-full mt-2">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-muted/60">
              <TabsTrigger value="dados" className="text-xs py-1.5">Dados</TabsTrigger>
              <TabsTrigger value="anamnese" disabled={!selectedClient} className="text-xs py-1.5">Anamnese</TabsTrigger>
              <TabsTrigger value="consentimento" disabled={!selectedClient} className="text-xs py-1.5">Consentimento</TabsTrigger>
              <TabsTrigger value="fotos" disabled={!selectedClient} className="text-xs py-1.5">Fotos</TabsTrigger>
              <TabsTrigger value="mapping" disabled={!selectedClient} className="text-xs py-1.5">Mapping</TabsTrigger>
              <TabsTrigger value="historico" disabled={!selectedClient} className="text-xs py-1.5">Histórico</TabsTrigger>
            </TabsList>

            {/* TAB DADOS */}
            <TabsContent value="dados" className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="c-name">Nome Completo</Label>
                  <Input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-email">E-mail</Label>
                  <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="c-phone">Telefone</Label>
                  <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(67) 3333-3333" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-whatsapp">WhatsApp</Label>
                  <Input id="c-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(67) 99999-9999" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="c-insta">Instagram</Label>
                  <Input id="c-insta" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@usuario" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-birth">Nascimento</Label>
                  <Input id="c-birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-cpf">CPF</Label>
                  <Input id="c-cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="c-prof">Profissional Preferida</Label>
                  <select
                    id="c-prof"
                    value={preferredProfId}
                    onChange={(e) => setPreferredProfId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Nenhuma preferência</option>
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {selectedClient && (
                  <div className="space-y-1">
                    <Label htmlFor="c-status">Status</Label>
                    <select
                      id="c-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="Ativa">Ativa</option>
                      <option value="Inativa">Inativa</option>
                    </select>
                  </div>
                )}
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={() => saveClientMutation.mutate()} className="bg-tiffany text-tiffany-foreground hover:bg-tiffany/90">
                  Salvar Cliente
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* TAB ANAMNESE */}
            <TabsContent value="anamnese" className="py-4 space-y-4">
              <AnamneseForm 
                anamnesis={anamnesis} 
                onSave={(data) => saveAnamnesisMutation.mutate(data)}
                canvasRef={anamnesisCanvasRef}
                startDrawing={(e) => startDrawing(e, anamnesisCanvasRef.current!)}
                draw={(e) => draw(e, anamnesisCanvasRef.current!)}
                stopDrawing={stopDrawing}
                clearCanvas={() => clearCanvas(anamnesisCanvasRef.current)}
                getCanvasData={() => getCanvasData(anamnesisCanvasRef.current)}
              />
            </TabsContent>

            {/* TAB CONSENTIMENTO */}
            <TabsContent value="consentimento" className="py-4 space-y-4">
              <div className="space-y-3">
                <Label>Termo de Consentimento para Uso de Imagem</Label>
                <Textarea
                  className="min-h-[120px] text-sm leading-relaxed"
                  defaultValue={consent?.text_content || `Eu autorizo o Studio Bela Moça a utilizar imagens, fotos e vídeos do meu olhar e dos procedimentos realizados para fins de portfólio, mídias sociais e material de divulgação.`}
                  id="consent-text"
                />
                
                {consent?.signature ? (
                  <div className="space-y-1">
                    <Label>Assinatura Registrada:</Label>
                    <div className="border border-dashed border-border rounded-lg bg-muted/20 p-2 flex justify-center max-w-sm">
                      <img src={consent.signature} alt="Assinatura" className="max-h-28" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Assinar Termo (Canvas Digital):</Label>
                    <div className="border border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-muted/20 flex flex-col items-center">
                      <canvas
                        ref={consentCanvasRef}
                        width={400}
                        height={120}
                        onMouseDown={(e) => startDrawing(e, consentCanvasRef.current!)}
                        onMouseMove={(e) => draw(e, consentCanvasRef.current!)}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={(e) => startDrawing(e, consentCanvasRef.current!)}
                        onTouchMove={(e) => draw(e, consentCanvasRef.current!)}
                        onTouchEnd={stopDrawing}
                        className="cursor-crosshair bg-transparent"
                      />
                      <div className="flex w-full justify-between items-center bg-muted/40 px-3 py-1.5 border-t">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Assine acima</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => clearCanvas(consentCanvasRef.current)}
                          className="h-7 text-xs text-muted-foreground gap-1"
                        >
                          <RotateCcw className="h-3 w-3" /> Limpar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 justify-between">
                  <Button
                    type="button"
                    onClick={() => {
                      const textVal = (document.getElementById("consent-text") as HTMLTextAreaElement)?.value;
                      const signatureData = getCanvasData(consentCanvasRef.current);
                      
                      saveConsentMutation.mutate({
                        text_content: textVal,
                        signature: signatureData || consent?.signature,
                        signed_at: new Date().toISOString(),
                      });
                    }}
                    className="bg-primary text-primary-foreground"
                  >
                    <Save className="mr-2 h-4 w-4" /> Salvar Assinatura
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={exportConsentPDF}
                    className="border-primary/40"
                  >
                    <Download className="mr-2 h-4 w-4" /> Exportar PDF
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB FOTOS */}
            <TabsContent value="fotos" className="py-4 space-y-4">
              <ClientPhotosTab 
                photos={photos} 
                onAddPhoto={(url, category) => addPhotoMutation.mutate({ url, category })}
              />
            </TabsContent>

            {/* TAB MAPPING */}
            <TabsContent value="mapping" className="py-4 space-y-4">
              <ClientMappingTab
                mappings={clientMappings}
                onAddMapping={(m) => addMappingMutation.mutate(m)}
              />
            </TabsContent>

            {/* TAB HISTÓRICO */}
            <TabsContent value="historico" className="py-4">
              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!selectedClient?.appointments || selectedClient.appointments.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6 italic text-sm">
                          Nenhum agendamento encontrado para esta cliente.
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedClient.appointments.map((appt: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium text-xs">
                            {new Date(appt.start_time).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                          </TableCell>
                          <TableCell className="text-sm">{appt.service?.name || "Serviço"}</TableCell>
                          <TableCell className="text-sm">{appt.professional?.name || "Profissional"}</TableCell>
                          <TableCell className="text-sm font-semibold">R$ {Number(selectedClient.price || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize text-xs">
                              {appt.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -------------------------------------------------------------
// CHILD COMPONENT: AnamneseForm
// -------------------------------------------------------------
function AnamneseForm({ 
  anamnesis, 
  onSave, 
  canvasRef, 
  startDrawing, 
  draw, 
  stopDrawing, 
  clearCanvas,
  getCanvasData 
}: { 
  anamnesis: ClientAnamnesis | null; 
  onSave: (data: Partial<ClientAnamnesis>) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  startDrawing: (e: any) => void;
  draw: (e: any) => void;
  stopDrawing: () => void;
  clearCanvas: () => void;
  getCanvasData: () => string | null;
}) {
  const [alergias, setAlergias] = useState(anamnesis?.alergias || "");
  const [gestante, setGestante] = useState(anamnesis?.gestante || false);
  const [lactante, setLactante] = useState(anamnesis?.lactante || false);
  const [medicamentos, setMedicamentos] = useState(anamnesis?.medicamentos || "");
  const [problemasOculares, setProblemasOculares] = useState(anamnesis?.problemas_oculares || "");
  const [lentesContato, setLentesContato] = useState(anamnesis?.lentes_contato || false);
  const [doencas, setDoencas] = useState(anamnesis?.doencas || "");
  const [contraindicacoes, setContraindicacoes] = useState(anamnesis?.contraindicacoes || "");

  // Update states when anamnesis loads
  useEffect(() => {
    if (anamnesis) {
      setAlergias(anamnesis.alergias || "");
      setGestante(anamnesis.gestante || false);
      setLactante(anamnesis.lactante || false);
      setMedicamentos(anamnesis.medicamentos || "");
      setProblemasOculares(anamnesis.problemas_oculares || "");
      setLentesContato(anamnesis.lentes_contato || false);
      setDoencas(anamnesis.doencas || "");
      setContraindicacoes(anamnesis.contraindicacoes || "");
    }
  }, [anamnesis]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const signatureBase64 = getCanvasData();
    onSave({
      alergias,
      gestante,
      lactante,
      medicamentos,
      problemas_oculares: problemasOculares,
      lentes_contato: lentesContato,
      doencas,
      contraindicacoes,
      signature: signatureBase64 || anamnesis?.signature,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="alergias">Alergias (Substâncias/Produtos)</Label>
          <Input id="alergias" value={alergias} onChange={(e) => setAlergias(e.target.value)} placeholder="Ex: Esmaltes, látex, etc." />
        </div>
        <div className="space-y-1">
          <Label htmlFor="medicamentos">Medicamentos de uso contínuo</Label>
          <Input id="medicamentos" value={medicamentos} onChange={(e) => setMedicamentos(e.target.value)} placeholder="Remédios regulares" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 py-1 bg-muted/20 p-2.5 rounded-lg border border-border/80">
        <div className="flex items-center space-x-1.5">
          <Checkbox id="gestante" checked={gestante} onCheckedChange={(c) => setGestante(!!c)} />
          <Label htmlFor="gestante" className="cursor-pointer">Gestante</Label>
        </div>
        <div className="flex items-center space-x-1.5">
          <Checkbox id="lactante" checked={lactante} onCheckedChange={(c) => setLactante(!!c)} />
          <Label htmlFor="lactante" className="cursor-pointer">Lactante</Label>
        </div>
        <div className="flex items-center space-x-1.5">
          <Checkbox id="lentes" checked={lentesContato} onCheckedChange={(c) => setLentesContato(!!c)} />
          <Label htmlFor="lentes" className="cursor-pointer">Usa lentes de contato</Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="doencas">Doenças Sistêmicas / Crônicas</Label>
          <Input id="doencas" value={doencas} onChange={(e) => setDoencas(e.target.value)} placeholder="Ex: Diabetes, tireoide" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="problemas">Problemas Oculares Recentes</Label>
          <Input id="problemas" value={problemasOculares} onChange={(e) => setProblemasOculares(e.target.value)} placeholder="Ex: Conjuntivite, glaucoma" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="contraindicacoes">Contraindicações Notadas</Label>
        <Input id="contraindicacoes" value={contraindicacoes} onChange={(e) => setContraindicacoes(e.target.value)} placeholder="Sensibilidade ocular, etc." />
      </div>

      {anamnesis?.signature ? (
        <div className="space-y-1">
          <Label>Assinatura Digital Registrada:</Label>
          <div className="border border-dashed border-border rounded-lg bg-muted/20 p-2 flex justify-center max-w-sm">
            <img src={anamnesis.signature} alt="Assinatura" className="max-h-28" />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label>Assinatura Digital (Canvas Mouse/Touch):</Label>
          <div className="border border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-muted/20 flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={400}
              height={120}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="cursor-crosshair bg-transparent"
            />
            <div className="flex w-full justify-between items-center bg-muted/40 px-3 py-1.5 border-t">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Escreva sua assinatura digital</span>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={clearCanvas}
                className="h-7 text-xs text-muted-foreground gap-1"
              >
                <RotateCcw className="h-3 w-3" /> Limpar
              </Button>
            </div>
          </div>
        </div>
      )}

      <Button type="submit" className="w-full bg-tiffany text-tiffany-foreground hover:bg-tiffany/90">
        <Save className="mr-2 h-4 w-4" /> Salvar Ficha de Anamnese
      </Button>
    </form>
  );
}

// -------------------------------------------------------------
// CHILD COMPONENT: ClientPhotosTab
// -------------------------------------------------------------
function ClientPhotosTab({ 
  photos, 
  onAddPhoto 
}: { 
  photos: ClientPhoto[]; 
  onAddPhoto: (url: string, category: string) => void;
}) {
  const [photoUrl, setPhotoUrl] = useState("");
  const [category, setCategory] = useState("Antes");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        onAddPhoto(reader.result, category);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4 bg-muted/10 sm:flex-row sm:items-end">
        <div className="space-y-1 flex-1">
          <Label htmlFor="p-url">Foto (Cole o Link ou envie um arquivo)</Label>
          <Input 
            id="p-url" 
            placeholder="https://exemplo.com/foto.jpg" 
            value={photoUrl} 
            onChange={(e) => setPhotoUrl(e.target.value)} 
          />
        </div>
        <div className="space-y-1 sm:w-36">
          <Label htmlFor="p-cat">Categoria</Label>
          <select
            id="p-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="Antes">Antes</option>
            <option value="Depois">Depois</option>
            <option value="Mapping">Mapping</option>
            <option value="Retencao">Retenção</option>
            <option value="Outras">Outras</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button 
            type="button" 
            onClick={() => {
              if (photoUrl) {
                onAddPhoto(photoUrl, category);
                setPhotoUrl("");
              }
            }}
            className="bg-primary text-primary-foreground font-medium"
          >
            Adicionar URL
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            className="border-dashed"
          >
            <Camera className="mr-1.5 h-4 w-4" /> Enviar Arquivo
          </Button>
        </div>
      </div>

      {photos.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground italic py-8 border border-dashed rounded-lg">
          Nenhuma foto anexada a esta cliente ainda.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {photos.map((p) => (
            <div key={p.id} className="relative group overflow-hidden rounded-xl border border-border bg-card">
              <img src={p.url} alt={p.category} className="aspect-square w-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white">
                <span className="text-xs uppercase tracking-widest font-semibold text-tiffany">{p.category}</span>
                <span className="text-[10px] text-gray-300">
                  {new Date(p.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// CHILD COMPONENT: ClientMappingTab
// -------------------------------------------------------------
function ClientMappingTab({ 
  mappings, 
  onAddMapping 
}: { 
  mappings: ClientMapping[]; 
  onAddMapping: (m: Partial<ClientMapping>) => void;
}) {
  const [curvaturas, setCurvaturas] = useState("");
  const [espessuras, setEspessuras] = useState("");
  const [mappingType, setMappingType] = useState("");
  const [marcaFios, setMarcaFios] = useState("");
  const [marcaCola, setMarcaCola] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const handleSubmitMapping = (e: React.FormEvent) => {
    e.preventDefault();
    onAddMapping({
      curvaturas,
      espessuras,
      mapping_type: mappingType,
      marca_fios: marcaFios,
      marca_cola: marcaCola,
      observacoes,
    });
    // clear fields
    setCurvaturas("");
    setEspessuras("");
    setMappingType("");
    setMarcaFios("");
    setMarcaCola("");
    setObservacoes("");
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmitMapping} className="rounded-lg border border-border p-4 bg-muted/10 space-y-3">
        <h4 className="font-serif text-sm font-semibold text-foreground flex items-center gap-1.5">
          <MapIcon className="h-4 w-4 text-tiffany" /> Registrar Novo Mapping Técnico
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="m-curv">Curvaturas</Label>
            <Input id="m-curv" placeholder="Ex: C, D, L" value={curvaturas} onChange={(e) => setCurvaturas(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="m-esp">Espessuras</Label>
            <Input id="m-esp" placeholder="Ex: 0.07, 0.15" value={espessuras} onChange={(e) => setEspessuras(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="m-type">Tipo de Mapping</Label>
            <Input id="m-type" placeholder="Ex: Boneca, Gatinho" value={mappingType} onChange={(e) => setMappingType(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="m-fios">Marca dos Fios</Label>
            <Input id="m-fios" placeholder="Ex: Nagaraku" value={marcaFios} onChange={(e) => setMarcaFios(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="m-cola">Marca da Cola</Label>
            <Input id="m-cola" placeholder="Ex: Elite HS-10" value={marcaCola} onChange={(e) => setMarcaCola(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="m-obs">Observações / Mapa (Tamanhos e Setores)</Label>
          <Textarea id="m-obs" placeholder="Ex: Setor 1: 8mm, Setor 2: 10mm, Setor 3: 12mm..." rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>

        <Button type="submit" className="w-full bg-primary text-primary-foreground font-medium">
          <PlusCircle className="mr-1.5 h-4 w-4" /> Salvar Mapping
        </Button>
      </form>

      {mappings.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground italic py-8 border border-dashed rounded-lg">
          Nenhum mapping técnico registrado para esta cliente ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {mappings.map((m) => (
            <div key={m.id} className="rounded-xl border border-border p-4 bg-card shadow-xs text-sm">
              <div className="flex justify-between items-center mb-2 pb-1 border-b">
                <span className="font-serif text-sm font-semibold text-tiffany-foreground">
                  Tipo: {m.mapping_type || "Não especificado"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(m.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div><span className="font-medium text-foreground">Curvaturas:</span> {m.curvaturas || "-"}</div>
                <div><span className="font-medium text-foreground">Espessuras:</span> {m.espessuras || "-"}</div>
                <div><span className="font-medium text-foreground">Marca Fios:</span> {m.marca_fios || "-"}</div>
                <div><span className="font-medium text-foreground">Marca Cola:</span> {m.marca_cola || "-"}</div>
              </div>
              {m.observacoes && (
                <div className="mt-2.5 bg-muted/20 p-2 rounded-lg border text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-0.5">Observações / Setores:</p>
                  <p className="whitespace-pre-line">{m.observacoes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
