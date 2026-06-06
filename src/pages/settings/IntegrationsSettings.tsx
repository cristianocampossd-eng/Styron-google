import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Calendar, Info } from "lucide-react";

export default function IntegrationsSettings() {
  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      <div>
        <h3 className="text-lg font-medium">Integrações de Terceiros</h3>
        <p className="text-sm text-muted-foreground">
          Gerenciamento de conexões externas e ferramentas de produtividade.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-md flex items-center gap-2">
                Agenda Local Ativa
              </CardTitle>
              <CardDescription className="text-xs">
                A sincronização externa com o Google Agenda foi desativada. Todos os compromissos são registrados e mantidos nativamente.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg text-xs space-y-2 leading-relaxed text-slate-600 dark:text-slate-350">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">Seus compromissos continuam 100% seguros:</p>
                  <ul className="list-disc pl-4 mt-1.5 space-y-1.5">
                    <li>Reuniões, ligações e follow-ups criados por você ou pela IA são gerenciados de forma privativa.</li>
                    <li>As datas e horários são mostrados de forma interativa no Calendário e em cada Ficha de Cliente.</li>
                    <li>Sem dependências de chaves externas ou permissões adicionais do Google.</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
