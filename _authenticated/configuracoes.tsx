import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings, Save, Upload, MessageSquare, Building2, ShieldCheck, Loader2, KeyRound, UserPlus, Trash2
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

  // New User Form State
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "professional">("professional");
  const [creatingUser, setCreatingUser] = useState(false);

  // Fetch Users and Roles
  const { data: usersList = [], refetch: refetchUsers } = useQuery({
    queryKey: ["usersList"],
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase.from("user_roles").select("*");
      if (rolesErr) throw rolesErr;
      
      const { data: profiles, error: profErr } = await supabase.from("profiles").select("*");
      if (profErr) throw profErr;
      
      return roles.map((r: any) => {
        const p = profiles.find((profile: any) => profile.id === r.user_id);
        return {
          id: r.id,
          userId: r.user_id,
          role: r.role,
          name: p?.full_name || "Profissional",
          createdAt: r.created_at
        };
      });
    }
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserPassword.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres");
      return;
    }
    setCreatingUser(true);
    
    try {
      // Use direct fetch to bypass local storage session takeover by supabase-js auth.signUp
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: {
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          data: {
            full_name: newUserName
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.msg || result.message || "Erro no cadastro");
      }

      if (result.id) {
        // Assign role in public.user_roles
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: result.id,
            role: newUserRole
          });

        if (roleError) {
          toast.error("Usuário criado na autenticação, mas erro ao definir cargo: " + roleError.message);
        } else {
          toast.success(`Usuário ${newUserName} criado com sucesso como ${newUserRole === "admin" ? "Administrador" : "Profissional"}!`);
          setNewUserEmail("");
          setNewUserPassword("");
          setNewUserName("");
          refetchUsers();
        }
      }
    } catch (err: any) {
      toast.error("Erro ao criar usuário: " + err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, roleId: number) => {
    // Prevent deleting own user (check active session user id)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id === userId) {
      toast.error("Você não pode remover o seu próprio acesso!");
      return;
    }

    if (confirm("Tem certeza que deseja remover o acesso deste usuário?")) {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) {
        toast.error("Erro ao remover acesso: " + error.message);
      } else {
        toast.success("Acesso removido com sucesso!");
        refetchUsers();
      }
    }
  };

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
        <TabsList className="grid w-full grid-cols-4 max-w-lg bg-muted/60 p-1">
          <TabsTrigger value="geral" className="text-xs">Estúdio</TabsTrigger>
          <TabsTrigger value="mensagens" className="text-xs">Mensagens</TabsTrigger>
          <TabsTrigger value="politicas" className="text-xs">Políticas</TabsTrigger>
          <TabsTrigger value="acessos" className="text-xs">Acessos</TabsTrigger>
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

        {/* ACCESS CONTROL TAB */}
        <TabsContent value="acessos" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Create User Form */}
            <Card className="border-border shadow-xs">
              <CardHeader>
                <CardTitle className="font-serif text-base font-semibold flex items-center gap-1.5">
                  <UserPlus className="h-4.5 w-4.5 text-tiffany" />
                  Criar Novo Usuário / Profissional
                </CardTitle>
                <CardDescription>Registre novas profissionais e defina seu nível de acesso privado.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-name">Nome Completo</Label>
                    <Input
                      id="new-name"
                      required
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Ex: Ana Souza"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-email">E-mail</Label>
                    <Input
                      id="new-email"
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="ana@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Senha (mín. 6 caracteres)</Label>
                    <Input
                      id="new-password"
                      type="password"
                      required
                      minLength={6}
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="******"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-role">Nível de Acesso</Label>
                    <select
                      id="new-role"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as "admin" | "professional")}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="professional">Profissional (Visualiza agenda)</option>
                      <option value="admin">Administrador (Acesso total)</option>
                    </select>
                  </div>
                  <Button type="submit" disabled={creatingUser} className="w-full bg-tiffany hover:bg-tiffany/90 text-tiffany-foreground font-medium rounded-full">
                    {creatingUser ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <><UserPlus className="mr-1.5 h-4 w-4" /> Criar Conta de Acesso</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Users List */}
            <Card className="border-border shadow-xs">
              <CardHeader>
                <CardTitle className="font-serif text-base font-semibold flex items-center gap-1.5">
                  <KeyRound className="h-4.5 w-4.5 text-tiffany" />
                  Controle de Acessos Ativos
                </CardTitle>
                <CardDescription>Lista de profissionais e administradores cadastrados com login ativo.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {usersList.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum usuário cadastrado.</p>
                  ) : (
                    usersList.map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-xl bg-card">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-semibold text-foreground">{user.name}</h4>
                          <span className="inline-block text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {user.role === "admin" ? "Administrador" : "Profissional"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user.userId, user.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                          title="Remover Acesso"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
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
