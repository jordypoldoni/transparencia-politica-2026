// Deixa o teste do Node importar arquivos sem extensao ('./turnos'), como o Next faz no build.
import { register } from 'node:module';
register('./resolvedor.mjs', import.meta.url);
