@echo off
:: Navega para a pasta raiz do projeto
cd /d "C:\Users\jordy\OneDrive\Área de Trabalho\hub_politica"

echo ======================================================
echo   PLATAFORMA DE INTEGRIDADE - INICIANDO MANUTENCAO
echo ======================================================

echo [1/4] Atualizando Dados Cadastrais dos Agentes...
node src/logicas/sincronizar_agentes_detalhes.js >> log_geral.txt 2>&1

echo [2/4] Sincronizando Despesas (Camara)...
node src/logicas/sincronizador_geral.js >> log_geral.txt 2>&1

echo [3/4] Tentando Contingencia de Despesas (Senado)...
node src/logicas/sincronizar_gastos_senado_contingencia.js >> log_geral.txt 2>&1

echo [4/4] Higienizando e Normalizando Categorias...
node src/logicas/higienizador_dados.js >> log_geral.txt 2>&1

echo --- Ciclo Completo em %date% %time% --- >> log_geral.txt
echo ======================================================
echo   PROCESSAMENTO FINALIZADO. VERIFIQUE log_geral.txt
echo ======================================================