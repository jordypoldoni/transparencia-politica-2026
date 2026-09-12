import ServicoAPI from '../../src/servicos/servico_api';

// Fatia seguinte do ranking de gastos, para o botao "ver mais 10" em /deputados e /senadores.
// Os 10 primeiros ja vem no payload da pagina; daqui em diante e sob demanda, pelo mesmo
// motivo das proposicoes: guardar tudo no payload penaliza quem nunca clica.
const CASAS = ['Câmara', 'Senado', 'Assembleia (SP)', 'Assembleia (RS)'];
const LIMITE_MAX = 50;

export default async function handler(req, res) {
  const { casa, ano, sentido, offset } = req.query;
  const limite = Math.min(Number(req.query.limite) || 10, LIMITE_MAX);

  // Whitelist em vez de repassar o que veio: casa entra num .eq() e ano num filtro numerico.
  if (!CASAS.includes(casa)) return res.status(400).json({ erro: 'casa inválida' });
  const anoNum = Number(ano);
  if (!Number.isInteger(anoNum) || anoNum < 2000 || anoNum > 2100) return res.status(400).json({ erro: 'ano inválido' });
  const off = Math.max(0, Number(offset) || 0);
  const dir = sentido === 'menores' ? 'menores' : 'maiores';

  try {
    const linhas = await ServicoAPI.getRadarFatia({ casa, ano: anoNum, sentido: dir, offset: off, limite });
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ linhas });
  } catch (e) {
    console.error('/api/radar:', e.message);
    return res.status(500).json({ erro: 'falha ao buscar o ranking' });
  }
}
