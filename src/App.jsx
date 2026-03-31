import React, { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.entry";
import Tesseract from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function App() {
  const [page, setPage] = useState("home"); // home, recipes, cook, add
  const [theme, setTheme] = useState("light");
  const [recipes, setRecipes] = useState([]);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [pdfURL, setPdfURL] = useState("");
  const apiKey = import.meta.env.VITE_OPENAPI_KEY;

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("recipes") || "[]");
    setRecipes(stored);
  }, []);

  const saveRecipes = (newRecipes) => {
    setRecipes(newRecipes);
    localStorage.setItem("recipes", JSON.stringify(newRecipes));
  };

  // ---------- PDF OCR + OpenAI recipe extraction ----------
  const handlePDFUrl = async (url) => {
    if (!url) return alert("Enter a PDF URL");

    try {
      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const pageObj = await pdf.getPage(i);
        const viewport = pageObj.getViewport({ scale: 2 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await pageObj.render({ canvasContext: context, viewport }).promise;

        const { data: { text } } = await Tesseract.recognize(canvas, 'eng', {
          logger: m => console.log(m) // shows progress
        });

        fullText += text + "\n";
      }

      // Send OCR text to OpenAI for recipe extraction
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "user",
              content: `Extract a recipe from this text into JSON:
{
"name": "Recipe Name",
"ingredients": ["ingredient 1 10g", "ingredient 2 200ml"],
"steps": ["Step 1", "Step 2 with time in seconds like 120s"]
}
Text: ${fullText}`
            }
          ]
        })
      });

      const data = await response.json();
      const recipe = JSON.parse(data.choices[0].message.content);
      saveRecipes([...recipes, recipe]);
      alert("Recipe imported successfully!");
      setPdfURL("");
      setPage("recipes");

    } catch (err) {
      console.error("OCR/PDF error:", err);
      alert("Failed to import recipe. Make sure the PDF URL is direct and accessible.");
    }
  };

  const deleteRecipe = (index) => {
    const newRecipes = recipes.filter((_, i) => i !== index);
    saveRecipes(newRecipes);
  };

  const editRecipe = (index, updated) => {
    const newRecipes = [...recipes];
    newRecipes[index] = updated;
    saveRecipes(newRecipes);
  };

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const buttonStyle = {
    display: "block",
    margin: "10px 0",
    width: "100%",
    padding: 10,
    fontSize: 16,
    borderRadius: 6,
    border: "none",
    cursor: "pointer"
  };

  const containerStyle = {
    padding: 20,
    fontFamily: "sans-serif",
    background: theme === "dark" ? "#111" : "#f9f9f9",
    color: theme === "dark" ? "#fff" : "#111",
    minHeight: "100vh",
    maxWidth: 600,
    margin: "0 auto"
  };

  // ---------- Page Render ----------
  if (page === "home") {
    return (
      <div style={containerStyle}>
        <h1 style={{ textAlign: "center" }}>Cooking App</h1>
        <button style={buttonStyle} onClick={() => setPage("recipes")}>📖 Recipes</button>
        <button style={buttonStyle} onClick={() => setPage("add")}>➕ Add Recipe</button>
        <button style={buttonStyle} onClick={toggleTheme}>🌓 Toggle Theme</button>
      </div>
    );
  }

  if (page === "add") {
    return (
      <div style={containerStyle}>
        <h1>Add Recipe</h1>
        <input
          type="text"
          placeholder="Recipe Name (optional)"
          style={{ width: "100%", marginBottom: 10 }}
        />
        <input
          type="text"
          placeholder="Enter direct PDF URL"
          value={pdfURL}
          onChange={(e) => setPdfURL(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />
        <button style={buttonStyle} onClick={() => handlePDFUrl(pdfURL)}>Import PDF</button>
        <button style={buttonStyle} onClick={() => setPage("home")}>Back</button>
      </div>
    );
  }

  if (page === "recipes") {
    return (
      <div style={containerStyle}>
        <h1>Saved Recipes</h1>
        {recipes.map((r, i) => (
          <div key={i} style={{ border: "1px solid #ccc", borderRadius: 10, padding: 10, margin: "10px 0" }}>
            <h2>{r.name}</h2>
            <button style={{ ...buttonStyle, background: "green" }} onClick={() => { setCurrentRecipe(r); setPage("cook"); }}>Open Recipe</button>
            <button style={{ ...buttonStyle, background: "orange", marginTop: 5 }} onClick={() => editRecipe(i,r)}>Edit</button>
            <button style={{ ...buttonStyle, background: "red", marginTop: 5 }} onClick={() => deleteRecipe(i)}>Delete</button>
          </div>
        ))}
        <button style={buttonStyle} onClick={() => setPage("add")}>+ Add Recipe</button>
        <button style={buttonStyle} onClick={() => setPage("home")}>Back Home</button>
      </div>
    );
  }

  if (page === "cook") {
    return (
      <div style={containerStyle}>
        <h1>{currentRecipe.name}</h1>
        <h2>Ingredients</h2>
        <ul>{currentRecipe.ingredients.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
        <h2>Steps</h2>
        <ol>{currentRecipe.steps.map((s, idx) => <li key={idx}>{s}</li>)}</ol>
        <button style={buttonStyle} onClick={() => setPage("recipes")}>Back</button>
      </div>
    );
  }

  return <div>Unknown page</div>;
}
