function requireApiKey() {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) throw new Error("Missing SPOONACULAR_API_KEY in server env");
  return key;
}

export async function fetchRecipeInformation(id: number) {
  const apiKey = requireApiKey();

  const url = new URL(`https://api.spoonacular.com/recipes/${id}/information`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("includeNutrition", "false");

  const r = await fetch(url);
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Spoonacular details failed: ${r.status} ${text.slice(0, 300)}`);
  }

  return (await r.json()) as any;
}