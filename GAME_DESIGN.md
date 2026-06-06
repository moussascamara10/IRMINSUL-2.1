# IRMINSUL V2 - Game Design & Progression Joueur

## Objectif
Transformer les systèmes existants en une expérience joueur cohérente et fluide, du premier jour jusqu'à l'endgame.

---

## Flux Joueur Actuel (Analyse)

### Point d'entrée
- `/commencer` - Création du profil avec ressources de départ (50,000 Mora, 160 Primogens, 1 Destin, 160 Résine)
- Personnages de départ : Jean, Amber, Kaeya, Lisa

### Systèmes disponibles
- **Profile** : `/profil`, `/statistiques`
- **Gacha** : `/voeux`, `/banniere`, `/pity`
- **Combat** : `/boss`, `/domain`, `/expedition`
- **Commission** : `/daily-tasks`, `/weekly-tasks`, `/daily-complete`, `/weekly-complete`, `/daily-rewards`, `/weekly-rewards`
- **Events** : `/events`, `/event-info`, `/event-progress`, `/event-complete`, `/event-claim`
- **Guild** : `/guild-create`, `/guild-join`, `/guild-leave`, `/guild-info`, `/guild-donate`, `/guild-members`, `/guild-promote`, `/guild-demote`, `/guild-kick`, `/guild-perk`
- **Abyss** : `/raids`, `/challenges`, `/raid-start`, `/challenge-start`

---

## Progression Joueur : Jour 1 → Endgame

### Phase 1 : Découverte (AR 1-10)
**Objectif** : Apprendre les bases et établir une routine quotidienne

**Jour 1**
1. `/commencer` - Créer le profil
2. `/profil` - Voir ses ressources
3. `/voeux` - Faire les premiers vœux avec le Destin de départ
4. `/daily-tasks` - Découvrir les tâches quotidiennes
5. `/daily-complete` - Compléter 1-2 tâches simples
6. `/daily-rewards` - Réclamer les récompenses

**Routine quotidienne suggérée**
- `/daily-tasks` - Voir les tâches disponibles
- `/daily-complete` - Compléter les tâches
- `/daily-rewards` - Réclamer les récompenses
- `/profil` - Suivre sa progression

**Déblocage naturel**
- AR 5 : Accès aux domaines (via `/domain`)
- AR 8 : Accès aux boss (via `/boss`)
- AR 10 : Accès aux guildes (via `/guild-create`)

### Phase 2 : Construction (AR 10-25)
**Objectif** : Construire son équipe et progresser dans le contenu

**Nouvelles activités**
- `/domain` - Farm des artefacts et matériaux
- `/boss` - Farm des matériaux de boss
- `/guild-create` ou `/guild-join` - Rejoindre une guilde
- `/guild-donate` - Contribuer à la guilde
- `/weekly-tasks` - Découvrir les tâches hebdomadaires

**Routine quotidienne**
- Tâches quotidiennes (comme Phase 1)
- `/domain` - 1-2 runs par jour
- `/boss` - 1 run par jour (si résine disponible)
- `/guild-donate` - Donner à la guilde (si membre)

**Routine hebdomadaire**
- `/weekly-tasks` - Voir les tâches hebdomadaires
- `/weekly-complete` - Compléter les tâches
- `/weekly-rewards` - Réclamer les récompenses

**Déblocage naturel**
- AR 15 : Accès aux expéditions (via `/expedition`)
- AR 20 : Accès aux raids (via `/raids`)
- AR 25 : Accès aux challenges (via `/challenges`)

### Phase 3 : Optimisation (AR 25-45)
**Objectif** : Optimiser son équipe et participer au contenu avancé

**Nouvelles activités**
- `/expedition` - Envoyer des expéditions
- `/raids` - Participer aux raids de guilde
- `/challenges` - Participer aux défis
- `/guild-perk` - Débloquer des perks de guilde
- `/events` - Participer aux événements limités

**Routine quotidienne**
- Tâches quotidiennes (comme Phase 1)
- `/domain` - 2-3 runs par jour
- `/boss` - 2 runs par jour
- `/expedition` - Envoyer des expéditions
- `/events` - Participer aux événements actifs
- `/guild-donate` - Donner à la guilde

**Routine hebdomadaire**
- Tâches hebdomadaires (comme Phase 2)
- `/raids` - Participer aux raids de guilde
- `/challenges` - Participer aux défis

**Déblocage naturel**
- AR 35 : Accès aux événements spéciaux
- AR 45 : Accès à l'endgame complet

### Phase 4 : Endgame (AR 45-60)
**Objectif** : Maximiser son potentiel et participer au contenu le plus difficile

**Activités principales**
- `/raids` - Raids de difficulté maximale
- `/challenges` - Défis extrêmes
- `/events` - Événements limités et spéciaux
- `/guild-perk` - Perks avancés de guilde

**Routine quotidienne**
- Tâches quotidiennes (optimisées)
- `/domain` - Farm intensif d'artefacts
- `/boss` - Farm intensif de matériaux
- `/expedition` - Expéditions maximales
- `/events` - Participation active aux événements

**Routine hebdomadaire**
- Tâches hebdomadaires (complètes)
- `/raids` - Tous les raids disponibles
- `/challenges` - Tous les défis disponibles

---

## Structuration des Commandes Discord

### Niveau Débutant (AR 1-10)
```
/commencer      - Démarrer l'aventure
/profil         - Voir son profil
/voeux          - Faire des vœux
/banniere       - Voir les bannières
/daily-tasks    - Voir les tâches quotidiennes
/daily-complete - Compléter une tâche quotidienne
/daily-rewards  - Réclamer les récompenses quotidiennes
```

### Niveau Intermédiaire (AR 10-25)
```
/domain         - Explorer les domaines
/boss           - Combattre des boss
/guild-create   - Créer une guilde
/guild-join     - Rejoindre une guilde
/guild-info     - Voir les infos de sa guilde
/guild-donate   - Faire un don à la guilde
/weekly-tasks   - Voir les tâches hebdomadaires
/weekly-complete- Compléter une tâche hebdomadaire
/weekly-rewards - Réclamer les récompenses hebdomadaires
```

### Niveau Avancé (AR 25-45)
```
/expedition     - Envoyer des expéditions
/raids          - Voir les raids disponibles
/raid-start     - Démarrer un raid
/challenges     - Voir les défis disponibles
/challenge-start- Démarrer un défi
/events         - Voir les événements actifs
/event-info     - Voir les détails d'un événement
/event-progress - Voir sa progression d'événement
/event-complete - Compléter une activité d'événement
/event-claim    - Réclamer un milestone d'événement
/guild-perk     - Débloquer un perk de guilde
/guild-members  - Voir les membres de la guilde
```

### Niveau Endgame (AR 45-60)
```
/pity           - Voir son pity
/statistiques   - Voir ses statistiques détaillées
/guild-promote  - Promouvoir un membre
/guild-demote   - Rétrograder un membre
/guild-kick     - Expulser un membre
/guild-leave    - Quitter la guilde
```

---

## Améliorations UX Proposées

### 1. Guide de démarrage intégré
Créer une commande `/guide` qui affiche des conseils basés sur l'AR du joueur :
- AR 1-10 : Guide de découverte
- AR 10-25 : Guide de construction
- AR 25-45 : Guide d'optimisation
- AR 45-60 : Guide d'endgame

### 2. Suggestions contextuelles
Ajouter des suggestions dans les commandes existantes :
- `/profil` : Suggérer la prochaine action basée sur l'AR
- `/daily-rewards` : Suggérer de passer aux tâches hebdomadaires
- `/weekly-rewards` : Suggérer de participer aux raids/events

### 3. Messages d'aide améliorés
Améliorer les messages d'erreur pour être plus informatifs :
- Expliquer pourquoi une action n'est pas disponible
- Suggérer des alternatives
- Indiquer les prérequis

### 4. Commande de navigation
Créer une commande `/menu` qui affiche un menu structuré des commandes disponibles basé sur l'AR.

---

## Roadmap d'Implémentation

### Priorité 1 (Immédiat)
1. Créer la commande `/guide` avec conseils par AR
2. Améliorer les messages d'aide dans `/commencer`
3. Ajouter des suggestions contextuelles dans `/profil`

### Priorité 2 (Court terme)
1. Créer la commande `/menu` pour la navigation
2. Améliorer les messages d'erreur dans toutes les commandes
3. Ajouter des tooltips dans les commandes slash

### Priorité 3 (Moyen terme)
1. Créer un système de tutoriel progressif
2. Ajouter des objectifs journaliers clairs
3. Créer des badges de progression

---

## Métriques de Succès

- Taux de rétention des nouveaux joueurs (Jour 1, Jour 7, Jour 30)
- Temps moyen pour atteindre AR 10
- Temps moyen pour atteindre AR 25
- Pourcentage de joueurs qui rejoignent une guilde
- Pourcentage de joueurs qui complètent les tâches quotidiennes
- Pourcentage de joueurs qui participent aux événements
