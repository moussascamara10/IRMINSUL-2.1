FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de package
COPY package*.json ./

# Installer les dépendances (production + dev pour tsx)
RUN npm install --production=false

# Copier le code source
COPY . .

# Commande de démarrage avec node --import tsx/esm
CMD ["node", "--import", "tsx/esm", "src/index.ts"]
