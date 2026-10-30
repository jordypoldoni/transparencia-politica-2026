# Agregador dos boletins de urna do 2º turno (nuvem). Saída por UF no formato esperado por scripts/replay/gerar_*_1t.mjs
import sys, json, zipfile, io, pandas as pd
uf = sys.argv[1]; src = f"/home/claude/bu2t/{uf}.zip"; out = f"/home/claude/work/agg/{uf}.json"
BASE = pd.Timestamp("2026-10-25 17:00:00"); MIN = 601
z = zipfile.ZipFile(src); nome = [n for n in z.namelist() if n.endswith(".csv")][0]
cols = ["CD_MUNICIPIO","NR_ZONA","NR_SECAO","CD_CARGO_PERGUNTA","DT_BU_RECEBIDO","QT_APTOS","QT_COMPARECIMENTO","DS_TIPO_URNA","DS_TIPO_VOTAVEL","NR_VOTAVEL","NM_VOTAVEL","SG_PARTIDO","QT_VOTOS"]
df = pd.read_csv(z.open(nome), sep=";", encoding="latin-1", usecols=cols, dtype=str)
df = df[df.CD_CARGO_PERGUNTA == "1"].copy()
df["t"] = pd.to_datetime(df.DT_BU_RECEBIDO)
df["m"] = ((df.t - BASE).dt.total_seconds() // 60).astype(int).clip(lower=0)
sec = df.drop_duplicates(["CD_MUNICIPIO","NR_ZONA","NR_SECAO"])
nao_apurada = int((sec.DS_TIPO_URNA != "Apurada").sum())
fora = int((df.m >= MIN).sum())
assert fora == 0, f"{uf}: {fora} linhas fora da janela"
secoes = [0]*MIN; comp = [0]*MIN; aptos = [0]*MIN
for m, g in sec.groupby("m"):
    secoes[m] = len(g); comp[m] = int(g.QT_COMPARECIMENTO.astype(int).sum()); aptos[m] = int(g.QT_APTOS.astype(int).sum())
df["v"] = df.QT_VOTOS.astype(int)
cands = {}; votos = {}
for (n, nm, p, tp), g in df.groupby(["NR_VOTAVEL","NM_VOTAVEL","SG_PARTIDO","DS_TIPO_VOTAVEL"]):
    cands[n] = {"nome": nm, "partido": p, "tipo": tp}
    arr = [0]*MIN
    for m, s in g.groupby("m").v.sum().items(): arr[m] = int(s)
    votos[n] = arr
json.dump({"uf": uf, "secoes": secoes, "secoes_total": len(sec), "comparecimento": comp, "aptos": aptos, "candidatos": cands, "votos": votos}, open(out, "w"))
print(uf, len(sec), "secoes", sum(comp), "comp", "nao_apurada", nao_apurada, "primeira", sec.t.min(), "ultima", sec.t.max())
