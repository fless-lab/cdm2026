import csv, math, json
import numpy as np
from scipy.optimize import minimize

CANON={'Türkiye':'Turkey','Czechia':'Czech Republic','Cabo Verde':'Cape Verde',
       'Congo DR':'DR Congo','Zaire':'DR Congo','Congo-Kinshasa':'DR Congo','Korea Republic':'South Korea'}
def canon(n): return CANON.get(n,n)

rows=[r for r in csv.DictReader(open('/tmp/results.csv'))]
rows.sort(key=lambda r:r['date'])

# ---- Elo ----
R={}
def get(t): return R.setdefault(t,1500.0)
def kweight(t):
    t=t.lower()
    if 'world cup' in t and 'qualif' not in t: return 60.0
    if 'qualif' in t: return 40.0
    if any(x in t for x in ['euro','copa am','african cup','asian cup','gold cup','nations league','confederations']): return 45.0
    if 'friendly' in t: return 20.0
    return 30.0
def gmult(gd):
    gd=abs(gd)
    return 1.0 if gd<=1 else (1.5 if gd==2 else (1.75 if gd==3 else 1.75+(gd-3)/8.0))
REF=__import__('datetime').date(2026,7,1)
def age_years(ds):
    y,m,d=map(int,ds.split('-')); return (REF-__import__('datetime').date(y,m,d)).days/365.25
records=[]
for r in rows:
    if r['home_score'] in ('NA','') or r['away_score'] in ('NA',''): continue
    try: hs=int(r['home_score']); as_=int(r['away_score'])
    except: continue
    h=canon(r['home_team']); a=canon(r['away_team'])
    neutral=r['neutral'].strip().upper()=='TRUE'
    Rh=get(h); Ra=get(a); hadv=0.0 if neutral else 100.0
    records.append((Rh,Ra,0 if neutral else 1,hs,as_,r['date'],h,a))
    dr=(Rh-Ra)+hadv; We=1/(1+10**(-dr/400)); W=1.0 if hs>as_ else (0.5 if hs==as_ else 0.0)
    delta=kweight(r['tournament'])*gmult(hs-as_)*(W-We)
    R[h]=Rh+delta; R[a]=Ra-delta
print("teams rated:",len(R))

# ---- fit global Dixon-Coles avec décroissance temporelle ----
HALFLIFE=4.0
fit=[rec for rec in records if rec[5]>='2012-01-01']
z=np.array([(x[0]-x[1])/100 for x in fit]); home=np.array([x[2] for x in fit],float)
hs=np.array([x[3] for x in fit],float); as_=np.array([x[4] for x in fit],float)
w=np.array([0.5**(age_years(x[5])/HALFLIFE) for x in fit])
def tau(h,a,lh,la,rho):
    t=np.ones_like(lh)
    m=(h==0)&(a==0); t[m]=1-lh[m]*la[m]*rho
    m=(h==0)&(a==1); t[m]=1+lh[m]*rho
    m=(h==1)&(a==0); t[m]=1+la[m]*rho
    m=(h==1)&(a==1); t[m]=1-rho
    return np.clip(t,1e-6,None)
def nll(p):
    a,b,eta,rho=p
    lh=np.exp(a+b*z+eta*home); la=np.exp(a-b*z)
    ll = -lh+hs*np.log(lh) -la+as_*np.log(la) + np.log(tau(hs,as_,lh,la,rho))
    return -np.sum(w*ll)
res=minimize(nll,[0.1,0.18,0.24,-0.03],method='L-BFGS-B',
             bounds=[(-2,2),(0,1),(0,1),(-0.18,0.18)])
A,B,ETA,RHO=res.x
print("DC fit alpha=%.4f beta=%.4f eta=%.4f rho=%.4f"%(A,B,ETA,RHO))

# ---- backtest 2023+ (avec DC) ----
def matrix(rh,ra,hm,mg=10):
    x=(rh-ra)/100; lh=math.exp(A+B*x+ETA*hm); la=math.exp(A-B*x)
    ph=[math.exp(-lh)*lh**k/math.factorial(k) for k in range(mg+1)]
    pa=[math.exp(-la)*la**k/math.factorial(k) for k in range(mg+1)]
    P=[[ph[i]*pa[j] for j in range(mg+1)] for i in range(mg+1)]
    for (i,j,t) in [(0,0,1-lh*la*RHO),(0,1,1+lh*RHO),(1,0,1+la*RHO),(1,1,1-RHO)]:
        P[i][j]*=max(t,1e-6)
    s=sum(sum(r) for r in P)
    return [[P[i][j]/s for j in range(mg+1)] for i in range(mg+1)]
def whp(M):
    pH=pD=pA=0
    for i in range(len(M)):
        for j in range(len(M)):
            if i>j:pH+=M[i][j]
            elif i==j:pD+=M[i][j]
            else:pA+=M[i][j]
    return pH,pD,pA
bt=[rec for rec in records if rec[5]>='2023-01-01']
acc=0;ll=0;brier=0;n=0
for rh,ra,hm,h_,a_,d,_,_ in bt:
    pH,pD,pA=whp(matrix(rh,ra,hm)); out=0 if h_>a_ else (1 if h_==a_ else 2); pr=[pH,pD,pA]
    if pr.index(max(pr))==out:acc+=1
    ll+=-math.log(max(pr[out],1e-9)); y=[1 if out==k else 0 for k in range(3)]
    brier+=sum((pr[k]-y[k])**2 for k in range(3)); n+=1
print("backtest n=%d acc=%.3f logloss=%.3f brier=%.3f"%(n,acc/n,ll/n,brier/n))

# ---- offsets attaque/défense par équipe (style), régularisés ----
CODE2NAMES={'MEX':['Mexico'],'RSA':['South Africa'],'KOR':['South Korea'],'CZE':['Czech Republic'],'CAN':['Canada'],'BIH':['Bosnia and Herzegovina'],'QAT':['Qatar'],'SUI':['Switzerland'],'BRA':['Brazil'],'MAR':['Morocco'],'HAI':['Haiti'],'SCO':['Scotland'],'USA':['United States'],'PAR':['Paraguay'],'AUS':['Australia'],'TUR':['Turkey'],'GER':['Germany'],'CUW':['Curaçao','Curacao'],'CIV':['Ivory Coast'],'ECU':['Ecuador'],'NED':['Netherlands'],'JPN':['Japan'],'SWE':['Sweden'],'TUN':['Tunisia'],'BEL':['Belgium'],'EGY':['Egypt'],'IRN':['Iran'],'NZL':['New Zealand'],'ESP':['Spain'],'CPV':['Cape Verde'],'KSA':['Saudi Arabia'],'URU':['Uruguay'],'FRA':['France'],'SEN':['Senegal'],'IRQ':['Iraq'],'NOR':['Norway'],'ARG':['Argentina'],'ALG':['Algeria'],'AUT':['Austria'],'JOR':['Jordan'],'POR':['Portugal'],'COD':['DR Congo'],'UZB':['Uzbekistan'],'COL':['Colombia'],'ENG':['England'],'CRO':['Croatia'],'GHA':['Ghana'],'PAN':['Panama']}
name2code={}
for c,ns in CODE2NAMES.items():
    for nm in ns: name2code[canon(nm)]=c
# accumulate scored/conceded vs expected (base model, no offsets), time-weighted, window 2014+
acc_s={c:0.0 for c in CODE2NAMES}; acc_es={c:0.0 for c in CODE2NAMES}
acc_c={c:0.0 for c in CODE2NAMES}; acc_ec={c:0.0 for c in CODE2NAMES}; cnt={c:0.0 for c in CODE2NAMES}
for rh,ra,hm,h_,a_,d,hn,an in records:
    if d<'2014-01-01': continue
    wt=0.5**(age_years(d)/HALFLIFE)
    x=(rh-ra)/100; lh=math.exp(A+B*x+ETA*hm); la=math.exp(A-B*x)
    ch=name2code.get(hn); ca=name2code.get(an)
    if ch: acc_s[ch]+=wt*h_; acc_es[ch]+=wt*lh; acc_c[ch]+=wt*a_; acc_ec[ch]+=wt*la; cnt[ch]+=wt
    if ca: acc_s[ca]+=wt*a_; acc_es[ca]+=wt*la; acc_c[ca]+=wt*h_; acc_ec[ca]+=wt*lh; cnt[ca]+=wt
TAU0=8.0  # shrinkage
offsets={}
for c in CODE2NAMES:
    if cnt[c]<=0: offsets[c]={'a':0.0,'d':0.0}; continue
    atk=math.log((acc_s[c]+0.6)/(acc_es[c]+0.6))      # >0 marque plus que prévu
    dfn=math.log((acc_ec[c]+0.6)/(acc_c[c]+0.6))      # >0 encaisse moins que prévu
    sh=cnt[c]/(cnt[c]+TAU0)
    offsets[c]={'a':round(max(-0.5,min(0.5,atk*sh)),4),'d':round(max(-0.5,min(0.5,dfn*sh)),4)}

ratings={}
for c,ns in CODE2NAMES.items():
    for nm in ns:
        if canon(nm) in R: ratings[c]=round(R[canon(nm)],1); break
lastdate=max(r[5] for r in records)
model={'ratings':ratings,'offsets':offsets,
       'model':{'alpha':round(A,5),'beta':round(B,5),'eta':round(ETA,5),'rho':round(RHO,5),
                'hostBonus':round(0.6*ETA,4),'maxGoals':10,'halfLifeYears':HALFLIFE},
       'meta':{'trainedThrough':lastdate,'nMatchesTotal':len(records),'nFit':len(fit),
               'backtest':{'n':n,'accuracy':round(acc/n,3),'logloss':round(ll/n,3),'brier':round(brier/n,3),'since':'2023-01-01'},
               'method':'Elo World Football + Dixon-Coles Poisson (décroissance temporelle, demi-vie 4 ans) + offsets attaque/défense régularisés + avantage hôte',
               'source':'martj42/international_results'}}
json.dump(model,open('predict-model.json','w'),ensure_ascii=False,indent=1)
print("wrote predict-model.json")
top=sorted(ratings.items(),key=lambda kv:-kv[1])[:8]
print("top:",["%s %.0f (a%+.2f d%+.2f)"%(c,v,offsets[c]['a'],offsets[c]['d']) for c,v in top])
