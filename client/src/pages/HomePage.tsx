import { useEffect, useMemo, useState } from "react";
import { searchRecipes, type RecipeSearchResult } from "../api/recipes.api";
import { getRecipeDetails } from "../api/recipeDetails.api";

const DIETS = ["", "vegetarian", "vegan", "gluten free", "ketogenic"];
const RESULTS_OPTIONS = [5, 10, 20, 30] as const;

const STORAGE_KEY = "inmyfridge:v2";

type SortBy = "bestMatch" | "fewestMissing" | "title";

type PersistedState = {
  ingredients: string[];
  maxReadyTime: number | "";
  diet: string;
  sortBy: SortBy;
  resultsCount: number;
  lastResults: RecipeSearchResult[];
};

function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!Array.isArray(parsed.ingredients)) return null;

    const resultsCount =
      typeof parsed.resultsCount === "number" && RESULTS_OPTIONS.includes(parsed.resultsCount as any)
        ? parsed.resultsCount
        : 10;

    return {
      ingredients: parsed.ingredients,
      maxReadyTime: typeof parsed.maxReadyTime === "number" || parsed.maxReadyTime === "" ? parsed.maxReadyTime : "",
      diet: typeof parsed.diet === "string" ? parsed.diet : "",
      sortBy: parsed.sortBy === "fewestMissing" || parsed.sortBy === "title" ? parsed.sortBy : "bestMatch",
      resultsCount,
      lastResults: Array.isArray(parsed.lastResults) ? parsed.lastResults : [],
    };
  } catch {
    return null;
  }
}

export default function HomePage() {
  const persisted = useMemo(() => loadPersisted(), []);

  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>(persisted?.ingredients ?? []);

  const [maxReadyTime, setMaxReadyTime] = useState<number | "">(persisted?.maxReadyTime ?? "");
  const [diet, setDiet] = useState<string>(persisted?.diet ?? "");

  const [sortBy, setSortBy] = useState<SortBy>(persisted?.sortBy ?? "bestMatch");
  const [resultsCount, setResultsCount] = useState<number>(persisted?.resultsCount ?? 10);

  const [status, setStatus] = useState("");
  const [results, setResults] = useState<RecipeSearchResult[]>(persisted?.lastResults ?? []);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailsStatus, setDetailsStatus] = useState("");
  const [details, setDetails] = useState<any>(null);

  const normalizedIngredients = useMemo(
    () => ingredients.map((x) => x.trim().toLowerCase()).filter(Boolean),
    [ingredients]
  );

  const sortedResults = useMemo(() => {
    const arr = [...results];

    if (sortBy === "bestMatch") {
      arr.sort((a, b) => b.matchScore - a.matchScore);
    } else if (sortBy === "fewestMissing") {
      arr.sort((a, b) => a.missedIngredientCount - b.missedIngredientCount);
    } else if (sortBy === "title") {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    }

    return arr;
  }, [results, sortBy]);

  useEffect(() => {
    const payload: PersistedState = {
      ingredients,
      maxReadyTime,
      diet,
      sortBy,
      resultsCount,
      lastResults: results,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [ingredients, maxReadyTime, diet, sortBy, resultsCount, results]);

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

  function clearAll() {
    setIngredients([]);
    setResults([]);
    setSelectedId(null);
    setDetails(null);
    setStatus("");
    setDetailsStatus("");
    setIngredientInput("");
    setMaxReadyTime("");
    setDiet("");
    setSortBy("bestMatch");
    setResultsCount(10);
    localStorage.removeItem(STORAGE_KEY);
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
          number: resultsCount,
          ranking: 1,
          maxReadyTime: maxReadyTime === "" ? undefined : maxReadyTime,
          diet: diet || undefined,
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
    <div style={{ width: "100%", padding: 16 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>InMyFridge</h1>

        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <input
            style={{ flex: "1 1 260px", padding: 8 }}
            value={ingredientInput}
            onChange={(e) => setIngredientInput(e.target.value)}
            placeholder="Type an ingredient (e.g., tomato)"
            onKeyDown={(e) => {
              if (e.key === "Enter") addIngredient();
            }}
          />
          <button onClick={addIngredient}>Add</button>
          <button onClick={clearAll}>Clear</button>
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

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
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

          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            Results
            <select
              style={{ padding: 6 }}
              value={resultsCount}
              onChange={(e) => setResultsCount(Number(e.target.value))}
            >
              {RESULTS_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            Sort
            <select style={{ padding: 6 }} value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
              <option value="bestMatch">best match</option>
              <option value="fewestMissing">fewest missing</option>
              <option value="title">title (A–Z)</option>
            </select>
          </label>

          <button onClick={onSearch}>Search</button>
        </div>

        <div style={{ marginBottom: 12 }}>{status}</div>

        {sortedResults.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginTop: 12,
            }}
          >
            {sortedResults.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => openDetails(r)}
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  background: "white",
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16 / 10",
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "#f3f3f3",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {r.image ? (
                    <img
                      src={r.image}
                      alt={r.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      loading="lazy"
                    />
                  ) : (
                    <span style={{ opacity: 0.7, fontSize: 12 }}>No image</span>
                  )}
                </div>

                <div style={{ fontWeight: 700, lineHeight: 1.25 }}>{r.title}</div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, opacity: 0.85 }}>
                  <span>match {r.matchScore}%</span>
                  <span>missing {r.missedIngredientCount}</span>
                </div>
              </button>
            ))}
          </div>
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
    </div>
  );
}