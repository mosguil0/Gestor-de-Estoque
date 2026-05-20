import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BarcodeScanner } from '../components/BarcodeScanner';
import { stockService } from '../services/stockService';
import { Product } from '../types';
import { Maximize2, Scan, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';

export const StockEntry: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [isNewProduct, setIsNewProduct] = useState(false);

  const handleScan = (code: string) => {
    setBarcode(code);
    setIsScanning(false);
    toast.success(`Código lido: ${code}`);
    
    // Check if product already exists
    const existingProducts = stockService.getProducts();
    const product = existingProducts.find(p => p.barcode === code);
    
    if (product) {
      setProductName(product.name);
      setMinStock(product.minStockLevel.toString());
      setIsNewProduct(false);
    } else {
      setProductName('');
      setIsNewProduct(true);
      toast.info('Produto novo detectado. Por favor, cadastre os detalhes.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode || !productName || !quantity || !expiryDate) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    let productId = '';
    const existingProducts = stockService.getProducts();
    const existingProduct = existingProducts.find(p => p.barcode === barcode);

    if (existingProduct) {
      productId = existingProduct.id;
    } else {
      productId = Math.random().toString(36).substr(2, 9);
      stockService.saveProduct({
        id: productId,
        name: productName,
        barcode: barcode,
        category: 'Geral',
        minStockLevel: parseInt(minStock),
      });
    }

    stockService.addBatch({
      id: Math.random().toString(36).substr(2, 9),
      productId,
      quantity: parseInt(quantity),
      expiryDate,
      receivedAt: new Date().toISOString(),
    });

    toast.success('Entrada de estoque realizada com sucesso!');
    
    // Reset form
    setBarcode('');
    setProductName('');
    setQuantity('');
    setExpiryDate('');
    setIsNewProduct(false);
  };  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="bg-white/5 border-white/10 backdrop-blur-md rounded-2xl">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <Plus className="h-6 w-6 text-indigo-400" />
            Entrada de Produtos
          </CardTitle>
          <CardDescription className="text-slate-400">
            Use o leitor de código de barras ou insira manualmente os dados para registrar a entrada de novos itens.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
              {isScanning ? (
                <div className="w-full space-y-4">
                  <BarcodeScanner onScan={handleScan} />
                  <Button variant="outline" className="w-full border-white/10 text-slate-300 hover:bg-white/5" onClick={() => setIsScanning(false)}>
                    Cancelar Leitura
                  </Button>
                </div>
              ) : (
                <button className="w-full flex flex-col items-center gap-3 py-4" onClick={() => setIsScanning(true)}>
                  <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Scan className="h-8 w-8 text-indigo-400" />
                  </div>
                  <span className="font-semibold text-slate-200">Ativar Leitor de Código de Barras</span>
                  <span className="text-xs text-slate-500">Aponte a câmera para o EAN-13</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="barcode" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Código de Barras</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="barcode" 
                      value={barcode} 
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="Leia ou digite o código"
                      className="bg-white/5 border-white/10 rounded-xl h-12 focus:ring-indigo-500 text-white placeholder:text-slate-500"
                    />
                    <Button type="button" variant="outline" size="icon" className="h-12 w-12 border-white/10 text-slate-300" onClick={() => setIsScanning(true)}>
                      <Maximize2 className="h-5 w-5 text-indigo-400" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Nome do Produto</Label>
                  <Input 
                    id="name" 
                    value={productName} 
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Ex: Leite Integral"
                    className="bg-white/5 border-white/10 rounded-xl h-12 focus:ring-indigo-500 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Quantidade</Label>
                  <Input 
                    id="quantity" 
                    type="number"
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    className="bg-white/5 border-white/10 rounded-xl h-12 focus:ring-indigo-500 text-slate-300 placeholder:text-slate-500 text-center"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Vencimento</Label>
                  <Input 
                    id="expiry" 
                    type="date"
                    value={expiryDate} 
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="bg-white/5 border-white/10 rounded-xl h-12 focus:ring-indigo-500 [color-scheme:dark] text-slate-300"
                  />
                </div>

                {isNewProduct && (
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="min" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Estoque Mínimo (Alerta)</Label>
                    <Input 
                      id="min" 
                      type="number"
                      value={minStock} 
                      onChange={(e) => setMinStock(e.target.value)}
                      placeholder="Limite para reposição"
                      className="bg-white/5 border-white/10 rounded-xl h-12 focus:ring-indigo-500 text-white placeholder:text-slate-500"
                    />
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full h-12 gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20">
                <Save className="h-5 w-5" />
                Registrar Entrada de Lote
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
