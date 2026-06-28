import csv, math, json
from scipy.optimize import minimize
import numpy as np

# ---- canonicalisation des noms (fusion des renommages) ----
CANON={'Türkiye':'Turkey','Czechia':'Czech Republic','Cabo Verde':'Cape Verde',
       'Congo DR':'DR Congo','Zaire':'DR Congo','Congo-Kinshasa':'DR Congo',
       'United States':'United States','Korea Republic':'South Korea','Ivory Coast':'Ivory Coast'}
def canon(n): return CANON.get(n,n)

rows=[]
with open('/tmp/results.csv') as f:
    for r in csv.DictReader(f):
        rows.append(r)
rows.sort(key=lambda r:r['date'])

# ---- Elo (World Football Elo) ----
R={}
def get(t): return R.setdefault(t,1500.0)
def kweight(tournament):
    t=tournament.lower()
    if 'world cup' in t and 'qualif' not in t: return 60.0
    if 'qualif' in t: return 40.0
    if any(x in t for x in ['euro','copa am','african cup','asian cup','gold cup','nations league','confederations']): return 45.0
    if 'friendly' in t: return 20.0
    return 30.0
def gmult(gd):
    gd=abs(gd)
    if gd<=1: return 1.0
    if gd==2: return 1.5
    if gd==3: return 1.75
    return 1.75+(gd-3)/8.0

records=[]  # (R_home_pre, R_away_pre, home_flag, hs, as_, date)
for r in rows:
    if r['home_score'] in ('NA','') or r['away_score'] in ('NA',''): continue
    try: hs=int(r['home_score']); as_=int(r['away_score'])
    except: continue
    h=canon(r['home_team']); a=canon(r['away_team'])
    neutral = r['neutral'].strip().upper()=='TRUE'
    Rh=get(h); Ra=get(a)
    homeadv = 0.0 if neutral else 100.0
    records.append((Rh,Ra,0 if neutral else 1,hs,as_,r['date']))
    dr=(Rh-Ra)+homeadv
    We=1.0/(1.0+10**(-dr/400.0))
    W=1.0 if hs>as_ else (0.5 if hs==as_ else 0.0)
    K=kweight(r['tournament'])*gmult(hs-as_)
    delta=K*(W-We)
    R[h]=Rh+delta; R[a]=Ra-delta

print("teams rated:",len(R))

# ---- calibration Poisson sur 2010+ ----
fit=[rec for rec in records if rec[5]>='2010-01-01']
Rh=np.array([x[0] for x in fit]); Ra=np.array([x[1] for x in fit])
home=np.array([x[2] for x in fit],float)
hs=np.array([x[3] for x in fit],float); as_=np.array([x[4] for x in fit],float)
x=(Rh-Ra)/100.0
def negll(p):
    a,b,eta=p
    lh=np.exp(a+b*x+eta*home); la=np.exp(a-b*x)
    # Poisson negative loglik (drop constant log(k!))
    return np.sum(lh-hs*np.log(lh)) + np.sum(la-as_*np.log(la))
res=minimize(negll,[0.2,0.18,0.25],method='Nelder-Mead',options={'xatol':1e-6,'fatol':1e-6,'maxiter':20000})
a,b,eta=res.x
print("fit alpha=%.4f beta=%.4f eta=%.4f n=%d"%(a,b,eta,len(fit)))

# ---- backtest sur 2023+ (hold-out par date) : accuracy 1X2, log-loss, Brier ----
bt=[rec for rec in records if rec[5]>='2023-01-01']
def probs(rh,ra,hm,maxg=10):
    xx=(rh-ra)/100.0
    lh=math.exp(a+b*xx+eta*hm); la=math.exp(a-b*xx)
    ph=[math.exp(-lh)*lh**k/math.factorial(k) for k in range(maxg+1)]
    pa=[math.exp(-la)*la**k/math.factorial(k) for k in range(maxg+1)]
    pH=pD=pA=0.0
    for i in range(maxg+1):
        for j in range(maxg+1):
            p=ph[i]*pa[j]
            if i>j: pH+=p
            elif i==j: pD+=p
            else: pA+=p
    s=pH+pD+pA
    return pH/s,pD/s,pA/s
acc=0; ll=0.0; brier=0.0; n=0
for rh,ra,hm,h_,a_,d in bt:
    pH,pD,pA=probs(rh,ra,hm)
    out=0 if h_>a_ else (1 if h_==a_ else 2)
    pred=[pH,pD,pA]
    if pred.index(max(pred))==out: acc+=1
    ll += -math.log(max(pred[out],1e-9))
    y=[1 if out==k else 0 for k in range(3)]
    brier += sum((pred[k]-y[k])**2 for k in range(3))
    n+=1
print("backtest n=%d acc=%.3f logloss=%.3f brier=%.3f"%(n,acc/n,ll/n,brier/n))

# ---- export ratings pour les 48 + modèle ----
CODE2NAMES={
 'MEX':['Mexico'],'RSA':['South Africa'],'KOR':['South Korea'],'CZE':['Czech Republic'],
 'CAN':['Canada'],'BIH':['Bosnia and Herzegovina'],'QAT':['Qatar'],'SUI':['Switzerland'],
 'BRA':['Brazil'],'MAR':['Morocco'],'HAI':['Haiti'],'SCO':['Scotland'],
 'USA':['United States'],'PAR':['Paraguay'],'AUS':['Australia'],'TUR':['Turkey'],
 'GER':['Germany'],'CUW':['Curaçao','Curacao'],'CIV':['Ivory Coast'],'ECU':['Ecuador'],
 'NED':['Netherlands'],'JPN':['Japan'],'SWE':['Sweden'],'TUN':['Tunisia'],
 'BEL':['Belgium'],'EGY':['Egypt'],'IRN':['Iran'],'NZL':['New Zealand'],
 'ESP':['Spain'],'CPV':['Cape Verde'],'KSA':['Saudi Arabia'],'URU':['Uruguay'],
 'FRA':['France'],'SEN':['Senegal'],'IRQ':['Iraq'],'NOR':['Norway'],
 'ARG':['Argentina'],'ALG':['Algeria'],'AUT':['Austria'],'JOR':['Jordan'],
 'POR':['Portugal'],'COD':['DR Congo'],'UZB':['Uzbekistan'],'COL':['Colombia'],
 'ENG':['England'],'CRO':['Croatia'],'GHA':['Ghana'],'PAN':['Panama']}
ratings={}; missing=[]
for code,names in CODE2NAMES.items():
    val=None
    for nm in names:
        if canon(nm) in R: val=R[canon(nm)]; break
    if val is None: missing.append(code)
    else: ratings[code]=round(val,1)
print("missing:",missing)
lastdate=max(r[5] for r in records)
model={'ratings':ratings,
       'model':{'alpha':round(a,5),'beta':round(b,5),'eta':round(eta,5),'homeAdvElo':100,'maxGoals':10},
       'meta':{'trainedThrough':lastdate,'nMatchesTotal':len(records),'nFit':len(fit),
               'backtest':{'n':n,'accuracy':round(acc/n,3),'logloss':round(ll/n,3),'brier':round(brier/n,3),'since':'2023-01-01'},
               'source':'martj42/international_results (Kaggle/GitHub), Elo World Football + Poisson MLE'}}
json.dump(model,open('predict-model.json','w'),ensure_ascii=False,indent=1)
print("wrote predict-model.json")
# show top 12 of the 48 by rating
top=sorted(ratings.items(),key=lambda kv:-kv[1])[:12]
print("top12:",["%s %.0f"%(c,v) for c,v in top])
