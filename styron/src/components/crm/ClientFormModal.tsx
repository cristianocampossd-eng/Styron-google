import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Client } from "@/lib/crmService";
import { 
  User, 
  Building, 
  MapPin, 
  DollarSign, 
  Phone, 
  Mail, 
  Globe, 
  Briefcase 
} from "lucide-react";

interface ClientFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSave: (clientData: Omit<Client, "id" | "created_at" | "updated_at">) => Promise<void>;
}

export function ClientFormModal({ isOpen, onOpenChange, client, onSave }: ClientFormModalProps) {
  const [loading, setLoading] = useState(false);

  // Form Fields
  // Basic Info
  const [contatoNome, setContatoNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [cargo, setCargo] = useState("");
  const [emailPrincipal, setEmailPrincipal] = useState("");
  const [emailSecundario, setEmailSecundario] = useState("");
  const [telefonePrincipal, setTelefonePrincipal] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [site, setSite] = useState("");

  // Address
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [pais, setPais] = useState("Brasil");

  // Commercial
  const [origemLead, setOrigemLead] = useState("");
  const [segmento, setSegmento] = useState("");
  const [porteEmpresa, setPorteEmpresa] = useState("PEQUENA");
  const [qtdFuncionarios, setQtdFuncionarios] = useState<number>(1);
  const [faturamentoEstimado, setFaturamentoEstimado] = useState<number>(0);
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  useEffect(() => {
    if (client) {
      setContatoNome(client.contato_nome || "");
      setEmpresa(client.empresa || "");
      setRazaoSocial(client.razao_social || "");
      setCpf(client.cpf || "");
      setCnpj(client.cnpj || "");
      setInscricaoEstadual(client.inscricao_estadual || "");
      setCargo(client.cargo || "");
      setEmailPrincipal(client.email_principal || "");
      setEmailSecundario(client.email_secundario || "");
      setTelefonePrincipal(client.telefone_principal || "");
      setWhatsapp(client.whatsapp || "");
      setSite(client.site || "");

      setCep(client.cep || "");
      setRua(client.rua || "");
      setNumero(client.numero || "");
      setComplemento(client.complemento || "");
      setBairro(client.bairro || "");
      setCidade(client.cidade || "");
      setEstado(client.estado || "");
      setPais(client.pais || "Brasil");

      setOrigemLead(client.origem_lead || "");
      setSegmento(client.segmento || "");
      setPorteEmpresa(client.porte_empresa || "PEQUENA");
      setQtdFuncionarios(client.qtd_funcionarios || 1);
      setFaturamentoEstimado(client.faturamento_estimado || 0);
      setObservacoes(client.observacoes || "");
      setStatus(client.status || "active");
    } else {
      // Clear form
      setContatoNome("");
      setEmpresa("");
      setRazaoSocial("");
      setCpf("");
      setCnpj("");
      setInscricaoEstadual("");
      setCargo("");
      setEmailPrincipal("");
      setEmailSecundario("");
      setTelefonePrincipal("");
      setWhatsapp("");
      setSite("");

      setCep("");
      setRua("");
      setNumero("");
      setComplemento("");
      setBairro("");
      setCidade("");
      setEstado("");
      setPais("Brasil");

      setOrigemLead("Direto");
      setSegmento("");
      setPorteEmpresa("PEQUENA");
      setQtdFuncionarios(1);
      setFaturamentoEstimado(0);
      setObservacoes("");
      setStatus("active");
    }
  }, [client, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contatoNome) {
      toast.error("Nome do contato é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      await onSave({
        contato_nome: contatoNome,
        empresa,
        razao_social: razaoSocial,
        cpf,
        cnpj,
        inscricao_estadual: inscricaoEstadual,
        cargo,
        email_principal: emailPrincipal,
        email_secundario: emailSecundario,
        telefone_principal: telefonePrincipal,
        whatsapp,
        site,
        cep,
        rua,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        pais,
        origem_lead: origemLead,
        segmento,
        porte_empresa: porteEmpresa,
        qtd_funcionarios: Number(qtdFuncionarios),
        faturamento_estimado: Number(faturamentoEstimado),
        observacoes,
        status,
        logo_url: client?.logo_url || null,
      });
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar cadastro de cliente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <User className="w-5 h-5 text-primary" />
            {client ? "Editar Ficha de Cliente" : "Cadastrar Novo Cliente"}
          </DialogTitle>
          <DialogDescription>
            Insira os dados profissionais, fiscais, endereço e informações ricas para o funil de vendas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Seção 1: Dados Básicos */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b pb-1 dark:text-slate-200">
              <User className="w-4 h-4 text-primary" /> Dados Básicos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contato_nome">Nome do Contato *</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="contato_nome"
                    placeholder="Nome completo do contato"
                    value={contatoNome}
                    onChange={(e) => setContatoNome(e.target.value)}
                    className="pl-8"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="empresa">Empresa (Nome Fantasia)</Label>
                <div className="relative">
                  <Building className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="empresa"
                    placeholder="Nome fantasia da empresa"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="razao_social">Razão Social</Label>
                <Input
                  id="razao_social"
                  placeholder="Nome comercial legal"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ie">Inscrição Estadual</Label>
                <Input
                  id="ie"
                  placeholder="Isento ou numérico"
                  value={inscricaoEstadual}
                  onChange={(e) => setInscricaoEstadual(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cargo">Cargo do Contato</Label>
                <div className="relative">
                  <Briefcase className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="cargo"
                    placeholder="Ex: Diretor de Tecnologia, Compras"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email_principal">E-mail Principal</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email_principal"
                    type="email"
                    placeholder="contato@empresa.com"
                    value={emailPrincipal}
                    onChange={(e) => setEmailPrincipal(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email_sec">E-mail Secundário</Label>
                <Input
                  id="email_sec"
                  type="email"
                  placeholder="diretoria@empresa.com"
                  value={emailSecundario}
                  onChange={(e) => setEmailSecundario(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tel_principal">Telefone Principal</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="tel_principal"
                    placeholder="(00) 0000-0000"
                    value={telefonePrincipal}
                    onChange={(e) => setTelefonePrincipal(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="whatsapp"
                    placeholder="Ex: 5543999999999 (com código)"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="site">Site corporativo</Label>
                <div className="relative">
                  <Globe className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="site"
                    placeholder="https://suaempresa.com"
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Endereço */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b pb-1 dark:text-slate-200">
              <MapPin className="w-4 h-4 text-primary" /> Endereço Comercial
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="rua">Logradouro (Rua)</Label>
                <Input
                  id="rua"
                  placeholder="Av, Rua, Travessa..."
                  value={rua}
                  onChange={(e) => setRua(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  placeholder="Ex: 154A ou S/N"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  placeholder="Sala, Andar, Bloco..."
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  placeholder="Centro, Industrial..."
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  placeholder="Nome da cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  placeholder="Ex: SP, PR, RJ"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pais">País</Label>
                <Input
                  id="pais"
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Informações Comerciais */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b pb-1 dark:text-slate-200">
              <DollarSign className="w-4 h-4 text-primary" /> Informações Comerciais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Origem do Lead</Label>
                <Select value={origemLead} onValueChange={setOrigemLead}>
                  <SelectTrigger>
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inbound - Marketing">Inbound - Marketing</SelectItem>
                    <SelectItem value="Outbound - Prospecção">Outbound - Prospecção</SelectItem>
                    <SelectItem value="Indicação">Indicação de Parceiros</SelectItem>
                    <SelectItem value="Direto">Direto (Contato Ativo)</SelectItem>
                    <SelectItem value="Redes Sociais">Redes Sociais</SelectItem>
                    <SelectItem value="Eventos">Eventos / Feiras</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="segmento">Segmento da Empresa</Label>
                <Input
                  id="segmento"
                  placeholder="Ex: SaaS, Logística, Varejo"
                  value={segmento}
                  onChange={(e) => setSegmento(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Porte da Empresa</Label>
                <Select value={porteEmpresa} onValueChange={setPorteEmpresa}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o porte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MICRO">Microempresa (ME)</SelectItem>
                    <SelectItem value="PEQUENA">Empresa de Pequeno Porte (EPP)</SelectItem>
                    <SelectItem value="MEDIA">Média Empresa</SelectItem>
                    <SelectItem value="GRANDE">Grande Corporação (Enterprise)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qtd_funcionarios">Qtd. Funcionários</Label>
                <Input
                  id="qtd_funcionarios"
                  type="number"
                  min="1"
                  value={qtdFuncionarios}
                  onChange={(e) => setQtdFuncionarios(Math.max(1, Number(e.target.value)))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fatur_est">Faturamento Estimado Anual</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fatur_est"
                    type="number"
                    min="0"
                    placeholder="0,00"
                    value={faturamentoEstimado || ""}
                    onChange={(e) => setFaturamentoEstimado(Number(e.target.value))}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Status do Cliente</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo (Comercial Aberto)</SelectItem>
                    <SelectItem value="inactive">Inativo (Sem Atividade)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="obs_cliente">Observações Internas</Label>
              <Textarea
                id="obs_cliente"
                placeholder="Insira informações de histórico chave, estilo de comunicação, ou particularidades do cliente..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : client ? "Atualizar Ficha de Cliente" : "Salvar Cadastro de Cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
