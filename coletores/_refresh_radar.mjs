// Atalho: atualiza so a view radar_gastos, sem rodar coletor nenhum.
// Serve quando um coletor gravou certo e so o refresh falhou.
// Uso: node coletores/_refresh_radar.mjs
import 'dotenv/config';
import { refreshRadar } from './refresh_radar.js';
const t = Date.now();
await refreshRadar();
console.log(`⏱️  ${((Date.now() - t) / 1000).toFixed(1)}s`);
