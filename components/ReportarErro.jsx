import { useRouter } from 'next/router';
import { t } from '../src/estilo/tokens';
import { linkErro } from '../src/lib/contato';

// "Encontrou um erro? Avise" (18/10/2026, B7). Abre o e-mail já preenchido com a página, o assunto e o
// dado em dúvida. É um link comum (mailto), então funciona sem JavaScript e no celular abre o app de e-mail.
// escuro: para fundo índigo (cartão de resumo do perfil).
export default function ReportarErro({ assunto = '', detalhe = '', escuro = false, rotulo = 'Encontrou um erro? Avise', style }) {
  const { asPath } = useRouter();
  return (
    <a href={linkErro({ caminho: asPath, assunto, detalhe })}
      style={{ color: escuro ? t.cor.ouro : t.cor.ouroTexto, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'underline', ...style }}>
      {rotulo}
    </a>
  );
}
