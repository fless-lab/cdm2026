# Modèle de prédiction — entraînement

Pipeline hors-ligne qui produit `predict-model.json` / `predict-model.js`
(notes Elo + paramètres Poisson) consommés par la page `/predict`.

## Méthode
1. **Données** : `martj42/international_results` (~49 000 matchs internationaux 1872→2026).
2. **Elo World Football** calculé chronologiquement sur tout l'historique (K pondéré
   par importance du match + multiplicateur d'écart de buts, avantage du terrain 100).
3. **Modèle de buts Poisson** : `log λ = α ± β·(ΔElo/100) + η·domicile`, calibré par
   maximum de vraisemblance (scipy) sur les matchs 2010+.
4. **Backtest** sur 2023+ : précision 1N2, log-loss, score de Brier.

## Lancer
```bash
pip install numpy scipy
curl -sL https://raw.githubusercontent.com/martj42/international_results/master/results.csv -o /tmp/results.csv
python3 train_model.py   # écrit predict-model.json à la racine
```
Puis régénérer `predict-model.js` (wrapper `window.PREDICT_MODEL = …`).
