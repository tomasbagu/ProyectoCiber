FROM node:trixie-slim

# 1) Directorio de trabajo
WORKDIR /app

# 2) Instalar deps con caché limpia y reproducible
COPY package*.json ./
RUN npm install

# 3) Copiar el código
COPY . .

# 4) Asegurar propiedad para el usuario no-root
RUN chown -R node:node /app

# 5) Puerto no-privilegiado
EXPOSE 5173

# 6) Arranque en modo dev

CMD ["npm", "run", "dev", "--", "--host", "--", "--host"]

# 7) Bajar privilegios (última instrucción efectiva)
USER node
