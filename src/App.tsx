import { useState, useEffect } from "react";
import "./App.css";
import initSqlJs, { Database, QueryExecResult } from "sql.js";
import { useFormik } from "formik";
import styled from "@emotion/styled";

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

      {results[0] && (
        <div style={{ border: "1px solid black", marginTop: 10 }}>
          <RenderedResults results={results[0]} />
        </div>
      )}
      <div>
        {sqlError ? (
          <ErrorIndicator error={sqlError} />
        ) : (
          currentQuery && (
            <div>
              Showing results for: <pre>{currentQuery}</pre>
            </div>
          )
        )}
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
    <table>
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
    </table>
  );
}

function QueryEditor({ onSubmit }: { onSubmit: (s: string) => void }) {
  const formik = useFormik({
    initialValues: {
      query:
        "select count(*) as 'sacks', formation from plays where is_sack = true group by formation",
    },
    onSubmit: (values) => onSubmit(values.query),
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <div>
        <textarea
          rows={10}
          cols={80}
          id="query"
          value={formik.values.query}
          onChange={formik.handleChange}
        />
      </div>
      <button type="submit">RUN</button>
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

export default App;