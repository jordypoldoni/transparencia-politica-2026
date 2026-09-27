// CASAS DO MÓDULO PARLAMENTARES (27/09/2026). Fonte única de "que grupos de parlamentares a
// afinidade compara", usada pela rota (servidor) e pela tela (navegador).
//
// PLUGÁVEL: Câmara e Senado valem para todos os estados. Assembleia só onde o site tem o voto de
// cada deputado estadual. Acrescentar uma Assembleia (AM, RO...) é: coletor dos votos, perguntas
// com a casa dela em src/lib/perguntasAfinidade.js e UMA linha em ASSEMBLEIAS_COM_VOTO. O resto
// (rota, cálculo, tela) não muda.
import { casaDoPerfil } from '../casa';

export const CASAS_AFINIDADE = [
  { id: 'camara', rotulo: 'Deputados Federais', singular: 'Deputado(a) Federal',
    ehDaCasa: (a) => { const c = casaDoPerfil(a); return !c.ehSenado && !c.ehEstadual; } },
  { id: 'senado', rotulo: 'Senadores', singular: 'Senador(a)',
    ehDaCasa: (a) => casaDoPerfil(a).ehSenado },
  { id: 'assembleia', rotulo: 'Deputados Estaduais', singular: 'Deputado(a) Estadual',
    ehDaCasa: (a) => casaDoPerfil(a).ehEstadual },
];

// Assembleias com voto nominal no site. `casaVotacao` é o valor de `casa` nas votações do
// catálogo de perguntas.
export const ASSEMBLEIAS_COM_VOTO = {
  RS: { casaVotacao: 'alergs', nome: 'Assembleia Legislativa do RS' },
};

export const casaAfinidade = (id) => CASAS_AFINIDADE.find((c) => c.id === id) || null;
