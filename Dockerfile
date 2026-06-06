FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de package
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Compiler TypeScript
RUN npm run build

# Commande de démarrage
CMD ["node", "dist/index.js"]
