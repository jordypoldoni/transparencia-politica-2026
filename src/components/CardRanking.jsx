import React from 'react';

const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export default function CardRanking({ politico, posicao }) {
  const isTop3 = posicao <= 3;
  
  // Cores de fundo para as medalhas do ranking
  const medalColor = isTop3 ? '#f59e0b' : '#e2e8f0';
  const textColor = isTop3 ? '#ffffff' : '#475569';

  return (
    <div 
      onClick={() => window.location.href = `/politico/${politico.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '20px',
        marginBottom: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        width: '100%'
      }}
      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      
      {/* Posição Circular */}
      <div style={{
        flexShrink: 0,
        width: '45px',
        height: '45px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        fontWeight: '900',
        fontSize: '18px',
        marginRight: '20px',
        backgroundColor: medalColor,
        color: textColor
      }}>
        {posicao}º
      </div>
      
      {/* Container da Foto - FORÇADO 80x80 */}
      <div style={{
        flexShrink: 0,
        width: '80px',
        height: '80px',
        marginRight: '20px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '2px solid #f8fafc',
        position: 'relative',
        backgroundColor: '#f1f5f9'
      }}>
        <img 
          src={politico.foto_url || 'https://via.placeholder.com/150'} 
          alt={politico.nome} 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            objectPosition: 'top' 
          }}
        />
      </div>

      {/* Informações */}
      <div style={{ flexGrow: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{
            padding: '2px 8px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 'bold',
            borderRadius: '4px',
            textTransform: 'uppercase'
          }}>
            {politico.cargo || 'Parlamentar'}
          </span>
          <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '600' }}>
            {politico.partido}
          </span>
        </div>
        
        <h3 style={{
          margin: 0,
          color: '#1e293b',
          fontSize: '20px',
          fontWeight: '800',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {politico.nome}
        </h3>

        {/* Comparação estatística neutra (sem julgamento) */}
        {politico.anomalia && (
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#6B7280',
              backgroundColor: '#F1F0EC',
              padding: '3px 10px',
              borderRadius: '999px',
              border: '1px solid #E6E3DC'
            }}>
              {politico.percentual_acima.toFixed(0)}% acima da mediana da categoria
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Mediana: {formatter.format(politico.mediana)}
            </span>
          </div>
        )}
      </div>

      {/* Valor do Gasto */}
      <div style={{ textAlign: 'right', marginLeft: '20px' }}>
        <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Gasto Total 2026
        </p>
        <p style={{ 
          margin: 0, 
          fontSize: '24px', 
          fontWeight: '900', 
          color: isTop3 ? '#b45309' : '#1e293b' 
        }}>
          {formatter.format(politico.total)}
        </p>
      </div>

    </div>
  );
}