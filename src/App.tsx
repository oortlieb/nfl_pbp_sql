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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/nfl_pbp_sql/db" element={<DBViewerScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

function Home() {
  return <Link to="/nfl_pbp_sql/db?dbURL=pbp_2021.sqlite">Go to NFL data</Link>;
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

  // if (error) return <pre>{error.toString()}</pre>;
  // else if (!db) return <pre>Loading...</pre>;
  // else return <SQLRepl db={db} />;

  if (loadingError) {
    return <div>Error: {JSON.stringify(loadingError)}</div>;
  } else if (db === null) {
    return <div>Loading...</div>;
  }
  return (
    <>
      <div className="layout-grid">
        <div>
          <QueryEditor onSubmit={setCurrentQuery} />
          {results[0] && <RenderedResults results={results[0]} />}
          <div>{sqlError && <ErrorIndicator error={sqlError} />}</div>
        </div>
        <DBDescriber schemaQueryResult={schemaQueryResult} />
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
    <RenderedResultsWrapper>
      <button type="button" onClick={() => downloadCSV(results)}>
        DOWNLOAD
      </button>
      <Table>
        <tbody>
          <tr>
            {columns.map((c, idx) => (
              <th key={idx}>{c}</th>
            ))}
          </tr>
          {values.map((v, vIdx) => (
            <tr key={vIdx}>
              {v.map((col, colIdx) => (
                <td key={colIdx}>{col}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </RenderedResultsWrapper>
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
      query: format(
        'select * from player_games where week=1 and pos="QB" order by total_points desc'
      ),
    },
    onSubmit: (values) => onSubmit(values.query),
  });

  const formatSQL = useCallback(() => {
    formik.setFieldValue("query", format(formik.values.query));
  }, [formik]);

  return (
    <form onSubmit={formik.handleSubmit}>
      <CodeMirror
        options={cmOptions}
        value={formik.values.query}
        onBeforeChange={(editor: Editor, _data, value) => {
          formik.setFieldValue("query", value);
          editor.showHint(hintOptions);
        }}
      />
      <button type="submit">RUN</button>
      <button type="button" onClick={formatSQL}>
        FORMAT
      </button>
    </form>
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
  borderCollapse: "separate",
  borderSpacing: "12px",
  textAlign: "left",
  border: "1px solid black",
});

const RenderedResultsWrapper = styled.div({
  marginTop: "12px",
});

const ROW_SEP = "\n";
const COL_SEP = "\t";
function queryResultToCSV(queryResult: QueryExecResult) {
  let lines = [queryResult.columns.join(COL_SEP)];
  lines = lines.concat(queryResult.values.map((r) => r.join(COL_SEP)));

  return lines.join(ROW_SEP);
}

function downloadCSV(queryResult: QueryExecResult) {
  return saveAs(new Blob([queryResultToCSV(queryResult)]), "download.tsv");
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

  return <div>{rows}</div>;
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

export default App;
