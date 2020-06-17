###
FROM node:12-alpine as builder

RUN apk update && apk add git

WORKDIR /build

COPY . /build/

RUN npm i \
  && npm run clean \
  && npm run debootstrap

###
FROM node:12-alpine

RUN npm install -g wait-on

WORKDIR /app
COPY --from=builder /build/entrypoint.sh /app/

EXPOSE 3000

ENTRYPOINT [ "/app/entrypoint.sh" ]
CMD [ "npm", "start" ]

ARG component

COPY --from=builder /build/components/${component} /app/
