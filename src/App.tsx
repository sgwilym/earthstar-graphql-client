import React, { useState, useMemo } from "react";
import { useQuery, useMutation, queryCache } from "react-query";
import { generateAuthorKeypair, AuthorKeypair } from "earthstar";
import { query, makeMemoryContext } from "earthstar-graphql";
import "./App.css";

// Set up context to query against

var ctx = makeMemoryContext(["+gardening.xxxxxxxxxxxxxxxxxxxx", "+react.123"]);

// GraphQL query strings to pass to our query fn

const WORKSPACE_QUERY = `query AppQuery {
  workspaces(sortedBy: LAST_ACTIVITY_DESC) {
    name
    address
    population
    documents {
      ... on ES3Document {
        path
        value
        author {
          shortName
        }
      }
    }
  }
}
`;

const SET_MUTATION = `mutation SetMutation(
  $author: AuthorInput!
  $document: DocumentInput!
  $workspace: String!
) {
  set(author: $author, document: $document, workspace: $workspace) {
    __typename
    ... on SetDataSuccessResult {
      document {
        __typename
      }
    }
  }
}
`;

const SYNC_MUTATION = `mutation SyncMutation($workspace: String!, $pubUrl: String!) {
  sync(workspace: $workspace, pubUrl: $pubUrl) {
    syncedWorkspace {
      documents {
        __typename
      }
    }
  }
}
`;

// fns for querying earthstar-graphql

async function getWorkspaces() {
  const { data } = await query<WorkspaceQuery>(WORKSPACE_QUERY, {}, ctx);

  return data;
}

async function syncWorkspace({
  workspace,
  pubUrl,
}: {
  workspace: string;
  pubUrl: string;
}) {
  const res = await query(SYNC_MUTATION, { workspace, pubUrl }, ctx);

  return res.data;
}

async function set({
  author,
  document,
  workspace,
}: {
  author: AuthorKeypair;
  document: { value: string; path: string };
  workspace: string;
}) {
  return query(SET_MUTATION, { author, document, workspace }, ctx);
}

// The app itself

type WorkspaceQuery = {
  workspaces: {
    name: string;
    address: string;
    population: number;
    documents: {
      path: string;
      value: string;
      author: {
        shortName: string;
      };
    }[];
  }[];
};

function App() {
  const workspacesQuery = useQuery("workspaces", getWorkspaces, {
    isDataEqual: () => false,
  });

  if (!workspacesQuery.data) {
    return <>Loading... 😅</>;
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>🌍⭐️ my earthstar workspaces </h1>
      {workspacesQuery.data.workspaces.map((ws, i, arr) => {
        return (
          <React.Fragment key={ws.name}>
            <WorkspaceListing workspace={ws} />
            {i < arr.length - 1 && <div style={{ padding: 5 }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

type WorkspaceListingProps = {
  workspace: WorkspaceQuery["workspaces"][0];
};

const WorkspaceListing = ({ workspace }: WorkspaceListingProps) => {
  const [mutate, { status }] = useMutation(syncWorkspace, {
    onSuccess: () => queryCache.invalidateQueries("workspaces"),
  });

  return (
    <div style={{ border: "1px solid black", padding: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
        }}
      >
        <div>
          <h2>{workspace.name}</h2>
        </div>
        <button
          onClick={() => {
            if (status === "loading") {
              return;
            }
            mutate({
              workspace: workspace.address,
              pubUrl: "https://cinnamon-bun-earthstar-pub3.glitch.me",
            });
          }}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Syncing..." : "Sync"}
        </button>
      </div>
      {workspace.documents.map((doc) => {
        return (
          <p>
            Posted by <b>{doc.author.shortName}</b> to <b>{doc.path}</b>:{" "}
            {doc.value}
          </p>
        );
      })}
      <WorkspacePoster workspace={workspace} />
    </div>
  );
};

type WorkspacePosterProps = {
  workspace: WorkspaceQuery["workspaces"][0];
};

const WorkspacePoster = (props: WorkspacePosterProps) => {
  const [path, setPath] = useState("");
  const [value, setValue] = useState("");

  const keypair = useMemo(() => generateAuthorKeypair("test"), []);

  const [mutate, { status }] = useMutation(set, {
    onSuccess: () => {
      queryCache.invalidateQueries("workspaces");
      setPath("");
      setValue("");
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <h3>Post something with a temporary identity!</h3>
      <label>Path</label>
      <br />
      <input
        type={"text"}
        placeholder={"/some/path"}
        value={path}
        onChange={(e) => setPath(e.target.value)}
        disabled={status === "loading"}
      ></input>
      <br />
      <label>Value</label>
      <br />
      <textarea
        disabled={status === "loading"}
        placeholder={"Hey everyone!"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      ></textarea>
      <br />
      <button
        onClick={() => {
          mutate({
            author: keypair,
            document: {
              path,
              value,
            },
            workspace: props.workspace.address,
          });
        }}
        disabled={status === "loading"}
      >
        Post!
      </button>
    </div>
  );
};

export default App;
