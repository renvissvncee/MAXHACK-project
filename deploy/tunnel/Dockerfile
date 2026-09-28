FROM node:26-alpine
WORKDIR /app
RUN npm install --omit=dev --no-audit --no-fund localtunnel@2.0.2
COPY run.cjs .
USER node
CMD ["node", "run.cjs"]
