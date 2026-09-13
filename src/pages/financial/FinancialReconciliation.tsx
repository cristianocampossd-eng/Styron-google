import { useState, useMemo } from "react";
import { UploadCloud, CheckCircle, Trash2, CheckSquare, Square, RefreshCcw, Save } from "lucide-react";
import Papa from "papaparse";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { parse, isValid } from "date-fns";

type ReconciliationRow = {
  id: string;
  originalDate: string;
  originalDesc: string;
  originalValue: number;
  type: "income" | "expense";
  date: Date;
  selected: boolean;
  categoryId: string;
  projectId: string;
  systemId: string;
};

export default function FinancialReconciliation() {
  const { accounts, categories, projects, addTransaction, updateAccountBalance } = useApp();
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [bulkCategory, setBulkCategory] = useState<string>("");
  const [bulkProject, setBulkProject] = useState<string>("general");
  const [bulkSystem, setBulkSystem] = useState<string>("none");

  const [search, setSearch] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      processCsv(csvText);
    };
    reader.readAsText(uploadedFile);
  };

  const processCsv = (text: string) => {
    // Asaas export often contains a header preamble
    // We look for the real header row that starts with "Data"
    const lines = text.split("\n");
    const headerIndex = lines.findIndex(line => line.includes('"Data","Transação"') || line.includes('Data,Transação'));
    
    let csvDataToParse = text;
    if (headerIndex !== -1) {
      csvDataToParse = lines.slice(headerIndex).join("\n");
    }

    Papa.parse(csvDataToParse, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedRows: ReconciliationRow[] = [];
        
        results.data.forEach((row: any, index: number) => {
          const dateStr = row["Data"] || "";
          const desc = row["Descrição"] || row["Descricao"] || "";
          const valueStr = row["Valor"] || "0";
          const typeStr = row["Tipo do lançamento"] || row["Tipo"] || "";

          if (!dateStr || dateStr.trim() === "" || desc === "Saldo Inicial" || desc === "Saldo Final") {
            return; // Skip empty rows or balances
          }

          let value = parseFloat(valueStr.replace(",", "."));
          if (isNaN(value)) value = 0;

          // Some banks/gateways use negative values for expenses, let's normalize it to positive absolute value
          // and infer the type from the value sign if the type column is not clear
          let isExpense = value < 0 || typeStr.toLowerCase().includes("débito") || typeStr.toLowerCase().includes("debito") || typeStr.toLowerCase().includes("saída");
          
          let dateObj = new Date();
          const parsedDate = parse(dateStr.trim(), "dd/MM/yyyy", new Date());
          if (isValid(parsedDate)) {
            dateObj = parsedDate;
            dateObj.setHours(12, 0, 0, 0); // avoid timezone issues
          }

          parsedRows.push({
            id: `row-${index}`,
            originalDate: dateStr,
            originalDesc: desc,
            originalValue: Math.abs(value),
            type: isExpense ? "expense" : "income",
            date: dateObj,
            selected: false, // User will select which ones to import
            categoryId: "", // Default to empty, requires mapping
            projectId: "general",
            systemId: "none",
          });
        });

        setRows(parsedRows);
        toast.success(`${parsedRows.length} lançamentos encontrados no arquivo.`);
      },
      error: (error) => {
        toast.error("Erro ao ler o arquivo CSV.");
        console.error(error);
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setRows(rows.map(r => ({ ...r, selected: checked })));
  };

  const applyBulkSettings = () => {
    setRows(rows.map(r => {
      if (!r.selected) return r;
      return {
        ...r,
        ...(bulkCategory ? { categoryId: bulkCategory } : {}),
        projectId: bulkProject,
        systemId: bulkSystem,
      };
    }));
    toast.success("Configurações aplicadas aos lançamentos selecionados.");
  };

  const handleSaveImport = async () => {
    const selectedRows = rows.filter(r => r.selected);
    
    if (selectedRows.length === 0) {
      toast.error("Nenhum lançamento selecionado para importação.");
      return;
    }

    if (!selectedAccount) {
      toast.error("Selecione uma conta de destino para os lançamentos.");
      return;
    }

    // Check if all selected rows have a category
    const missingCategory = selectedRows.find(r => !r.categoryId);
    if (missingCategory) {
      toast.error("Alguns lançamentos selecionados não possuem categoria informada.");
      return;
    }

    setIsProcessing(true);
    let successCount = 0;

    try {
      for (const row of selectedRows) {
        const txn = {
          type: row.type,
          projectId: row.projectId === "general" ? null : row.projectId,
          accountId: selectedAccount,
          categoryId: row.categoryId,
          value: row.originalValue,
          date: row.date,
          description: row.originalDesc,
          systemId: row.systemId === "none" ? null : row.systemId,
          affectsSystemBalance: row.systemId !== "none" ? true : null, // Default behavior
        };

        await addTransaction(txn);
        
        // Update account balance
        if (row.type === "income") {
          await updateAccountBalance(selectedAccount, row.originalValue);
        } else if (row.type === "expense") {
          await updateAccountBalance(selectedAccount, -row.originalValue);
        }
        
        successCount++;
      }
      
      toast.success(`${successCount} movimentações importadas com sucesso!`);
      // Remove imported rows from the list
      setRows(rows.filter(r => !r.selected));
      
    } catch (error) {
      console.error(error);
      toast.error("Erro ao importar alguns lançamentos.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRows = rows.filter(r => 
    r.originalDesc.toLowerCase().includes(search.toLowerCase()) || 
    r.originalValue.toString().includes(search)
  );

  const selectedCount = rows.filter(r => r.selected).length;
  const totalValueSelected = rows.filter(r => r.selected).reduce((acc, curr) => acc + curr.originalValue, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <RefreshCcw className="w-5 h-5 text-indigo-500" />
            Conciliação Bancária
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Importe seu extrato (CSV) e faça a conciliação automática com os lançamentos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">1. Configuração Inicial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Conta Destino</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Arquivo de Extrato (CSV)</Label>
                <div className="mt-1.5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    accept=".csv" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                  />
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {file ? file.name : "Clique ou arraste um arquivo CSV"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Formato Asaas, Cora, Nubank...</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {rows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Aplicação em Lote</CardTitle>
                <CardDescription className="text-xs">Aplicar aos {selectedCount} itens selecionados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Categoria</Label>
                  <Select value={bulkCategory} onValueChange={setBulkCategory}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Projeto</Label>
                  <Select value={bulkProject} onValueChange={setBulkProject}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Geral" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Geral (Nenhum)</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={applyBulkSettings}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={selectedCount === 0}
                >
                  Aplicar Configurações
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-8 lg:col-span-9">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">2. Transações Identificadas</CardTitle>
                <CardDescription>Revise e categorize os lançamentos antes de importar.</CardDescription>
              </div>
              {rows.length > 0 && (
                <div className="w-64">
                  <Input 
                    placeholder="Buscar na descrição..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full text-slate-500">
                  <RefreshCcw className="w-12 h-12 mb-4 text-slate-200 dark:text-slate-800" />
                  <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Nenhum lançamento</h3>
                  <p className="text-sm mt-1">Faça o upload de um arquivo CSV para começar a conciliação.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 font-medium text-center w-12">
                          <Checkbox 
                            checked={selectedCount === rows.length && rows.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </th>
                        <th className="px-4 py-3 font-medium">Data</th>
                        <th className="px-4 py-3 font-medium">Descrição</th>
                        <th className="px-4 py-3 font-medium">Valor</th>
                        <th className="px-4 py-3 font-medium">Categoria</th>
                        <th className="px-4 py-3 font-medium">Projeto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredRows.map((row) => (
                        <tr key={row.id} className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${row.selected ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                          <td className="px-4 py-3 text-center">
                            <Checkbox 
                              checked={row.selected}
                              onCheckedChange={(c) => {
                                setRows(rows.map(r => r.id === row.id ? { ...r, selected: !!c } : r));
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {row.originalDate}
                          </td>
                          <td className="px-4 py-3 min-w-[200px]">
                            <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-1" title={row.originalDesc}>
                              {row.originalDesc}
                            </div>
                            <div className="text-xs mt-1">
                              {row.type === "income" ? (
                                <span className="inline-flex items-center text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                  Entrada
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                  Saída
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap font-medium ${row.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {row.type === "income" ? "+" : "-"} R$ {row.originalValue.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 min-w-[180px]">
                            <Select 
                              value={row.categoryId} 
                              onValueChange={(v) => {
                                setRows(rows.map(r => r.id === row.id ? { ...r, categoryId: v } : r));
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {categories
                                  .filter(c => c.type === row.type || c.type === 'transfer') // Simple filtering heuristic if needed, or show all
                                  .map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3 min-w-[150px]">
                            <Select 
                              value={row.projectId} 
                              onValueChange={(v) => {
                                setRows(rows.map(r => r.id === row.id ? { ...r, projectId: v } : r));
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Geral" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="general">Geral</SelectItem>
                                {projects.map(p => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {rows.length > 0 && (
                <div className="p-4 border-t bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
                  <div className="text-sm">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedCount}</span> itens selecionados 
                    (Total: <span className="font-semibold">R$ {totalValueSelected.toFixed(2)}</span>)
                  </div>
                  <Button 
                    onClick={handleSaveImport} 
                    disabled={selectedCount === 0 || isProcessing}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isProcessing ? "Importando..." : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Importar Selecionados
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
