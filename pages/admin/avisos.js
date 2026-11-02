import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { t } from '../../src/estilo/tokens';
import Giro from '../../components/Giro';
import { validarSessao, sessaoAtual } from '../../src/lib/perfilUsuario';
import { STATUS_AVISO, ROTULO_STATUS } from '../../src/lib/admin';
import { avisarMudancaDeAvisos } from '../../src/lib/souAdmin';

// PAINEL DE AVISOS DE ERRO (02/11/2026). Só o administrador do Lume (e-mail em ADMIN_EMAIL, conferido no servidor)
// vê a lista dos avisos do formulário /avisar-erro e muda o status de cada um. Fora do Google (noindex) e fora do mapa do site.
// Quem não é administrador não vê nada além de "sem acesso".
const pilula = (ativa) => ({ border: 'none', cursor: 'pointer', fontFamily: t.fonte.corpo, fontSize: '0.85rem', fontWeight: 700, padding: '8px 16px', borderRadius: t.raio.pill, background: ativa ? t.cor.verde : t.cor.papelQuente, color: ativa ? t.cor.ouro : t.cor.tinta, boxShadow: ativa ? t.sombra.botao : t.sombra.clicavel });
const FILTROS = ['todos', ...STATUS_AVISO];
const ROTULO_FILTRO = { todos: 'Todos', ...ROTULO_STATUS };

const quando = (iso) => {
  try { return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }); } catch (_) { return String(iso || ''); }
};

export default function AdminAvisos() {
  const [estado, setEstado] = useState('carregando'); // carregando | sem_sessao | sem_acesso | erro | ok
  const [filtro, setFiltro] = useState('todos');
  const [dados, setDados] = useState(null);
  const [salvando, setSalvando] = useState(0);
  const [msg, setMsg] = useState('');

  const chamar = useCallback(async (opcoes = {}, f = 'todos') => {
    const s = await sessaoAtual();
    if (!s) return { status: 401 };
    const r = await fetch(`/api/admin/avisos${opcoes.method === 'PATCH' ? '' : `?status=${encodeURIComponent(f)}`}`, {
      ...opcoes, headers: { Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' },
    });
    return { status: r.status, corpo: await r.json().catch(() => ({})) };
  }, []);

  const carregar = useCallback(async (f) => {
    const r = await chamar({}, f);
    if (r.status === 401) { setEstado('sem_sessao'); return; }
    if (r.status === 403) { setEstado('sem_acesso'); return; }
    if (r.status !== 200) { setEstado('erro'); return; }
    setDados(r.corpo); setEstado('ok');
  }, [chamar]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const u = await validarSessao().catch(() => null);
      if (!vivo) return;
      if (!u) { setEstado('sem_sessao'); return; }
      await carregar('todos');
    })();
    return () => { vivo = false; };
  }, [carregar]);

  const trocarFiltro = async (f) => { setFiltro(f); setMsg(''); await carregar(f); };

  const mudar = async (id, status) => {
    setSalvando(id); setMsg('');
    const r = await chamar({ method: 'PATCH', body: JSON.stringify({ id, status }) });
    setSalvando(0);
    if (r.status !== 200) { setMsg('Não foi possível salvar. Tente de novo.'); return; }
    await carregar(filtro);
    avisarMudancaDeAvisos();
  };

  return (
    <div className="pagina">
      <Head><title>Avisos de erro | Lume Cidadão</title><meta name="robots" content="noindex,nofollow" /></Head>
      <div className="leitura" style={{ maxWidth: '860px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>Administração</span>
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(2rem,5vw,2.8rem)', lineHeight: 1.1, margin: '12px 0 16px' }}>Avisos de erro</h1>

        {estado === 'carregando' && <p style={{ display: 'flex', alignItems: 'center', gap: '10px', color: t.cor.cinza }}><Giro tamanho={18} /> Carregando…</p>}
        {estado === 'sem_sessao' && (
          <p style={{ color: t.cor.cinza, lineHeight: 1.65 }}>
            Entre com a sua conta para ver os avisos. <Link href="/entrar" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Entrar</Link>, e depois volte a esta página.
          </p>
        )}
        {estado === 'sem_acesso' && <p style={{ color: t.cor.cinza, lineHeight: 1.65 }}>Esta conta não tem acesso a esta página.</p>}
        {estado === 'erro' && <p role="alert" style={{ color: t.cor.nao, fontWeight: 600 }}>Não foi possível carregar os avisos agora. Atualize a página.</p>}

        {estado === 'ok' && dados && (
          <>
            <div role="group" aria-label="Filtrar por status" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '0 0 20px' }}>
              {FILTROS.map((f) => (
                <button key={f} type="button" onClick={() => trocarFiltro(f)} aria-pressed={filtro === f} style={pilula(filtro === f)}>
                  {ROTULO_FILTRO[f]} ({dados.contagens?.[f] ?? 0})
                </button>
              ))}
            </div>
            {msg && <p role="alert" style={{ color: t.cor.nao, fontWeight: 600, margin: '0 0 12px' }}>{msg}</p>}
            {dados.avisos.length === 0 ? (
              <p style={{ color: t.cor.cinza }}>Nenhum aviso neste filtro.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
                {dados.avisos.map((a) => (
                  <li key={a.id} style={{ background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '14px 16px', boxShadow: t.sombra.sutil }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px 16px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', color: t.cor.cinza, fontWeight: 700 }}>#{a.id} · {quando(a.criado_em)}</span>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 700, color: t.cor.tinta }}>
                        {salvando === a.id && <Giro tamanho={14} />}
                        Status
                        <select value={a.status} disabled={salvando === a.id} onChange={(e) => mudar(a.id, e.target.value)}
                          style={{ fontFamily: t.fonte.corpo, fontSize: '0.9rem', padding: '6px 10px', borderRadius: '10px', border: 'none', background: '#fff', color: t.cor.tinta, boxShadow: 'inset 0 0 0 1px #CC7A22' }}>
                          {STATUS_AVISO.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}
                        </select>
                      </label>
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                      <strong style={{ color: t.cor.tinta }}>Página: </strong>
                      {String(a.pagina).startsWith('/')
                        ? <Link href={a.pagina} style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>{a.pagina}</Link>
                        : <span style={{ color: t.cor.cinza }}>{a.pagina}</span>}
                    </p>
                    <p style={{ margin: '0 0 8px', color: t.cor.tinta, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{a.descricao}</p>
                    {a.email_retorno && (
                      <p style={{ margin: 0, fontSize: '0.88rem', color: t.cor.cinza }}>
                        Responder para: <a href={`mailto:${a.email_retorno}`} style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>{a.email_retorno}</a>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
