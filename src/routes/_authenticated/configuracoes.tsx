import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Settings, Save, Upload, MessageSquare, Building2, ShieldCheck, Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const [loading, setLoading] = useState(false);

  // Settings state loaded from localStorage or default
  const [salonName, setSalonName] = useState("Studio Bela Moça");
  const [salonPhone, setSalonPhone] = useState("(67) 99999-9999");
  const [salonEmail, setSalonEmail] = useState("studiobelamocacg@gmail.com");
  const [instagramUrl, setInstagramUrl] = useState("https://instagram.com/studiobelamoca");
  
  // WhatsApp Template state
  const [birthdayTemplate, setBirthdayTemplate] = useState(
    "Parabéns pelo seu aniversário, {nome}! 🌸 Temos um presente especial te esperando aqui no Studio Bela Moça. Agende um horário para comemorar!"
  );
  const [recallTemplate, setRecallTemplate] = useState(
    "Olá, {nome}! Sentimos sua falta aqui no Studio Bela Moça. 💖 Que tal renovarmos seu olhar? Agende seu horário online em: {link}"
  );

  // RLS / Policy defaults
  const [requireAnamnesis, setRequireAnamnesis] = useState(true);
  const [allowPublicBooking, setAllowPublicBooking] = useState(true);

  // Load config on mount
  useEffect(() => {
    const savedName = localStorage.getItem("settings_salon_name");
    const savedPhone = localStorage.getItem("settings_salon_phone");
    const savedEmail = localStorage.getItem("settings_salon_email");
    const savedInsta = localStorage.getItem("settings_salon_insta");
    const savedBday = localStorage.getItem("settings_template_birthday");
    const savedRecall = localStorage.getItem("settings_template_recall");
    const savedAnam = localStorage.getItem("settings_require_anamnesis");
    const savedPub = localStorage.getItem("settings_allow_public");

    if (savedName) setSalonName(savedName);
    if (savedPhone) setSalonPhone(savedPhone);
    if (savedEmail) setSalonEmail(savedEmail);
    if (savedInsta) setInstagramUrl(savedInsta);
    if (savedBday) setBirthdayTemplate(savedBday);
    if (savedRecall) setRecallTemplate(savedRecall);
    if (savedAnam) setRequireAnamnesis(savedAnam === "true");
    if (savedPub) setAllowPublicBooking(savedPub === "true");
  }, []);

  const handleSave = () => {
    setLoading(true);
    
    // Save to localStorage
    localStorage.setItem("settings_salon_name", salonName);
    localStorage.setItem("settings_salon_phone", salonPhone);
    localStorage.setItem("settings_salon_email", salonEmail);
    localStorage.setItem("settings_salon_insta", instagramUrl);
    localStorage.setItem("settings_template_birthday", birthdayTemplate);
    localStorage.setItem("settings_template_recall", recallTemplate);
    localStorage.setItem("settings_require_anamnesis", String(requireAnamnesis));
    localStorage.setItem("settings_allow_public", String(allowPublicBooking));

    setTimeout(() => {
      setLoading(false);
      toast.success("Configurações atualizadas com sucesso!");
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Configurações
        </h2>
        <p className="text-sm text-muted-foreground">
          Gerencie informações de contato, mensagens automáticas de WhatsApp e preferências do sistema.
        </p>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/60 p-1">
          <TabsTrigger value="geral" className="text-xs">Estúdio</TabsTrigger>
          <TabsTrigger value="mensagens" className="text-xs">Mensagens</TabsTrigger>
          <TabsTrigger value="politicas" className="text-xs">Políticas</TabsTrigger>
        </TabsList>

        {/* GENERAL TAB */}
        <TabsContent value="geral" className="mt-4">
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="font-serif text-base font-semibold flex items-center gap-1.5">
                <Building2 className="h-4.5 w-4.5 text-tiffany" />
                Dados do Estúdio
              </CardTitle>
              <CardDescription>Informações expostas na home de agendamento público.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="s-name">Nome do Salão</Label>
                  <Input 
                    id="s-name" 
                    value={salonName} 
                    onChange={(e) => setSalonName(e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s-phone">WhatsApp Principal (Exibição)</Label>
                  <Input 
                    id="s-phone" 
                    value={salonPhone} 
                    onChange={(e) => setSalonPhone(e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="s-email">E-mail de Contato</Label>
                  <Input 
                    id="s-email" 
                    type="email"
                    value={salonEmail} 
                    onChange={(e) => setSalonEmail(e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s-insta">Perfil do Instagram (Link)</Label>
                  <Input 
                    id="s-insta" 
                    value={instagramUrl} 
                    onChange={(e) => setInstagramUrl(e.target.value)} 
                  />
                </div>
              </div>

              <div className="pt-2">
                <Label>Logo do Estúdio</Label>
                <div className="mt-2 border border-dashed rounded-xl p-6 flex flex-col items-center justify-center bg-muted/10 max-w-sm">
                  <div className="h-14 w-14 rounded-full bg-tiffany/20 text-tiffany-foreground grid place-items-center mb-3">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <Button type="button" variant="outline" size="sm" className="text-xs">
                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Enviar Novo Logo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WHATSAPP MESSAGES TAB */}
        <TabsContent value="mensagens" className="mt-4">
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="font-serif text-base font-semibold flex items-center gap-1.5">
                <MessageSquare className="h-4.5 w-4.5 text-tiffany" />
                Modelos de WhatsApp (Relacionamento)
              </CardTitle>
              <CardDescription>Defina os textos padrão disparados ao interagir com as clientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="t-bday">Mensagem de Aniversário</Label>
                <Textarea 
                  id="t-bday" 
                  value={birthdayTemplate} 
                  onChange={(e) => setBirthdayTemplate(e.target.value)} 
                  rows={3}
                  className="text-xs leading-relaxed"
                />
                <span className="text-[10px] text-muted-foreground">
                  Use <code className="font-mono bg-muted px-1 py-0.5 rounded">{`{nome}`}</code> para preencher o nome da cliente automaticamente.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="t-recall">Mensagem de Resgate (Inativas 30/60/90 dias)</Label>
                <Textarea 
                  id="t-recall" 
                  value={recallTemplate} 
                  onChange={(e) => setRecallTemplate(e.target.value)} 
                  rows={3}
                  className="text-xs leading-relaxed"
                />
                <span className="text-[10px] text-muted-foreground">
                  Use <code className="font-mono bg-muted px-1 py-0.5 rounded">{`{nome}`}</code> e <code className="font-mono bg-muted px-1 py-0.5 rounded">{`{link}`}</code> para o link de agendamento.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY & RULES TAB */}
        <TabsContent value="politicas" className="mt-4">
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="font-serif text-base font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5 text-tiffany" />
                Políticas e Segurança
              </CardTitle>
              <CardDescription>Regras e validações aplicadas no sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-xl bg-card">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Exigir Ficha de Anamnese</h4>
                  <p className="text-[10px] text-muted-foreground">Bloqueia atendimento se a ficha não estiver assinada.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={requireAnamnesis} 
                  onChange={(e) => setRequireAnamnesis(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-xl bg-card">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Permitir Agendamento Público</h4>
                  <p className="text-[10px] text-muted-foreground">Deixa a página `/agendar` aberta para clientes.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={allowPublicBooking} 
                  onChange={(e) => setAllowPublicBooking(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button 
          onClick={handleSave} 
          disabled={loading}
          className="bg-tiffany hover:bg-tiffany/90 text-tiffany-foreground font-medium rounded-full px-6"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-1.5 h-4 w-4" /> Salvar Configurações</>}
        </Button>
      </div>
    </div>
  );
}
