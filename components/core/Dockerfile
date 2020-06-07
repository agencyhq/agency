FROM node:12-alpine

RUN apk update && apk add git
RUN npm install -g wait-on

WORKDIR /app

COPY ./components/controller/package*.json /app/
COPY ./components/*/*.tgz /packages/

RUN npm i || \
  npm i /packages/*.tgz && \
  rm -R /packages

COPY ./components/controller /app/

EXPOSE 3000 3001

ENTRYPOINT [ "/app/entrypoint.sh" ]
