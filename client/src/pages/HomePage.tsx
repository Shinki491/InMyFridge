import { useEffect, useMemo, useState } from "react";
import {
  Apple,
  Beef,
  Carrot,
  Citrus,
  Coffee,
  CookingPot,
  Egg,
  Fish,
  IceCream,
  Leaf,
  Milk,
  Search,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import {
  searchRecipes,
  type RecipeSearchResult,
  type PlateItem,
} from "../api/recipes.api";
import { getRecipeDetails as fetchRecipeDetails } from "../api/recipeDetails.api";

const DIETS = ["", "vegetarian", "vegan", "gluten free", "ketogenic"];
const FOOD_TYPES = [
  "",
  "main course",
  "side dish",
  "dessert",
  "appetizer",
  "salad",
  "bread",
  "breakfast",
  "soup",
  "beverage",
  "sauce",
  "marinade",
  "fingerfood",
  "snack",
  "drink",
];

const RESULTS_OPTIONS = [5, 10, 20, 30] as const;
const FETCH_COUNT = 30;
const UNITS = ["piece", "g", "kg", "ml", "l", "cup", "tbsp", "tsp"];
const STORAGE_KEY = "inmyfridge:v6";

const COMMON_INGREDIENTS = [
  "egg",
  "milk",
  "butter",
  "cheese",
  "yogurt",
  "chicken",
  "beef",
  "fish",
  "shrimp",
  "rice",
  "pasta",
  "flour",
  "sugar",
  "salt",
  "pepper",
  "garlic",
  "onion",
  "tomato",
  "potato",
  "carrot",
  "broccoli",
  "spinach",
  "lettuce",
  "cucumber",
  "bell pepper",
  "mushroom",
  "zucchini",
  "apple",
  "banana",
  "lemon",
  "orange",
  "strawberry",
  "olive oil",
  "bread",
  "beans",
  "lentils",
  "peas",
  "corn",
  "cream",
  "chocolate",
];

type SortBy = "bestMatch" | "fewestMissing" | "title";

type PersistedState = {
  plate: PlateItem[];
  maxReadyTime: number | "";
  diet: string;
  foodType: string;
  sortBy: SortBy;
  resultsCount: number;
  lastResults: RecipeSearchResult[];
  lastCloseResults: RecipeSearchResult[];
};

type FridgeSection = {
  title: string;
  items: PlateItem[];
};

function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!Array.isArray(parsed.plate)) return null;

    const resultsCount =
      typeof parsed.resultsCount === "number" &&
      RESULTS_OPTIONS.includes(parsed.resultsCount as any)
        ? parsed.resultsCount
        : 10;

    const sortBy: SortBy =
      parsed.sortBy === "fewestMissing" || parsed.sortBy === "title"
        ? parsed.sortBy
        : "bestMatch";

    return {
      plate: parsed.plate,
      maxReadyTime:
        typeof parsed.maxReadyTime === "number" || parsed.maxReadyTime === ""
          ? parsed.maxReadyTime
          : "",
      diet: typeof parsed.diet === "string" ? parsed.diet : "",
      foodType: typeof parsed.foodType === "string" ? parsed.foodType : "",
      sortBy,
      resultsCount,
      lastResults: Array.isArray(parsed.lastResults) ? parsed.lastResults : [],
      lastCloseResults: Array.isArray(parsed.lastCloseResults)
        ? parsed.lastCloseResults
        : [],
    };
  } catch {
    return null;
  }
}

function getQuantityBadge(
  status?: "enough" | "partial" | "unknown"
): { text: string; bg: string; color: string } | null {
  if (status === "enough")
    return { text: "enough ingredients", bg: "#dcfce7", color: "#166534" };
  if (status === "partial")
    return { text: "missing some amount", bg: "#fef3c7", color: "#92400e" };
  if (status === "unknown")
    return { text: "amount unclear", bg: "#e0e7ff", color: "#3730a3" };
  return null;
}

function getIngredientIcon(name: string) {
  const n = name.toLowerCase();
  if (
    n.includes("milk") ||
    n.includes("cheese") ||
    n.includes("dairy") ||
    n.includes("yogurt")
  )
    return <Milk size={16} />;
  if (
    n.includes("meat") ||
    n.includes("beef") ||
    n.includes("pork") ||
    n.includes("steak")
  )
    return <Beef size={16} />;
  if (
    n.includes("chicken") ||
    n.includes("poultry") ||
    n.includes("turkey")
  )
    return <Utensils size={16} />;
  if (
    n.includes("fish") ||
    n.includes("shrimp") ||
    n.includes("seafood")
  )
    return <Fish size={16} />;
  if (
    n.includes("apple") ||
    n.includes("fruit") ||
    n.includes("berry") ||
    n.includes("banana")
  )
    return <Apple size={16} />;
  if (
    n.includes("lemon") ||
    n.includes("lime") ||
    n.includes("orange")
  )
    return <Citrus size={16} />;
  if (
    n.includes("spinach") ||
    n.includes("lettuce") ||
    n.includes("green") ||
    n.includes("leaf")
  )
    return <Leaf size={16} />;
  if (
    n.includes("carrot") ||
    n.includes("vegetable") ||
    n.includes("pumpkin") ||
    n.includes("potato")
  )
    return <Carrot size={16} />;
  if (n.includes("egg")) return <Egg size={16} />;
  if (
    n.includes("coffee") ||
    n.includes("tea") ||
    n.includes("drink")
  )
    return <Coffee size={16} />;
  if (
    n.includes("dessert") ||
    n.includes("sugar") ||
    n.includes("chocolate")
  )
    return <IceCream size={16} />;
  return <CookingPot size={16} />;
}

function getIngredientCategory(name: string): string {
  const n = name.toLowerCase();

  if (
    n.includes("apple") ||
    n.includes("banana") ||
    n.includes("berry") ||
    n.includes("orange") ||
    n.includes("lemon") ||
    n.includes("lime") ||
    n.includes("lettuce") ||
    n.includes("spinach") ||
    n.includes("carrot") ||
    n.includes("broccoli") ||
    n.includes("tomato") ||
    n.includes("cucumber") ||
    n.includes("pepper") ||
    n.includes("mushroom") ||
    n.includes("potato") ||
    n.includes("zucchini")
  ) {
    return "Produce";
  }

  if (
    n.includes("milk") ||
    n.includes("cheese") ||
    n.includes("butter") ||
    n.includes("yogurt") ||
    n.includes("cream") ||
    n.includes("egg")
  ) {
    return "Dairy & Eggs";
  }

  if (
    n.includes("chicken") ||
    n.includes("beef") ||
    n.includes("pork") ||
    n.includes("fish") ||
    n.includes("shrimp") ||
    n.includes("seafood") ||
    n.includes("turkey")
  ) {
    return "Meat & Seafood";
  }

  return "Pantry";
}

function buildFridgeSections(plate: PlateItem[]): FridgeSection[] {
  const groups: Record<string, PlateItem[]> = {
    Produce: [],
    "Dairy & Eggs": [],
    "Meat & Seafood": [],
    Pantry: [],
  };

  for (const item of plate) {
    groups[getIngredientCategory(item.name)].push(item);
  }

  return Object.entries(groups)
    .map(([title, items]) => ({ title, items }))
    .filter((section) => section.items.length > 0);
}

function ResultsGrid({
  items,
  onOpen,
}: {
  items: RecipeSearchResult[];
  onOpen: (r: RecipeSearchResult) => void;
}) {
  return (
    <div className="results-grid">
      {items.map((r) => {
        const badge = getQuantityBadge(r.quantityStatus);

        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onOpen(r)}
            className="recipe-card"
          >
            <div className="recipe-card-image-wrap">
              {r.image ? (
                <img
                  src={r.image}
                  alt={r.title}
                  className="recipe-card-image"
                  loading="lazy"
                />
              ) : (
                <span className="recipe-card-no-image">No image</span>
              )}
            </div>

            <div className="recipe-card-title">{r.title}</div>

            {badge && (
              <div
                className="recipe-card-badge"
                style={{ background: badge.bg, color: badge.color }}
              >
                {badge.text}
              </div>
            )}

            <div className="recipe-card-meta">
              <span>match {r.matchScore}%</span>
              <span>missing {r.missedIngredientCount}</span>
            </div>

            {r.missingAmounts && r.missingAmounts.length > 0 && (
              <div className="recipe-card-warning">{r.missingAmounts[0]}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const persisted = useMemo(() => loadPersisted(), []);

  const [ingredientInput, setIngredientInput] = useState("");
  const [amountInput, setAmountInput] = useState<number | "">("");
  const [unitInput, setUnitInput] = useState("piece");

  const [plate, setPlate] = useState<PlateItem[]>(persisted?.plate ?? []);

  const [maxReadyTime, setMaxReadyTime] = useState<number | "">(
    persisted?.maxReadyTime ?? ""
  );
  const [diet, setDiet] = useState<string>(persisted?.diet ?? "");
  const [foodType, setFoodType] = useState<string>(persisted?.foodType ?? "");

  const [sortBy, setSortBy] = useState<SortBy>(
    persisted?.sortBy ?? "bestMatch"
  );
  const [resultsCount, setResultsCount] = useState<number>(
    persisted?.resultsCount ?? 10
  );

  const [status, setStatus] = useState("");
  const [results, setResults] = useState<RecipeSearchResult[]>(
    persisted?.lastResults ?? []
  );
  const [closeResults, setCloseResults] = useState<RecipeSearchResult[]>(
    persisted?.lastCloseResults ?? []
  );

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailsStatus, setDetailsStatus] = useState("");
  const [details, setDetails] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [recentlyAddedName, setRecentlyAddedName] = useState<string | null>(null);

  const ingredientNames = useMemo(
    () =>
      plate
        .map((item) => item.name.trim().toLowerCase())
        .filter(Boolean),
    [plate]
  );

  const suggestions = useMemo(() => {
    const q = ingredientInput.trim().toLowerCase();
    if (!q) return [];

    return COMMON_INGREDIENTS.filter(
      (item) =>
        item.includes(q) && !plate.some((plateItem) => plateItem.name === item)
    ).slice(0, 8);
  }, [ingredientInput, plate]);

  const fridgeSections = useMemo(() => buildFridgeSections(plate), [plate]);

  const sortedResults = useMemo(() => {
    const arr = [...results];

    if (sortBy === "bestMatch") arr.sort((a, b) => b.matchScore - a.matchScore);
    else if (sortBy === "fewestMissing") {
      arr.sort((a, b) => a.missedIngredientCount - b.missedIngredientCount);
    } else if (sortBy === "title") {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    }

    return arr;
  }, [results, sortBy]);

  const sortedCloseResults = useMemo(() => {
    const arr = [...closeResults];

    if (sortBy === "bestMatch") arr.sort((a, b) => b.matchScore - a.matchScore);
    else if (sortBy === "fewestMissing") {
      arr.sort((a, b) => a.missedIngredientCount - b.missedIngredientCount);
    } else if (sortBy === "title") {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    }

    return arr;
  }, [closeResults, sortBy]);

  const visibleResults = useMemo(
    () => sortedResults.slice(0, resultsCount),
    [sortedResults, resultsCount]
  );

  const visibleCloseResults = useMemo(
    () => sortedCloseResults.slice(0, resultsCount),
    [sortedCloseResults, resultsCount]
  );

  useEffect(() => {
    const payload: PersistedState = {
      plate,
      maxReadyTime,
      diet,
      foodType,
      sortBy,
      resultsCount,
      lastResults: results,
      lastCloseResults: closeResults,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    plate,
    maxReadyTime,
    diet,
    foodType,
    sortBy,
    resultsCount,
    results,
    closeResults,
  ]);

  useEffect(() => {
    if (!recentlyAddedName) return;
    const timer = window.setTimeout(() => setRecentlyAddedName(null), 450);
    return () => window.clearTimeout(timer);
  }, [recentlyAddedName]);

  function addIngredient(nameOverride?: string) {
    const name = (nameOverride ?? ingredientInput).trim().toLowerCase();
    if (!name) return;

    const alreadyExists = plate.some((item) => item.name === name);
    if (alreadyExists) return;

    setPlate((prev) => [
      ...prev,
      {
        name,
        amount: amountInput === "" ? undefined : Number(amountInput),
        unit: unitInput || "piece",
      },
    ]);

    setRecentlyAddedName(name);
    setIngredientInput("");
    setAmountInput("");
    setUnitInput("piece");
    setActiveSuggestionIndex(-1);
  }

  function removeIngredient(name: string) {
    setPlate((prev) => prev.filter((item) => item.name !== name));
  }

  function clearAll() {
    setPlate([]);
    setResults([]);
    setCloseResults([]);
    setSelectedId(null);
    setDetails(null);
    setStatus("");
    setDetailsStatus("");
    setIngredientInput("");
    setAmountInput("");
    setUnitInput("piece");
    setMaxReadyTime("");
    setDiet("");
    setFoodType("");
    setSortBy("bestMatch");
    setResultsCount(10);
    setHasSearched(false);
    localStorage.removeItem(STORAGE_KEY);
  }

  async function onSearch() {
    if (ingredientNames.length === 0) {
      setStatus("Add at least one ingredient.");
      return;
    }

    setHasSearched(true);
    setStatus("Searching...");
    setResults([]);
    setCloseResults([]);
    setSelectedId(null);
    setDetails(null);
    setDetailsStatus("");

    try {
      const data = await searchRecipes({
        ingredients: ingredientNames,
        plate: plate.map((item) => ({
          name: item.name,
          amount: typeof item.amount === "number" ? item.amount : undefined,
          unit: item.unit,
        })),
        filters: {
          number: FETCH_COUNT,
          ranking: 1,
          maxReadyTime: maxReadyTime === "" ? undefined : maxReadyTime,
          diet: diet || undefined,
          type: foodType || undefined,
        },
      });

      setResults(data.results);
      setCloseResults(data.closeResults ?? []);
      setStatus(
        `Found ${data.results.length} strong matches and ${
          (data.closeResults ?? []).length
        } close results.`
      );
    } catch {
      setStatus("Search failed");
    }
  }

  async function openDetails(r: RecipeSearchResult) {
    setSelectedId(r.id);
    setDetails(null);
    setDetailsStatus("Loading details...");

    try {
      const resp = await fetchRecipeDetails(r.id);
      setDetails(resp);
      setDetailsStatus(`Loaded (${resp.source})`);
    } catch {
      setDetailsStatus("Failed to load details");
    }
  }

  function handleIngredientKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }

      if (e.key === "Enter" && activeSuggestionIndex >= 0) {
        e.preventDefault();
        addIngredient(suggestions[activeSuggestionIndex]);
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      addIngredient();
    }
  }

  return (
    <div className="app-shell">
      <div className="main-content">
        <header className="hero-header">
          <div>
            <h1 className="hero-title">InMyFridge</h1>
            <p className="hero-subtitle">
              Discover recipes based on what you already have.
            </p>
          </div>
        </header>

        <section className="search-panel">
          <div className="search-row">
            <div className="ingredient-autocomplete-wrap">
              <input
                className="text-input ingredient-input"
                value={ingredientInput}
                onChange={(e) => {
                  setIngredientInput(e.target.value);
                  setActiveSuggestionIndex(-1);
                }}
                placeholder="Add an ingredient"
                onKeyDown={handleIngredientKeyDown}
              />

              {suggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      type="button"
                      className={`suggestion-item ${
                        index === activeSuggestionIndex ? "active" : ""
                      }`}
                      onClick={() => addIngredient(suggestion)}
                    >
                      <span className="suggestion-icon">
                        {getIngredientIcon(suggestion)}
                      </span>
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              className="text-input amount-input"
              type="number"
              min={0}
              value={amountInput}
              onChange={(e) =>
                setAmountInput(e.target.value ? Number(e.target.value) : "")
              }
              placeholder="Amount"
            />

            <select
              className="select-input"
              value={unitInput}
              onChange={(e) => setUnitInput(e.target.value)}
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>

            <button onClick={() => addIngredient()} className="primary-button add-button">
              Add
            </button>
          </div>

          <div className="filters-row">
            <label className="filter-group">
              <span>Max time</span>
              <input
                className="text-input small-input"
                type="number"
                min={1}
                value={maxReadyTime}
                onChange={(e) =>
                  setMaxReadyTime(e.target.value ? Number(e.target.value) : "")
                }
                placeholder="mins"
              />
            </label>

            <label className="filter-group">
              <span>Diet</span>
              <select
                className="select-input"
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
              >
                {DIETS.map((d) => (
                  <option key={d} value={d}>
                    {d || "any"}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-group">
              <span>Food type</span>
              <select
                className="select-input"
                value={foodType}
                onChange={(e) => setFoodType(e.target.value)}
              >
                {FOOD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t || "any"}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-group">
              <span>Results</span>
              <select
                className="select-input"
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

            <label className="filter-group">
              <span>Sort</span>
              <select
                className="select-input"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
              >
                <option value="bestMatch">best match</option>
                <option value="fewestMissing">fewest missing</option>
                <option value="title">title (A–Z)</option>
              </select>
            </label>
          </div>

          <div className="search-actions">
            <button onClick={onSearch} className="search-button search-button-wide">
              <Search size={18} />
              Search Recipes
            </button>

            <button onClick={clearAll} className="secondary-button clear-button">
              Clear All
            </button>
          </div>
        </section>

        <div className="status-text">{status}</div>

        {!hasSearched && visibleResults.length === 0 && visibleCloseResults.length === 0 && (
          <section className="empty-state-card">
            <div className="empty-state-icon">
              <CookingPot size={56} />
            </div>
            <h2>Your kitchen is ready!</h2>
            <p>Add ingredients to the fridge to start cooking.</p>
          </section>
        )}

        {hasSearched &&
          visibleResults.length === 0 &&
          visibleCloseResults.length === 0 && (
            <section className="empty-state-card">
              <div className="empty-state-icon">
                <Search size={52} />
              </div>
              <h2>No matching recipes found</h2>
              <p>
                Try adjusting your ingredients, diet, food type, or time filter.
              </p>
            </section>
          )}

        {visibleResults.length > 0 && (
          <section className="results-section">
            <h2 className="section-title">Best matches</h2>
            <ResultsGrid items={visibleResults} onOpen={openDetails} />
          </section>
        )}

        {visibleCloseResults.length > 0 && (
          <section className="results-section">
            <h2 className="section-title">Close results</h2>
            <ResultsGrid items={visibleCloseResults} onOpen={openDetails} />
          </section>
        )}

        {selectedId !== null && (
          <section className="details-panel">
            <div className="details-header">
              <div>
                <div className="details-id">Recipe id: {selectedId}</div>
                <div className="details-status">{detailsStatus}</div>
              </div>
              <button className="icon-button" onClick={() => setSelectedId(null)}>
                <X size={18} />
              </button>
            </div>

            {details?.recipe && (
              <div className="details-body">
                <h3 className="details-title">{details.recipe.title}</h3>

                <div className="details-meta">
                  <span>
                    <b>Ready in:</b> {details.recipe.readyInMinutes ?? "?"} minutes
                  </span>
                  <span>
                    <b>Servings:</b> {details.recipe.servings ?? "?"}
                  </span>
                </div>

                <div className="details-columns">
                  <div className="details-card">
                    <h4>Ingredients</h4>
                    <ul>
                      {details.recipe.ingredients.map((ing: string, i: number) => (
                        <li key={i}>{ing}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="details-card">
                    <h4>Instructions</h4>
                    <p className="instructions-text">
                      {details.recipe.instructions || "No instructions available."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <aside className="fridge-sidebar">
        <div className="fridge-handle" />
        <div className="fridge-content">
          <div className="fridge-header-sticky">
            <h3 className="fridge-title">My Fridge</h3>
          </div>

          <div className="fridge-list">
            {plate.length === 0 ? (
              <div className="fridge-empty">
                <CookingPot size={44} />
                <p>Your fridge is empty</p>
              </div>
            ) : (
              fridgeSections.map((section) => (
                <div key={section.title} className="fridge-section">
                  <div className="fridge-section-title">{section.title}</div>

                  {section.items.map((item) => (
                    <div
                      key={item.name}
                      className={`fridge-item ${
                        recentlyAddedName === item.name ? "fridge-item-enter" : ""
                      }`}
                    >
                      <div className="fridge-item-left">
                        <span className="fridge-item-icon">
                          {getIngredientIcon(item.name)}
                        </span>
                        <div className="fridge-item-text">
                          <span className="fridge-item-name">{item.name}</span>
                          {item.amount ? (
                            <span className="fridge-item-amount">
                              {item.amount} {item.unit}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <button
                        onClick={() => removeIngredient(item.name)}
                        className="icon-button danger-button"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}