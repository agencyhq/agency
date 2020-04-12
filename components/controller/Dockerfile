FROM node:12-alpine

RUN npm install -g pm2 wait-on

WORKDIR /app

COPY package*.json /app/
RUN npm install

COPY . /app/

ARG app

EXPOSE 3000 3001

ENTRYPOINT [ "/app/entrypoint.sh" ]
CMD [ "pm2-runtime", "start", "ecosystem.yaml" ]
