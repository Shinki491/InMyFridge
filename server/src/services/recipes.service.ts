import { fetchRecipeInformation } from "./spoonacular.service";
import { getCachedRecipe, upsertCachedRecipe } from "../repositories/recipeCache.repo";

function getTtlHours() {
  const raw = process.env.CACHE_TTL_HOURS ?? "72";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 72;
}

export async function getRecipeDetails(apiId: number) {
  const cached = await getCachedRecipe(apiId);
  if (cached) {
    const ageMs = Date.now() - new Date(cached.cachedAt).getTime();
    const ttlMs = getTtlHours() * 60 * 60 * 1000;
    if (ageMs < ttlMs) {
      return { source: "cache", recipe: normalizeRecipe(cached.payload) };
    }
  }

  const fresh = await fetchRecipeInformation(apiId);
  await upsertCachedRecipe(apiId, fresh);
  return { source: "spoonacular", recipe: normalizeRecipe(fresh) };
}

function normalizeRecipe(raw: any) {
  return {
    id: raw.id,
    title: raw.title ?? "",
    image: raw.image ?? null,
    readyInMinutes: raw.readyInMinutes ?? null,
    servings: raw.servings ?? null,
    diets: raw.diets ?? [],
    ingredients: Array.isArray(raw.extendedIngredients)
      ? raw.extendedIngredients.map((i: any) => i.original ?? i.name)
      : [],
    instructions:
      raw.instructions ??
      (Array.isArray(raw.analyzedInstructions) &&
      raw.analyzedInstructions.length > 0
        ? raw.analyzedInstructions[0].steps
            ?.map((s: any) => s.step)
            .join(" ")
        : ""),
  };
}