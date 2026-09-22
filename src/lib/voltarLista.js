// Voltar para a lista COM os filtros que a pessoa tinha aplicado. (22/09/2026)
//
// O PROBLEMA, reproduzido no site em 22/09: filtrar a lista de candidatos, abrir um, e voltar.
// Pelo botão voltar do navegador o filtro voltava certo (ele já morava no endereço). Pelo link
// "← Candidatos 2026" no topo da página do candidato, não: o link tinha endereço FIXO, sem filtro.
// Dois gestos de "voltar" davam em lugares diferentes, e o Jordy notou pelo lado que frustra.
//
// A SOLUÇÃO: a lista anota o último endereço filtrado na sessionStorage, que vale só para esta
// aba e some ao fechá-la (duas abas com filtros diferentes não se atropelam). A página do
// candidato lê a anotação depois de montar e troca o destino do link. Sem anotação (quem chegou
// pelo Google, ou navegador que bloqueia armazenamento) o link fica no destino padrão, igual antes.
//
// Não é document.referrer: numa navegação interna do Next ele continua apontando para a primeira
// página carregada, não para a anterior.
import { useEffect, useState } from 'react';

const PREFIXO = 'lume:lista:';

export function lembrarLista(chave, url) {
  try { window.sessionStorage.setItem(PREFIXO + chave, url); } catch { /* armazenamento bloqueado: segue sem */ }
}

export function useVoltarLista(chave, padrao) {
  const [destino, setDestino] = useState(padrao);
  useEffect(() => {
    try {
      const salvo = window.sessionStorage.getItem(PREFIXO + chave);
      // Só aceita caminho interno do próprio site: a anotação nunca vira link para fora.
      if (salvo && salvo.startsWith('/candidatos-2026')) setDestino(salvo);
    } catch { /* fica o padrão */ }
  }, [chave]);
  return destino;
}
