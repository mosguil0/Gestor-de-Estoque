import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Smartphone, BookOpen, Code, Database, Bell, AlertTriangle, Scan, Play, CheckCircle2, Copy, Layers, Sliders, BadgePercent } from 'lucide-react';
import { toast } from 'sonner';

export const FlutterIntegration: React.FC = () => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  // Mobile Simulator State
  const [scanInput, setScanInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    barcode: string;
    minQty: number;
    batches: { id: string; qty: number; expiry: string }[];
  } | null>({
    id: 'prod1',
    name: 'Ração Golden Special Cães Adultos Frango 15kg',
    barcode: '7891000053508',
    minQty: 5,
    batches: [
      { id: 'batch-1', qty: 12, expiry: '2026-06-15' },
      { id: 'batch-2', qty: 18, expiry: '2026-12-05' }
    ]
  });

  const [newBatchQty, setNewBatchQty] = useState('20');
  const [newBatchExpiry, setNewBatchExpiry] = useState('2026-08-30');
  const [newMinQty, setNewMinQty] = useState('10');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`${label} copiado para a área de transferência!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSimulateScan = () => {
    if (!scanInput) {
      toast.error('Digite um código de barras para simular a leitura.');
      return;
    }
    toast.success(`Código de barras lido via Câmera Flutter: ${scanInput}`);
    setSelectedProduct({
      id: Math.random().toString(36).substr(2, 9),
      name: scanInput === '7891000053508' 
        ? 'Ração Golden Special Cães Adultos Frango 15kg' 
        : 'Produto Pet Lido #' + scanInput.slice(-4),
      barcode: scanInput,
      minQty: parseInt(newMinQty) || 5,
      batches: [
        { id: 'b1', qty: 12, expiry: '2026-06-10' },
        { id: 'b2', qty: 18, expiry: '2026-12-05' }
      ]
    });
  };

  const handleAddNewBatch = () => {
    if (!selectedProduct) return;
    const qty = parseInt(newBatchQty);
    if (!qty || !newBatchExpiry) {
      toast.error('Informe a quantidade e a data de validade para o lote!');
      return;
    }

    const updatedBatches = [
      ...selectedProduct.batches,
      { id: Math.random().toString(36).substr(2, 9), qty, expiry: newBatchExpiry }
    ];

    setSelectedProduct({
      ...selectedProduct,
      batches: updatedBatches
    });

    toast.success(`Novo lote de ${qty} unidades recebido com sucesso no Firebase!`);
  };

  const handleUpdateMinQty = () => {
    if (!selectedProduct) return;
    const min = parseInt(newMinQty);
    setSelectedProduct({
      ...selectedProduct,
      minQty: min
    });
    toast.success(`Estoque mínimo de alerta atualizado para ${min} unidades!`);
  };

  const totalQty = selectedProduct 
    ? selectedProduct.batches.reduce((sum, b) => sum + b.qty, 0) 
    : 0;

  const flutterCode = `import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:intl/intl.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const StockApp());
}

class StockApp extends StatelessWidget {
  const StockApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'StockAI Flutter',
      theme: ThemeData.dark().copyWith(
        primaryColor: Colors.indigo,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
      ),
      home: const DashboardScreen(),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Contato Pet Center Mobile'),
        backgroundColor: Colors.indigo.withOpacity(0.2),
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: _db.collection('products').snapshots(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          final docs = snapshot.data!.docs;
          
          return ListView.builder(
            itemCount: docs.length,
            itemBuilder: (context, index) {
              final data = docs[index].data() as Map<String, dynamic>;
              final name = data['name'] ?? 'Produto';
              final barcode = data['barcode'] ?? '';
              final minStock = data['minStockLevel'] ?? 5;
              
              // Calcular estoque total a partir dos subcoleta 'batches'
              return ListTile(
                title: Text(name),
                subtitle: Text('EAN: \$barcode • Alerta: \$minStock un'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ProductDetailsScreen(productId: docs[index].id, name: name),
                  ),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const BarcodeScannerScreen()));
        },
        icon: const Icon(Icons.qr_code_scanner),
        label: const Text('Escanear'),
        backgroundColor: Colors.indigo,
      ),
    );
  }
}

// Scanner Screen implementing fast camera recognition
class BarcodeScannerScreen extends StatelessWidget {
  const BarcodeScannerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Leitor de Código de Barras')),
      body: MobileScanner(
        onDetect: (capture) {
          final List<Barcode> barcodes = capture.barcodes;
          if (barcodes.isNotEmpty) {
            final String? code = barcodes.first.rawValue;
            if (code != null) {
              Navigator.pop(context, code); // Returns read barcode to app state
            }
          }
        },
      ),
    );
  }
}`;

  const firebaseRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permite leitura e escrita para todos os usuários autenticados da sua equipe
    match /products/{productId} {
      allow read, write: if request.auth != null;
      
      // Coleção interna de Lotes do produto
      match /batches/{batchId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
`;
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
            StockPro Flutter + Firebase Setup
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Monitore o simulador mobile e obtenha o código limpo para construir seu aplicativo Flutter completo com banco Firestore integrado.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Mobile Phone Interactive Simulator */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-[360px] h-[720px] bg-slate-900 border-[10px] border-slate-800 rounded-[50px] shadow-2xl overflow-hidden flex flex-col ring-4 ring-indigo-500/10">
            
            {/* Phone Speaker Slot */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-800 rounded-full z-20 flex justify-center items-center">
              <span className="w-12 h-1 bg-slate-900 rounded-full"></span>
            </div>
            
            {/* Phone Content Header */}
            <div className="bg-white/5 px-6 pt-8 pb-4 border-b border-white/5 flex justify-between items-center z-10">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-indigo-400" />
                <span className="font-bold text-sm tracking-tight text-white">StockPro Flutter</span>
              </div>
              <span className="text-[10px] bg-indigo-550/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-400/20">
                Firebase Realtime
              </span>
            </div>

            {/* Simulated App Screen Area */}
            <div className="flex-1 bg-slate-950 p-4 overflow-y-auto space-y-4 text-xs">
              
              {/* Push Notifications Section */}
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex items-start gap-3">
                <Bell className="h-4 w-4 text-indigo-400 animate-pulse mt-0.5" />
                <div>
                  <h4 className="font-bold text-[11px] text-white uppercase tracking-wider">Alertas Mobile Push</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Notificação automática disparada via Cloud Functions quando os itens estão vencendo ou abaixo do mínimo.</p>
                </div>
              </div>

              {/* Simulated Camera Scanner Mode */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3 shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[11px] text-slate-300 uppercase tracking-tight flex items-center gap-1.5">
                    <Scan className="h-3 w-3 text-indigo-400" />
                    Simular Câmera Celular
                  </span>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[10px] text-slate-400">Insira um Código de Barras (EAN):</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Ex: 7891000053508..." 
                      className="h-8 bg-black/40 border-white/10 text-[11px] text-white rounded-lg pl-2 flex-1"
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                    />
                    <Button size="sm" className="h-8 px-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold" onClick={handleSimulateScan}>
                      Ler <Play className="h-2.5 w-2.5 ml-1 inline" />
                    </Button>
                  </div>
                  <div className="text-[9px] text-slate-500 leading-tight">
                    Insira <span className="text-indigo-400 font-mono">7891000053508</span> para carregar um produto teste ou qualquer outro código para cadastrar o fluxo.
                  </div>
                </div>
              </div>

              {/* Active Product Details with Multi-Batches (Lotes Diferentes) */}
              {selectedProduct ? (
                <div className="space-y-3">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-2 shadow-xs">
                    <div>
                      <div className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Produto Selecionado no Banco</div>
                      <h3 className="font-bold text-sm text-white font-sans">{selectedProduct.name}</h3>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedProduct.barcode}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                        <span className="text-[8px] text-slate-500 uppercase font-semibold">Qtd Total Cadastrada</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-base font-extrabold text-indigo-400">{totalQty}</span>
                          <span className="text-[8px] text-slate-500">un.</span>
                        </div>
                      </div>

                      <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                        <span className="text-[8px] text-slate-500 uppercase font-semibold">Limite Alerta</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-base font-extrabold text-orange-400">{selectedProduct.minQty}</span>
                          <span className="text-[8px] text-slate-500">un.</span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Alert Status */}
                    {totalQty <= selectedProduct.minQty ? (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] p-2 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                        <span><strong>Alerta Ativo:</strong> Estoque abaixo da quantidade limite estabelecida!</span>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] p-2 rounded-lg flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>Nível seguro de estoque.</span>
                      </div>
                    )}
                  </div>

                  {/* Multi-Lot Display (Lotes do Produto) */}
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-2 shadow-xs">
                    <div className="flex justify-between items-center text-[10px] border-b border-white/5 pb-1.5">
                      <span className="font-bold text-slate-200 flex items-center gap-1">
                        <Layers className="h-3 w-3 text-indigo-400" />
                        Lotes no Firestore ({selectedProduct.batches.length})
                      </span>
                      <span className="text-[9px] text-slate-500">Vencimento</span>
                    </div>

                    <div className="space-y-1.5 max-h-[110px] overflow-y-auto">
                      {selectedProduct.batches.map((batch, idx) => (
                        <div key={batch.id} className="flex justify-between items-center bg-white/5 p-1.5 rounded-lg border border-white/5">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-400">#{idx+1}</span>
                            <span className="text-slate-300 font-semibold">{batch.qty} un</span>
                          </div>
                          <span className={"font-mono text-[10px] " + (new Date(batch.expiry) < new Date('2026-07-01') ? 'text-red-405' : 'text-slate-400')}>
                            {batch.expiry}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Set Limit customizer */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <Label className="text-[9px] text-slate-400">Limite Alerta do Item</Label>
                        <Input 
                          type="number" 
                          value={newMinQty} 
                          onChange={(e) => setNewMinQty(e.target.value)} 
                          className="h-7 bg-white/5 border-white/5 text-[10px] text-white pl-1 w-full"
                        />
                      </div>
                      <Button size="sm" className="h-7 bg-white/10 hover:bg-white/20 mt-4 text-[9px] text-slate-200" onClick={handleUpdateMinQty}>
                        Aplicar
                      </Button>
                    </div>
                  </div>

                  {/* Lot Entry Section - Simulates capturing dynamic lote quantity & date */}
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-2.5 shadow-xs font-bold text-slate-200">
                    <span className="font-bold text-[10px] text-slate-200 uppercase tracking-tight flex items-center gap-1.5">
                      <Sliders className="h-3 w-3 text-indigo-400" />
                      Inserir Novo Lote
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[9px] text-slate-400">Quantidade</Label>
                        <Input 
                          type="number" 
                          value={newBatchQty} 
                          onChange={(e) => setNewBatchQty(e.target.value)} 
                          className="h-7 bg-white/5 border-white/10 text-[10px] text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-[9px] text-slate-400">Validade Lote</Label>
                        <Input 
                          type="date" 
                          value={newBatchExpiry} 
                          onChange={(e) => setNewBatchExpiry(e.target.value)} 
                          className="h-7 bg-white/5 border-white/10 text-[10px] [color-scheme:dark] text-white"
                        />
                      </div>
                    </div>

                    <Button className="w-full h-8 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-200 hover:text-white font-bold text-[10px] border border-indigo-500/30 rounded-lg mt-1 transition-colors" onClick={handleAddNewBatch}>
                      Confirmar Entrada no Firestore
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-550 italic">
                  Abra a câmera simulada ou digite o código de barras acima para carregar o painel do produto.
                </div>
              )}
            </div>

            {/* Simulated Phone Home Bar */}
            <div className="h-8 bg-slate-950 flex justify-center items-center">
              <div className="w-28 h-1 bg-slate-705 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Right Side: Setup Instructions, Copyable Code, Tech Stack Manual */}
        <div className="lg:col-span-7 space-y-6">
          <Tabs defaultValue="guide" className="w-full text-white">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl w-full grid grid-cols-3">
              <TabsTrigger value="guide" className="rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white text-slate-400 text-xs">
                <BookOpen className="h-3.5 w-3.5 mr-2" /> Guia Integrado
              </TabsTrigger>
              <TabsTrigger value="code" className="rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white text-slate-400 text-xs">
                <Code className="h-3.5 w-3.5 mr-2" /> Código Flutter
              </TabsTrigger>
              <TabsTrigger value="rules" className="rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white text-slate-400 text-xs">
                <Database className="h-3.5 w-3.5 mr-2" /> Regras Firebase
              </TabsTrigger>
            </TabsList>

            {/* Integrate Instruction manual */}
            <TabsContent value="guide" className="mt-4 space-y-4">
              <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-indigo-400 uppercase tracking-wider">Arquitetura de Uso Fácil recomendada</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Siga este roadmap de 4 passos para conectar o aplicativo móvel Flutter à estrutura Firebase com segurança e sincronizar os lotes e validades.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs text-slate-300">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                    <div>
                      <h4 className="font-bold text-white">Criar Projeto no Firebase</h4>
                      <p className="mt-1 text-slate-450 leading-relaxed animate-none">
                        Acesse o Console do Firebase, crie um projeto e registre seu app Flutter usando o comando <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded text-[10px]">flutterfire configure</code> para gerar os arquivos de conexão automaticamente.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                    <div>
                      <h4 className="font-bold text-white">Configurar o Firestore (Coleções e Subcoleções)</h4>
                      <p className="mt-1 text-slate-450 leading-relaxed">
                        A estrutura ideal para gerenciar lotes se divide em duas partes:<br />
                        • Coleção principal <code className="text-indigo-400 font-bold font-mono">products/</code> para os dados principais do produto (Nome, EAN e Estoque de segurança).<br />
                        • Subcoleção <code className="text-emerald-400 font-bold font-mono">batches/</code> dentro de cada produto para gerenciar quantidades com validades diferentes.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                    <div>
                      <h4 className="font-bold text-white">Habilitar Leitura de Código com mobile_scanner</h4>
                      <p className="mt-1 text-slate-450 leading-relaxed animate-none">
                        O pacote <code className="text-indigo-400 font-mono">mobile_scanner</code> utiliza a aceleração de hardware nativa do iOS/Android para decodificar EAN-13 em milissegundos sem causar lentidão e abrindo instantaneamente no toque do botão.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">4</div>
                    <div>
                      <h4 className="font-bold text-white">Configurar Alertas Customizados de Estoque Baixo</h4>
                      <p className="mt-1 text-slate-450 leading-relaxed">
                        Defina o campo <code className="text-orange-400 font-mono">minStockLevel</code> de forma individualizada. Através do simulador ao lado, veja como o alerta visual se ajusta e informe quando o total somado for inferior ao estabelecido!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="code" className="mt-4 space-y-4">
              <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                <CardHeader className="flex flex-row justify-between items-center border-b border-white/5 pb-4">
                  <div>
                    <CardTitle className="text-base font-bold text-white">Código Completo Flutter (Dart)</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Implementação rápida da página principal de visualização de estoque e leitor nativo.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="border-white/10 h-8 text-slate-200 hover:bg-white/5" onClick={() => copyToClipboard(flutterCode, 'Código Flutter')}>
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    {copiedText === 'Código Flutter' ? 'Copiado!' : 'Copiar'}
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <pre className="text-[10px] font-mono text-indigo-200 overflow-x-auto max-h-[380px] bg-black/40 p-4 rounded-xl leading-relaxed whitespace-pre scrollbar-thin">
                    {flutterCode}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rules" className="mt-4 space-y-4">
              <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                <CardHeader className="flex flex-row justify-between items-center border-b border-white/5 pb-4">
                  <div>
                    <CardTitle className="text-base font-bold text-white">Regras de Segurança Firestore (firestore.rules)</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Limite o acesso de leitura e escrita somente a usuários logados na sua equipe.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="border-white/10 h-8 text-slate-200 hover:bg-white/5" onClick={() => copyToClipboard(firebaseRules, 'Regras Firebase')}>
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    {copiedText === 'Regras Firebase' ? 'Copiado!' : 'Copiar'}
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <pre className="text-xs font-mono text-indigo-200 overflow-x-auto max-h-[380px] bg-black/40 p-4 rounded-xl leading-relaxed whitespace-pre">
                    {firebaseRules}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
