import { useState, useEffect, useCallback } from "react";
import "./App.css";
import initSqlJs, { Database, QueryExecResult } from "sql.js";
import { useFormik } from "formik";
import styled from "@emotion/styled";
import { format } from "sql-formatter";
import { Controlled as CodeMirror } from "react-codemirror2";
import { saveAs } from "file-saver";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/material.css";
import "codemirror/mode/sql/sql";

function App() {
  const [db, setDb] = useState<Database | null>(null);
  const [loadingError, setLoadingError] = useState(null);
  const [sqlError, setSQLError] = useState<string | null>(null);
  const [results, setResults] = useState<QueryExecResult[]>([]);
  const [currentQuery, setCurrentQuery] = useState<string>("");

  useEffect(() => {
    // fetch wasm file
    initSqlJs({ locateFile: () => "./sql-wasm.wasm" }).then((SQL) => {
      fetch("./pbp_2021.sqlite")
        .then((res) => res.arrayBuffer())
        .then((ab) => setDb(new SQL.Database(new Uint8Array(ab))))
        .catch((e) => setLoadingError(e));
    });
  }, []);

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
      <QueryEditor onSubmit={setCurrentQuery} />

      {results[0] && <RenderedResults results={results[0]} />}
      <div>{sqlError && <ErrorIndicator error={sqlError} />}</div>
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

function QueryEditor({ onSubmit }: { onSubmit: (s: string) => void }) {
  const formik = useFormik({
    initialValues: {
      query: format(
        "select count(*) as 'sacks', formation from plays where is_sack = true group by formation"
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
        options={{
          mime: "text/x-sql",
          lineWrapping: true,
          lineNumbers: true,
          showCursorWhenSelecting: true,
          hintOptions: {
            tables: {
              plays: ["game_id"],
            },
          },
        }}
        value={formik.values.query}
        onBeforeChange={(_editor, _data, value) => {
          formik.setFieldValue("query", value);
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

export default App;
