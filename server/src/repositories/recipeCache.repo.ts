import { RecipeCache } from "../models/RecipeCache.model";

export async function getCachedRecipe(apiId: number) {
  return RecipeCache.findOne({ apiId }).lean();
}

export async function upsertCachedRecipe(apiId: number, payload: unknown) {
  return RecipeCache.findOneAndUpdate(
    { apiId },
    { apiId, payload, cachedAt: new Date() },
    { upsert: true, new: true }
  ).lean();
}