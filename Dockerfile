FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de package
COPY package*.json ./

# Installer toutes les dépendances
RUN npm ci

# Installer tsx globalement
RUN npm install -g tsx

# Copier le code source
COPY . .

# Commande de démarrage avec tsx
CMD ["tsx", "src/index.ts"]
