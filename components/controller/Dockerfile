FROM node:12-alpine

RUN apk update && apk add git
RUN npm install -g wait-on

WORKDIR /app

COPY package*.json /app/
RUN npm ci

COPY . /app/

EXPOSE 3000 3001

ENTRYPOINT [ "/app/entrypoint.sh" ]
