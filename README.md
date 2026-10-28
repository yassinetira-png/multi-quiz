# Multi Quiz

Application web pour apprendre les tables de multiplication (1 à 12).

## Lancer (recommandé)

```bash
python3 server.py
```

Puis ouvre http://127.0.0.1:5173

Le serveur n’écoute que sur la machine locale, refuse le listing de fichiers, et envoie des en-têtes de sécurité (CSP, `X-Frame-Options`, `nosniff`, etc.).

## Modes

- **Entraînement** : questions en continu avec correction immédiate
- **Quiz** : 10 questions, score et récapitulatif
- **Réviser** : affichage d’une table complète
# multi-quiz
