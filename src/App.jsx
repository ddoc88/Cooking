import React, { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

// Vite PDF.js worker
/* @vite-ignore */
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.js",
  import.meta.url
).toString();

export default function App() {
  const [page, setPage] = useState("home"); // home, recipes, cook, add
  const [theme, setTheme] = useState("light");
  const [recipes, setRecipes] = useState([]);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [pdfLink, setPdfLink] = useState("");

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

  // ---------- PDF Upload ----------
  const handlePDFUpload = async (file) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const pageObj = await pdf.getPage(i);
          const textContent = await pageObj.getTextContent();
          fullText += textContent.items.map((t) => t.str).join(" ") + " ";
        }
        extractRecipeFromText(fullText);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("PDF upload error:", err);
      alert("Failed to read PDF.");
    }
  };

  // ---------- PDF Link OCR ----------
  const handlePDFLink = async (link) => {
    try {
      const response = await fetch(link);
      const arrayBuffer = await response.arrayBuffer();

      // Use global Tesseract from CDN
      const worker = Tesseract.createWorker({ logger: (m) => console.log(m) });
      await worker.load();
      await worker.loadLanguage("eng");
      await worker.initialize("eng");
      const { data } = await worker.recognize(arrayBuffer);
      await worker.terminate();

      extractRecipeFromText(data.text);
    } catch (err) {
      console.error("PDF OCR error:", err);
      alert("Failed to read PDF from link. Make sure it is a direct PDF URL.");
    }
  };

  // ---------- OpenAI Recipe Extraction ----------
  const extractRecipeFromText = async (text) => {
    try {
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
Text: ${text}`,
            },
          ],
        }),
      });
      const data = await response.json();
      const recipe = JSON.parse(data.choices[0].message.content);
      saveRecipes([...recipes, recipe]);
      alert("Recipe imported!");
      setPage("recipes");
    } catch (err) {
      console.error("Recipe parsing error:", err);
      alert("Failed to import recipe.");
    }
  };

  const deleteRecipe = (index) => {
    const newRecipes = recipes.filter((_, i) => i !== index);
    saveRecipes(newRecipes);
  };

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const buttonStyle = { display: "block", margin: "10px 0", width: "100%", padding: 10 };

  // ---------------- Pages ----------------
  if (page === "home") {
    return (
      <div style={{ padding: 20, fontFamily: "sans-serif", background: theme === "dark" ? "#111" : "#f9f9f9", minHeight: "100vh" }}>
        <h1>Cooking App</h1>
        <button style={buttonStyle} onClick={() => setPage("recipes")}>Recipes</button>
        <button style={buttonStyle} onClick={() => setPage("add")}>+ Add Recipe</button>
        <button style={buttonStyle} onClick={toggleTheme}>Toggle Theme</button>
      </div>
    );
  }

  if (page === "add") {
    return (
      <div style={{ padding: 20 }}>
        <h1>Add Recipe</h1>
        <input type="file" onChange={(e) => handlePDFUpload(e.target.files[0])} />
        <input
          type="text"
          placeholder="Or paste PDF link"
          value={pdfLink}
          onChange={(e) => setPdfLink(e.target.value)}
          style={{ width: "100%", marginTop: 10 }}
        />
        <button style={buttonStyle} onClick={() => handlePDFLink(pdfLink)}>Import from Link</button>
        <button style={buttonStyle} onClick={() => setPage("home")}>Back</button>
      </div>
    );
  }

  if (page === "recipes") {
    return (
      <div style={{ padding: 20 }}>
        <h1>Saved Recipes</h1>
        {recipes.map((r, i) => (
          <div key={i} style={{ border: "1px solid #ccc", margin: "10px 0", borderRadius: 10, padding: 10 }}>
            <h2>{r.name}</h2>
            <button style={{ background: "green", color: "white", width: "100%" }} onClick={() => { setCurrentRecipe(r); setPage("cook"); }}>Open Recipe</button>
            <button style={{ background: "red", color: "white", width: "100%", marginTop: 5 }} onClick={() => deleteRecipe(i)}>Delete</button>
          </div>
        ))}
        <button style={buttonStyle} onClick={() => setPage("add")}>+ Add Recipe</button>
      </div>
    );
  }

  if (page === "cook") {
    return (
      <div style={{ padding: 20 }}>
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
