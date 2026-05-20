/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { stockService } from './services/stockService';
import { Dashboard } from './pages/Dashboard';
import { StockEntry } from './pages/StockEntry';
import { Inventory } from './pages/Inventory';
import { Replenishment } from './pages/Replenishment';
import { FlutterIntegration } from './pages/FlutterIntegration';
import { DashboardStats } from './types';
import { 
  LayoutDashboard, 
  PackageSearch, 
  PlusCircle, 
  RefreshCcw,
  Smartphone,
  Menu,
  X,
  Store,
  Shield,
  User
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { motion, AnimatePresence } from 'motion/react';

type Page = 'dashboard' | 'stock' | 'inventory' | 'replenishment' | 'flutter';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [role, setRole] = useState<'patrao' | 'funcionario'>(() => {
    return (localStorage.getItem('user_role') as 'patrao' | 'funcionario') || 'patrao';
  });

  useEffect(() => {
    localStorage.setItem('user_role', role);
  }, [role]);

  useEffect(() => {
    // Refresh stats periodically or on page change
    setStats(stockService.getDashboardStats());
  }, [currentPage]);

  const navigation = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'inventory', label: 'Estoque', icon: PackageSearch },
    { id: 'stock', label: 'Entrada', icon: PlusCircle },
    { id: 'replenishment', label: 'Reposição', icon: RefreshCcw },
    { id: 'flutter', label: 'App Flutter (Mobile)', icon: Smartphone },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return stats ? <Dashboard stats={stats} role={role} /> : null;
      case 'stock': return <StockEntry />;
      case 'inventory': return <Inventory />;
      case 'replenishment': return <Replenishment />;
      case 'flutter': return <FlutterIntegration />;
      default: return stats ? <Dashboard stats={stats} role={role} /> : null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-slate-100 font-sans flex">
      {/* Sidebar */}
      <aside className={`
        ${isSidebarOpen ? 'w-64' : 'w-20'} 
        transition-all duration-300 border-r border-white/10 bg-white/5 backdrop-blur-md hidden md:flex flex-col
      `}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-550/20">
            <Store className="text-white h-6 w-6" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="font-bold text-base leading-tight tracking-tight text-white">Contato Pet</span>
              <span className="text-[10px] text-indigo-455 font-mono uppercase tracking-widest leading-none">Center</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as Page)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                ${currentPage === item.id 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}
              `}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            {isSidebarOpen && <span>Recolher</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <button className="md:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold capitalize tracking-tight">
              {navigation.find(n => n.id === currentPage)?.label}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Seletor de Perfil / Nível de Acesso */}
            <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-xl shadow-inner gap-1">
              <button
                onClick={() => setRole('patrao')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  role === 'patrao' 
                    ? 'bg-indigo-650 text-white shadow-md border border-indigo-500/50' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
                title="Acesso total para o Proprietário"
              >
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Patrão (Admin)</span>
                <span className="sm:hidden">Patrão</span>
              </button>
              <button
                onClick={() => setRole('funcionario')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  role === 'funcionario' 
                    ? 'bg-slate-700 text-white shadow-md border border-slate-655/50' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
                title="Acesso operacional básico"
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Funcionário</span>
                <span className="sm:hidden">Func.</span>
              </button>
            </div>

            <div className="text-xs text-slate-400 hidden lg:block bg-white/5 px-3 py-1 rounded-full border border-white/10">
               {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Toaster position="top-center" expand={true} richColors />
    </div>
  );
}
