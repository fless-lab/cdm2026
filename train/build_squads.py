#!/usr/bin/env python3
"""Construit predict-squads.json : compos EA FC26 + stats internationales StatsBomb + calibration EA->Elo.
Sources locales :
  - EA FC26 players.csv (qualité joueur, postes sélection)
  - StatsBomb open-data events+lineups (stats internationales réelles : buts, xG, tirs)
  - predict-model.json (Elo, pour la calibration)
"""
import csv, json, glob, os, math, unicodedata, sys

SCRATCH = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-1000/-home-raouf-workspace-Projects-cdm/aa296343-7b56-4f49-a845-3f2ee394a29f/scratchpad'
EA = SCRATCH + '/players.csv'
SB = SCRATCH + '/statsbomb'
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def strip(s): return ''.join(c for c in unicodedata.normalize('NFKD', s or '') if not unicodedata.combining(c)).lower().strip()

# 48 équipes 2026 -> nom EA (nationality_name) -> nom StatsBomb (team_name)
TEAMS = {
 'MEX':('Mexico','Mexico'),'RSA':('South Africa','South Africa'),'KOR':('Korea Republic','South Korea'),
 'CZE':('Czechia','Czech Republic'),'CAN':('Canada','Canada'),'BIH':('Bosnia and Herzegovina','Bosnia and Herzegovina'),
 'QAT':('Qatar','Qatar'),'SUI':('Switzerland','Switzerland'),'BRA':('Brazil','Brazil'),'MAR':('Morocco','Morocco'),
 'HAI':('Haiti','Haiti'),'SCO':('Scotland','Scotland'),'USA':('United States','United States'),'PAR':('Paraguay','Paraguay'),
 'AUS':('Australia','Australia'),'TUR':('Türkiye','Turkey'),'GER':('Germany','Germany'),'CUW':('Curacao','Curacao'),
 'CIV':("Côte d'Ivoire","Ivory Coast"),'ECU':('Ecuador','Ecuador'),'NED':('Netherlands','Netherlands'),
 'JPN':('Japan','Japan'),'SWE':('Sweden','Sweden'),'TUN':('Tunisia','Tunisia'),'BEL':('Belgium','Belgium'),
 'EGY':('Egypt','Egypt'),'IRN':('Iran','Iran'),'NZL':('New Zealand','New Zealand'),'ESP':('Spain','Spain'),
 'CPV':('Cape Verde','Cape Verde'),'KSA':('Saudi Arabia','Saudi Arabia'),'URU':('Uruguay','Uruguay'),
 'FRA':('France','France'),'SEN':('Senegal','Senegal'),'IRQ':('Iraq','Iraq'),'NOR':('Norway','Norway'),
 'ARG':('Argentina','Argentina'),'ALG':('Algeria','Algeria'),'AUT':('Austria','Austria'),'JOR':('Jordan','Jordan'),
 'POR':('Portugal','Portugal'),'COD':('DR Congo','DR Congo'),'UZB':('Uzbekistan','Uzbekistan'),
 'COL':('Colombia','Colombia'),'ENG':('England','England'),'CRO':('Croatia','Croatia'),'GHA':('Ghana','Ghana'),
 'PAN':('Panama','Panama'),
}
ea2code = {strip(ea): c for c,(ea,sb) in TEAMS.items()}
sb2code = {strip(sb): c for c,(ea,sb) in TEAMS.items()}

def posgroup(p):
    p = (p or '').upper()
    if p == 'GK': return 'GK'
    if any(x in p for x in ['CB','LB','RB','WB','DEF']): return 'DEF'
    if any(x in p for x in ['DM','CM','AM','LM','RM','MF','MID']): return 'MID'
    if any(x in p for x in ['ST','CF','LW','RW','FW','SS']): return 'FWD'
    return 'MID'

# ---------- 1) EA squads ----------
rows = list(csv.DictReader(open(EA, encoding='utf-8', errors='replace')))
bycode = {c: [] for c in TEAMS}
for r in rows:
    c = ea2code.get(strip(r['nationality_name']))
    if not c: continue
    try: ovr = int(r['overall'])
    except: continue
    bycode[c].append({
        'name': r['short_name'], 'ovr': ovr,
        'pos': (r['player_positions'].split(',')[0].strip() if r['player_positions'] else ''),
        'natpos': r.get('nation_position','').strip(),
        'club': r['club_name'], 'rep': r.get('international_reputation','') or '0',
    })

squads = {}
for c, pool in bycode.items():
    pool.sort(key=lambda p: -p['ovr'])
    starters = [p for p in pool if p['natpos'] and p['natpos'] not in ('SUB','RES')]
    # XI : titulaires désignés par EA ; sinon top-11 par note
    if len(starters) >= 11:
        xi = sorted(starters, key=lambda p: -p['ovr'])[:11]
    else:
        seen=set(); xi=[]
        for p in starters+pool:
            if p['name'] in seen: continue
            seen.add(p['name']); xi.append(p)
            if len(xi)==11: break
    xi_names = {p['name'] for p in xi}
    bench = [p for p in pool if p['name'] not in xi_names][:25]
    for p in xi+bench: p['grp'] = posgroup(p['natpos'] or p['pos'])
    xiMean = round(sum(p['ovr'] for p in xi)/len(xi), 2) if xi else None
    squads[c] = {
        'xiMean': xiMean, 'nPool': len(pool),
        'xi': [{'n':p['name'],'o':p['ovr'],'p':p['natpos'] or p['pos'],'g':p['grp'],'c':p['club']} for p in xi],
        'bench': [{'n':p['name'],'o':p['ovr'],'p':p['natpos'] or p['pos'],'g':p['grp'],'c':p['club']} for p in bench],
    }

# ---------- 2) StatsBomb stats internationales par joueur ----------
pstat = {}  # (code, name) -> dict
team_matches = {}
ev_files = sorted(glob.glob(SB + '/events/*.json'))
print('parsing', len(ev_files), 'StatsBomb event files...', flush=True)
for i, ef in enumerate(ev_files):
    mid = os.path.basename(ef)[:-5]
    try: events = json.load(open(ef, encoding='utf-8'))
    except Exception: continue
    # appearances depuis lineup
    lf = SB + '/lineups/' + mid + '.json'
    appeared = {}  # name -> code
    if os.path.exists(lf):
        try:
            for t in json.load(open(lf, encoding='utf-8')):
                code = sb2code.get(strip(t['team_name']))
                if not code: continue
                team_matches[code] = team_matches.get(code, 0) + 1
                for pl in t['lineup']:
                    appeared[pl['player_name']] = code
        except Exception: pass
    for nm, code in appeared.items():
        d = pstat.setdefault((code, nm), {'m':0,'g':0,'xg':0.0,'sh':0,'sot':0,'a':0})
        d['m'] += 1
    for e in events:
        et = e.get('type', {}).get('name')
        tm = e.get('team', {}).get('name'); code = sb2code.get(strip(tm)) if tm else None
        if not code: continue
        pl = e.get('player', {}).get('name')
        if et == 'Shot' and pl:
            sh = e.get('shot', {})
            d = pstat.setdefault((code, pl), {'m':0,'g':0,'xg':0.0,'sh':0,'sot':0,'a':0})
            d['sh'] += 1; d['xg'] += sh.get('statsbomb_xg', 0) or 0
            out = sh.get('outcome', {}).get('name')
            if out == 'Goal': d['g'] += 1; d['sot'] += 1
            elif out in ('Saved','Saved To Post','Saved Off Target'): d['sot'] += 1
        if et == 'Pass' and e.get('pass', {}).get('goal_assist') and pl:
            d = pstat.setdefault((code, pl), {'m':0,'g':0,'xg':0.0,'sh':0,'sot':0,'a':0})
            d['a'] += 1
    if (i+1) % 50 == 0: print('  ', i+1, flush=True)

# joueurs-clés internationaux par équipe (top par buts+xG)
def keyintl(code):
    ps = [(nm, d) for (c, nm), d in pstat.items() if c == code and d['m'] >= 1]
    ps.sort(key=lambda x: -(x[1]['g']*1.0 + x[1]['xg']*0.6 + x[1]['a']*0.4))
    out = []
    for nm, d in ps[:6]:
        out.append({'n':nm,'m':d['m'],'g':d['g'],'a':d['a'],'xg':round(d['xg'],1),'sh':d['sh'],'sot':d['sot']})
    return out
for c in TEAMS:
    squads[c]['keyIntl'] = keyintl(c)
    squads[c]['sbMatches'] = team_matches.get(c, 0)

# ---------- 2b) forme nationale : 6 derniers résultats réels (martj42) ----------
RES = '/tmp/results.csv'
formrows = {c: [] for c in TEAMS}
if os.path.exists(RES):
    allres = [r for r in csv.DictReader(open(RES, encoding='utf-8', errors='replace'))
              if r['home_score'] not in ('NA','') and r['away_score'] not in ('NA','')]
    allres.sort(key=lambda r: r['date'])
    for r in allres:
        try: hs = int(r['home_score']); as_ = int(r['away_score'])
        except: continue
        ch = sb2code.get(strip(r['home_team'])); ca = sb2code.get(strip(r['away_team']))
        if ch: formrows[ch].append((r['date'], 'H', hs, as_, r['away_team']))
        if ca: formrows[ca].append((r['date'], 'A', as_, hs, r['home_team']))
    for c in TEAMS:
        last = formrows[c][-6:][::-1]   # plus récent en premier
        squads[c]['form'] = [{
            'd': d[5:], 'gf': gf, 'ga': ga, 'opp': opp,
            'r': 'W' if gf > ga else ('L' if gf < ga else 'N')
        } for (d, ha, gf, ga, opp) in last]

# ---------- 3) calibration EA xiMean -> Elo ----------
model = json.load(open(REPO + '/predict-model.json'))
elo = model['ratings']
pts = [(squads[c]['xiMean'], elo[c]) for c in TEAMS if squads[c]['xiMean'] and c in elo and squads[c]['nPool']>=11]
n = len(pts); mx = sum(p[0] for p in pts)/n; my = sum(p[1] for p in pts)/n
cov = sum((x-mx)*(y-my) for x,y in pts); vx = sum((x-mx)**2 for x,_ in pts)
sy = math.sqrt(sum((y-my)**2 for _,y in pts)); sx = math.sqrt(vx)
slope = cov/vx; r = cov/(sx*sy)
print('calibration: n=%d  r=%.3f  slope=%.1f Elo/overall  xiMean(mean)=%.1f' % (n, r, slope, mx))

out = {
    'calib': {'eloPerOverall': round(slope,1), 'r': round(r,3), 'meanXiMean': round(mx,1)},
    'teams': squads,
    'meta': {
        'eaSource': 'EA Sports FC 26 (SoFIFA, 18405 joueurs)',
        'intlSource': 'StatsBomb open-data (%d matchs internationaux : WC2018/22, Euro2020/24, Copa2024, CAN2023)' % len(ev_files),
        'note': "La compo ajuste la force d'équipe par delta vs XI attendu (profondeur de scénario, pas +précision). Note EA = qualité, pas forme.",
    }
}
json.dump(out, open(REPO + '/predict-squads.json', 'w'), ensure_ascii=False, separators=(',',':'))
sz = os.path.getsize(REPO + '/predict-squads.json')
print('wrote predict-squads.json (%d KB)' % (sz//1024))
# aperçu
for c in ['FRA','ARG','BRA','EGY']:
    s = squads[c]
    print('%s xiMean=%s  XI=%s' % (c, s['xiMean'], [p['n'] for p in s['xi'][:5]]))
    print('   keyIntl=%s' % [(k['n'],k['g'],k['xg']) for k in s['keyIntl'][:4]])
