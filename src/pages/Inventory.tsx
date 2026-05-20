import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { stockService } from '../services/stockService';
import { format, isBefore, addDays, parseISO } from 'date-fns';
import { 
  Search, 
  Filter, 
  AlertCircle, 
  AlertTriangle, 
  ListFilter, 
  Hourglass, 
  Calendar, 
  CalendarClock, 
  History, 
  Trash2, 
  Wifi 
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export const Inventory: React.FC = () => {
  const products = stockService.getProducts();
  const batches = stockService.getBatches();
  const sales = stockService.getSales();
  const stats = stockService.getDashboardStats();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');

  // Autocomplete state for deep-dive diagnostics
  const [diagSearch, setDiagSearch] = useState('');
  const [isDiagOpen, setIsDiagOpen] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Sync diagnosis search with selected product when changed elsewhere (e.g. clicking on table)
  useEffect(() => {
    const productsList = stockService.getProducts();
    const activeProd = productsList.find(p => p.id === selectedProductId);
    if (activeProd) {
      setDiagSearch(activeProd.name);
    }
  }, [selectedProductId]);

  // Click outside autocomplete to close suggestions
  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setIsDiagOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiagSearch(e.target.value);
    setIsDiagOpen(true);
  };

  const handleSelectProduct = (product: any) => {
    setSelectedProductId(product.id);
    setDiagSearch(product.name);
    setIsDiagOpen(false);
  };

  const diagSuggestions = useMemo(() => {
    if (!diagSearch) return products;
    const query = diagSearch.toLowerCase().trim();
    const activeProd = products.find(p => p.id === selectedProductId);
    if (activeProd && activeProd.name.toLowerCase() === query) {
      return products;
    }
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.barcode.includes(query)
    );
  }, [products, diagSearch, selectedProductId]);

  const inventoryData = useMemo(() => {
    return products.map(product => {
      const productBatches = batches.filter(b => b.productId === product.id);
      const totalStock = productBatches.reduce((sum, b) => sum + b.quantity, 0);
      
      const soonestExpiry = productBatches.length > 0 
        ? productBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0].expiryDate 
        : null;

      return {
        ...product,
        totalStock,
        soonestExpiry,
      };
    }).filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.barcode.includes(searchTerm)
    );
  }, [products, batches, searchTerm]);

  // Deep-dive calculations for the selected product
  const selectedProductDetails = useMemo(() => {
    if (!selectedProductId) return null;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return null;

    const productSales = sales
      .filter(s => s.productId === selectedProductId)
      .sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime()); // Newest first

    const productBatches = batches.filter(b => b.productId === selectedProductId);
    const now = new Date("2026-05-20T22:49:57Z");

    // Filter Expired Batches
    const expiredBatches = productBatches.filter(b => {
      const expDate = new Date(b.expiryDate + 'T23:59:59');
      return expDate < now;
    });
    const expiredQty = expiredBatches.reduce((sum, b) => sum + b.quantity, 0);

    // Regular active batches
    const activeBatches = productBatches.filter(b => {
      const expDate = new Date(b.expiryDate + 'T23:59:59');
      return expDate >= now;
    }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    return {
      product,
      expiredBatches,
      expiredQty,
      regularBatches: activeBatches,
    };
  }, [selectedProductId, products, sales, batches]);

  const formatDateOnly = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (product: any) => {
    const now = new Date();
    const thirtyDays = addDays(now, 30);
    
    if (product.totalStock <= product.minStockLevel) {
      return <Badge variant="destructive">Estoque Baixo</Badge>;
    }
    
    if (product.soonestExpiry && isBefore(parseISO(product.soonestExpiry), thirtyDays)) {
      return <Badge variant="outline" className="text-orange-500 border-orange-500">Vencimento Próximo</Badge>;
    }
    
    return <Badge variant="outline" className="text-green-500 border-green-500 font-bold">Saudável</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Alertas Operacionais no topo */}
      <div className="grid gap-4 md:grid-cols-2">
        {stats.expiringSoon > 0 ? (
          <div className="flex items-start gap-4 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-100 backdrop-blur-md">
            <div className="bg-red-500/20 p-2 rounded-lg shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <div className="font-bold text-xs uppercase tracking-wider text-red-300">Alerta de Lotes Próximos do Vencimento</div>
              <div className="text-xs text-red-200/80 mt-1.5 leading-relaxed">
                Você possui <strong className="text-white bg-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{stats.expiringSoon} lote(s)</strong> de produtos veterinários ou rações que expiram em menos de 30 dias.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-200 backdrop-blur-md text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>✓ Todos os lotes possuem vencimento seguro no momento.</span>
          </div>
        )}
        
        {stats.lowStockItems > 0 ? (
          <div className="flex items-start gap-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-200 backdrop-blur-md">
            <div className="bg-amber-500/20 p-2 rounded-lg shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="font-bold text-xs uppercase tracking-wider text-amber-300">Estoque de Segurança Crítico</div>
              <div className="text-xs text-amber-200/80 mt-1.5 leading-relaxed">
                Atualmente, <strong className="text-white bg-amber-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{stats.lowStockItems} produto(s)</strong> estão operando abaixo do nível mínimo definido. Recomendada reposição imediata.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-200 backdrop-blur-md text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>✓ Todos os produtos atendem ao limite mínimo de estoque saudável.</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Buscar por nome ou código..."
            className="pl-10 bg-white/5 border-white/10 rounded-xl focus:ring-indigo-500 text-slate-100 placeholder:text-slate-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
           <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/5">
             <Filter className="h-5 w-5" />
           </Button>
         </div>
       </div>
 
       <Card className="bg-white/5 border-white/10 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-white/5">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-bold text-slate-200">Estoque Atual</CardTitle>
            <span className="text-xs text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">Ordenado por Validade</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="hover:bg-transparent border-b border-white/5">
                <TableHead className="text-[10px] text-slate-400 uppercase tracking-widest p-4">Produto</TableHead>
                <TableHead className="text-[10px] text-slate-400 uppercase tracking-widest p-4 text-center">Código</TableHead>
                <TableHead className="text-[10px] text-slate-400 uppercase tracking-widest p-4 text-center">Qtd. Total</TableHead>
                <TableHead className="text-[10px] text-slate-400 uppercase tracking-widest p-4 text-center">Próx. Vencimento</TableHead>
                <TableHead className="text-[10px] text-slate-400 uppercase tracking-widest p-4 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryData.length > 0 ? inventoryData.map((item) => (
                <TableRow 
                  key={item.id} 
                  className={`hover:bg-white/5 border-b border-white/5 group transition-colors cursor-pointer ${selectedProductId === item.id ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : ''}`}
                  onClick={() => setSelectedProductId(item.id)}
                >
                  <TableCell className="p-4 font-semibold text-slate-200">{item.name}</TableCell>
                  <TableCell className="p-4 text-center font-mono text-[10px] text-slate-500 opacity-80">{item.barcode}</TableCell>
                  <TableCell className="p-4 text-center">
                    <span className={`text-sm font-bold ${item.totalStock <= item.minStockLevel ? "text-red-400 font-bold" : "text-slate-300"}`}>
                      {item.totalStock} un
                    </span>
                  </TableCell>
                  <TableCell className="p-4 text-center text-sm text-slate-400">
                    {item.soonestExpiry ? (
                       <span className={isBefore(parseISO(item.soonestExpiry), addDays(new Date(), 30)) ? "text-amber-400 font-semibold" : ""}>
                        {format(parseISO(item.soonestExpiry), 'dd/MM/yyyy')}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="p-4 text-right">
                    {getStatusBadge(item)}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500 italic text-sm">
                    Nenhum produto em estoque.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PAINEL DE CONTROLE DE LOTES E VENCIMENTOS (DIAGNOSTICO) */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20 border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <CardHeader className="border-b border-white/5 pb-4 bg-white/5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-indigo-500/20 text-indigo-300">
                  <Hourglass className="h-4 w-4 animate-spin-slow" />
                </span>
                <CardTitle className="text-base font-bold text-slate-100 tracking-tight">
                  Painel de Controle de Lotes e Vencimentos (Perdas)
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-400 mt-1">
                Diagnóstico de perdas com foco em lotes ativos, monitoramento preventivo de validade e descarte sanitário.
              </CardDescription>
            </div>
            
            {/* Autocomplete product search selector */}
            <div className="w-full md:w-[325px] relative" ref={autocompleteRef}>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Escolher Produto para Diagnóstico:
              </label>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-450" />
                <input
                  type="text"
                  placeholder="Pesquisar produto ou código..."
                  value={diagSearch}
                  onFocus={() => setIsDiagOpen(true)}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-text text-ellipsis"
                />
                
                {/* dropdown icon indicator */}
                <button 
                  type="button"
                  onClick={() => setIsDiagOpen(!isDiagOpen)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                >
                  <ListFilter className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Suggestions floating dropdown list */}
              {isDiagOpen && (
                <div className="absolute left-0 right-0 mt-1.5 max-h-[220px] overflow-y-auto bg-slate-950 border border-white/10 rounded-xl shadow-2xl z-50 scrollbar-thin divide-y divide-white/5 animate-in fade-in duration-100">
                  {diagSuggestions.length > 0 ? (
                    diagSuggestions.map((p) => {
                      const isSelected = p.id === selectedProductId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectProduct(p)}
                          className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex flex-col gap-1 hover:bg-indigo-500/10 ${
                            isSelected ? 'bg-indigo-500/15 border-l-2 border-indigo-500 font-medium' : ''
                          }`}
                        >
                          <span className={`font-semibold ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                            {p.name}
                          </span>
                          <span className="font-mono text-[9px] text-slate-500 flex items-center justify-between">
                            <span>EAN: {p.barcode}</span>
                            <span className="uppercase tracking-widest text-[8px] bg-white/5 px-1 py-0.5 rounded text-slate-400 font-sans">
                              {p.category}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3.5 py-3 text-xs text-slate-500 italic text-center">
                      Nenhum produto pet correspondente.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {selectedProductDetails ? (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column: Health & Loss status details */}
              <div className="bg-black/30 border border-white/5 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-inner">
                <div>
                  <span className="font-bold text-[10px] uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-3">
                    <CalendarClock className="h-4 w-4 text-red-400 animate-pulse" />
                    Situação Sanitária do Produto
                  </span>
                  
                  {selectedProductDetails.expiredQty > 0 ? (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-sm text-red-200 block">Existem Produtos Vencidos</span>
                          <p className="text-xs text-red-300 leading-relaxed mt-1">
                            O sistema identificou um total de <strong className="font-bold text-white bg-red-650 px-1.5 py-0.5 rounded text-xs">{selectedProductDetails.expiredQty} unidades</strong> com data de validade vencida.
                          </p>
                        </div>
                      </div>
                      <div className="text-[11px] text-red-400/80 bg-red-950/20 px-3 py-2 rounded-lg leading-relaxed">
                        ⚠️ **Ação Recomendada:** Remova imediatamente estas unidades das prateleiras para evitar multas de fiscalização e incidentes de saúde com os pets dos clientes.
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl space-y-3">
                      <div className="flex items-start gap-3">
                        <Wifi className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-sm text-emerald-200 block">Conformidade de Validade OK</span>
                          <p className="text-xs text-emerald-300/90 leading-relaxed mt-1">
                            Ótimo trabalho! Todos os lotes cadastrados para este produto estão dentro do prazo de validade seguro.
                          </p>
                        </div>
                      </div>
                      <div className="text-[11px] text-emerald-400/80 bg-emerald-950/20 px-3 py-2 rounded-lg leading-relaxed">
                        ✓ Nenhuma ação imediata necessária. O estoque está seguro para consumo e comercialização.
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                  <div className="bg-white/5 p-3 rounded-lg">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">Lotes Ativos</span>
                    <span className="text-lg font-bold text-indigo-300 block mt-1">
                      {selectedProductDetails.regularBatches.length} lote(s)
                    </span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">Un. Vencidas</span>
                    <span className={`text-lg font-bold block mt-1 ${selectedProductDetails.expiredQty > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {selectedProductDetails.expiredQty} un
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Lotes Extrato List */}
              <div className="bg-black/30 border border-white/5 rounded-xl p-5 flex flex-col space-y-3">
                <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <History className="h-4 w-4 text-indigo-400" />
                  Extrato e Rastreamento de Lotes
                </span>

                <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2 pr-1 scrollbar-thin">
                  {selectedProductDetails.expiredBatches.length === 0 && selectedProductDetails.regularBatches.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 italic text-xs">
                      Nenhum lote cadastrado para este produto.
                    </div>
                  ) : (
                    <>
                      {/* Expired list */}
                      {selectedProductDetails.expiredBatches.map(b => (
                        <div key={b.id} className="text-xs flex justify-between items-center p-3 bg-red-500/10 hover:bg-red-500/15 rounded-xl border border-red-500/20 transition-all">
                          <span className="text-red-300 font-bold flex items-center gap-2">
                            <Trash2 className="h-4 w-4 shrink-0 text-red-500" />
                            VENCIDO EM: {formatDateOnly(b.expiryDate)}
                          </span>
                          <span className="font-bold text-red-200 text-xs bg-red-950/40 px-2 py-1 rounded border border-red-500/30">
                            {b.quantity} un (Perda)
                          </span>
                        </div>
                      ))}

                      {/* Normal list */}
                      {selectedProductDetails.regularBatches.map(b => {
                        const daysLeft = Math.ceil((new Date(b.expiryDate).getTime() - new Date("2026-05-20").getTime()) / (1000 * 60 * 60 * 24));
                        const isClose = daysLeft <= 30;
                        return (
                          <div key={b.id} className={`text-xs flex justify-between items-center p-3 rounded-xl border transition-all ${
                            isClose 
                              ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15 text-amber-200' 
                              : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                          }`}>
                            <span className="flex items-center gap-2 font-medium">
                              <Calendar className={`h-4 w-4 shrink-0 ${isClose ? 'text-amber-400 animate-pulse' : 'text-indigo-400'}`} />
                              <span>Validade: {formatDateOnly(b.expiryDate)}</span>
                              {isClose && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
                                  Vence em {daysLeft} dias
                                </span>
                              )}
                            </span>
                            <span className="font-bold text-slate-100 bg-black/40 px-2 py-1 rounded">
                              {b.quantity} un
                            </span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 italic text-xs">
              Selecione um produto para iniciar o diagnóstico sanitário.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
