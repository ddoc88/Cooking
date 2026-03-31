import fs from "fs";
import path from "path";

const recipesDir = path.resolve("./recipes");
const outputFile = path.resolve("./src/recipes.json");

const recipeFiles = fs.readdirSync(recipesDir).filter(f => f.endsWith(".pdf"));

const recipes = recipeFiles.map(file => {
  const name = path.basename(file, ".pdf"); // filename without .pdf
  return {
    name,
    ingredients: ["TBD"], // optional placeholder
    steps: ["TBD"], // optional placeholder
    file,
  };
});

fs.writeFileSync(outputFile, JSON.stringify(recipes, null, 2));
console.log(`Generated ${recipes.length} recipes in ${outputFile}`);
