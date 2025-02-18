const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const { graphqlUploadExpress } = require("graphql-upload-ts");

express()
  .use(
    "/graphql",
    graphqlUploadExpress({
      maxFileSize: 1000000,
      maxFiles: 1,
      overrideSendResponse: false,
    }),
    graphqlHTTP({
      schema: require("./schema"),
    })
  )
  .listen(3000, () => {
    console.log("Server is running on http://localhost:3000/graphql");
  });
