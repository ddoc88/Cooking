const fs = require("fs");
const path = require("path");

const recipesDir = path.join(__dirname, "../recipes");
const outputFile = path.join(__dirname, "src", "recipes.json");

// Read all PDFs in the folder
const files = fs.readdirSync(recipesDir).filter(f => f.endsWith(".pdf"));

// Generate JSON entries
const recipes = files.map(file => {
  return {
    name: path.basename(file, ".pdf"), // filename without extension
    path: `/recipes/${file}`            // path to use in the app
  };
});

// Write JSON file
fs.writeFileSync(outputFile, JSON.stringify(recipes, null, 2));
console.log(`Generated recipes.json with ${recipes.length} entries.`);
