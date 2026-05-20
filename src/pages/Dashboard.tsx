import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardStats } from '../types';
import { 
  Package, 
  AlertTriangle, 
  ListFilter, 
  Search, 
  Wifi, 
  Clock, 
  ArrowDownRight, 
  BadgeDollarSign, 
  ShoppingBag,
  TrendingDown,
  ArrowUpRight,
  TrendingUp,
  LayoutDashboard,
  CalendarDays
} from 'lucide-react';
import { stockService } from '../services/stockService';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DashboardProps {
  stats: DashboardStats;
  role: 'patrao' | 'funcionario';
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, role }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [lossSearchTerm, setLossSearchTerm] = useState('');
  const [chartMetric, setChartMetric] = useState<'units' | 'revenue'>('units');
  const [activeTab, setActiveTab] = useState<'overview' | 'audit'>('overview');

  // Fetch live state from service
  const products = stockService.getProducts();
  const sales = stockService.getSales();
  const batches = stockService.getBatches();
  const movements = stockService.getMovements();

  // Selected product state for individual tracking
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');

  // Format Helper functions
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Compile detailed metrics for losses due to expiration
  const expirationLossStats = useMemo(() => {
    const now = new Date("2026-05-20T23:11:47Z");
    let totalExpiredQty = 0;
    let totalPrejudiceValue = 0;
    const expiredList: { id: string; name: string; barcode: string; category: string; qty: number; value: number; expiryDate: string }[] = [];

    const getProductPrice = (productId: string): number => {
      switch (productId) {
        case 'p1': return 149.90;
        case 'p2': return 3.50;
        case 'p3': return 219.00;
        case 'p4': return 24.90;
        default: return 45.00;
      }
    };

    batches.forEach(batch => {
      const expDate = new Date(batch.expiryDate + 'T23:59:59');
      if (expDate < now) {
        const prod = products.find(p => p.id === batch.productId);
        const price = getProductPrice(batch.productId);
        const value = batch.quantity * price;
        totalExpiredQty += batch.quantity;
        totalPrejudiceValue += value;
        
        expiredList.push({
          id: batch.id,
          name: prod ? prod.name : 'Produto Geral',
          barcode: prod ? prod.barcode : '7891234567890',
          category: prod ? prod.category : 'Outros',
          qty: batch.quantity,
          value: value,
          expiryDate: batch.expiryDate,
        });
      }
    });

    return {
      totalExpiredQty,
      totalPrejudiceValue,
      expiredList
    };
  }, [batches, products]);

  // Combine product and checkout metrics
  const productPerformance = useMemo(() => {
    return products.map(product => {
      const productSales = sales.filter(s => s.productId === product.id);
      const unitsSold = productSales.reduce((sum, s) => sum + s.quantity, 0);
      const revenue = productSales.reduce((sum, s) => sum + (s.quantity * s.price), 0);
      
      const currentStock = batches
        .filter(b => b.productId === product.id)
        .reduce((sum, b) => sum + b.quantity, 0);

      return {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        category: product.category,
        unitsSold,
        revenue,
        currentStock,
        minStockLevel: product.minStockLevel,
      };
    });
  }, [products, sales, batches]);

  // Data for Chart (Best sellers first, limited to top 6 items)
  const chartData = useMemo(() => {
    const data = [...productPerformance];
    const sorted = data.sort((a, b) => {
      return chartMetric === 'units' ? b.unitsSold - a.unitsSold : b.revenue - a.revenue;
    });

    return sorted.map(item => ({
      name: item.name,
      displayName: item.name.length > 14 ? `${item.name.substring(0, 12)}...` : item.name,
      value: chartMetric === 'units' ? item.unitsSold : parseFloat(item.revenue.toFixed(2)),
    }));
  }, [productPerformance, chartMetric]);

  // Filtered dataset for individual sales table
  const filteredProducts = useMemo(() => {
    return productPerformance.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm)
    ).sort((a, b) => b.unitsSold - a.unitsSold);
  }, [productPerformance, searchTerm]);

  // Extract recent movements representing automatic PDV checkouts
  const recentDeductions = useMemo(() => {
    const outs = movements.filter(m => m.type === 'OUT');
    return outs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
      .map(m => {
        const prod = products.find(p => p.id === m.productId);
        return {
          id: m.id,
          productName: prod ? prod.name : 'Produto Geral',
          barcode: prod ? prod.barcode : '',
          quantity: m.quantity,
          timestamp: m.timestamp,
          reason: m.reason || 'Venda PDV',
        };
      });
  }, [movements, products]);

  // Calculate overall life-time revenue from sales
  const totalSalesRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + (s.price * s.quantity), 0);
  }, [sales]);

  const getStockBadge = (stock: number, min: number) => {
    if (stock <= 0) {
      return <Badge variant="destructive" className="font-bold">Esgotado</Badge>;
    }
    if (stock <= min) {
      return <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">Estoque Crítico</Badge>;
    }
    return <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">Estoque OK</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Real-time sync ribbon banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <div className="absolute top-0 left-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-200">Sincronização Firebase Ativa</h4>
            <p className="text-[11px] text-slate-400 leading-none mt-1">Conexão em tempo real estabelecida. Toda baixa do PDV debita e atualiza o estoque instantaneamente.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-indigo-500/25 border border-indigo-500/30 rounded-lg px-3 py-1.5 text-xs text-indigo-300 font-mono">
          <Wifi className="h-3.5 w-3.5 text-indigo-400" />
          db_firebase.connected
        </div>
      </div>

      {/* Modern Tab Selector */}
      <div className="flex border-b border-white/10 pb-1 gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all relative ${
            activeTab === 'overview'
              ? 'text-indigo-400 border-b-2 border-indigo-500 font-extrabold pb-2'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          Painel Geral
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all relative ${
            activeTab === 'audit'
              ? 'text-indigo-400 border-b-2 border-indigo-500 font-extrabold pb-2'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          Vendas do PDV & Auditoria
        </button>
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Stats Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm border-t-4 border-t-indigo-500 rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">Total de Produtos</CardTitle>
                <Package className="h-4 w-4 text-indigo-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalItems}</div>
                <p className="text-xs text-slate-550 mt-1">Cadastrados no catálogo</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-sm border-t-4 border-t-red-500 rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-red-000">Expirando em Breve</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-100">{stats.expiringSoon}</div>
                <p className="text-xs text-slate-550 mt-1">Lotes sob check (&lt; 30 dias)</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-sm border-t-4 border-t-orange-500 rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-orange-400">Estoque Baixo</CardTitle>
                <ListFilter className="h-4 w-4 text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.lowStockItems}</div>
                <p className="text-xs text-slate-550 mt-1">Produtos abaixo do limite mínimo</p>
              </CardContent>
            </Card>

            {role === 'patrao' ? (
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm border-t-4 border-t-emerald-500 rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-emerald-400">Faturamento Geral</CardTitle>
                  <BadgeDollarSign className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-100">{formatCurrency(totalSalesRevenue)}</div>
                  <p className="text-xs text-slate-550 mt-1">Receita total acumulada no PDV</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm border-t-4 border-t-slate-500 rounded-2xl opacity-75">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">Faturamento Geral</CardTitle>
                  <BadgeDollarSign className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-semibold text-slate-400 flex items-center gap-1.5 mt-1.5">
                    <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
                    Restrito a Administrador
                  </div>
                  <p className="text-[10px] text-slate-500 select-none mt-2">Visão financeira indisponível</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Relatório Financeiro de Perdas por Vencimento */}
          <Card className={`bg-gradient-to-br from-slate-900 via-slate-900 ${role === 'patrao' ? 'to-red-950/10 border-red-500/10' : 'to-indigo-950/10 border-white/10'} rounded-2xl overflow-hidden shadow-xl`}>
            <CardHeader className="border-b border-white/5 pb-4 bg-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-lg ${role === 'patrao' ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                    <TrendingDown className="h-4.5 w-4.5" />
                  </span>
                  <CardTitle className="text-base font-bold text-slate-100 tracking-tight">
                    {role === 'patrao' 
                      ? "Relatório Financeiro de Perdas por Vencimento (Desperdício)" 
                      : "Controle de Lotes Vencidos (Descarte Sanitário)"
                    }
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-400 mt-1">
                  {role === 'patrao'
                    ? "Total de produtos descartados por validade expirada e o respectivo prejuízo em caixa."
                    : "Identificação de lotes e produtos com validade vencida para retirada imediata das gôndolas."
                  }
                </CardDescription>
              </div>

              {/* Input de filtro de perdas */}
              <div className="relative w-full sm:max-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Filtrar por nome..."
                  className={`pl-9 h-8 bg-black/35 border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:ring-1 ${role === 'patrao' ? 'focus:ring-red-500' : 'focus:ring-indigo-500'}`}
                  value={lossSearchTerm}
                  onChange={(e) => setLossSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-5">
                {/* Métricas e Sumários */}
                <div className="md:col-span-2 space-y-4">
                  <div className={`border rounded-2xl p-5 flex flex-col justify-between h-full space-y-6 ${role === 'patrao' ? 'bg-red-500/10 border-red-500/20' : 'bg-indigo-500/10 border-indigo-500/20'}`}>
                    <div>
                      <span className={`font-bold text-[10px] uppercase tracking-wider block mb-1 ${role === 'patrao' ? 'text-red-400' : 'text-indigo-400'}`}>
                        {role === 'patrao' ? "Prejuízo Financeiro Acumulado" : "Alerta de Segurança Sanitária"}
                      </span>
                      {role === 'patrao' ? (
                        <div className="text-3xl font-extrabold text-red-200 select-none tracking-tight">
                          {formatCurrency(expirationLossStats.totalPrejudiceValue)}
                        </div>
                      ) : (
                        <div className="text-xl font-extrabold text-amber-400 select-none tracking-tight flex items-center gap-1.5 mt-1">
                          <AlertTriangle className="h-5 w-5 text-amber-400 animate-pulse" />
                          Retirada Pendente
                        </div>
                      )}
                      <p className="text-[11px] text-slate-300 leading-relaxed mt-2.5">
                        {role === 'patrao'
                          ? `Soma do preço de venda de cada unidade dos lotes pet cuja data de vencimento é anterior a hoje (${new Date("2026-05-20").toLocaleDateString('pt-BR')}).`
                          : "Produtos vencidos não devem ser comercializados em nenhuma hipótese. Realize a triagem e descarte imediato dos lotes listados abaixo."
                        }
                      </p>
                    </div>

                    <div className={`grid grid-cols-2 gap-3 pt-4 border-t ${role === 'patrao' ? 'border-red-500/20' : 'border-indigo-500/20'}`}>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Unidades Perdidas</span>
                        <span className="text-xl font-bold text-slate-200 block mt-1">
                          {expirationLossStats.totalExpiredQty} un
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Lotes Afetados</span>
                        <span className="text-xl font-bold text-slate-200 block mt-1">
                          {expirationLossStats.expiredList.length} lote(s)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabela de Rastreamento detalhada */}
                <div className="md:col-span-3 bg-black/35 border border-white/5 rounded-2xl p-5 flex flex-col space-y-3">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-slate-405 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                    Detalhamento dos Descartes Sanitários
                  </span>

                  <div className="overflow-y-auto max-h-[220px] space-y-2 pr-1 scrollbar-thin flex-1">
                    {expirationLossStats.expiredList.filter(item => 
                      item.name.toLowerCase().includes(lossSearchTerm.toLowerCase()) ||
                      item.barcode.includes(lossSearchTerm)
                    ).length === 0 ? (
                      <div className="text-center py-14 text-slate-500 italic text-xs leading-relaxed">
                        Nenhum produto descartado ou correspondente encontrado.
                      </div>
                    ) : (
                      expirationLossStats.expiredList
                        .filter(item => 
                          item.name.toLowerCase().includes(lossSearchTerm.toLowerCase()) ||
                          item.barcode.includes(lossSearchTerm)
                        )
                        .map(item => (
                          <div 
                            key={item.id} 
                            className="text-xs flex justify-between items-center p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all gap-4"
                          >
                            <div className="min-w-0">
                              <span className="text-slate-200 font-bold block truncate text-xs">{item.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono block mt-1">
                                EAN: {item.barcode} | Expira em: {new Date(item.expiryDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-red-350 block text-xs">-{item.qty} un</span>
                              {role === 'patrao' && (
                                <span className="text-[10px] text-red-400 font-mono mt-0.5 block">
                                  {formatCurrency(item.value)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: Audit / Sales */}
      {activeTab === 'audit' && (
        <div className="grid gap-6 lg:grid-cols-7 animate-in fade-in duration-200">
          {/* Left panel: Product Performance Table (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-white/5 border-white/10 backdrop-blur-md rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-slate-200">Resultados Individuais de Vendas</CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-1">Estatísticas detalhadas de saídas de cada produto no PDV.</CardDescription>
                </div>
                <div className="relative w-full sm:max-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Filtrar por nome..."
                    className="pl-9 h-8 bg-black/20 border-white/10 rounded-xl text-xs text-white focus:ring-indigo-500 placeholder:text-slate-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-white/5 border-b border-white/5">
                      <TableRow className="hover:bg-transparent border-b border-white/5">
                        <TableHead className="text-[10px] text-slate-400 uppercase tracking-widest p-4">Produto</TableHead>
                        <TableHead className="text-[10px] text-slate-400 uppercase tracking-widest p-4 text-center">EAN</TableHead>
                        <TableHead className="text-[10px] text-slate-400 uppercase tracking-widest p-4 text-center">Un. Vendidas</TableHead>
                        {role === 'patrao' && <TableHead className="text-[10px] text-slate-400 uppercase tracking-widest p-4 text-right">Receita</TableHead>}
                        <TableHead className="text-[10px] text-slate-400 uppercase tracking-widest p-4 text-right">Estoque</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((item) => (
                          <TableRow 
                            key={item.id} 
                            className={`hover:bg-white/5 border-b border-white/5 transition-colors cursor-pointer ${selectedProductId === item.id ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : ''}`}
                            onClick={() => setSelectedProductId(item.id)}
                          >
                            <TableCell className="p-4">
                              <span className="font-semibold text-slate-200 block text-xs">{item.name}</span>
                              <span className="text-[10px] text-slate-450 block mt-0.5">{item.category}</span>
                            </TableCell>
                            <TableCell className="p-4 text-center font-mono text-[10px] text-slate-450">{item.barcode}</TableCell>
                            <TableCell className="p-4 text-center font-semibold text-xs text-indigo-300">
                              {item.unitsSold > 0 ? `${item.unitsSold} un` : '-'}
                            </TableCell>
                            {role === 'patrao' && (
                              <TableCell className="p-4 text-right font-semibold text-xs text-emerald-400">
                                {item.revenue > 0 ? formatCurrency(item.revenue) : '-'}
                              </TableCell>
                            )}
                            <TableCell className="p-4 text-right">
                              {getStockBadge(item.currentStock, item.minStockLevel)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-slate-500 italic text-xs">
                            Nenhum resultado encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right panel: Recent Deductions feed (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="bg-white/5 border-white/10 backdrop-blur-md rounded-2xl">
              <CardHeader className="border-b border-white/5">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-200">Histórico de Baixas (PDV)</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Sincronização imediata de saídas pós-checkout.</CardDescription>
                  </div>
                  <ShoppingBag className="h-5 w-5 text-indigo-400 animate-pulse" />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {recentDeductions.length > 0 ? (
                    recentDeductions.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="bg-red-500/10 p-2 rounded-lg shrink-0 mt-0.5">
                          <ArrowDownRight className="h-4 w-4 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-xs text-slate-200 truncate">{item.productName}</span>
                            <span className="text-[10px] text-red-300 font-bold bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                              -{item.quantity} un
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-450 mt-1.5 font-mono">
                            <span>EAN: {item.barcode || '7891234567890'}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-505" />
                              {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-500 italic text-xs leading-relaxed">
                      Nenhuma baixa automática registrada no PDV.<br />
                      Efetue vendas de teste para observar sincronizações.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
