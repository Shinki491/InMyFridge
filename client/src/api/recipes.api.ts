import { apiPost } from "./http";

export type SearchRequest = {
  ingredients: string[];
  filters?: {
    maxReadyTime?: number;
    diet?: string;
    intolerances?: string[];
    type?: string; // NEW
    number?: number;
    ranking?: 1 | 2;
    ignorePantry?: boolean;
  };
};

export type RecipeSearchResult = {
  id: number;
  title: string;
  image: string | null;
  usedIngredientCount: number;
  missedIngredientCount: number;
  matchScore: number;
  usedIngredients: string[];
  missedIngredients: string[];
};

export type SearchResponse = {
  ingredients: string[];
  filters: Record<string, unknown>;
  results: RecipeSearchResult[];
};

export async function searchRecipes(body: SearchRequest) {
  return apiPost<SearchResponse>("/api/recipes/search", body);
}