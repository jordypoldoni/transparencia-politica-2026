// Giro de carregamento (20/10/2026). Anel âmbar que gira; a regra `.giro` e o `@keyframes giro` estão
// em pages/_app.js. Com "reduzir movimento" ligado, o anel fica parado (regra global do _app.js).
export default function Giro({ tamanho = 20 }) {
  return <span className="giro" aria-hidden="true" style={{ width: tamanho, height: tamanho }} />;
}
