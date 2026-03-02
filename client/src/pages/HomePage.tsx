import { useMemo, useState } from "react";
import { searchRecipes, type RecipeSearchResult } from "../api/recipes.api";
import { getRecipeDetails } from "../api/recipeDetails.api";

const DIETS = ["", "vegetarian", "vegan", "gluten free", "ketogenic"];

export default function HomePage() {
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);

  const [maxReadyTime, setMaxReadyTime] = useState<number | "">("");
  const [diet, setDiet] = useState<string>("");

  const [status, setStatus] = useState("");
  const [results, setResults] = useState<RecipeSearchResult[]>([]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailsStatus, setDetailsStatus] = useState("");
  const [details, setDetails] = useState<any>(null);

  const normalizedIngredients = useMemo(
    () => ingredients.map((x) => x.trim().toLowerCase()).filter(Boolean),
    [ingredients]
  );

  function addIngredient() {
    const v = ingredientInput.trim().toLowerCase();
    if (!v) return;
    if (ingredients.includes(v)) return;
    setIngredients((prev) => [...prev, v]);
    setIngredientInput("");
  }

  function removeIngredient(name: string) {
    setIngredients((prev) => prev.filter((x) => x !== name));
  }

  function clearPlate() {
    setIngredients([]);
    setResults([]);
    setSelectedId(null);
    setDetails(null);
    setStatus("");
    setDetailsStatus("");
  }

  async function onSearch() {
    if (normalizedIngredients.length === 0) {
      setStatus("Add at least one ingredient.");
      return;
    }

    setStatus("Searching...");
    setResults([]);
    setSelectedId(null);
    setDetails(null);
    setDetailsStatus("");

    try {
      const data = await searchRecipes({
        ingredients: normalizedIngredients,
        filters: {
          number: 10,
          ranking: 1,
          // maxReadyTime/diet will be wired on backend later
        },
      });
      setResults(data.results);
      setStatus(`Got ${data.results.length} results`);
    } catch {
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
    } catch {
      setDetailsStatus("Failed to load details");
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, Arial" }}>
      <h1>InMyFridge</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          value={ingredientInput}
          onChange={(e) => setIngredientInput(e.target.value)}
          placeholder="Type an ingredient (e.g., tomato)"
          onKeyDown={(e) => {
            if (e.key === "Enter") addIngredient();
          }}
        />
        <button onClick={addIngredient}>Add</button>
        <button onClick={clearPlate}>Clear</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {ingredients.length === 0 ? (
          <span style={{ opacity: 0.7 }}>No ingredients added yet.</span>
        ) : (
          ingredients.map((ing) => (
            <button
              key={ing}
              onClick={() => removeIngredient(ing)}
              title="Remove"
              style={{
                border: "1px solid #ccc",
                borderRadius: 999,
                padding: "6px 10px",
                background: "white",
                cursor: "pointer",
              }}
            >
              {ing} ×
            </button>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Max time
          <input
            style={{ width: 90, padding: 6 }}
            type="number"
            min={1}
            value={maxReadyTime}
            onChange={(e) => setMaxReadyTime(e.target.value ? Number(e.target.value) : "")}
            placeholder="mins"
          />
        </label>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Diet
          <select style={{ padding: 6 }} value={diet} onChange={(e) => setDiet(e.target.value)}>
            {DIETS.map((d) => (
              <option key={d} value={d}>
                {d || "any"}
              </option>
            ))}
          </select>
        </label>

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
                  {details.recipe.ingredients.map((ing: string, i: number) => (
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