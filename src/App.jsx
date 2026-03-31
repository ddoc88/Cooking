import React, { useState, useEffect } from "react";

export default function App() {
  const [page, setPage] = useState("home"); // home, recipes, cook, add
  const [theme, setTheme] = useState("light");
  const [recipes, setRecipes] = useState([]);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [pdfURL, setPdfURL] = useState("");

  const apiKey = import.meta.env.VITE_OPENAPI_KEY; // Vercel environment variable

  // Load recipes from localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("recipes") || "[]");
    setRecipes(stored);
  }, []);

  const saveRecipes = (newRecipes) => {
    setRecipes(newRecipes);
    localStorage.setItem("recipes", JSON.stringify(newRecipes));
  };

  // Handle PDF URL import
  const handlePDFUrl = async (url) => {
    if (!url) return alert("Enter a PDF URL");

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const text = await pdfToText(arrayBuffer);

      // Call OpenAI API
      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
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
Text: ${text}`
            }
          ]
        }),
      });
      const data = await aiResponse.json();
      const recipe = JSON.parse(data.choices[0].message.content);

      saveRecipes([...recipes, recipe]);
      alert("Recipe imported!");
      setPage("recipes");
      setPdfURL("");
    } catch (err) {
      console.error("PDF/AI error:", err);
      alert("Failed to import recipe");
    }
  };

  // Simple text extraction from PDF ArrayBuffer (without worker)
  const pdfToText = async (arrayBuffer) => {
    const pdfjsLib = await import("pdfjs-dist/build/pdf");
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((t) => t.str).join(" ") + " ";
    }
    return fullText;
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

  // --- Page Render ---
  if (page === "home") {
    return (
      <div style={{
        padding: 20,
        fontFamily: "sans-serif",
        background: theme === "dark" ? "#111" : "#f9f9f9",
        minHeight: "100vh"
      }}>
        <h1 style={{ textAlign: "center" }}>Cooking App</h1>
        <button onClick={() => setPage("recipes")} style={buttonStyle}>📖 Recipes</button>
        <button onClick={() => setPage("add")} style={buttonStyle}>➕ Add Recipe</button>
        <button onClick={toggleTheme} style={buttonStyle}>🌓 Toggle Theme</button>
      </div>
    );
  }

  if (page === "add") {
    return (
      <div style={{ padding: 20 }}>
        <h1>Add Recipe</h1>
        <input
          type="text"
          placeholder="Recipe Name"
          id="recipeName"
          style={{ width: "100%", marginBottom: 10 }}
        />
        <input
          type="text"
          placeholder="Enter PDF URL"
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
      <div style={{ padding: 20 }}>
        <h1>Saved Recipes</h1>
        {recipes.map((r, i) => (
          <div key={i} style={{ border: "1px solid #ccc", margin: "10px 0", borderRadius: 10, padding: 10 }}>
            <h2>{r.name}</h2>
            <button style={{ ...buttonStyle, background: "green" }} onClick={() => { setCurrentRecipe(r); setPage("cook"); }}>Open Recipe</button>
            <button style={{ ...buttonStyle, background: "orange", marginTop: 5 }} onClick={() => editRecipe(i,r)}>Edit</button>
            <button style={{ ...buttonStyle, background: "red", marginTop: 5 }} onClick={() => deleteRecipe(i)}>Delete</button>
          </div>
        ))}
        <button onClick={() => setPage("add")} style={buttonStyle}>+ Add Recipe</button>
        <button onClick={() => setPage("home")} style={buttonStyle}>Back Home</button>
      </div>
    );
  }

  if (page === "cook") {
    return (
      <div style={{ padding: 20 }}>
        <h1>{currentRecipe.name}</h1>
        <h2>Ingredients</h2>
        <ul>
          {currentRecipe.ingredients.map((i, idx) => <li key={idx}>{i}</li>)}
        </ul>
        <h2>Steps</h2>
        <ol>
          {currentRecipe.steps.map((s, idx) => <li key={idx}>{s}</li>)}
        </ol>
        <button style={buttonStyle} onClick={() => setPage("recipes")}>Back</button>
      </div>
    );
  }

  return <div>Unknown page</div>;
}

// --- Styles ---
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
