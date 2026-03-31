import React, { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import { GlobalWorkerOptions } from "pdfjs-dist";
import Tesseract from "tesseract.js";

// Set up PDF.js worker for Vite
GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.js",
  import.meta.url
).toString();

export default function App() {
  const [page, setPage] = useState("home"); // home, recipes, cook, add
  const [theme, setTheme] = useState("light");
  const [recipes, setRecipes] = useState([]);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfLink, setPdfLink] = useState("");

  // Use Vercel environment variable for API key
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

  // PDF File Upload Handler
  const handlePDFUpload = async (file) => {
    setPdfFile(file);
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

      extractRecipeFromText(fullText);
    };
    reader.readAsArrayBuffer(file);
  };

  // PDF Link Handler (OCR with Tesseract)
  const handlePDFLink = async (link) => {
    try {
      const response = await fetch(link);
      const arrayBuffer = await response.arrayBuffer();
      const worker = await Tesseract.createWorker({ logger: (m) => console.log(m) });
      await worker.load();
      await worker.loadLanguage("eng");
      await worker.initialize("eng");
      const { data } = await worker.recognize(arrayBuffer);
      await worker.terminate();

      extractRecipeFromText(data.text);
    } catch (err) {
      console.error("PDF OCR error:", err);
      alert("Failed to read PDF from link.");
    }
  };

  // Extract recipe using OpenAI
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
              content: `Extract a recipe from this text into JSON:
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
    } catch (err) {
      console.error("PDF/AI error:", err);
      alert("Failed to import recipe.");
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

  // ------------------- Pages -------------------
  if (page === "home") {
    return (
      <div
        style={{
          padding: "20px",
          fontFamily: "sans-serif",
          background: theme === "dark" ? "#111" : "#f9f9f9",
          minHeight: "100vh",
        }}
      >
        <h1>Cooking App</h1>
        <button onClick={() => setPage("recipes")} style={{ display: "block", margin: "10px 0", width: "100%" }}>
          Recipes
        </button>
        <button onClick={() => setPage("add")} style={{ display: "block", margin: "10px 0", width: "100%" }}>
          + Add Recipe
        </button>
        <input
          type="password"
          placeholder="OpenAI API Key"
          defaultValue={apiKey || ""}
          style={{ width: "100%", marginTop: "10px" }}
          onChange={(e) => console.log("API Key changed locally, update .env on Vercel")}
        />
        <button onClick={toggleTheme} style={{ display: "block", margin: "10px 0", width: "100%" }}>
          Toggle Theme
        </button>
      </div>
    );
  }

  if (page === "add") {
    return (
      <div style={{ padding: "20px" }}>
        <h1>Add Recipe</h1>
        <input type="text" placeholder="Recipe Name" style={{ width: "100%", marginBottom: "10px" }} />
        <input type="file" onChange={(e) => handlePDFUpload(e.target.files[0])} />
        <input
          type="text"
          placeholder="Paste PDF URL (HelloFresh style)"
          style={{ width: "100%", marginTop: "10px" }}
          value={pdfLink}
          onChange={(e) => setPdfLink(e.target.value)}
        />
        <button style={{ display: "block", marginTop: "10px" }} onClick={() => handlePDFLink(pdfLink)}>
          Import from Link
        </button>
        <button style={{ display: "block", marginTop: "10px" }} onClick={() => setPage("home")}>
          Back
        </button>
      </div>
    );
  }

  if (page === "recipes") {
    return (
      <div style={{ padding: "20px" }}>
        <h1>Saved Recipes</h1>
        {recipes.map((r, i) => (
          <div key={i} style={{ border: "1px solid #ccc", margin: "10px 0", borderRadius: "10px", padding: "10px" }}>
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
            <button style={{ background: "orange", color: "white", marginTop: "5px", width: "49%" }} onClick={() => editRecipe(i, r)}>
              Edit
            </button>
            <button style={{ background: "red", color: "white", marginTop: "5px", width: "49%" }} onClick={() => deleteRecipe(i)}>
              Delete
            </button>
          </div>
        ))}
        <button onClick={() => setPage("add")} style={{ display: "block", margin: "10px 0", width: "100%" }}>
          + Add Recipe
        </button>
      </div>
    );
  }

  if (page === "cook") {
    return (
      <div style={{ padding: "20px" }}>
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
