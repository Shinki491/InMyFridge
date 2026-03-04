import { Router } from "express";
import { getRecipeDetails } from "../services/recipes.service";

const router = Router();

type SearchBody = {
  ingredients: string[];
  filters?: {
    number?: number;
    ranking?: 1 | 2;
    ignorePantry?: boolean;
    maxReadyTime?: number;
    diet?: string;
    intolerances?: string[];
    type?: string; // NEW
  };
};

router.post("/search", async (req, res) => {
  try {
    const body = (req.body ?? {}) as SearchBody;

    const ingredients = Array.isArray(body.ingredients)
      ? body.ingredients.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
      : [];

    if (ingredients.length === 0) {
      return res.status(400).json({ error: "ingredients must be a non-empty array" });
    }

    const number = body.filters?.number ?? 10;
    const ranking = body.filters?.ranking ?? 1;
    const ignorePantry = body.filters?.ignorePantry ?? true;

    const maxReadyTime = body.filters?.maxReadyTime;
    const diet = body.filters?.diet?.trim();
    const intolerances = body.filters?.intolerances ?? [];
    const type = body.filters?.type?.trim(); // NEW

    const apiKey = process.env.SPOONACULAR_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing SPOONACULAR_API_KEY" });

    const useComplex =
      Boolean(diet) ||
      Boolean(type) ||
      Number.isFinite(maxReadyTime) ||
      (Array.isArray(intolerances) && intolerances.length > 0);

    // Fast path: no complex-only filters
    if (!useComplex) {
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

      const data = (await r.json()) as any[];

      const results = data.map((item) => {
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
          usedIngredients: (item.usedIngredients ?? []).map((x: any) => x.name),
          missedIngredients: (item.missedIngredients ?? []).map((x: any) => x.name),
        };
      });

      return res.json({ ingredients, filters: { number, ranking, ignorePantry }, results });
    }

    // Complex path: supports diet, maxReadyTime, intolerances, type
    const url = new URL("https://api.spoonacular.com/recipes/complexSearch");
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("number", String(number));
    url.searchParams.set("addRecipeInformation", "true");
    url.searchParams.set("fillIngredients", "true");
    url.searchParams.set("instructionsRequired", "false");

    url.searchParams.set("includeIngredients", ingredients.join(","));

    if (Number.isFinite(maxReadyTime)) url.searchParams.set("maxReadyTime", String(maxReadyTime));
    if (diet) url.searchParams.set("diet", diet);
    if (type) url.searchParams.set("type", type);
    if (intolerances.length > 0) url.searchParams.set("intolerances", intolerances.join(","));

    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({
        error: "Spoonacular complexSearch failed",
        status: r.status,
        details: text.slice(0, 500),
      });
    }

    const payload = (await r.json()) as { results: any[] };
    const data = payload.results ?? [];

    const results = data.map((item) => {
      const ext = Array.isArray(item.extendedIngredients) ? item.extendedIngredients : [];
      const recipeIngs = ext
        .map((x: any) => String(x.name ?? "").trim().toLowerCase())
        .filter(Boolean);

      const usedSet = new Set<string>();
      for (const ing of ingredients) {
        if (recipeIngs.includes(ing)) usedSet.add(ing);
      }
      const usedIngredients = Array.from(usedSet);

      const used = usedIngredients.length;
      const missedIngredientCount = Math.max(0, ingredients.length - used);
      const matchScore = Math.round((used / (ingredients.length || 1)) * 100);

      return {
        id: item.id,
        title: item.title,
        image: item.image ?? null,
        usedIngredientCount: used,
        missedIngredientCount,
        matchScore,
        usedIngredients,
        missedIngredients: [],
      };
    });

    return res.json({
      ingredients,
      filters: { number, ranking, ignorePantry, maxReadyTime, diet, type, intolerances },
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

export default router;