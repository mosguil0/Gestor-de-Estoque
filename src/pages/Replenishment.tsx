import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { stockService } from '../services/stockService';
import { ShoppingCart, RefreshCw, ChevronRight } from 'lucide-react';

export const Replenishment: React.FC = () => {
  const suggestions = useMemo(() => stockService.getReplenishmentSuggestions(), []);

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <RefreshCw className="h-6 w-6 text-indigo-400" />
            Sugestões de Reposição Inteligente
          </CardTitle>
          <CardDescription className="text-slate-400">
            Análise baseada no volume de vendas dos últimos 30 dias e estoque atual.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="hover:bg-transparent border-b border-white/5">
                <TableHead className="text-[10px] text-slate-400 uppercase tracking-widest p-4">Produto</TableHead>
                <TableHead className="text-[10px] text-slate-400 uppercase tracking-widest p-4">Estoque Atual</TableHead>
                <TableHead className="text-[10px] text-slate-400 uppercase tracking-widest p-4">Vendas (30d)</TableHead>
                <TableHead className="text-[10px] text-slate-400 uppercase tracking-widest p-4">Sugestão de Pedido</TableHead>
                <TableHead className="p-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.length > 0 ? suggestions.map((item) => (
                <TableRow key={item.id} className="hover:bg-white/5 border-b border-white/5 transition-colors">
                  <TableCell className="p-4 font-medium text-slate-200">{item.name}</TableCell>
                  <TableCell className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300">{item.currentStock}</span>
                      {item.currentStock <= item.minStockLevel && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/20 text-[10px] h-5">CRÍTICO</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-4 text-slate-400">{item.last30DaysSales}</TableCell>
                  <TableCell className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-xl text-indigo-400">{Math.ceil(item.suggestedReorder)} un</span>
                      <span className="text-[10px] text-slate-505">Recomendado para 30 dias</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-4 text-right">
                    <Button size="sm" variant="outline" className="gap-2 border-white/10 text-slate-300 hover:bg-white/5">
                      <ShoppingCart className="h-4 w-4" />
                      Gerar Pedido
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500 italic text-sm">
                    Estoque saudável. Nenhuma reposição necessária no momento.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-300">Como funciona a inteligência?</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-indigo-200/70 space-y-3 leading-relaxed">
            <div className="flex gap-3">
              <div className="w-1 bg-indigo-500 rounded-full h-8 shrink-0"></div>
              <p>Calculamos a média de vendas diárias dos últimos 30 dias para entender o ritmo de saída.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-1 bg-indigo-500 rounded-full h-8 shrink-0"></div>
              <p>Projetamos a demanda mensal e adicionamos uma margem de segurança de 20%.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-1 bg-indigo-500 rounded-full h-8 shrink-0"></div>
              <p>O resultado final economiza seu tempo e evita perda de vendas por falta de produto.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
