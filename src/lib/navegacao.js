// ESTADO DE NAVEGAÇÃO COMPARTILHADO (20/10/2026, itens 1 e 7 da lista do Jordy).
//
// Por quê: as páginas do site são renderizadas no servidor e demoram de 2s a 16s (medido no ar:
// /estado/RS 15,7s, perfil do parlamentar 6 a 17s). Durante esse tempo a página antiga continua na
// tela e o único retorno era uma barra fina de 3px no topo. O campo "Seu estado" da página inicial
// ainda voltava a ficar vazio depois de escolher, e a pessoa achava que nada tinha acontecido.
//
// Este módulo é a fonte única de "estamos abrindo uma página". O `_app.js` alimenta com os eventos do
// roteador; `IndicadorNavegacao` (barra e aviso) e `CampoSelect` (giro no campo) só leem.
import { useSyncExternalStore } from 'react';

const INICIAL = { navegando: false, rotulo: '', falhou: false };
let estado = INICIAL;
const ouvintes = new Set();
const mudar = (parcial) => { estado = { ...estado, ...parcial }; ouvintes.forEach((f) => f()); };

export const assinar = (f) => { ouvintes.add(f); return () => ouvintes.delete(f); };
export const lerNavegacao = () => estado;
export const useNavegacao = () => useSyncExternalStore(assinar, lerNavegacao, () => INICIAL);

// Quem sabe para onde vai (um campo de escolha, por exemplo) anuncia o nome do destino logo antes
// de chamar o roteador. Vale por menos de 1s: se não houver navegação nesse intervalo, descarta,
// para um rótulo antigo nunca aparecer numa navegação que não tem relação com ele.
let pendente = null;
export function anunciarDestino(rotulo) {
  pendente = rotulo ? { rotulo, ate: Date.now() + 800 } : null;
}
const consumir = () => {
  const p = pendente;
  pendente = null;
  return p && p.ate >= Date.now() ? p.rotulo : '';
};

// Rótulo genérico quando ninguém anunciou o destino (clique num cartão ou num link).
export function rotuloDaUrl(url = '') {
  const p = String(url).split('?')[0].split('#')[0];
  if (/^\/(deputado|deputado-federal|senador|politico|presidencial|candidato-[a-z]+)\//.test(p)) return 'Abrindo o perfil…';
  if (/^\/votacao\//.test(p)) return 'Abrindo a votação…';
  if (/^\/estado\//.test(p)) return 'Abrindo a página do estado…';
  if (/^\/cpis\//.test(p)) return 'Abrindo o pedido de CPI…';
  if (/^\/indicacao\//.test(p)) return 'Abrindo a indicação…';
  return 'Carregando a página…';
}

let fimAdiado = null;
export function comecouNavegacao(url) {
  clearTimeout(fimAdiado);
  const anunciado = consumir();
  mudar({ navegando: true, falhou: false, rotulo: anunciado ? `Abrindo ${anunciado}…` : rotuloDaUrl(url) });
}
export function terminouNavegacao() {
  clearTimeout(fimAdiado);
  if (estado.navegando) mudar({ navegando: false });
}
// O roteador cancela a navegação em andamento quando outra começa (e emite erro "cancelled" antes do
// novo início). Espera um instante: se uma nova navegação começar, `comecouNavegacao` desfaz isto.
export function cancelouNavegacao() {
  clearTimeout(fimAdiado);
  fimAdiado = setTimeout(() => { if (estado.navegando) mudar({ navegando: false }); }, 80);
}
export function falhouNavegacao() {
  clearTimeout(fimAdiado);
  mudar({ navegando: false, falhou: true });
  fimAdiado = setTimeout(() => mudar({ falhou: false }), 6000);
}
