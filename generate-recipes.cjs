const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const recipesDir = path.join(__dirname, "public/recipes");
const outputFile = path.join(__dirname, "src/recipes.json");

async function extractTitle(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);

    const text = data.text.trim();

    // Get first meaningful line
    const firstLine = text.split("\n").find(line => line.trim().length > 5);

    return firstLine
      ? firstLine.replace(/[^a-zA-Z0-9 ]/g, "").trim()
      : "Unknown Recipe";
  } catch (err) {
    console.log("Error reading:", filePath);
    return "Unknown Recipe";
  }
}

async function generate() {
  const files = fs.readdirSync(recipesDir).filter(f => f.endsWith(".pdf"));

  const recipes = [];

  for (const file of files) {
    const fullPath = path.join(recipesDir, file);
    const name = await extractTitle(fullPath);

    recipes.push({
      name,
      path: `/recipes/${file}`
    });
  }

  fs.writeFileSync(outputFile, JSON.stringify(recipes, null, 2));
  console.log("✅ recipes.json generated!");
}

generate();
