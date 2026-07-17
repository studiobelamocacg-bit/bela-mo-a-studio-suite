import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Package, Plus, Edit, Trash2, Search, Loader2, ArrowUpRight, ArrowDownRight, History, ShieldAlert, Tag
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
import type { InventoryItem, InventoryLog } from "@/types/database.types";

export const Route = createFileRoute("/_authenticated/estoque")({
  component: EstoquePage,
});

function EstoquePage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog States
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form State for Item (Add/Edit)
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Cílios");
  const [brand, setBrand] = useState("");
  const [supplier, setSupplier] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [minQuantity, setMinQuantity] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0.00);
  const [location, setLocation] = useState("");

  // Form State for Log (Entrada/Saída)
  const [logType, setLogType] = useState<"entrada" | "saida">("entrada");
  const [logQty, setLogQty] = useState(1);
  const [logNotes, setLogNotes] = useState("");

  // Fetch Inventory Items
  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["inventory_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  // Fetch Inventory Logs for Selected Item
  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["inventory_logs", selectedItem?.id],
    queryFn: async () => {
      if (!selectedItem?.id) return [];
      const { data, error } = await supabase
        .from("inventory_logs")
        .select("*")
        .eq("product_id", selectedItem.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InventoryLog[];
    },
    enabled: !!selectedItem?.id && isHistoryDialogOpen,
  });

  const handleAddItemClick = () => {
    setSelectedItem(null);
    setName("");
    setCategory("Cílios");
    setBrand("");
    setSupplier("");
    setQuantity(0);
    setMinQuantity(2);
    setPurchasePrice(0.00);
    setLocation("");
    setIsItemDialogOpen(true);
  };

  const handleEditItemClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setName(item.name);
    setCategory(item.category || "Cílios");
    setBrand(item.brand || "");
    setSupplier(item.supplier || "");
    setQuantity(item.quantity);
    setMinQuantity(item.min_quantity);
    setPurchasePrice(Number(item.purchase_price));
    setLocation(item.location || "");
    setIsItemDialogOpen(true);
  };

  const handleAdjustStockClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setLogType("entrada");
    setLogQty(1);
    setLogNotes("");
    setIsLogDialogOpen(true);
  };

  const handleShowHistoryClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsHistoryDialogOpen(true);
  };

  // Save Item (Create/Update)
  const saveItemMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        category,
        brand,
        supplier,
        quantity,
        min_quantity: minQuantity,
        purchase_price: purchasePrice,
        location,
        updated_at: new Date().toISOString(),
      };

      if (selectedItem) {
        const { error } = await supabase
          .from("inventory_items")
          .update(payload)
          .eq("id", selectedItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("inventory_items")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success(selectedItem ? "Item atualizado!" : "Item cadastrado!");
      setIsItemDialogOpen(false);
    },
    onError: (err) => {
      toast.error("Erro ao salvar item: " + err.message);
    },
  });

  // Adjust Stock (Insert Log + Increment/Decrement quantity)
  const adjustStockMutation = useMutation({
    mutationFn: async () => {
      if (!selectedItem) return;

      // 1. Insert Inventory Log
      const { error: logError } = await supabase
        .from("inventory_logs")
        .insert({
          product_id: selectedItem.id,
          type: logType,
          quantity: logQty,
          notes: logNotes,
        });
      if (logError) throw logError;

      // 2. Calculate new quantity
      const newQty = logType === "entrada" 
        ? selectedItem.quantity + logQty 
        : Math.max(0, selectedItem.quantity - logQty);

      // 3. Update quantity in inventory_items
      const { error: itemError } = await supabase
        .from("inventory_items")
        .update({ 
          quantity: newQty,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedItem.id);
      if (itemError) throw itemError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_logs", selectedItem?.id] });
      toast.success("Estoque ajustado com sucesso!");
      setIsLogDialogOpen(false);
    },
    onError: (err) => {
      toast.error("Erro ao ajustar estoque: " + err.message);
    },
  });

  // Delete Item
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("Item removido do estoque!");
    },
    onError: (err) => {
      toast.error("Erro ao remover item: " + err.message);
    },
  });

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Estoque
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitore o estoque de insumos (colas, cílios, removedores) e envie alertas de reposição.
          </p>
        </div>
        <Button onClick={handleAddItemClick} className="rounded-full bg-tiffany hover:bg-tiffany/90 text-tiffany-foreground font-medium">
          <Plus className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </div>

      {/* Filters */}
      <div className="relative max-w-md">
        <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produto por nome ou marca..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 rounded-full bg-card"
        />
      </div>

      {/* Grid / Table */}
      {loadingItems ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-tiffany" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 font-serif text-lg font-medium">Nenhum item em estoque</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre os cílios, colas e produtos utilizados no estúdio.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Marca / Fornecedor</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Preço de Compra</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const isLow = item.quantity <= item.min_quantity;

                return (
                  <TableRow key={item.id} className={isLow ? "bg-amber-500/5 hover:bg-amber-500/10" : ""}>
                    <TableCell className="font-semibold text-foreground">
                      <div>
                        <span>{item.name}</span>
                        {item.category && (
                          <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>Marca: {item.brand || "-"}</div>
                      <div>Fornecedor: {item.supplier || "-"}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.location || "-"}</TableCell>
                    <TableCell className="text-sm">R$ {Number(item.purchase_price || 0).toFixed(2)}</TableCell>
                    <TableCell className="font-bold">{item.quantity} un</TableCell>
                    <TableCell className="text-muted-foreground">{item.min_quantity} un</TableCell>
                    <TableCell>
                      {isLow ? (
                        <Badge className="bg-amber-600 hover:bg-amber-600 text-white flex items-center gap-1 w-fit text-[10px] px-1.5 py-0.5">
                          <ShieldAlert className="h-3 w-3 shrink-0" /> Reposição
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px]">Ok</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAdjustStockClick(item)}
                          title="Entrada / Saída"
                          className="text-teal-600 hover:bg-teal-50"
                        >
                          <ArrowUpRight className="h-4.5 w-4.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleShowHistoryClick(item)}
                          title="Histórico de movimentação"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditItemClick(item)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Excluir item "${item.name}" do estoque permanentemente?`)) {
                              deleteItemMutation.mutate(item.id);
                            }
                          }}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title="Excluir"
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

      {/* Item Dialog (Add/Edit) */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {selectedItem ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); saveItemMutation.mutate(); }} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="i-name">Nome do Produto</Label>
                <Input id="i-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Cílios Mix Ellipse" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="i-cat">Categoria</Label>
                <Input id="i-cat" required value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Cílios, Colas" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="i-brand">Marca</Label>
                <Input id="i-brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: Nagaraku" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="i-supp">Fornecedor</Label>
                <Input id="i-supp" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Ex: Lash Shop" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="i-qty">Qtd. Inicial</Label>
                <Input id="i-qty" type="number" required value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="i-min">Mínimo Ideal</Label>
                <Input id="i-min" type="number" required value={minQuantity} onChange={(e) => setMinQuantity(parseInt(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="i-price">Preço Compra</Label>
                <Input id="i-price" type="number" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(parseFloat(e.target.value))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="i-loc">Localização de Armazenamento</Label>
              <Input id="i-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Frigobar, Gaveta 1" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsItemDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-tiffany hover:bg-tiffany/90 text-tiffany-foreground" disabled={saveItemMutation.isPending}>
                {saveItemMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog (Entrada/Saída) */}
      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">Ajustar Estoque: {selectedItem?.name}</DialogTitle>
            <DialogDescription>Lance movimentações manuais de entrada ou saída.</DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); adjustStockMutation.mutate(); }} className="space-y-4 py-1.5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="l-type">Tipo de Operação</Label>
                <select
                  id="l-type"
                  value={logType}
                  onChange={(e: any) => setLogType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="entrada">Entrada (Compra/Reposição)</option>
                  <option value="saida">Saída (Consumo/Perda)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="l-qty">Quantidade</Label>
                <Input id="l-qty" type="number" min={1} required value={logQty} onChange={(e) => setLogQty(parseInt(e.target.value))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="l-notes">Observações / Justificativa</Label>
              <Textarea id="l-notes" placeholder="Ex: Consumo no atendimento de cílios..." rows={2} value={logNotes} onChange={(e) => setLogNotes(e.target.value)} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsLogDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary text-primary-foreground" disabled={adjustStockMutation.isPending}>
                {adjustStockMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Movimentação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg flex items-center gap-1.5">
              <History className="h-5 w-5 text-tiffany" />
              Histórico: {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>

          {loadingLogs ? (
            <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-tiffany" /></div>
          ) : logs.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground italic py-8">Nenhuma movimentação registrada para este item.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto pr-1 space-y-2 text-xs">
              {logs.map((log) => (
                <div key={log.id} className="flex justify-between items-center border p-2.5 rounded-lg bg-muted/20">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      {log.type === "entrada" ? (
                        <span className="text-emerald-600 font-bold flex items-center"><ArrowUpRight className="h-3.5 w-3.5 shrink-0" /> Entrada</span>
                      ) : (
                        <span className="text-rose-600 font-bold flex items-center"><ArrowDownRight className="h-3.5 w-3.5 shrink-0" /> Saída</span>
                      )}
                      <span className="text-foreground font-semibold">({log.quantity} unidades)</span>
                    </div>
                    {log.notes && <p className="text-muted-foreground italic">{log.notes}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(log.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" onClick={() => setIsHistoryDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
