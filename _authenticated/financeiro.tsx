import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Wallet, Plus, ArrowUpCircle, ArrowDownCircle, Search, Filter, Loader2, DollarSign, Calendar, Edit, Trash2
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
import type { FinancialRecord } from "@/types/database.types";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all', 'entrada', 'saida'
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  
  // Form State
  const [type, setType] = useState<"entrada" | "saida">("entrada");
  const [category, setCategory] = useState("Atendimento");
  const [amount, setAmount] = useState(0.00);
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [recordDate, setRecordDate] = useState(new Date().toISOString().substring(0, 10));

  // Fetch Financial Records
  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ["financial_records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .order("record_date", { ascending: false });
      if (error) throw error;
      return data as FinancialRecord[];
    },
  });

  const handleAddClick = (defaultType: "entrada" | "saida") => {
    setEditingRecord(null);
    setType(defaultType);
    setCategory(defaultType === "entrada" ? "Atendimento" : "Produtos");
    setAmount(0.00);
    setDescription("");
    setPaymentMethod("PIX");
    setRecordDate(new Date().toISOString().substring(0, 10));
    setIsDialogOpen(true);
  };

  const handleEditClick = (record: FinancialRecord) => {
    setEditingRecord(record);
    setType(record.type);
    setCategory(record.category);
    setAmount(Number(record.amount));
    setDescription(record.description || "");
    setPaymentMethod(record.payment_method || "PIX");
    setRecordDate(record.record_date);
    setIsDialogOpen(true);
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        type,
        category,
        amount,
        description,
        payment_method: paymentMethod,
        record_date: recordDate,
        updated_at: new Date().toISOString(),
      };

      if (editingRecord) {
        const { error } = await supabase
          .from("financial_records")
          .update(payload)
          .eq("id", editingRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("financial_records")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_records"] });
      toast.success(editingRecord ? "Lançamento atualizado!" : "Lançamento registrado!");
      setIsDialogOpen(false);
    },
    onError: (err) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_records")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_records"] });
      toast.success("Lançamento excluído!");
    },
    onError: (err) => {
      toast.error("Erro ao excluir: " + err.message);
    },
  });

  // Calculate totals
  const totalEntradas = records
    .filter((r) => r.type === "entrada")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalSaidas = records
    .filter((r) => r.type === "saida")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const saldo = totalEntradas - totalSaidas;

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchesSearch = 
      r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === "all" || r.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || r.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  const categories = Array.from(new Set(records.map((r) => r.category)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Financeiro
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitore o fluxo de caixa, registre receitas, despesas corporativas e comissões da equipe.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleAddClick("entrada")} 
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nova Entrada
          </Button>
          <Button 
            onClick={() => handleAddClick("saida")} 
            variant="outline"
            className="rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-medium"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nova Saída
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/20 p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-emerald-800 font-semibold">Total Receitas</span>
            <p className="font-serif text-2xl font-bold text-emerald-600">R$ {totalEntradas.toFixed(2)}</p>
          </div>
          <ArrowUpCircle className="h-10 w-10 text-emerald-500/80" />
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/20 p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-rose-800 font-semibold">Total Despesas</span>
            <p className="font-serif text-2xl font-bold text-rose-600">R$ {totalSaidas.toFixed(2)}</p>
          </div>
          <ArrowDownCircle className="h-10 w-10 text-rose-500/80" />
        </div>

        <div className={`rounded-2xl border p-5 flex items-center justify-between shadow-xs ${saldo >= 0 ? "border-teal-100 bg-teal-50/20" : "border-rose-150 bg-rose-50/10"}`}>
          <div className="space-y-1">
            <span className={`text-xs uppercase tracking-wider font-semibold ${saldo >= 0 ? "text-teal-800" : "text-rose-800"}`}>Saldo Líquido</span>
            <p className={`font-serif text-2xl font-bold ${saldo >= 0 ? "text-teal-600" : "text-rose-600"}`}>R$ {saldo.toFixed(2)}</p>
          </div>
          <Wallet className={`h-10 w-10 ${saldo >= 0 ? "text-teal-500/80" : "text-rose-500/80"}`} />
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por categoria ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-full bg-card"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-full border border-border bg-card px-3 py-1.5 text-sm outline-none"
          >
            <option value="all">Todas as transações</option>
            <option value="entrada">Apenas Receitas (Entradas)</option>
            <option value="saida">Apenas Despesas (Saídas)</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-full border border-border bg-card px-3 py-1.5 text-sm outline-none"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Records Table */}
      {loadingRecords ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-tiffany" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <Wallet className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 font-serif text-lg font-medium">Nenhuma transação encontrada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Lançamentos de agendamentos concluídos aparecem aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Forma de Pagamento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium text-xs">
                    {new Date(record.record_date + "T12:00:00").toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {record.type === "entrada" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20">Receita</Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/10 border-rose-500/20">Despesa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">{record.category}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{record.description || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {record.payment_method?.replace("_", " ") || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className={`font-bold ${record.type === "entrada" ? "text-emerald-600" : "text-rose-600"}`}>
                    {record.type === "entrada" ? "+" : "-"} R$ {Number(record.amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(record)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Excluir este lançamento financeiro permanentemente?")) {
                            deleteMutation.mutate(record.id);
                          }
                        }}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingRecord ? "Editar Lançamento" : `Novo Registro (${type === "entrada" ? "Receita" : "Despesa"})`}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="rec-date">Data</Label>
                <Input
                  id="rec-date"
                  type="date"
                  required
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="rec-amount">Valor (R$)</Label>
                <Input
                  id="rec-amount"
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="rec-cat">Categoria</Label>
                <select
                  id="rec-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {type === "entrada" ? (
                    <>
                      <option value="Atendimento">Atendimento</option>
                      <option value="Venda de Produto">Venda de Produto</option>
                      <option value="Outros">Outros</option>
                    </>
                  ) : (
                    <>
                      <option value="Produtos">Produtos (Estoque)</option>
                      <option value="Comissão">Comissão de Equipe</option>
                      <option value="Aluguel">Aluguel / Condomínio</option>
                      <option value="Energia / Água">Energia / Água</option>
                      <option value="Marketing">Marketing / Tráfego</option>
                      <option value="Outros">Outros</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="rec-pay">Forma de Pagamento</Label>
                <select
                  id="rec-pay"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartao_Credito">Cartão de Crédito</option>
                  <option value="Cartao_Debito">Cartão de Débito</option>
                  <option value="Transferencia">Transferência</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="rec-desc">Descrição</Label>
              <Input
                id="rec-desc"
                placeholder="Ex: Pagamento mensal de internet"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className={type === "entrada" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"}
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
