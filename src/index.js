import React from "react";
import ReactDOM from "react-dom";
import "./styles.css";

import graphql from "reactive-graphql";

import { makeExecutableSchema } from "graphql-tools";
import gql from "graphql-tag";
import { Observable } from "rxjs";
import { componentFromStream } from "@dcos/data-service";

// mocked API clients that return Observables
const oldPosts = Observable.from(["my first post", "a second post"]);
const newPosts = Observable.interval(3000).map(v => `Blog Post #${v + 1}`);
const fetchPosts = () =>
  oldPosts.merge(newPosts).scan((acc, item) => [...acc, item], []);
const votesStore = {};
const fetchVotesForPost = name => Observable.of(votesStore[name] || 0);

const schema = makeExecutableSchema({
  typeDefs: `
  type Post {
    id: Int!
    title: String!
    votes: Int!
  }

  # the schema allows the following query:
  type Query {
    posts: [Post]
  }

  # this schema allows the following mutation:
  type Mutation {
    upvotePost (
      postId: Int!
    ): Post
  }
  `,
  resolvers: {
    Query: {
      posts(parent, args, context) {
        return fetchPosts().map(emittedValue =>
          emittedValue.map((value, index) => ({ id: index, title: value }))
        );
      }
    },
    Post: {
      votes(parent, args, context) {
        return fetchVotesForPost(parent.title);
      }
    }
  }
});

const query = gql`
  query {
    posts {
      title
      votes
    }
  }
`;

const postStream = graphql(query, schema);
const PostsList = componentFromStream(propsStream =>
  propsStream.combineLatest(postStream, (props, result) => {
    const {
      data: { posts }
    } = result;

    return posts.map(post => (
      <div>
        <h3>{post.title}</h3>
      </div>
    ));
  })
);

function App() {
  return (
    <div className="App">
      <PostsList />
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
