# IRMINSUL V2 — 04. COMMANDES DISCORD

> Version de conception : 2.0.0 | Statut : Phase Architecturale
> Framework : Discord.js v14 — Slash Commands

---

## PRINCIPES DE CONCEPTION

```
1. Toutes les commandes sont des slash commands (/) → pas de préfixe texte
2. Réponses différées (deferReply) pour toutes les opérations longues > 2s
3. Éphémère par défaut sauf les actions publiques (boss kills, etc.)
4. Boutons et menus pour la navigation (pas de sous-commandes infinies)
5. Modals pour les inputs utilisateur (noms, messages, confirmations)
6. Pagination pour toutes les listes longues (artefacts, inventaire, etc.)
7. Cooldowns appliqués par discordId, stockés dans Redis
8. Permissions Discord.js v14 pour restreindre certaines commandes
```

---

## CATÉGORIE 1 — 👤 PROFIL & COMPTE

### /commencer
> Créer son compte IRMINSUL (première fois)
```
Description: Lance le tutoriel et crée ton compte de Voyageur
Permission: Tout le monde
Cooldown: Aucun (désactivée après création)
Réponse: Éphémère → Tutoriel interactif (5 étapes avec boutons)
```

### /profil [utilisateur]
> Voir le profil d'un joueur
```
Options:
  utilisateur: User (optionnel) — Profil d'un autre joueur

Affiche:
  - Avatar + Pseudo + Rang d'Aventurier
  - Titre équipé + Namecard
  - Statistiques principales
  - Équipe active (4 personnages)
  - Progression (AR XP, exploration, abîme)
  - Theière (rang + confort)
  - Signature

Cooldown: 3s
Réponse: Publique si soi-même, éphémère si autre joueur
```

### /statistiques [utilisateur]
> Statistiques détaillées d'un joueur
```
Options:
  utilisateur: User (optionnel)

Affiche:
  - Boss tués par type
  - Pulls totaux + taux de 5★
  - Mora gagnée/dépensée totale
  - Dégâts max en un coup
  - Commissions complétées (total)
  - Abîme Spiralé: meilleur résultat

Cooldown: 5s
```

### /titres
> Voir et équiper ses titres
```
Affiche tous les titres débloqués (paginé)
Bouton [Équiper] sur chaque titre
Filtre par catégorie (succès, événement, rang, région)

Cooldown: 5s
```

### /paramètres
> Modifier les préférences du compte
```
Modal de configuration:
  - Langue (fr/en/es/zh)
  - Notifications (toggle DM)
  - Profil public ou privé
  - Signature (max 50 chars)

Cooldown: 30s
```

### /rechercher <joueur>
> Trouver un joueur par pseudo Discord
```
Options:
  joueur: String (pseudo ou ID)

Retourne: Embed profil simplifié + bouton [Voir Profil] [Envoyer Demande Amitié]
Cooldown: 10s
```

---

## CATÉGORIE 2 — ✨ VŒUX (GACHA)

### /voeux <bannière> [quantité]
> Effectuer des vœux sur une bannière
```
Options:
  bannière: Choice ["standard", "personnage", "arme", "débutant"]
  quantité: Choice [1, 10]

Affiche avant:
  - Résumé de la bannière active
  - Coût en Destins/Primogens
  - Pity actuel

Après confirmation (bouton):
  - Animation d'embed (simulée avec edits)
  - Résultats des pulls (5★ en doré, 4★ en violet, 3★ en bleu)
  - Nouveau pity affiché
  - "✨ HU TAO ★★★★★" si 5★

Cooldown: 3s entre pulls simples, 10s entre x10
```

### /banniere [type]
> Voir les bannières actuellement actives
```
Options:
  type: Choice ["personnage", "arme", "standard", "toutes"]

Affiche:
  - Image de la bannière
  - Personnage/arme vedette
  - Durée restante
  - Probabilités et pity
  - Boutton [Voir Featured] [Effectuer des Vœux]

Cooldown: 5s
```

### /pity [bannière]
> Voir son pity actuel sur toutes les bannières
```
Affiche:
  - Pity 5★ et 4★ par bannière
  - Guarantee 50/50 activé ou non
  - Pulls totaux effectués

Cooldown: 5s
Réponse: Toujours éphémère
```

### /voeux historique [bannière] [page]
> Voir l'historique complet de ses vœux
```
Options:
  bannière: Choice (optionnel)
  page: Number (optionnel, défaut 1)

Affiche les 20 derniers pulls par page
Filtre: "5★ uniquement" (bouton toggle)
Bouton: [Exporter en CSV]

Cooldown: 10s
```

### /boutique [onglet]
> Boutique avec les monnaies en jeu
```
Onglets (menu déroulant):
  📦 Boutique Primogens → Acheter fates avec primogens
  ⭐ Boutique Lueur      → Dépenser Starglitter/Stardust
  🎪 Boutique Événement  → Shop de l'événement actuel
  🏰 Boutique Guilde    → Shop avec Coins de Guilde (si dans guilde)

Cooldown: 5s
```

---

## CATÉGORIE 3 — ⚔️ COMBAT

### /boss <nom>
> Affronter un boss de résine
```
Options:
  nom: String (autocomplete → liste des boss disponibles)

Processus:
  1. Vérification résine (20 ou 40 selon boss)
  2. Sélection équipe (boutons menu personnage)
  3. Création Thread privé → combat complet
  4. Fin → Fermeture Thread + embed résumé dans salon principal

Cooldown: Aucun (limité par résine)
```

### /boss hebdomadaire [boss]
> Affronter un boss hebdomadaire
```
Options:
  boss: Choice ["Dvalin", "Andrius", "Signora", "Childe", "Azhdaha", "Shogun", ...]

Limite: 3 boss hebdomadaires différents par semaine
Résine: 30 (50 si première fois)
Même flux que /boss mais avec phases plus complexes

Cooldown: 60s après la fin d'un boss hebdo
```

### /domaine <nom>
> Entrer dans un domaine (artefacts ou matériaux)
```
Options:
  nom: String (autocomplete)
  difficulté: Choice ["I", "II", "III", "IV"] (si applicable)

Processus similaire à /boss
Résine: 20
Récompenses: 1-3 artefacts + ressources de talents/armes

Cooldown: Aucun (limité par résine)
```

### /expedition start <personnage> <durée>
> Envoyer un personnage en expédition
```
Options:
  personnage: String (autocomplete → persos disponibles, pas dans l'équipe active)
  durée: Choice ["4h", "8h", "12h", "20h"]

Affiche:
  - Ressources estimées
  - Bonus si natif de la région
  - Heure de fin

Limite: 4 expéditions simultanées

Cooldown: 5s
```

### /expedition status
> Voir l'état de ses expéditions en cours
```
Affiche:
  - Liste des expéditions actives
  - Temps restant pour chacune
  - Progression (barre de chargement)
  - Bouton [Collecter Tout] si expéditions terminées

Cooldown: 10s
```

### /expedition collect [all | personnage]
> Récupérer les récompenses d'expéditions terminées
```
Options:
  all: Boolean (récupère tout)
  personnage: String (récupère une expédition spécifique)

Réponse: Liste des ressources récupérées

Cooldown: 5s
```

### /commission [type]
> Effectuer ses commissions quotidiennes
```
Sans options: Liste des 4 commissions du jour avec statut
Avec option type: Lance la commission spécifiée

Types:
  combat     → Embed combat simplifié (mini-boss)
  collecte   → RNG avec pourcentage (mini-jeu textuel)
  craft      → Consomme ressources pour créer
  dialogue   → Embed narratif + 2-3 choix de réponse

/commission remettre → Valider les commissions complétées (+ bonus)

Cooldown: 5s par commission
```

---

## CATÉGORIE 4 — 🎭 PERSONNAGES

### /personnage [nom]
> Voir les détails d'un personnage possédé ou la base de données
```
Options:
  nom: String (autocomplete → tous les persos ou uniquement possédés)

Sans argument: Grille de son inventaire de personnages (paginé, filtre par élément)
Avec nom (possédé): Fiche complète du personnage (stats, talents, équipement)
Avec nom (non possédé): Fiche de présentation du personnage

Affiche fiche complète:
  - Image + Nom + Élément + Rareté
  - Niveau/Ascension/XP
  - Stats calculées (HP, ATK, DEF, CRIT...)
  - Constellations (niveau actuel)
  - Talents (niveaux)
  - Équipement (arme + 5 artefacts)
  - Amitié

Cooldown: 5s
```

### /equipe [numéro] [action]
> Gérer ses équipes
```
Options:
  numéro: Choice [1, 2, 3, 4]
  action: Choice ["voir", "modifier", "nommer"]

/equipe voir → Affiche les 4 équipes avec leurs persos
/equipe modifier <numéro> → Menu déroulant pour composer l'équipe (4 sélecteurs)
/equipe abyss → Composer les 2 équipes Abîme Spiralé

Cooldown: 5s
```

### /ameliorer personnage <nom> [type]
> Améliorer un personnage
```
Options:
  nom: String (autocomplete → personnages possédés)
  type: Choice ["niveau", "ascension", "talent_normal", "talent_skill", "talent_burst"]

Affiche:
  - Matériaux requis vs possédés (✅/❌)
  - Coût Mora
  - Bouton [Améliorer] si ressources suffisantes
  - Bouton [Améliorer MAX] si toutes les ressources sont là

Cooldown: 5s
```

### /constellation <personnage>
> Gérer les constellations d'un personnage
```
Options:
  personnage: String (autocomplete)

Affiche:
  - Les 6 constellations avec descriptions
  - Niveaux actuels débloqués
  - Si une copie du personnage est en stock → Bouton [Activer C+1]

Cooldown: 5s
```

### /inventaire [filtre] [tri]
> Voir tout son inventaire de personnages
```
Options:
  filtre: Choice ["tous", "pyro", "hydro", "cryo", "electro", "anemo", "geo", "dendro", "5★", "4★"]
  tri: Choice ["rareté", "niveau", "constellation", "élément", "récent"]

Affiche: Grille de cartes de personnages (12 par page)
Boutons: Flèches pagination + filtre rapide + [Voir Détails]

Cooldown: 10s
```

---

## CATÉGORIE 5 — 🗡️ ARMES & ⚗️ ARTEFACTS

### /arme voir [nom]
> Voir ses armes ou la fiche d'une arme
```
Similaire à /personnage mais pour les armes
Affiche: Niveau, raffinement, stats, perso équipé

Cooldown: 5s
```

### /arme equiper <arme> <personnage>
> Équiper une arme sur un personnage
```
Vérifie: type d'arme compatible
Si arme déjà équipée sur autre perso → confirmation requise

Cooldown: 5s
```

### /arme ameliorer <arme>
> Améliorer le niveau d'une arme
```
Consomme: Minerais d'amélioration + Mora
Options: [+1 Niveau] [+MAX Niveau] [Affiner (si double)]

Cooldown: 5s
```

### /artefact voir [filtre] [tri]
> Voir son inventaire d'artefacts
```
Options:
  filtre: Choice ["slot", "set", "mainstat", "rareté"]
  tri: Choice ["score qualité", "niveau", "récent"]

Bouton: [Locker/Délocker] [Équiper] [Détruire]
Cooldown: 10s
```

### /artefact ameliorer <id>
> Améliorer un artefact (avec du fodder)
```
Sélection des artefacts à sacrifier (menu)
Preview des sous-stats avant confirmation

Cooldown: 5s
```

### /artefact strongbox <set>
> Échanger 3 artefacts 5★ contre 1 artefact du set cible
```
Mécanisme fidèle à Genshin
Coût: 3 artefacts 5★ → 1 artefact 5★ du set sélectionné

Cooldown: 10s
```

### /artefact stats <personnage>
> Calculer et analyser les stats d'un personnage équipé
```
Affiche:
  - Toutes les stats finales calculées
  - Analyse des ratios (CRIT Rate/DMG, ER vs besoins)
  - Score global /100
  - Suggestions d'amélioration

Cooldown: 10s
```

---

## CATÉGORIE 6 — 📈 PROGRESSION & RESSOURCES

### /resine
> Voir l'état de sa résine
```
Affiche:
  - Résine actuelle / 200
  - Temps avant plein
  - Résine condensée en stock
  - Fragolites bleues restantes cette semaine
  - Bouton [Condenser] si ≥40 résine et condensées <5

Cooldown: 5s
Réponse: Éphémère
```

### /resources [filtre]
> Voir son inventaire de matériaux
```
Options:
  filtre: Choice ["tous", "ascension_perso", "talents", "forge", "cuisine", "expédition"]

Affiche: Liste paginée des matériaux avec quantités
Bouton: [Utiliser dans Craft]

Cooldown: 10s
```

### /mora
> Voir son solde de Mora avec historique récent
```
Affiche:
  - Mora actuelle
  - Sources de Mora aujourd'hui (tableau)
  - Dépenses aujourd'hui (tableau)
  - Graphe simplifié: 7 derniers jours

Cooldown: 10s
```

### /rang
> Voir sa progression d'Aventurier
```
Affiche:
  - AR actuel + XP barre de progression
  - Level mondial
  - Liste de ce qui se débloque au prochain AR
  - Source d'XP: missions, boss, commissions

Cooldown: 5s
```

---

## CATÉGORIE 7 — 🏠 THÉIÈRE DE SÉRÉNITHÉ

### /theiere [action]
> Accéder à sa théière
```
Actions disponibles (boutons):
  🏠 [Voir Théière]    → Embed de la théière avec statistiques
  🛠️ [Gérer Meubles]  → Liste des meubles placés et en stock
  👥 [Résidents]       → Personnages placés + bonus
  📦 [Collecter]       → Récolter la production passive
  🔧 [Craft Meuble]   → Fabriquer un meuble (si matériaux dispo)
  👁️ [Visiter]         → Visiter une autre théière

Cooldown: 5s
```

### /theiere craft <meuble>
> Fabriquer un meuble
```
Options:
  meuble: String (autocomplete → plans débloqués)

Affiche:
  - Matériaux requis vs possédés
  - Durée de fabrication (si délai)
  - Bonus de confort

Cooldown: 10s
```

### /theiere visiter <utilisateur>
> Visiter la théière d'un ami
```
Options:
  utilisateur: User

Nécessite: Être ami avec l'utilisateur
Donne: 50 Essence de Baguette à toi + 10 à l'hôte

Cooldown: 8h par visite chez le même hôte
```

### /theiere nommer <nom>
> Renommer son royaume
```
Options:
  nom: String (max 30 chars)

Cooldown: 24h
```

---

## CATÉGORIE 8 — 🏰 GUILDES

### /guilde voir [guilde]
> Voir sa guilde ou une guilde publique
```
Options:
  guilde: String (optionnel — nom d'une guilde publique)

Affiche:
  - Nom, tag, description, icône
  - Niveau + XP de guilde
  - Liste des membres (top 10 + son rang)
  - Statistiques (raids, guerres)
  - Buffs actifs

Cooldown: 5s
```

### /guilde créer <nom> <tag> [description]
> Créer une guilde
```
Coût: 100,000 Mora
Prérequis: AR25, pas déjà dans une guilde
Validation: nom unique sur le serveur

Cooldown: 24h (si annulation d'une guilde précédente)
```

### /guilde rejoindre <nom>
> Rejoindre une guilde ouverte
```
Vérifie: Guilde publique + pas pleine + AR minimum
Si candidature: notification au Maître + Officiers

Cooldown: 24h
```

### /guilde quitter
> Quitter sa guilde
```
Confirmation requise
Impossibilité de quitter si Maître (doit d'abord transférer)

Cooldown: 7 jours après avoir rejoint
```

### /guilde gérer [action]
> Actions de gestion de guilde (Maître/Officier)
```
Actions (menu):
  👤 [Inviter]        → /guilde inviter <utilisateur>
  ❌ [Exclure]        → /guilde exclure <membre>
  ⬆️ [Promouvoir]     → /guilde promouvoir <membre> <rang>
  ⬇️ [Rétrograder]    → /guilde rétrograder <membre>
  💰 [Coffre]         → /guilde coffre [déposer/retirer]
  📢 [Annonce]        → /guilde annonce <message>
  ⚙️ [Paramètres]    → /guilde paramètres

Permission: Maître (tout) / Officier (inviter, coffre, annonce)
```

### /raid lancer [type]
> Lancer un raid de guilde
```
Options:
  type: Choice ["normal", "elite"] (selon niveau de guilde)

Notifie: Tous les membres de la guilde
Durée: 24h pour participer
Nécessite: Rang guilde 4+

Permission: Maître + Officiers
Cooldown: Selon type (normal: 1/semaine, elite: 1/mois)
```

### /raid attaquer
> Contribuer au raid de guilde en cours
```
Lance un combat contre le boss du raid
Dégâts infligés = contribution au score de guilde
Récompenses selon % de dégâts infligés

Cooldown: 1 fois par raid par joueur
```

### /guilde contribution [semaine | total]
> Voir les contributions de sa guilde
```
Classement des membres par contribution
Semaine actuelle vs historique

Cooldown: 10s
```

---

## CATÉGORIE 9 — 🌀 ABÎME SPIRALÉ & ENDGAME

### /abyss
> Menu principal de l'Abîme Spiralé
```
Affiche:
  - Progression actuelle (étage/chambre/étoiles)
  - Bénédictions actives (élémentaires)
  - Invitations (buff au choix)
  - Bouton [Attaquer Étage X-Y]
  - Bouton [Voir Récompenses]
  - Temps avant reset (prochain cycle)

Cooldown: 5s
```

### /abyss attaquer <étage> <chambre>
> Lancer un combat d'Abîme Spiralé
```
Options:
  étage: Number (1-12)
  chambre: Number (1-3)

Sélection des 2 équipes (si pas déjà configurées)
Combat en Thread → 2 moitiés séquentielles
Résultat: étoiles obtenues + temps

Prérequis: Étages précédents complétés à 0★
```

### /abyss classement [serveur | global]
> Classement de l'Abîme Spiralé
```
Options:
  scope: Choice ["serveur", "global"]

Top 20 des joueurs avec:
  - Étoiles totales
  - Étage max atteint
  - Temps record

Cooldown: 30s
```

### /theatre
> Théâtre Imaginaire
```
Similaire à /abyss mais menu dédié
Actes 1-10 + système de renforts aléatoires

Cooldown: 5s
```

### /battlepass
> Passe de Combat saisonnier
```
Affiche:
  - Palier actuel (50 max)
  - Barre XP + missions
  - Grille de récompenses (free vs premium)
  - Boutons: [Missions Quotidiennes] [Missions Hebdo] [Réclamer Récompenses]

Cooldown: 5s
```

---

## CATÉGORIE 10 — 🗺️ EXPLORATION & RÉPUTATION

### /region [nom]
> Voir la progression d'exploration d'une région
```
Options:
  nom: Choice ["mondstadt", "liyue", "inazuma", "sumeru", "fontaine", "natlan", "snezhnaya"]

Affiche:
  - % d'exploration + barre
  - Niveau de réputation (1-10) + XP
  - Waypoints découverts/total
  - Niveau statue des sept
  - Prochaines récompenses

Cooldown: 5s
```

### /reputation voir [region]
> Voir toutes ses réputations régionales
```
Affiche: Tableau de toutes les régions avec niveaux
Bouton par région pour voir les récompenses débloquées

Cooldown: 5s
```

### /exploration mondiale
> Vue d'ensemble de toute l'exploration
```
Carte textuelle/emoji de Teyvat avec % par région
Récompenses globales d'exploration

Cooldown: 10s
```

---

## CATÉGORIE 11 — 🎪 ÉVÉNEMENTS

### /evenement [nom]
> Voir les événements actifs
```
Sans argument: Liste de tous les événements actifs
Avec nom: Fiche complète de l'événement

Affiche:
  - Bannière de l'événement
  - Description + durée restante
  - Missions disponibles
  - Monnaie + shop
  - Progression personnelle

Cooldown: 5s
```

### /evenement mission <événement>
> Effectuer une mission d'événement
```
Selon le type de mission → interaction spécifique
Enregistre la progression automatiquement

Cooldown: Selon la mission
```

### /evenement shop <événement>
> Boutique de l'événement
```
Affiche les objets disponibles avec leur prix en monnaie d'événement
Bouton [Acheter] → confirmation + déduction

Cooldown: 5s
```

---

## CATÉGORIE 12 — 💰 ÉCONOMIE & MARCHÉ

### /marche [action]
> Accéder au marché P2P
```
Actions:
  📋 [Voir Annonces]   → Liste des annonces actives (filtrée)
  ➕ [Créer Annonce]   → Publier une vente
  🗑️ [Mes Annonces]   → Voir et gérer ses annonces
  📜 [Historique]      → Achats/ventes passés

Cooldown: 5s
```

### /marche vendre <ressource> <quantité> <prix>
> Créer une annonce de vente
```
Options:
  ressource: String (autocomplete → matériaux uniquement, pas persos/5★ armes)
  quantité: Number
  prix: Number (Mora, par unité)

Vérifie: prix dans les limites min/max du marché
Durée annonce: 24h automatiquement

Cooldown: 30s (anti-spam)
```

### /marche acheter <id_annonce>
> Acheter une annonce du marché
```
Confirmation + déduction de Mora
Taxes prélevées sur le vendeur à la livraison

Cooldown: 10s
```

### /echange <utilisateur> [accord]
> Proposer un échange direct à un joueur
```
Propose: ressources propres contre ressources de l'autre
L'autre joueur doit confirmer dans les 30 minutes

Cooldown: 5m entre propositions
```

---

## CATÉGORIE 13 — 🥇 SUCCÈS & COLLECTIONS

### /succes [categorie]
> Voir ses succès
```
Options:
  categorie: Choice ["aventure", "combat", "exploration", "personnages", "social", "cachés"]

Affiche:
  - Succès complétés / total
  - Points de succès
  - Prochains succès à compléter (recommandés)
  - Succès secrets découverts

Cooldown: 10s
```

### /bestiaire [ennemi]
> Voir le bestiaire des ennemis vaincus
```
Sans argument: Grille de tous les ennemis (découverts/non)
Avec nom: Fiche de l'ennemi (lore + stats + kills personnels)

Cooldown: 10s
```

### /collection [type]
> Collections complètes (cartes de visite, skins, etc.)
```
Types:
  - Namecards
  - Avatars
  - Armes (toutes possédées)
  - Personnages (tous possédés)

Cooldown: 10s
```

---

## CATÉGORIE 14 — 👥 SOCIAL

### /ami [action]
> Gérer ses amis
```
Actions:
  /ami ajouter <utilisateur>   → Envoyer une demande
  /ami supprimer <utilisateur> → Retirer un ami
  /ami liste                   → Voir ses amis (et leur statut)
  /ami demandes               → Voir et accepter/refuser les demandes

Limite: 50 amis maximum

Cooldown: 10s
```

### /classement [categorie] [scope]
> Voir les classements
```
Options:
  categorie: Choice ["rang_aventurier", "abyme", "gacha", "mora", "succes", "theiere", "guilde"]
  scope: Choice ["serveur", "global"]

Affiche top 20 avec podium stylisé

Cooldown: 30s
```

### /partager [element]
> Partager une réalisation publiquement dans le salon configuré
```
Options:
  element: Choice ["personnage", "artefact", "boss_kill", "abyss_record", "theiere"]

Crée un embed public dans le salon désigné

Cooldown: 10m
```

---

## CATÉGORIE 15 — ⚙️ ADMINISTRATION

### /admin [action]
> Commandes d'administration du bot sur ce serveur
```
Permission: Administrateur Discord requis

Actions:
  /admin setup            → Configurer le bot (canaux, rôles)
  /admin reset <joueur>   → Remettre à zéro un compte
  /admin donner <joueur> <ressource> <quantité> → Don de ressources
  /admin bannir <joueur> [raison]  → Bannir du bot
  /admin event créer      → Créer un événement personnalisé
  /admin annonce <message> → Annonce globale aux joueurs du serveur
  /admin stats            → Statistiques du bot sur ce serveur
```

### /admin event créer
> Créer un événement personnalisé (admin serveur)
```
Modal avec:
  - Nom de l'événement
  - Description
  - Durée (jours)
  - Récompenses
  - Conditions de participation

Cooldown: 24h
```

---

## RÉCAPITULATIF DES COOLDOWNS

| Commande | Cooldown | Scope |
|----------|----------|-------|
| /voeux ×1 | 3s | User |
| /voeux ×10 | 10s | User |
| /boss | 0s (limité résine) | User |
| /boss hebdomadaire | 60s | User |
| /commission | 5s | User |
| /profil | 3s | User |
| /classement | 30s | User |
| /guilde créer | 24h | User |
| /guilde quitter | 7j | User |
| /marche vendre | 30s | User |
| /partager | 10m | User |
| /theiere visiter | 8h/hôte | User |

---

## COMMANDES SLASH — DÉPLOIEMENT

```typescript
// deploy-commands.ts
const commands = [
  // Groupes de commandes
  { name: 'commencer', ... },
  { name: 'profil', ... },
  { name: 'voeux', ... },
  // ...toutes les commandes
];

// Déploiement sur un serveur spécifique (dev)
await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

// Déploiement global (production, délai 1h)
await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
```

---

## NOTES IMPORTANTES DISCORD.JS V14

```typescript
// Réponse différée obligatoire pour opérations longues
await interaction.deferReply({ ephemeral: true });
// ... traitement ...
await interaction.editReply({ embeds: [embed], components: [row] });

// Collecteur de boutons
const collector = message.createMessageComponentCollector({
  componentType: ComponentType.Button,
  time: 60_000, // 60 secondes
  filter: i => i.user.id === interaction.user.id,
});

// Auto-complétion
if (interaction.isAutocomplete()) {
  const focused = interaction.options.getFocused();
  const choices = characters.filter(c => c.name.startsWith(focused));
  await interaction.respond(choices.slice(0, 25));
}
```
