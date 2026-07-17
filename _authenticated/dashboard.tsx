import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, CalendarDays, Wallet, AlertTriangle, Gift, ArrowRight, MessageSquare, Loader2, Sparkles
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  LineChart, Line, PieChart, Pie, Cell 
} from "recharts";
import { format, isToday, subDays, addDays, startOfMonth, startOfYear } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Client, Appointment, FinancialRecord, InventoryItem } from "@/types/database.types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const COLORS = ["#AEE9E1", "#0D9488", "#78716c", "#eab308", "#6366f1"];

function DashboardPage() {
  // Fetch Clients
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          appointments:appointments(start_time, status)
        `);
      if (error) throw error;
      return data;
    },
  });

  // Fetch Appointments
  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, service:services(*)");
      if (error) throw error;
      return data;
    },
  });

  // Fetch Financial Records
  const { data: financialRecords = [], isLoading: loadingFinance } = useQuery({
    queryKey: ["financial_records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("*");
      if (error) throw error;
      return data as FinancialRecord[];
    },
  });

  // Fetch Inventory items
  const { data: inventoryItems = [], isLoading: loadingInventory } = useQuery({
    queryKey: ["inventory_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*");
      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  const loading = loadingClients || loadingAppointments || loadingFinance || loadingInventory;

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-tiffany" />
      </div>
    );
  }

  // --- STATS CALCULATIONS ---

  // 1. Clients
  const activeClients = clients.filter((c) => c.status === "Ativa").length;
  const currentMonthStart = startOfMonth(new Date());
  const newClientsThisMonth = clients.filter(
    (c) => new Date(c.created_at) >= currentMonthStart
  ).length;

  // 2. Appointments
  const apptsToday = appointments.filter((a) => isToday(new Date(a.start_time))).length;
  const apptsThisMonth = appointments.filter(
    (a) => new Date(a.start_time) >= currentMonthStart && a.status !== "cancelado"
  ).length;

  // 3. Finance
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const currentYearStart = startOfYear(new Date());

  const financeToday = financialRecords.filter((r) => r.record_date === todayStr);
  const revenueToday = financeToday.filter((r) => r.type === "entrada").reduce((sum, r) => sum + Number(r.amount), 0);
  const expenseToday = financeToday.filter((r) => r.type === "saida").reduce((sum, r) => sum + Number(r.amount), 0);

  const financeMonth = financialRecords.filter((r) => new Date(r.record_date + "T12:00:00") >= currentMonthStart);
  const revenueMonth = financeMonth.filter((r) => r.type === "entrada").reduce((sum, r) => sum + Number(r.amount), 0);
  const expenseMonth = financeMonth.filter((r) => r.type === "saida").reduce((sum, r) => sum + Number(r.amount), 0);
  const profitMonth = revenueMonth - expenseMonth;

  // 4. Low stock alerts
  const lowStockItems = inventoryItems.filter((i) => i.quantity <= i.min_quantity);

  // 5. Birthdays today and next 7 days
  const todayObj = new Date();
  const nextWeekObj = addDays(todayObj, 7);

  const birthdayClients = clients.filter((c) => {
    if (!c.birth_date) return false;
    const bDate = new Date(c.birth_date);
    
    // Create birthday this year
    const bThisYear = new Date(todayObj.getFullYear(), bDate.getMonth(), bDate.getDate());
    
    // If birthday already passed this year, check if next year fits inside the 7 days (edge case for late December)
    let checkDate = bThisYear;
    if (bThisYear.getTime() < todayObj.setHours(0,0,0,0)) {
      checkDate = new Date(todayObj.getFullYear() + 1, bDate.getMonth(), bDate.getDate());
    }

    const tZero = new Date();
    tZero.setHours(0,0,0,0);
    const wZero = new Date();
    wZero.setDate(wZero.getDate() + 7);
    wZero.setHours(23,59,59,999);

    return checkDate.getTime() >= tZero.getTime() && checkDate.getTime() <= wZero.getTime();
  });

  // 6. Inactive / "Sem Retorno" clients list (no visits in last 30, 60 or 90 days)
  const inactiveClients = clients
    .map((client) => {
      const appts = client.appointments || [];
      const valid = appts.filter((a: any) => a.status === "concluido");
      const sorted = [...valid].sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
      
      const lastVisitTime = sorted[0] ? new Date(sorted[0].start_time).getTime() : 0;
      const daysSince = lastVisitTime ? (Date.now() - lastVisitTime) / (1000 * 60 * 60 * 24) : 9999;
      
      return {
        ...client,
        daysSince: Math.floor(daysSince),
        lastVisitDate: lastVisitTime ? new Date(lastVisitTime).toLocaleDateString("pt-BR") : "Nenhum atendimento",
      };
    })
    .filter((c) => c.daysSince >= 30 && c.status === "Ativa")
    .sort((a, b) => b.daysSince - a.daysSince)
    .slice(0, 5); // top 5 most inactive

  // --- CHART DATA GENERATION ---

  // A. Revenue evolution (last 6 months)
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const revenueByMonth = Array.from({ length: 6 }).map((_, i) => {
    const d = subDays(new Date(), (5 - i) * 30);
    const mIdx = d.getMonth();
    const yr = d.getFullYear();
    const label = `${months[mIdx]}/${String(yr).substring(2)}`;
    
    const mRecords = financialRecords.filter((r) => {
      const recordDate = new Date(r.record_date + "T12:00:00");
      return recordDate.getMonth() === mIdx && recordDate.getFullYear() === yr;
    });

    const entries = mRecords.filter((r) => r.type === "entrada").reduce((sum, r) => sum + Number(r.amount), 0);
    const exits = mRecords.filter((r) => r.type === "saida").reduce((sum, r) => sum + Number(r.amount), 0);

    return {
      name: label,
      Receitas: entries,
      Despesas: exits,
      Lucro: entries - exits,
    };
  });

  // B. Services Category Share
  const servicesByCategoryMap: Record<string, number> = {};
  appointments.forEach((appt) => {
    if (appt.status === "concluido" && appt.service) {
      const cat = appt.service.category || "Outros";
      servicesByCategoryMap[cat] = (servicesByCategoryMap[cat] || 0) + 1;
    }
  });

  const categoryChartData = Object.entries(servicesByCategoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  // C. Customer Growth (last 6 months)
  const customerGrowthData = Array.from({ length: 6 }).map((_, i) => {
    const d = subDays(new Date(), (5 - i) * 30);
    const mIdx = d.getMonth();
    const yr = d.getFullYear();
    const label = `${months[mIdx]}/${String(yr).substring(2)}`;
    
    // Count cumulative clients up to that month's end
    const endOfMonthDate = new Date(yr, mIdx + 1, 0, 23, 59, 59, 999);
    const count = clients.filter((c) => new Date(c.created_at) <= endOfMonthDate).length;

    return {
      name: label,
      Clientes: count,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Dashboard Executivo
        </h2>
        <p className="text-sm text-muted-foreground">
          Visão geral do faturamento, agenda, equipe e inventário do Studio Bela Moça.
        </p>
      </div>

      {/* Main KPI Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-xs hover:border-tiffany/50 transition-all border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Clientes Ativas</CardTitle>
            <Users className="h-4.5 w-4.5 text-tiffany" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeClients}</div>
            <p className="text-[10px] text-muted-foreground mt-1">
              +{newClientsThisMonth} novas clientes cadastradas este mês
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:border-tiffany/50 transition-all border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Agenda do Mês</CardTitle>
            <CalendarDays className="h-4.5 w-4.5 text-tiffany" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{apptsThisMonth}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium text-teal-600">
              {apptsToday} atendimentos agendados para hoje
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:border-tiffany/50 transition-all border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Faturamento (Mês)</CardTitle>
            <Wallet className="h-4.5 w-4.5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">R$ {revenueMonth.toFixed(2)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Hoje: R$ {revenueToday.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:border-tiffany/50 transition-all border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Lucro Líquido (Mês)</CardTitle>
            <Wallet className="h-4.5 w-4.5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">R$ {profitMonth.toFixed(2)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Despesas no mês: R$ {expenseMonth.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts area */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Evolution Chart */}
        <Card className="lg:col-span-2 border-border shadow-xs">
          <CardHeader>
            <CardTitle className="font-serif text-base font-semibold">Faturamento e Despesas Recentes</CardTitle>
            <CardDescription>Fluxo de caixa consolidado nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#a3a3a3" fontSize={11} />
                <YAxis stroke="#a3a3a3" fontSize={11} />
                <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Receitas" fill="#0D9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Categories Share Chart */}
        <Card className="border-border shadow-xs">
          <CardHeader>
            <CardTitle className="font-serif text-base font-semibold">Procedimentos Concluídos</CardTitle>
            <CardDescription>Principais categorias no estúdio</CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex flex-col justify-center items-center">
            {categoryChartData.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Sem atendimentos concluídos para exibir gráfico</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="75%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground mt-3">
                  {categoryChartData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span>{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Row: Lists, Alerts & Relationship */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Low Stock & Birthdays */}
        <div className="space-y-6 lg:col-span-1">
          {/* Inventory warning */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                Alertas de Estoque Baixo
              </CardTitle>
              <CardDescription>Produtos que atingiram o limite mínimo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {lowStockItems.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3">Estoque completo. Nenhum alerta pendente.</p>
              ) : (
                lowStockItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border p-2 rounded-xl bg-amber-500/5 border-amber-200">
                    <div className="min-w-0">
                      <p className="font-medium text-xs truncate text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.brand || "Sem marca"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge className="bg-amber-600 hover:bg-amber-600 text-white text-[10px] px-1.5">
                        Qtd: {item.quantity} / Mín: {item.min_quantity}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Birthdays warning */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-sm font-semibold flex items-center gap-2">
                <Gift className="h-4.5 w-4.5 text-tiffany-foreground" />
                Aniversariantes Próximos
              </CardTitle>
              <CardDescription>Clientes fazendo aniversário nos próximos 7 dias</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {birthdayClients.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3">Nenhum aniversário nos próximos dias.</p>
              ) : (
                birthdayClients.map((c) => (
                  <div key={c.id} className="flex justify-between items-center border p-2 rounded-xl bg-tiffany/5 border-tiffany/30">
                    <div>
                      <p className="font-medium text-xs text-foreground">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.birth_date && new Date(c.birth_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    {c.whatsapp && (
                      <Button asChild size="icon" variant="ghost" className="h-7 w-7 text-teal-600 shrink-0">
                        <a 
                          href={`https://wa.me/55${c.whatsapp.replace(/\D/g, "")}?text=Parabéns%20pelo%20seu%20aniversário,%20${c.name}!%20Temos%20um%20presente%20especial%20te%20esperando%20aqui%20no%20Studio%20Bela%20Moça.`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Relationship: Inactive clients to recall */}
        <Card className="lg:col-span-2 border-border shadow-xs">
          <CardHeader>
            <CardTitle className="font-serif text-base font-semibold">Resgatar Clientes (Inativas)</CardTitle>
            <CardDescription>Clientes que não realizam atendimentos há 30 dias ou mais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {inactiveClients.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4">Ótimo! Todas as clientes agendaram recentemente.</p>
            ) : (
              inactiveClients.map((c) => (
                <div key={c.id} className="flex justify-between items-center border p-3 rounded-xl bg-card hover:bg-muted/5 transition-all text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Último serviço: {c.lastVisitDate} ({c.daysSince} dias atrás)
                    </p>
                  </div>
                  {c.whatsapp && (
                    <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white rounded-full font-medium h-8">
                      <a 
                        href={`https://wa.me/55${c.whatsapp.replace(/\D/g, "")}?text=Olá,%20${c.name}!%20Sentimos%20sua%20falta%20aqui%20no%20Studio%20Bela%20Moça.%20Que%20tal%20renovarmos%20seu%20olhar?%20Agende%20seu%20horário%20em:%20${window.location.origin}/agendar`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Enviar Mensagem
                      </a>
                    </Button>
                  )}
                </div>
              ))
            )}
            <div className="pt-2 text-right">
              <Button asChild variant="link" size="sm" className="text-xs text-tiffany-foreground/80 hover:text-tiffany-foreground font-semibold">
                <Link to="/clientes">Ver lista completa de clientes <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Growth Graph */}
      <Card className="border-border shadow-xs">
        <CardHeader>
          <CardTitle className="font-serif text-base font-semibold">Crescimento da Base de Clientes</CardTitle>
          <CardDescription>Evolução acumulativa de cadastros de clientes</CardDescription>
        </CardHeader>
        <CardContent className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={customerGrowthData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="#a3a3a3" fontSize={11} />
              <YAxis stroke="#a3a3a3" fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="Clientes" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
