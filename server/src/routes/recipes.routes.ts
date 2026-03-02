import { Router } from "express";

const router = Router();

type SearchBody = {
  ingredients: string[];
  filters?: {
    number?: number;
    ranking?: 1 | 2;
    ignorePantry?: boolean;
  };
};

function requireApiKey() {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) throw new Error("Missing SPOONACULAR_API_KEY in server env");
  return key;
}

router.post("/search", async (req, res) => {
  try {
    const body = (req.body ?? {}) as SearchBody;

    const ingredients = Array.isArray(body.ingredients)
      ? body.ingredients.map(s => String(s).trim()).filter(Boolean)
      : [];

    const number = body.filters?.number ?? 10;
    const ranking = body.filters?.ranking ?? 1;
    const ignorePantry = body.filters?.ignorePantry ?? true;

    if (ingredients.length === 0) {
      return res.status(400).json({ error: "ingredients must be a non-empty array" });
    }

    const apiKey = requireApiKey();

    const url = new URL("https://api.spoonacular.com/recipes/findByIngredients");
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("ingredients", ingredients.join(","));
    url.searchParams.set("number", String(number));
    url.searchParams.set("ranking", String(ranking));
    url.searchParams.set("ignorePantry", String(ignorePantry));

    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({
        error: "Spoonacular request failed",
        status: r.status,
        details: text.slice(0, 500),
      });
    }

    const data = (await r.json()) as Array<{
      id: number;
      title: string;
      image?: string;
      usedIngredientCount: number;
      missedIngredientCount: number;
      usedIngredients: Array<{ name: string }>;
      missedIngredients: Array<{ name: string }>;
    }>;

    const results = data.map(item => {
      const used = item.usedIngredientCount ?? 0;
      const missed = item.missedIngredientCount ?? 0;
      const denom = used + missed || 1;
      const matchScore = Math.round((used / denom) * 100);

      return {
        id: item.id,
        title: item.title,
        image: item.image ?? null,
        usedIngredientCount: used,
        missedIngredientCount: missed,
        matchScore,
        usedIngredients: (item.usedIngredients ?? []).map(x => x.name),
        missedIngredients: (item.missedIngredients ?? []).map(x => x.name),
      };
    });

    return res.json({
      ingredients,
      filters: { number, ranking, ignorePantry },
      results,
    });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const result = await getRecipeDetails(id);
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

import { getRecipeDetails } from "../services/recipes.service";
export default router;