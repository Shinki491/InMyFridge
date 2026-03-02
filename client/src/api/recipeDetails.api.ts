import { apiGet } from "./http";

export type NormalizedRecipe = {
  id: number;
  title: string;
  image: string | null;
  readyInMinutes: number | null;
  servings: number | null;
  diets: string[];
  ingredients: string[];
  instructions: string;
};

export type RecipeDetailsResponse = {
  source: "cache" | "spoonacular";
  recipe: NormalizedRecipe;
};

export function getRecipeDetails(id: number) {
  return apiGet<RecipeDetailsResponse>(`/api/recipes/${id}`);
}