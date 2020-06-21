psql --host localhost --port 5432 -U ifttt -f personal.sql
npx knex migrate:latest
npx knex seed:run
