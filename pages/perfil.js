import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import NavPraVoce from '../components/NavPraVoce';
import SeusFavoritos from '../components/SeusFavoritos';
import CampoSelect from '../components/CampoSelect';
import { t } from '../src/estilo/tokens';
import { NOMES_UF } from '../src/lib/cotas';
import { PERGUNTAS_AFINIDADE } from '../src/lib/perguntasAfinidade';
import {
  sessaoAtual, aoMudarSessao, sair, lerPerfil, registrarConsentimento, atualizarUf, lerRespostas,
  apagarMeusDados, VERSAO_CONSENTIMENTO, perfilDisponivel,
} from '../src/lib/perfilUsuario';
import { sincronizarTudo } from '../src/lib/sincronizacao';

// SEU PERFIL (26/09/2026). Página de "Pra você" onde a pessoa vê e controla o que é dela.
//
// Ordem das seções pensada para o primeiro acesso: primeiro a CONTA; depois o CONSENTIMENTO,
// sem o qual nada vai para o perfil (o banco recusa); só então estado, respostas e favoritos;
// por último, apagar tudo. Quem não entrou vê o convite para entrar e a garantia de que o site
// funciona igual sem conta.
//
// Consentimento em versão antiga (anterior a VERSAO_CONSENTIMENTO) conta como pendente: o texto
// mudou (passou a citar os favoritos), e quem aceitou o antigo não aceitou o novo.
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const ROTULO = { a_favor: 'a favor', contra: 'contra', sem_opiniao: 'sem opinião' };
const ORIGEM = { escolha: 'marcada por você', ia_confirmada: 'sugerida pela leitura automática e confirmada por você', ia_corrigida: 'sugerida pela leitura automática e corrigida por você' };
const caixa = { background: t.cor.papelCartao, borderRadius: t.raio.md, padding: 'clamp(18px,3vw,24px)', boxShadow: t.sombra.sutil, marginBottom: '18px' };
const h2 = { fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.3rem', margin: '0 0 8px' };
const botao = (claro = false, desligado = false) => ({
  display: 'inline-flex', alignItems: 'center', padding: '11px 22px', fontSize: '0.9rem', fontWeight: 700, fontFamily: t.fonte.corpo,
  border: 'none', borderRadius: t.raio.pill, cursor: desligado ? 'not-allowed' : 'pointer', opacity: desligado ? 0.5 : 1,
  background: claro ? t.cor.papelQuente2 : t.cor.verde, color: claro ? t.cor.tinta : t.cor.ouro,
  boxShadow: desligado ? 'none' : t.sombra.botao, textDecoration: 'none', transition: 'box-shadow .15s, transform .15s',
});
const realce = (e, ligar) => {
  if (e.currentTarget.disabled) return;
  e.currentTarget.style.boxShadow = ligar ? t.sombra.botaoHover : t.sombra.botao;
  e.currentTarget.style.transform = ligar ? 'translateY(-1px)' : 'none';
};
const dataBR = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

export default function Perfil() {
  const [carregando, setCarregando] = useState(true);
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [marcou, setMarcou] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [confirmarApagar, setConfirmarApagar] = useState(false);

  const recarregar = useCallback(async () => {
    const s = await sessaoAtual().catch(() => null);
    setSessao(s);
    if (s) {
      const p = await lerPerfil().catch(() => null);
      setPerfil(p);
      // Com autorização em dia, cada visita junta respostas e favoritos dos dois lados ANTES de
      // mostrar as respostas, para a lista já vir completa.
      if (p?.consentimento_em && p.consentimento_versao >= VERSAO_CONSENTIMENTO) await sincronizarTudo({ forcar: true }).catch(() => null);
      setRespostas(await lerRespostas().catch(() => ({})));
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
    return aoMudarSessao(() => recarregar());
  }, [recarregar]);

  const consentimentoEmDia = Boolean(perfil?.consentimento_em && perfil.consentimento_versao >= VERSAO_CONSENTIMENTO);

  const autorizar = async () => {
    setErro(''); setAviso('');
    try {
      let uf = perfil?.uf || null;
      try { uf = uf || JSON.parse(localStorage.getItem('prefs') || '{}').uf || null; } catch (e) {}
      await registrarConsentimento({ uf });
      const x = await sincronizarTudo({ forcar: true }).catch(() => null);
      const r = x?.respostas?.subiram || 0;
      const f = x?.favoritos || { subiram: 0, desceram: 0 };
      const d = (x?.respostas?.desceram || 0) + f.desceram;
      setAviso(`Pronto. ${r} ${r === 1 ? 'resposta' : 'respostas'} e ${f.subiram} ${f.subiram === 1 ? 'favorito' : 'favoritos'} deste navegador foram para o seu perfil${d ? `, e ${d} ${d === 1 ? 'item veio' : 'itens vieram'} de outros aparelhos` : ''}.`);
      await recarregar();
    } catch (e) { setErro('Não foi possível guardar a autorização. Tente de novo.'); }
  };

  const trocarUf = async (uf) => {
    setPerfil((p) => ({ ...p, uf }));
    try { await atualizarUf(uf); } catch (e) { setErro('Não foi possível salvar o estado.'); }
  };

  const apagar = async () => {
    setErro('');
    try { await apagarMeusDados(); setConfirmarApagar(false); setAviso('Seus dados foram apagados do perfil e deste navegador. A conta de acesso continua existindo; para apagá-la também, escreva para o contato da página de privacidade.'); await recarregar(); }
    catch (e) { setErro('Não foi possível apagar agora. Tente de novo.'); }
  };

  return (
    <div className="pagina">
      <Head><title>Seu perfil | Lume Cidadão</title><meta name="robots" content="noindex" /></Head>
      <NavPraVoce />
      <div style={{ maxWidth: '820px' }}>
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4vw,2.4rem)', margin: '0 0 14px' }}>Seu perfil</h1>

        {carregando ? <p style={{ color: t.cor.cinza }}>Carregando…</p> : !perfilDisponivel || !sessao ? (
          <div style={caixa}>
            <p style={{ margin: '0 0 14px', lineHeight: 1.6 }}>
              Você não está com uma conta aberta. Tudo no site funciona sem conta: suas respostas e favoritos ficam neste
              navegador. A conta serve para levar isso para outros aparelhos.
            </p>
            <Link href="/entrar" style={botao()} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>Entrar</Link>
          </div>
        ) : (
          <>
            <section style={caixa}>
              <h2 style={h2}>Sua conta</h2>
              <p style={{ margin: '0 0 12px', color: t.cor.cinza }}>Entrou como <strong style={{ color: t.cor.tinta }}>{sessao.user.email}</strong>.</p>
              <button type="button" onClick={() => sair()} style={botao(true)} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>Sair</button>
            </section>

            {!consentimentoEmDia ? (
              <section style={{ ...caixa, boxShadow: t.sombra.media }}>
                {/* Destaque por SOMBRA mais forte, nunca por borda lateral (regra do Jordy, 26/09/2026). */}
                <h2 style={h2}>Autorizar o perfil a guardar seus dados</h2>
                <p style={{ margin: '0 0 10px', lineHeight: 1.6 }}>
                  {perfil?.consentimento_em ? 'O texto desta autorização mudou desde que você aceitou: agora ele inclui os favoritos. ' : ''}
                  Para guardar no seu perfil, e levar para outros aparelhos, precisamos da sua autorização. Ficariam guardados:
                </p>
                <ul style={{ margin: '0 0 12px', paddingLeft: '20px', lineHeight: 1.6 }}>
                  <li>o seu estado;</li>
                  <li>a sua posição (a favor, contra ou sem opinião) nas perguntas do questionário, e como ela foi dada;</li>
                  <li>os políticos e partidos que você marcar como favoritos.</li>
                </ul>
                <p style={{ margin: '0 0 14px', lineHeight: 1.6, color: t.cor.cinza, fontSize: '0.9rem' }}>
                  Isso é <strong style={{ color: t.cor.tinta }}>dado pessoal sensível</strong> pela LGPD (opinião política). Só você vê, ninguém
                  mais: nem partidos, nem candidatos. Você pode apagar tudo nesta mesma página, quando quiser. Sem autorizar, nada disso sai
                  deste navegador.
                </p>
                <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '14px', cursor: 'pointer', lineHeight: 1.5 }}>
                  <input type="checkbox" checked={marcou} onChange={(e) => setMarcou(e.target.checked)} style={{ marginTop: '4px', width: '18px', height: '18px' }} />
                  <span>Autorizo o Lume a guardar no meu perfil os dados acima, para a finalidade descrita (versão {VERSAO_CONSENTIMENTO} deste texto).</span>
                </label>
                <button type="button" onClick={autorizar} disabled={!marcou} style={botao(false, !marcou)} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>Guardar no meu perfil</button>
              </section>
            ) : (
              <>
                <section style={caixa}>
                  <h2 style={h2}>Seu estado</h2>
                  <div style={{ maxWidth: '380px' }}>
                    <CampoSelect opcoes={UFS.map((u) => ({ valor: u, rotulo: `${u} · ${NOMES_UF[u] || u}`, busca: `${u} ${NOMES_UF[u] || ''}` }))}
                      valor={perfil?.uf || ''} placeholder="Escolha o estado" aoLabel="Seu estado" aoSelecionar={trocarUf} />
                  </div>
                  <p style={{ margin: '12px 0 0', fontSize: '0.84rem', color: t.cor.cinza }}>Autorização dada em {dataBR(perfil.consentimento_em)} (versão {perfil.consentimento_versao}).</p>
                </section>

                <section style={caixa}>
                  <h2 style={h2}>Suas respostas</h2>
                  {Object.keys(respostas).length === 0 ? (
                    <p style={{ margin: 0, color: t.cor.cinza }}>Nenhuma ainda. <Link href="/afinidade" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Responder o questionário</Link>.</p>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {PERGUNTAS_AFINIDADE.filter((p) => respostas[p.id]).map((p) => (
                          <div key={p.id} style={{ background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '10px 12px', fontSize: '0.86rem', lineHeight: 1.5 }}>
                            <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{p.texto}</p>
                            <p style={{ margin: 0 }}><span style={{ color: t.cor.cinza }}>Você: </span><strong>{ROTULO[respostas[p.id].resposta]}</strong> <span style={{ color: t.cor.cinza }}>({ORIGEM[respostas[p.id].origem] || 'marcada por você'})</span></p>
                          </div>
                        ))}
                      </div>
                      <p style={{ margin: '12px 0 0' }}><Link href="/afinidade" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Mudar respostas no questionário</Link></p>
                    </>
                  )}
                </section>

                <section style={caixa}>
                  <h2 style={h2}>Seus favoritos</h2>
                  <SeusFavoritos semTitulo />
                  <p style={{ margin: 0, fontSize: '0.86rem' }}><Link href="/favoritos" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Ver todos os favoritos</Link></p>
                </section>
              </>
            )}

            <section style={caixa}>
              <h2 style={h2}>Apagar seus dados</h2>
              <p style={{ margin: '0 0 12px', lineHeight: 1.6, color: t.cor.cinza }}>
                Apaga do perfil e deste navegador o seu estado, as suas respostas e os seus favoritos, e desfaz a autorização.
                Não dá para desfazer.
              </p>
              {!confirmarApagar ? (
                <button type="button" onClick={() => setConfirmarApagar(true)} style={botao(true)} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>Apagar meus dados</button>
              ) : (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>Tem certeza?</span>
                  <button type="button" onClick={apagar} style={botao()} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>Sim, apagar tudo</button>
                  <button type="button" onClick={() => setConfirmarApagar(false)} style={botao(true)} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>Cancelar</button>
                </div>
              )}
            </section>
          </>
        )}
        {aviso && <p role="status" style={{ ...caixa, background: t.cor.papelQuente, boxShadow: 'none' }}>{aviso}</p>}
        {erro && <p role="alert" style={{ color: t.cor.alertaTexto }}>{erro}</p>}
      </div>
    </div>
  );
}
