import { useState, useEffect, useCallback, useMemo } from "react";
import "./App.css";
import initSqlJs, { Database, QueryExecResult } from "sql.js";
import { useFormik } from "formik";
import styled from "@emotion/styled";
import { format } from "sql-formatter";
import { Editor, hint } from "codemirror";
import { Controlled as CodeMirror } from "react-codemirror2";
import { saveAs } from "file-saver";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/material.css";
import "codemirror/mode/sql/sql";
import "codemirror/addon/hint/show-hint.css"; // without this css hints won't show
import "codemirror/addon/hint/show-hint";
import "codemirror/addon/hint/sql-hint";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useSearchParams,
} from "react-router-dom";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@reach/disclosure";

const EXAMPLE_QUERIES = [
  {
    desc: "Most passing TD at home this year",
    query:
      'select player_name, sum(passing_td) as "passing td" from player_games where at_home group by player_name having sum(passing_td) > 0 order by sum(passing_td) desc',
  },
  {
    desc: "Fantasy points scored by a team",
    query:
      "select team, sum(total_points) from player_games group by team order by sum(total_points) desc",
  },
  {
    desc: "Fantasy points allowed by a team",
    query:
      "select player_opponent, sum(total_points) from player_games group by player_opponent order by sum(total_points) desc",
  },
  {
    desc: "Players with negative fantasy points",
    query:
      "select player_name, sum(total_points) from player_games group by player_name having sum(total_points) < 0 order by sum(total_points) asc",
  },
  {
    desc: "Total fantasy points scored per week",
    query:
      "select week, sum(total_points) from player_games group by week order by sum(total_points) desc",
  },
];

function App() {
  return (
    <BrowserRouter basename="/nfl_pbp_sql">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/db" element={<DBViewerScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

function Home() {
  return (
    <>
      <Link to="/db?dbURL=ff_2021.sqlite">Superflex SQL</Link>
      <Link to="/db?dbURL=pbp_2021.sqlite">NFL PBP data</Link>
    </>
  );
}

type DBViewerProps = {
  dbURL: string;
};

type SQLiteColumnType = "INT" | "TEXT" | "BOOLEAN";

function DBViewerScreen() {
  const [searchParams] = useSearchParams();
  const dbURL = searchParams.get("dbURL");
  return <DBViewer dbURL={`./${dbURL}`} />;
}

function DBViewer({ dbURL }: DBViewerProps) {
  const [db, setDb] = useState<Database | null>(null);
  const [loadingError, setLoadingError] = useState(null);
  const [sqlError, setSQLError] = useState<string | null>(null);
  const [results, setResults] = useState<QueryExecResult[]>([]);
  const [schemaQueryResult, setSchemaQueryResult] = useState<QueryExecResult[]>(
    []
  );
  const [currentQuery, setCurrentQuery] = useState<string>("");

  useEffect(() => {
    // fetch wasm file
    initSqlJs({ locateFile: () => "./sql-wasm.wasm" }).then((SQL) => {
      fetch(dbURL)
        .then((res) => res.arrayBuffer())
        .then((ab) => setDb(new SQL.Database(new Uint8Array(ab))))
        .catch((e) => setLoadingError(e));
    });
  }, [dbURL]);

  useEffect(() => {
    if (db) {
      try {
        setSchemaQueryResult(db?.exec("SELECT * FROM sqlite_schema"));
        setSQLError(null);
      } catch (e) {
        setResults([]);
        setSQLError((e as Error).message);
      }
    }
  }, [db]);

  useEffect(() => {
    if (db && currentQuery) {
      try {
        setResults(db?.exec(currentQuery));
        setSQLError(null);
      } catch (e) {
        setResults([]);
        setSQLError((e as Error).message);
      }
    }
  }, [currentQuery, db]);

  if (loadingError) {
    return <div>Error: {JSON.stringify(loadingError)}</div>;
  } else if (db === null) {
    return <div>Loading...</div>;
  }
  return (
    <>
      <div className="layout-grid">
        <div className="left-col-wrapper">
          <QueryEditor onSubmit={setCurrentQuery} />
          <DBDescriber schemaQueryResult={schemaQueryResult} />
        </div>

        {results[0] && <RenderedResults results={results[0]} />}
        {sqlError && (
          <div>
            <ErrorIndicator error={sqlError} />
          </div>
        )}
        <div />
        <div>
          <div>
            <div>
              Data from{" "}
              <a href="https://github.com/hvpkod/NFL-Data">
                https://github.com/hvpkod/NFL-Data
              </a>
            </div>
            <div>
              post on{" "}
              <a href="https://www.reddit.com/r/fantasyfootball/comments/qmlcvm/how_about_some_raw_data/">
                reddit
              </a>
            </div>
          </div>
          <div></div>
        </div>
      </div>
    </>
  );
}

function RenderedResults({ results }: { results: QueryExecResult }) {
  if (!results) {
    return null;
  }

  const { columns, values } = results;
  return (
    <>
      <div className="results-table-scroll-wrapper">
        <RenderedResultsWrapper>
          <Table>
            <tbody>
              <tr>
                {columns.map((c, idx) => (
                  <th key={idx}>{c}</th>
                ))}
              </tr>
              {values.map((v, vIdx) => (
                <tr key={vIdx} className="result-row">
                  {v.map((col, colIdx) => (
                    <td key={colIdx}>{col || 0}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </RenderedResultsWrapper>
      </div>
      <div />
      <div>
        {results && (
          <button type="button" onClick={() => downloadTSV(results)}>
            Download TSV
          </button>
        )}
      </div>
    </>
  );
}

const hintOptions = {
  tables: {
    games: ["col_A", "col_B", "col_C"],
    players: ["other_columns1", "other_columns2"],
  },
  disableKeywords: true,
  completeSingle: false,
  completeOnSingleClick: false,
};

const cmOptions = {
  mime: "text/x-sql",
  mode: { name: "sql" },
  extraKeys: { "Ctrl-Space": "autocomplete" },
  hint: hint.sql,
  hintOptions,
  lineWrapping: true,
  lineNumbers: true,
  showCursorWhenSelecting: true,
};

function QueryEditor({ onSubmit }: { onSubmit: (s: string) => void }) {
  const formik = useFormik({
    initialValues: {
      query: EXAMPLE_QUERIES[0].query,
    },
    onSubmit: (values) => onSubmit(values.query),
  });

  const formatSQL = useCallback(() => {
    formik.setFieldValue("query", format(formik.values.query));
  }, [formik]);

  return (
    <>
      <h1>Superflex SQL</h1>
      <form onSubmit={formik.handleSubmit}>
        <CodeMirror
          options={cmOptions}
          value={formik.values.query}
          onBeforeChange={(editor: Editor, _data, value) => {
            formik.setFieldValue("query", value);
            editor.showHint(hintOptions);
          }}
        />
        <div className="button-wrapper">
          <button type="submit">Run Query</button>
          <button type="button" onClick={formatSQL}>
            Format Query
          </button>
        </div>
        <ExampleQueries
          onSelect={(s: string) => formik.setFieldValue("query", format(s))}
        />
      </form>
    </>
  );
}

function ErrorIndicator({ error }: { error: string }) {
  return (
    <div>
      <ErrorText>SQL Error!</ErrorText>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

const ErrorText = styled.div({
  color: "red",
});

const Table = styled.table({
  textAlign: "center",
  border: "1px solid black",
});

const RenderedResultsWrapper = styled.div({
  marginTop: "12px",
  maxWidth: "100%",
  boxSizing: "border-box",
});

const ROW_SEP = "\n";
const COL_SEP = "\t";
function queryResultToTSV(queryResult: QueryExecResult) {
  let lines = [queryResult.columns.join(COL_SEP)];
  lines = lines.concat(queryResult.values.map((r) => r.join(COL_SEP)));

  return lines.join(ROW_SEP);
}

function downloadTSV(queryResult: QueryExecResult) {
  return saveAs(new Blob([queryResultToTSV(queryResult)]), "download.tsv");
}

type DBDescriberProps = {
  schemaQueryResult: QueryExecResult[];
};

function DBDescriber({ schemaQueryResult }: DBDescriberProps) {
  if (schemaQueryResult.length < 1) {
    return <div />;
  }

  const rows = schemaQueryResult[0].values.map(
    ([_type, name, _tableName, _rootPage, sql]) => (
      <SQLiteTableDescription
        key={name as string}
        name={name as string}
        sql={sql as string}
      />
    )
  );

  return (
    <div>
      <h2>Table information</h2>
      <div>{rows}</div>
    </div>
  );
}

type SQLiteTableDescriptionProps = { name: string; sql: string };

function SQLiteTableDescription({ name, sql }: SQLiteTableDescriptionProps) {
  const columnsData = useMemo(() => {
    const columnDefns = sql
      .substring(sql.indexOf("(") + 1, sql.lastIndexOf(")"))
      .trim();

    const removeTrailingComma = /,$/;
    return columnDefns.split("\n").map((s) => {
      return s.trim().replace(removeTrailingComma, "").split(" ");
    });
  }, [sql]);

  return (
    <div>
      <Disclosure>
        <DisclosureButton>
          <b>{name}</b>
        </DisclosureButton>

        <DisclosurePanel>
          {columnsData.map((c: string[]) => (
            <div key={c[0]}>
              {c[0]} <TypeIcon type={c[1] as SQLiteColumnType} />
            </div>
          ))}
        </DisclosurePanel>
      </Disclosure>
    </div>
  );
}

type TypeIconProps = {
  type: SQLiteColumnType;
};

function TypeIcon({ type }: TypeIconProps) {
  return <b>{type}</b>;
}

function ExampleQueries({ onSelect }: { onSelect: (s: string) => void }) {
  return (
    <div>
      <h2>Example Queries</h2>
      <div>
        {EXAMPLE_QUERIES.map(({ desc, query }, idx) => (
          <button
            key={idx}
            type="button"
            className="example-query"
            onClick={() => onSelect(query)}
          >
            {desc}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
