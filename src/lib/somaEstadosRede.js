// CARGA DA SOMA DOS ESTADOS (18/10/2026, I4, D-049): pede ao TSE os 27 estados + exterior e entrega os objetos já reduzidos.
// `buscar(url)` é injetado (devolve o JSON ou lança erro com .status). Nunca lança: devolve { ok:false, motivo } e a rota
// fica com o nacional. Limites de segurança: concorrência pequena (o TSE bloqueia IP com excesso de pedidos), tempo total
// máximo (`limiteMs`) e parada na 1ª resposta 404 ou 403/429 (não insiste: 404 repetido bloqueia o IP por 10 min).
import { urlPresidentePorUf, urlPresidenteExterior, reduzirResultado } from './apuracaoTse';
import { UFS_SOMA } from './somaEstados';

export async function carregarParaSoma({ turno = 1, env = process.env, buscar, limiteMs = 6000, concorrencia = 10 }) {
  const alvos = [...UFS_SOMA.map((uf) => ({ chave: uf, ...urlPresidentePorUf(uf, env, turno) })), { chave: 'ZZ', ...urlPresidenteExterior(env, turno) }];
  if (alvos.some((a) => !a.url)) return { ok: false, motivo: 'turno_invalido' };
  const estados = {}; let exterior = null; let parar = null;
  const fila = alvos.slice();
  const trabalhador = async () => {
    while (fila.length && !parar) {
      const a = fila.shift();
      try {
        const r = reduzirResultado(await buscar(a.url), 'presidente');
        if (a.chave === 'ZZ') exterior = r; else estados[a.chave] = r;
      } catch (e) {
        const st = e && e.status;
        if (st === 404 || st === 403 || st === 429) parar = `tse_${st}`; // não insiste
      }
    }
  };
  let relogio;
  const prazo = new Promise((res) => { relogio = setTimeout(() => res('prazo'), limiteMs); });
  const fim = await Promise.race([Promise.all(Array.from({ length: Math.min(concorrencia, alvos.length) }, trabalhador)).then(() => 'fim'), prazo]);
  clearTimeout(relogio);
  if (fim === 'prazo') { fila.length = 0; return { ok: false, motivo: 'prazo_estourado' }; }
  if (parar) return { ok: false, motivo: parar };
  return { ok: true, estados, exterior };
}
