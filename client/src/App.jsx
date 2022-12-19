import logo from "./assets/logo.png";
import { useState } from "react";
import Papa from "papaparse";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";

const CLOUD_FUNCTION_URL = "https://us-central1-actively-take-home-2f315.cloudfunctions.net/get_prediction";
const allowedExtensions = ["csv"];

async function postData(url = "", data = {}) {
  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow",
    referrerPolicy: "no-referrer",
    body: JSON.stringify(data),
  });
  return response.json();
}

function App() {
  const [file, setFile] = useState("");
  const [error, setError] = useState("");
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [numRows, setNumRows] = useState(0);

  const [hypInput, setHypInput] = useState({});
  const [output, setOutput] = useState();
  const [inputs, setInputs] = useState([]);
  const [outputs, setOutputs] = useState([]);

  const [prediction, setPrediction] = useState();
  const [loading, setLoading] = useState(false);

  async function makePrediction() {
    //console.log(response);

    // Make sure we have an output selected
    if (!output) {
      setError("No output selected");
      return;
    }

    // Checks that all inputs have a value
    for (const input of inputs) {
      if (hypInput[input] === null || hypInput[input] === undefined) {
        setError("Make sure all inputs have a value");
        return;
      }
    }

    setLoading(true);
    // Make request to endpoint
    const response = await postData(CLOUD_FUNCTION_URL, {
      data,
      inputs,
      outputs,
      hypInput,
      output,
    });
    setLoading(false);

    // Format result as a percentage
    const num = parseFloat(response.data);
    let percent = "100.00%";
    if (num < 1) {
      percent = Number(num).toLocaleString(undefined, {
        style: "percent",
        minimumFractionDigits: 2,
      });
    }
    setPrediction(percent);
  }

  // On change for file input
  function handleFileChange(event) {
    if (event.target.files.length) {
      const inputFile = event.target.files[0];
      // Make sure it is a CSV
      const fileExtension = inputFile?.type.split("/")[1];
      if (!allowedExtensions.includes(fileExtension)) {
        setError("Please input a csv file");
        return;
      }
      setFile(inputFile);
      handleParse(inputFile);
    }
  }

  // Function that parses the inputted CSV file
  function handleParse(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ({ target }) => {
      const csv = Papa.parse(target.result, { header: true });
      const parsedData = csv?.data;
      const columns = Object.keys(parsedData[0]);
      const inputColumns = [];
      const outputColumns = [];
      const boolValues = ["True", "true", "TRUE", "False", "false", "FALSE"];
      for (const column of columns) {
        const fieldValue = parsedData[0][column];
        if (boolValues.includes(fieldValue)) {
          outputColumns.push(column);
        } else {
          inputColumns.push(column);
        }
      }
      setInputs(inputColumns);
      setOutputs(outputColumns);
      setColumns(columns);
      setData(parsedData);
      setNumRows(Math.min(10, parsedData.length));
    };
    reader.readAsText(file);
  }

  return (
    <div>
      <div className="header">
        <img style={{ width: 128 }} alt="actively" src={logo} />
      </div>
      <div className="content">
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError()}>
            {error}
          </Alert>
        )}
        <Form>
          <Form.Group onChange={handleFileChange} className="mb-3">
            <Form.Label>Choose dataset (CSV)</Form.Label>
            <Form.Control type="file" />
          </Form.Group>
        </Form>
        <Form style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {inputs.map((input) => (
            <Form.Group
              onChange={(event) => {
                const copyHypInput = { ...hypInput };
                let value = event.target.value;
                if (value === "") {
                  value = null;
                }
                copyHypInput[input] = value;
                setHypInput(copyHypInput);
              }}
              key={input}
            >
              <Form.Label>{input}</Form.Label>
              <Form.Control type="number" />
            </Form.Group>
          ))}
        </Form>
        {outputs.length > 0 && (
          <Form className="mb-3">
            <Form.Label>Output</Form.Label>
            <Form.Select onChange={(event) => setOutput(event.target.value)}>
              <option>Select an output to test</option>
              {outputs.map((formOutput) => (
                <option value={formOutput} key={formOutput}>
                  {formOutput}
                </option>
              ))}
            </Form.Select>
          </Form>
        )}
        <div style={{ display: "flex", gap: 5 }}>
          {file && (
            <Button disabled={loading} variant="primary" onClick={makePrediction}>
              Make Prediction
            </Button>
          )}
          {numRows < data.length && (
            <Button variant="secondary" onClick={() => setNumRows(data.length)}>
              Show All Rows
            </Button>
          )}
          {numRows === data.length && data.length > 0 && (
            <Button variant="secondary" onClick={() => setNumRows(10)}>
              Show Less
            </Button>
          )}
        </div>
        {prediction && (
          <div className="prediction">
            ~{prediction} to be true with inputted data
          </div>
        )}
        {loading && "Loading..."}
        <Table className="data-table" striped bordered hover>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, numRows).map((row, index) => (
              <tr key={index}>
                {columns.map((column, index) => (
                  <td key={index}>{row[column]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

export default App;
