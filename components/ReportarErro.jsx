import { useRouter } from 'next/router';
import { t } from '../src/estilo/tokens';
import { linkAviso } from '../src/lib/contato';

// "Encontrou um erro? Avise" (18/10/2026, B7; 02/11/2026: abre o formulário /avisar-erro, não mais o e-mail,
// que não funcionava sem programa de e-mail configurado). É um link comum, com a página, o assunto e o dado em dúvida.
// escuro: para fundo índigo (cartão de resumo do perfil).
export default function ReportarErro({ assunto = '', detalhe = '', escuro = false, rotulo = 'Encontrou um erro? Avise', style }) {
  const { asPath } = useRouter();
  return (
    <a href={linkAviso({ caminho: asPath, assunto, detalhe })}
      style={{ color: escuro ? t.cor.ouro : t.cor.ouroTexto, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'underline', ...style }}>
      {rotulo}
    </a>
  );
}
