import { Router } from "express";
import { getRecipeDetails } from "../services/recipes.service";

const router = Router();

type PlateItem = {
  name: string;
  amount?: number;
  unit?: string;
};

type SearchBody = {
  ingredients: string[];
  plate?: PlateItem[];
  filters?: {
    number?: number;
    ranking?: 1 | 2;
    ignorePantry?: boolean;
    maxReadyTime?: number;
    diet?: string;
    intolerances?: string[];
    type?: string;
  };
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function singularize(value: string): string {
  const v = normalizeName(value);
  if (v.endsWith("ies")) return `${v.slice(0, -3)}y`;
  if (v.endsWith("es")) return v.slice(0, -2);
  if (v.endsWith("s") && !v.endsWith("ss")) return v.slice(0, -1);
  return v;
}

function namesMatch(a: string, b: string): boolean {
  const na = singularize(a);
  const nb = singularize(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

function canonicalUnit(unit?: string): string {
  const u = normalizeName(unit ?? "");

  if (!u) return "";

  const map: Record<string, string> = {
    piece: "piece",
    pieces: "piece",
    pc: "piece",
    pcs: "piece",
    whole: "piece",
    egg: "piece",
    eggs: "piece",
    clove: "piece",
    cloves: "piece",

    g: "g",
    gram: "g",
    grams: "g",

    kg: "kg",
    kilogram: "kg",
    kilograms: "kg",

    ml: "ml",
    milliliter: "ml",
    milliliters: "ml",

    l: "l",
    liter: "l",
    liters: "l",

    cup: "cup",
    cups: "cup",

    tbsp: "tbsp",
    tablespoon: "tbsp",
    tablespoons: "tbsp",

    tsp: "tsp",
    teaspoon: "tsp",
    teaspoons: "tsp",
  };

  return map[u] ?? u;
}

function convertAmount(amount: number, fromUnit: string, toUnit: string): number | null {
  if (!Number.isFinite(amount)) return null;

  const from = canonicalUnit(fromUnit);
  const to = canonicalUnit(toUnit);

  if (!from || !to) return null;
  if (from === to) return amount;

  const massToG: Record<string, number> = {
    g: 1,
    kg: 1000,
  };

  const volumeToMl: Record<string, number> = {
    ml: 1,
    l: 1000,
  };

  const spoonToMl: Record<string, number> = {
    tsp: 5,
    tbsp: 15,
    cup: 240,
  };

  if (from in massToG && to in massToG) {
    return (amount * massToG[from]) / massToG[to];
  }

  if (from in volumeToMl && to in volumeToMl) {
    return (amount * volumeToMl[from]) / volumeToMl[to];
  }

  if ((from in spoonToMl || from in volumeToMl) && (to in spoonToMl || to in volumeToMl)) {
    const fromMl = from in spoonToMl ? spoonToMl[from] : volumeToMl[from];
    const toMl = to in spoonToMl ? spoonToMl[to] : volumeToMl[to];
    return (amount * fromMl) / toMl;
  }

  return null;
}

function formatShortage(name: string, missingAmount: number, unit: string): string {
  const rounded = Math.round(missingAmount * 100) / 100;
  return `${name}: need ${rounded} ${unit}`;
}

function getRecipeComparableAmount(recipeIng: any, desiredUnit: string): { amount: number; unit: string } | null {
  const targetUnit = canonicalUnit(desiredUnit);

  const candidates = [
    {
      amount: Number(recipeIng?.amount),
      unit: canonicalUnit(recipeIng?.unit),
    },
    {
      amount: Number(recipeIng?.measures?.metric?.amount),
      unit: canonicalUnit(recipeIng?.measures?.metric?.unitShort || recipeIng?.measures?.metric?.unitLong),
    },
    {
      amount: Number(recipeIng?.measures?.us?.amount),
      unit: canonicalUnit(recipeIng?.measures?.us?.unitShort || recipeIng?.measures?.us?.unitLong),
    },
  ];

  for (const candidate of candidates) {
    if (!Number.isFinite(candidate.amount)) continue;

    let candidateUnit = candidate.unit;

    // If the user expects "piece" and the recipe gives a bare count, treat it as piece-like.
    if (!candidateUnit && targetUnit === "piece") {
      candidateUnit = "piece";
    }

    if (!candidateUnit) continue;

    const converted = convertAmount(candidate.amount, candidateUnit, targetUnit);
    if (converted !== null) {
      return { amount: converted, unit: targetUnit };
    }

    if (candidateUnit === targetUnit) {
      return { amount: candidate.amount, unit: targetUnit };
    }
  }

  return null;
}

type QuantityAnalysis = {
  usedIngredients: string[];
  missingIngredients: string[];
  usedIngredientCount: number;
  missedIngredientCount: number;
  matchScore: number;
  quantityStatus: "enough" | "partial" | "unknown";
  missingAmounts: string[];
  enoughComparableCount: number;
  unknownComparableCount: number;
  hasAnyQuantities: boolean;
};

function analyzeQuantity(
  plate: PlateItem[],
  extendedIngredients: any[]
): QuantityAnalysis {
  const usedIngredients: string[] = [];
  const missingIngredients: string[] = [];
  const missingAmounts: string[] = [];

  let enoughComparableCount = 0;
  let unknownComparableCount = 0;

  const hasAnyQuantities = plate.some((p) => typeof p.amount === "number");

  for (const plateItem of plate) {
    const recipeIng = extendedIngredients.find((ing) =>
      namesMatch(String(ing?.name ?? ""), plateItem.name)
    );

    if (!recipeIng) {
      missingIngredients.push(plateItem.name);
      continue;
    }

    usedIngredients.push(plateItem.name);

    const userAmount =
      typeof plateItem.amount === "number" && Number.isFinite(plateItem.amount)
        ? plateItem.amount
        : undefined;

    const userUnit = canonicalUnit(plateItem.unit);

    // No quantity given by user -> ingredient presence is enough.
    if (userAmount === undefined || !userUnit) {
      enoughComparableCount += 1;
      continue;
    }

    const comparable = getRecipeComparableAmount(recipeIng, userUnit);

    if (!comparable) {
      unknownComparableCount += 1;
      continue;
    }

    if (userAmount >= comparable.amount) {
      enoughComparableCount += 1;
    } else {
      missingAmounts.push(
        formatShortage(plateItem.name, comparable.amount - userAmount, comparable.unit)
      );
    }
  }

  const total = plate.length || 1;
  const matchScore = Math.round((enoughComparableCount / total) * 100);

  let quantityStatus: "enough" | "partial" | "unknown" = "unknown";

  if (!hasAnyQuantities) {
    quantityStatus = "unknown";
  } else if (missingAmounts.length === 0 && unknownComparableCount === 0 && usedIngredients.length === plate.length) {
    quantityStatus = "enough";
  } else if (enoughComparableCount > 0 || missingAmounts.length > 0) {
    quantityStatus = "partial";
  } else {
    quantityStatus = "unknown";
  }

  return {
    usedIngredients,
    missingIngredients,
    usedIngredientCount: usedIngredients.length,
    missedIngredientCount: missingIngredients.length,
    matchScore,
    quantityStatus,
    missingAmounts,
    enoughComparableCount,
    unknownComparableCount,
    hasAnyQuantities,
  };
}

router.post("/search", async (req, res) => {
  try {
    const body = (req.body ?? {}) as SearchBody;

    const plate = Array.isArray(body.plate)
      ? body.plate
          .map((item) => ({
            name: normalizeName(String(item.name ?? "")),
            amount:
              typeof item.amount === "number" && Number.isFinite(item.amount)
                ? item.amount
                : undefined,
            unit: canonicalUnit(item.unit),
          }))
          .filter((item) => item.name)
      : [];

    const ingredients =
      plate.length > 0
        ? plate.map((item) => item.name)
        : Array.isArray(body.ingredients)
        ? body.ingredients.map((s) => normalizeName(String(s))).filter(Boolean)
        : [];

    if (ingredients.length === 0) {
      return res.status(400).json({ error: "ingredients must be a non-empty array" });
    }

    const requestedNumber = body.filters?.number ?? 30;
    const fetchNumber = Math.max(requestedNumber, 100); // pull a larger candidate set

    const maxReadyTime = body.filters?.maxReadyTime;
    const diet = body.filters?.diet?.trim();
    const intolerances = body.filters?.intolerances ?? [];
    const type = body.filters?.type?.trim();

    const apiKey = process.env.SPOONACULAR_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing SPOONACULAR_API_KEY" });
    }

    const url = new URL("https://api.spoonacular.com/recipes/complexSearch");
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("number", String(fetchNumber));
    url.searchParams.set("addRecipeInformation", "true");
    url.searchParams.set("fillIngredients", "true");
    url.searchParams.set("instructionsRequired", "false");
    url.searchParams.set("includeIngredients", ingredients.join(","));

    if (Number.isFinite(maxReadyTime)) {
      url.searchParams.set("maxReadyTime", String(maxReadyTime));
    }
    if (diet) {
      url.searchParams.set("diet", diet);
    }
    if (type) {
      url.searchParams.set("type", type);
    }
    if (intolerances.length > 0) {
      url.searchParams.set("intolerances", intolerances.join(","));
    }

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

    const analyzed = data.map((item) => {
      const ext = Array.isArray(item.extendedIngredients) ? item.extendedIngredients : [];

      const quantityAnalysis = analyzeQuantity(
        plate.length > 0 ? plate : ingredients.map((name) => ({ name })),
        ext
      );

      return {
        id: item.id,
        title: item.title,
        image: item.image ?? null,
        usedIngredientCount: quantityAnalysis.usedIngredientCount,
        missedIngredientCount: quantityAnalysis.missedIngredientCount,
        matchScore: quantityAnalysis.matchScore,
        usedIngredients: quantityAnalysis.usedIngredients,
        missedIngredients: quantityAnalysis.missingIngredients,
        quantityStatus: quantityAnalysis.quantityStatus,
        missingAmounts: quantityAnalysis.missingAmounts,
        enoughComparableCount: quantityAnalysis.enoughComparableCount,
        unknownComparableCount: quantityAnalysis.unknownComparableCount,
      };
    });

    const hasAnyQuantities = plate.some((item) => typeof item.amount === "number");

    const primaryResults = analyzed
      .filter((item) => !hasAnyQuantities || item.quantityStatus === "enough")
      .sort((a, b) => {
        if (b.enoughComparableCount !== a.enoughComparableCount) {
          return b.enoughComparableCount - a.enoughComparableCount;
        }
        return b.matchScore - a.matchScore;
      })
      .slice(0, requestedNumber)
      .map(({ enoughComparableCount, unknownComparableCount, ...rest }) => rest);

    const closeResults = analyzed
      .filter((item) => hasAnyQuantities && item.quantityStatus !== "enough")
      .sort((a, b) => {
        const rank = (status?: string) => (status === "partial" ? 0 : 1);
        const byRank = rank(a.quantityStatus) - rank(b.quantityStatus);
        if (byRank !== 0) return byRank;

        if (b.enoughComparableCount !== a.enoughComparableCount) {
          return b.enoughComparableCount - a.enoughComparableCount;
        }

        return b.matchScore - a.matchScore;
      })
      .slice(0, requestedNumber)
      .map(({ enoughComparableCount, unknownComparableCount, ...rest }) => rest);

    return res.json({
      ingredients,
      filters: { number: requestedNumber, maxReadyTime, diet, type, intolerances },
      results: primaryResults,
      closeResults,
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