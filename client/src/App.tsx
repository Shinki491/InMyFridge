import { useState } from "react";
import { apiGet } from "./api/http";

type HealthResponse = { ok: boolean; service: string };

export default function App() {
  const [status, setStatus] = useState<string>("Not checked");

  async function checkBackend() {
    try {
      const data = await apiGet<HealthResponse>("/api/health");
      setStatus(`Connected: ${data.service}`);
    } catch (e) {
      setStatus("Failed to connect");
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, Arial" }}>
      <h1>InMyFridge</h1>
      <p>Backend status: {status}</p>
      <button onClick={checkBackend}>Check backend</button>
    </div>
  );
}