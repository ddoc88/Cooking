import React, { useState, useEffect } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.js?worker"; // fixed for Vite

GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function App() {
  const [page, setPage] = useState("home"); // home, recipes, cook, add
  const [theme, setTheme] = useState("light");
  const [recipes, setRecipes] = useState([]);
  const [currentRecipe, setCurrentRecipe] = useState(null);

  const OPENAI_API_KEY = import.meta.env.VITE_OPENAPI_KEY; // Vercel ENV

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("recipes") || "[]");
    setRecipes(stored);
  }, []);

  const saveRecipes = (newRecipes) => {
    setRecipes(newRecipes);
    localStorage.setItem("recipes", JSON.stringify(newRecipes));
  };

  // PDF Import using OpenAI
  const handlePDFUpload = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const typedArray = new Uint8Array(e.target.result);
      const pdf = await getDocument(typedArray).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((t) => t.str).join(" ") + " ";
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
                  content: `Extract a recipe JSON from this text:
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
        const recipe = JSON.parse(data.choices[0].message.content);
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

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const containerStyle = {
    padding: 20,
    fontFamily: "sans-serif",
    background: theme === "dark" ? "#111" : "#f9f9f9",
    color: theme === "dark" ? "#fff" : "#111",
    minHeight: "100vh",
    maxWidth: 600,
    margin: "0 auto",
  };

  // --- PAGE RENDER ---
  if (page === "home") {
    return (
      <div style={containerStyle}>
        <h1 style={{ textAlign: "center" }}>Cooking App</h1>
        <button style={{ width: "100%", margin: "10px 0" }} onClick={() => setPage("recipes")}>
          Recipes
        </button>
        <button style={{ width: "100%", margin: "10px 0" }} onClick={() => setPage("add")}>
          + Add Recipe
        </button>
        <button style={{ width: "100%", margin: "10px 0" }} onClick={toggleTheme}>
          Toggle Theme
        </button>
      </div>
    );
  }

  if (page === "add") {
    return (
      <div style={containerStyle}>
        <h1>Add Recipe</h1>
        <input type="text" placeholder="Recipe Name" id="recipeName" style={{ width: "100%", marginBottom: 10, padding: 8 }} />
        <input type="file" accept="application/pdf" onChange={(e) => handlePDFUpload(e.target.files[0])} style={{ marginBottom: 10 }} />
        <button style={{ width: "100%", marginTop: 10 }} onClick={() => setPage("home")}>
          Back
        </button>
      </div>
    );
  }

  if (page === "recipes") {
    return (
      <div style={containerStyle}>
        <h1>Saved Recipes</h1>
        <button style={{ marginBottom: 10 }} onClick={() => setPage("home")}>
          ⬅ Back Home
        </button>
        {recipes.map((r, i) => (
          <div key={i} style={{ border: "1px solid #ccc", borderRadius: 10, padding: 10, margin: "10px 0" }}>
            <h2 style={{ fontSize: 18 }}>{r.name}</h2>
            <button style={{ width: "100%", background: "green", color: "white", marginBottom: 5, padding: 8 }} onClick={() => { setCurrentRecipe(r); setPage("cook"); }}>
              Open Recipe
            </button>
            <div style={{ display: "flex", gap: 5 }}>
              <button style={{ flex: 1, background: "orange", color: "white" }} onClick={() => editRecipe(i, r)}>
                Edit
              </button>
              <button style={{ flex: 1, background: "red", color: "white" }} onClick={() => deleteRecipe(i)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        <button style={{ width: "100%", marginTop: 10 }} onClick={() => setPage("add")}>
          + Add Recipe
        </button>
      </div>
    );
  }

  if (page === "cook") {
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
        <button style={{ width: "100%", marginTop: 10 }} onClick={() => setPage("recipes")}>
          Back to Recipes
        </button>
      </div>
    );
  }

  return <div>Unknown page</div>;
}
