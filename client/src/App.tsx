import { useState } from "react";
import { searchRecipes, type RecipeSearchResult } from "./api/recipes.api";
import { getRecipeDetails } from "./api/recipeDetails.api";

export default function App() {
  const [ingredients, setIngredients] = useState("tomato, pasta");
  const [results, setResults] = useState<RecipeSearchResult[]>([]);
  const [status, setStatus] = useState<string>("");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailsStatus, setDetailsStatus] = useState<string>("");
  const [details, setDetails] = useState<any>(null);

  async function onSearch() {
    setStatus("Searching...");
    setResults([]);
    setSelectedId(null);
    setDetails(null);
    setDetailsStatus("");

    try {
      const data = await searchRecipes({
        ingredients: ingredients
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        filters: { number: 10, ranking: 1 },
      });
      setResults(data.results);
      setStatus(`Got ${data.results.length} results`);
    } catch (e) {
      setStatus("Search failed");
    }
  }

  async function openDetails(r: RecipeSearchResult) {
    setSelectedId(r.id);
    setDetails(null);
    setDetailsStatus("Loading details...");

    try {
      const resp = await getRecipeDetails(r.id);
      setDetails(resp);
      setDetailsStatus(`Loaded (${resp.source})`);
    } catch (e) {
      setDetailsStatus("Failed to load details");
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, Arial" }}>
      <h1>InMyFridge</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="Enter ingredients, separated by commas"
        />
        <button onClick={onSearch}>Search</button>
      </div>

      <div style={{ marginBottom: 12 }}>{status}</div>

      {results.length > 0 && (
        <ul style={{ paddingLeft: 18 }}>
          {results.map((r) => (
            <li key={r.id} style={{ marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => openDetails(r)}
                style={{
                  cursor: "pointer",
                  padding: "6px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 8,
                  background: "white",
                }}
              >
                {r.title} (match {r.matchScore}%)
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedId !== null && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <b>Selected recipe id:</b> {selectedId}
          </div>

          <div style={{ marginBottom: 8 }}>{detailsStatus}</div>

          {details?.recipe && (
            <div>
              <div>
                <b>Title:</b> {details.recipe.title}
              </div>

              <div>
                <b>Ready in:</b> {details.recipe.readyInMinutes ?? "?"} minutes
              </div>

              <div>
                <b>Servings:</b> {details.recipe.servings ?? "?"}
              </div>

              <div style={{ marginTop: 10 }}>
                <b>Ingredients:</b>
                <ul>
                  {details.recipe.ingredients.map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: 10 }}>
                <b>Instructions:</b>
                <p style={{ whiteSpace: "pre-line" }}>
                  {details.recipe.instructions || "No instructions available."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}