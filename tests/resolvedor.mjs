// Gancho de resolucao: se o import nao tem extensao, tenta .js e .mjs. So para testes.
export async function resolve(especificador, contexto, proximo) {
  try { return await proximo(especificador, contexto); }
  catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND' && /^\.{1,2}\//.test(especificador) && !/\.\w+$/.test(especificador)) {
      for (const ext of ['.js', '.mjs']) {
        try { return await proximo(especificador + ext, contexto); } catch { /* tenta a proxima */ }
      }
    }
    throw e;
  }
}
