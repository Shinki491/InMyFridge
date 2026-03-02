import mongoose from "mongoose";

const RecipeCacheSchema = new mongoose.Schema(
  {
    apiId: { type: Number, required: true, unique: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    cachedAt: { type: Date, required: true, default: () => new Date() },
  },
  { versionKey: false }
);

export const RecipeCache =
  mongoose.models.RecipeCache || mongoose.model("RecipeCache", RecipeCacheSchema);