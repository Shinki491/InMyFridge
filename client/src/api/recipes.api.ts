import { apiPost } from "./http";

export type PlateItem = {
  name: string;
  amount?: number;
  unit?: string;
};

export type SearchRequest = {
  ingredients: string[];
  plate?: PlateItem[];
  filters?: {
    maxReadyTime?: number;
    diet?: string;
    intolerances?: string[];
    type?: string;
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
  quantityStatus?: "enough" | "partial" | "unknown";
  missingAmounts?: string[];
};

export type SearchResponse = {
  ingredients: string[];
  filters: Record<string, unknown>;
  results: RecipeSearchResult[];
  closeResults?: RecipeSearchResult[];
};

export async function searchRecipes(body: SearchRequest) {
  return apiPost<SearchResponse>("/api/recipes/search", body);
}