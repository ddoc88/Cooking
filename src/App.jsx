import React, { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function App() {
  const [page, setPage] = useState("home");
  const [theme, setTheme] = useState("light");
  const [recipes, setRecipes] = useState([]);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [importedPDF, setImportedPDF] = useState(null);
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAPI_KEY; // Vercel ENV

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("recipes") || "[]");
    setRecipes(stored);
  }, []);

  const saveRecipes = (newRecipes) => {
    setRecipes(newRecipes);
    localStorage.setItem("recipes", JSON.stringify(newRecipes));
  };

  const handlePDFUpload = async (file) => {
    setImportedPDF(file);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const typedArray = new Uint8Array(e.target.result);
      const pdf = await pdfjsLib.getDocument(typedArray).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((t) => t.str).join(" ") + " ";
      }

      try {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4",
              messages: [
                {
                  role: "user",
                  content: `Extract recipe into JSON:
{
"name": "Recipe Name",
"ingredients": ["ingredient 1 10g", "ingredient 2 200ml"],
"steps": ["Step 1", "Step 2 with time in seconds like 120s"]
}
Text: ${fullText}`,
                },
              ],
            }),
          }
        );
        const data = await response.json();
        const text = data.choices[0].message.content;
        const recipe = JSON.parse(text);
        saveRecipes([...recipes, recipe]);
        alert("Recipe imported!");
        setPage("recipes");
      } catch (err) {
        console.error("PDF/AI error:", err);
        alert("Failed to import recipe.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const deleteRecipe = (index) => {
    if (!window.confirm("Are you sure you want to delete this recipe?")) return;
    const newRecipes = recipes.filter((_, i) => i !== index);
    saveRecipes(newRecipes);
  };

  const editRecipe = (index, updated) => {
    const newRecipes = [...recipes];
    newRecipes[index] = updated;
    saveRecipes(newRecipes);
    setPage("recipes");
  };

  const toggleTheme = () =>
    setTheme(theme === "light" ? "dark" : "light");

  const containerStyle = {
    padding: 20,
    fontFamily: "sans-serif",
    background: theme === "dark" ? "#111" : "#f9f9f9",
    minHeight: "100vh",
    maxWidth: 600,
    margin: "0 auto",
  };

  // --- PAGES ---
  if (page === "home")
    return (
      <div style={containerStyle}>
        <h1 style={{ textAlign: "center" }}>Cooking App</h1>
        <button
          onClick={() => setPage("recipes")}
          style={{ width: "100%", margin: "10px 0", padding: "10px" }}
        >
          Recipes
        </button>
        <button
          onClick={() => setPage("add")}
          style={{ width: "100%", margin: "10px 0", padding: "10px" }}
        >
          + Add Recipe
        </button>
        <button
          onClick={toggleTheme}
          style={{ width: "100%", margin: "10px 0", padding: "10px" }}
        >
          Toggle Theme
        </button>
      </div>
    );

  if (page === "add")
    return (
      <div style={containerStyle}>
        <h1>Add Recipe</h1>
        <input
          type="text"
          placeholder="Recipe Name"
          id="recipeName"
          style={{ width: "100%", marginBottom: 10, padding: 8 }}
        />
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => handlePDFUpload(e.target.files[0])}
          style={{ marginBottom: 10 }}
        />
        <button onClick={() => setPage("home")} style={{ width: "100%" }}>
          Back
        </button>
      </div>
    );

  if (page === "recipes")
    return (
      <div style={containerStyle}>
        <h1>Saved Recipes</h1>
        <button onClick={() => setPage("home")} style={{ marginBottom: 10 }}>
          ⬅ Back Home
        </button>
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
            <h2 style={{ fontSize: 18 }}>{r.name}</h2>
            <button
              style={{
                background: "green",
                color: "white",
                width: "100%",
                marginBottom: 5,
                padding: 8,
              }}
              onClick={() => {
                setCurrentRecipe(r);
                setPage("cook");
              }}
            >
              Open Recipe
            </button>
            <div style={{ display: "flex", gap: 5 }}>
              <button
                style={{ flex: 1, background: "orange", color: "white" }}
                onClick={() => editRecipe(i, r)}
              >
                Edit
              </button>
              <button
                style={{ flex: 1, background: "red", color: "white" }}
                onClick={() => deleteRecipe(i)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        <button onClick={() => setPage("add")} style={{ width: "100%" }}>
          + Add Recipe
        </button>
      </div>
    );

  if (page === "cook")
    return (
      <div style={{ ...containerStyle, paddingBottom: 50 }}>
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
        <button onClick={() => setPage("recipes")} style={{ width: "100%" }}>
          Back to Recipes
        </button>
      </div>
    );

  return <div>Unknown page</div>;
}
