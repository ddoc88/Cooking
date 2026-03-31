import React, { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import Tesseract from "tesseract.js";

// Set PDF worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.js",
  import.meta.url
).toString();

export default function App() {
  const [page, setPage] = useState("home"); // home, recipes, cook, add
  const [theme, setTheme] = useState("light");
  const [recipes, setRecipes] = useState([]);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [importing, setImporting] = useState(false);

  const apiKey = import.meta.env.VITE_OPENAPI_KEY;

  // Load recipes from localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("recipes") || "[]");
    setRecipes(stored);
  }, []);

  const saveRecipes = (newRecipes) => {
    setRecipes(newRecipes);
    localStorage.setItem("recipes", JSON.stringify(newRecipes));
  };

  // PDF Import via File
  const handlePDFUpload = async (file) => {
    if (!file) return;
    setImporting(true);
    let fullText = "";

    try {
      // Try using pdfjs first
      const typedArray = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument(typedArray).promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const pageObj = await pdf.getPage(i);
        const textContent = await pageObj.getTextContent();
        fullText += textContent.items.map((t) => t.str).join(" ") + " ";
      }

      // If pdfjs fails to extract (empty), fallback to OCR
      if (!fullText.trim()) {
        const { data } = await Tesseract.recognize(file, "eng", {
          logger: (m) => console.log(m),
        });
        fullText = data.text;
      }

      // Call OpenAI to convert to JSON
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "user",
              content: `Extract a recipe from this text into JSON format:
{
  "name": "Recipe Name",
  "ingredients": ["ingredient 1 10g", "ingredient 2 200ml"],
  "steps": ["Step 1", "Step 2 with time in seconds like 120s"]
}
Text: ${fullText}`,
            },
          ],
        }),
      });

      const data = await response.json();
      const text = data.choices[0].message.content;
      const recipe = JSON.parse(text);

      saveRecipes([...recipes, recipe]);
      alert("Recipe imported!");
    } catch (err) {
      console.error("Error importing recipe:", err);
      alert("Failed to import recipe.");
    }
    setImporting(false);
  };

  const deleteRecipe = (index) => {
    if (window.confirm("Delete this recipe?")) {
      const newRecipes = recipes.filter((_, i) => i !== index);
      saveRecipes(newRecipes);
    }
  };

  const editRecipe = (index, updated) => {
    const newRecipes = [...recipes];
    newRecipes[index] = updated;
    saveRecipes(newRecipes);
  };

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  // ------------------- RENDER PAGES -------------------

  if (page === "home") {
    return (
      <div
        style={{
          padding: 20,
          fontFamily: "sans-serif",
          minHeight: "100vh",
          background: theme === "dark" ? "#111" : "#f9f9f9",
        }}
      >
        <h1>Cooking App</h1>
        <button
          style={{ display: "block", margin: "10px 0", width: "100%" }}
          onClick={() => setPage("recipes")}
        >
          Recipes
        </button>
        <button
          style={{ display: "block", margin: "10px 0", width: "100%" }}
          onClick={() => setPage("add")}
        >
          + Add Recipe
        </button>
        <button
          style={{ display: "block", margin: "10px 0", width: "100%" }}
          onClick={toggleTheme}
        >
          Toggle Theme
        </button>
      </div>
    );
  }

  if (page === "add") {
    return (
      <div style={{ padding: 20 }}>
        <h1>Add Recipe</h1>
        <input
          type="file"
          onChange={(e) => handlePDFUpload(e.target.files[0])}
        />
        {importing && <p>Importing PDF...</p>}
        <button
          style={{ display: "block", marginTop: 10 }}
          onClick={() => setPage("home")}
        >
          Back
        </button>
      </div>
    );
  }

  if (page === "recipes") {
    return (
      <div style={{ padding: 20 }}>
        <h1>Saved Recipes</h1>
        {recipes.map((r, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #ccc",
              margin: "10px 0",
              borderRadius: 10,
              padding: 10,
            }}
          >
            <h2>{r.name}</h2>
            <button
              style={{ background: "green", color: "white", width: "100%" }}
              onClick={() => {
                setCurrentRecipe(r);
                setPage("cook");
              }}
            >
              Open Recipe
            </button>
            <button
              style={{
                background: "orange",
                color: "white",
                marginTop: 5,
                width: "49%",
              }}
              onClick={() => editRecipe(i, r)}
            >
              Edit
            </button>
            <button
              style={{
                background: "red",
                color: "white",
                marginTop: 5,
                width: "49%",
              }}
              onClick={() => deleteRecipe(i)}
            >
              Delete
            </button>
          </div>
        ))}
        <button
          onClick={() => setPage("add")}
          style={{ display: "block", margin: "10px 0", width: "100%" }}
        >
          + Add Recipe
        </button>
        <button onClick={() => setPage("home")}>Back</button>
      </div>
    );
  }

  if (page === "cook") {
    return (
      <div style={{ padding: 20 }}>
        <h1>{currentRecipe.name}</h1>
        <h2>Ingredients</h2>
        <ul>
          {currentRecipe.ingredients.map((i, idx) => (
            <li key={idx}>{i}</li>
          ))}
        </ul>
        <h2>Steps</h2>
        <ol>
          {currentRecipe.steps.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
        </ol>
        <button onClick={() => setPage("recipes")}>Back</button>
      </div>
    );
  }

  return <div>Unknown page</div>;
}
