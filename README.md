# Reproduction repo for prisma issue #23313

Related issue: prisma/prisma#23313

[From the docs on solving the n + 1 problem:](https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance#solving-n1-in-graphql-with-findunique-and-prisma-clients-dataloader)

> The Prisma Client dataloader automatically batches findUnique queries that ✔ occur in the same tick and ✔ have the same `where` and `include` parameters.

This reproduction aims to demonstrate how batching of `findUnique` calls fails for certain query arguments.

Changes have been applied to `prisma.service.ts` to add debug logging and to `resolvers.user.ts` to add test cases.

## Getting started

```
pnpm install
npx prisma migrate dev
pnpm dev
```

Open `http://localhost:3000/graphql`. Run the following query:

```graphql
query Test {
  allUsers {
    id
    name
    posts {
      id
    }
  }
}
```

**Expected result**: should result in 3 db queries. The first is for `user.findMany`. The second should be a batched query of users, corresponding to `user.findUnique` in the `posts` resolved field. The third should be a `posts` query to get posts for all users.

The actual result depends on the case applied in `resolvers.user.ts`. Without any extra args uncommented, batching works as expected.

Adding a simple arg, like `name: 'Alice'` also results in a single query to get users (although the API result won't contain all posts now – it's a contrived example).

Adding any variation of `AND` / `OR` breaks batching. Now each user gets fetched using an individual query, and their posts are fetched individually as well.

Case 7 is perhaps the most simple breaking case. Making this change:

```diff
    return this.prismaService.user
      .findUnique({
        where: {
          id: user.id,
+         AND: [],
        }
      })
      .posts()
```

makes the total number of queries go from 3 to 7.
