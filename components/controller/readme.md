IFTTT
-----

General-purpose automation for those, who are not exctatic of learning yet another DSL.

To run development version:

    $ npm i
    $ docker-compose up db mq
    $ npx knex migrate:latest
    $ npx knex seed:run
    $ npm start

Then you can open http://localhost:1234/ to see some basic UI or hit `npm run test` to make sure it all works as expected.

For staging version,

    $ npm i
    $ npm run build
    $ docker-compose build api
    $ docker-compose up

Then, the service should be avaliable at http://localhost:1234/. Containers for each service use the same image so it is better to build one of them ahead of time to speed up `docker-compose up`.
