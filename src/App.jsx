import React, { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

// ✅ FIX: worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.js",
  import.meta.url
).toString();

// ✅ Load Tesseract dynamically from CDN (fixes Vercel build error)
let Tesseract = null;
async function loadTesseract() {
  if (!Tesseract) {
    Tesseract = await import(
      /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/tesseract.min.js"
    );
  }
  return Tesseract;
}

export default function App() {
  const [page, setPage] = useState("home");
  const [recipes, setRecipes] = useState([]);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(false);

  const apiKey = import.meta.env.VITE_OPENAPI_KEY;

  // Load saved recipes
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("recipes") || "[]");
    setRecipes(stored);
  }, []);

  const saveRecipes = (newRecipes) => {
    setRecipes(newRecipes);
    localStorage.setItem("recipes", JSON.stringify(newRecipes));
  };

  // ✅ PDF IMPORT (PDF.js + OCR fallback)
  const handlePDFUpload = async (file) => {
    if (!file) return;

    setLoading(true);
    let fullText = "";

    try {
      // Try PDF text extraction first
      const typedArray = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument(typedArray).promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((t) => t.str).join(" ") + " ";
      }

      // Fallback to OCR if empty
      if (!fullText.trim()) {
        console.log("Using OCR fallback...");
        const tess = await loadTesseract();
        const { data } = await tess.recognize(file, "eng");
        fullText = data.text;
      }

      // Send to OpenAI
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
              content: `Extract a recipe into JSON:
{
"name": "Recipe Name",
"ingredients": ["ingredient 1 10g"],
"steps": ["Step 1"]
}
Text: ${fullText}`,
            },
          ],
        }),
      });

      const data = await response.json();
      const recipe = JSON.parse(data.choices[0].message.content);

      saveRecipes([...recipes, recipe]);
      alert("Recipe imported!");
    } catch (err) {
      console.error(err);
      alert("Failed to import recipe");
    }

    setLoading(false);
  };

  const deleteRecipe = (index) => {
    if (!confirm("Delete this recipe?")) return;
    const updated = recipes.filter((_, i) => i !== index);
    saveRecipes(updated);
  };

  const toggleTheme = () =>
    setTheme(theme === "light" ? "dark" : "light");

  const styles = {
    container: {
      padding: 20,
      minHeight: "100vh",
      background: theme === "dark" ? "#111" : "#f9f9f9",
      color: theme === "dark" ? "#fff" : "#000",
      fontFamily: "sans-serif",
    },
    button: {
      width: "100%",
      padding: "10px",
      margin: "10px 0",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
    },
    card: {
      background: theme === "dark" ? "#222" : "#fff",
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
      boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    },
  };

  // ------------------ HOME ------------------
  if (page === "home") {
    return (
      <div style={styles.container}>
        <h1>Cooking App</h1>
        <button style={styles.button} onClick={() => setPage("recipes")}>
          Recipes
        </button>
        <button style={styles.button} onClick={() => setPage("add")}>
          + Add Recipe
        </button>
        <button style={styles.button} onClick={toggleTheme}>
          Toggle Theme
        </button>
      </div>
    );
  }

  // ------------------ ADD ------------------
  if (page === "add") {
    return (
      <div style={styles.container}>
        <h1>Add Recipe</h1>
        <input type="file" onChange={(e) => handlePDFUpload(e.target.files[0])} />
        {loading && <p>Processing PDF...</p>}
        <button style={styles.button} onClick={() => setPage("home")}>
          Back
        </button>
      </div>
    );
  }

  // ------------------ RECIPES ------------------
  if (page === "recipes") {
    return (
      <div style={styles.container}>
        <h1>Saved Recipes</h1>

        {recipes.length === 0 && <p>No recipes yet</p>}

        {recipes.map((r, i) => (
          <div key={i} style={styles.card}>
            <h3>{r.name}</h3>

            <button
              style={{ ...styles.button, background: "green", color: "white" }}
              onClick={() => {
                setCurrentRecipe(r);
                setPage("cook");
              }}
            >
              Open
            </button>

            <button
              style={{ ...styles.button, background: "red", color: "white" }}
              onClick={() => deleteRecipe(i)}
            >
              Delete
            </button>
          </div>
        ))}

        <button style={styles.button} onClick={() => setPage("home")}>
          Back
        </button>
      </div>
    );
  }

  // ------------------ COOK ------------------
  if (page === "cook") {
    if (!currentRecipe) {
      return (
        <div style={styles.container}>
          <h1>Error loading recipe</h1>
          <button onClick={() => setPage("recipes")}>Back</button>
        </div>
      );
    }

    return (
      <div style={styles.container}>
        <h1>{currentRecipe.name}</h1>

        <h2>Ingredients</h2>
        <ul>
          {currentRecipe.ingredients?.map((i, idx) => (
            <li key={idx}>{i}</li>
          ))}
        </ul>

        <h2>Steps</h2>
        <ol>
          {currentRecipe.steps?.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
        </ol>

        <button style={styles.button} onClick={() => setPage("recipes")}>
          Back
        </button>
      </div>
    );
  }

  return <div>Unknown page</div>;
}
