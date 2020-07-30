# earthstar-graphql-client

This repo is a small demo of how [earthstar-graphql](https://github.com/sgwilym/earthstar-graphql) can be used in the context of a small React app.

This project doesn't used a dedicated JS GraphQL client. Using something like Apollo or Relay would obscure how this app works with earthstar-graphql, so it uses the more general `react-query` instead.

Everything interesting is happening in `src/App.tsx`, so have a look there!

To run the app:

1. Clone the repo
2. Install dependencies with `yarn`
3. Run `yarn start`
