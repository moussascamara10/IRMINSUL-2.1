FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de package
COPY package*.json ./

# Installer toutes les dépendances (incluant devDependencies pour le build)
RUN npm ci

# Copier le code source
COPY . .

# Compiler TypeScript
RUN npm run build

# Commande de démarrage avec heap size augmenté
CMD ["node", "--max-old-space-size=1024", "dist/index.js"]
