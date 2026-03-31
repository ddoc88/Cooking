import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";
import { useSwipeable } from "react-swipeable";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function App() {
  // Theme toggle
  const [dark, setDark] = useState(false);

  // Pages
  const [page, setPage] = useState("home");

  // Recipes
  const [recipes, setRecipes] = useState(() => {
    const saved = localStorage.getItem("recipes");
    return saved ? JSON.parse(saved) : [];
  });

  const [currentRecipe, setCurrentRecipe] = useState(null);

  // Fullscreen cooking mode
  const [fullscreen, setFullscreen] = useState(false);

  // Timer refs
  const timerRefs = useRef({});

  // Checked ingredients
  const [checkedIngredients, setCheckedIngredients] = useState({});

  // Meal plan (optional)
  const [mealPlan, setMealPlan] = useState({});

  // PDF / new recipe
  const [newRecipeName, setNewRecipeName] = useState("");
  const [newRecipeFile, setNewRecipeFile] = useState(null);

  // Favorite
  const toggleFavorite = (i) => {
    const updated = [...recipes];
    updated[i].favorite = !updated[i].favorite;
    setRecipes(updated);
    localStorage.setItem("recipes", JSON.stringify(updated));
  };

  // Delete recipe
  const deleteRecipe = (i) => {
    const updated = [...recipes];
    updated.splice(i, 1);
    setRecipes(updated);
    localStorage.setItem("recipes", JSON.stringify(updated));
  };

  // Edit recipe
  const editRecipe = (i) => {
    const recipe = recipes[i];
    setNewRecipeName(recipe.name);
    setPage("add");
    setCurrentRecipe(recipe);
  };

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: (ev) => {
      if (ev.event.target.dataset.index) deleteRecipe(ev.event.target.dataset.index);
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  // OpenAI API Key (set in Vercel environment variable VITE_OPENAI_KEY)
  const apiKey = import.meta.env.VITE_OPENAI_KEY;

  // Import PDF recipe
  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function () {
      const typedArray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument(typedArray).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item) => item.str);
        fullText += strings.join(" ") + " ";
      }

      // Call OpenAI to parse ingredients/steps
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "user",
                content: `
Extract a recipe from this text:

${fullText}

Return ONLY JSON in this format:
{
"name": "Recipe Name",
"ingredients": ["ingredient 1", "ingredient 2"],
"steps": [{"text":"step 1","time":0},{"text":"step 2","time":0}]
}
`,
              },
            ],
          }),
        });
        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);

        const updatedRecipes = [...recipes, parsed];
        setRecipes(updatedRecipes);
        localStorage.setItem("recipes", JSON.stringify(updatedRecipes));
        alert("Recipe imported successfully!");
      } catch (err) {
        console.error("PDF/AI error:", err);
        alert("Failed to import recipe. Check console.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Save new recipe manually
  const saveRecipe = () => {
    if (!newRecipeName) return;
    const newR = currentRecipe
      ? { ...currentRecipe, name: newRecipeName }
      : { name: newRecipeName, ingredients: [], steps: [] };
    const updated = currentRecipe
      ? recipes.map((r) => (r === currentRecipe ? newR : r))
      : [...recipes, newR];
    setRecipes(updated);
    localStorage.setItem("recipes", JSON.stringify(updated));
    setPage("recipes");
    setCurrentRecipe(null);
    setNewRecipeName("");
  };

  const startTimer = (stepIndex, duration) => {
    clearTimeout(timerRefs.current[stepIndex]);
    timerRefs.current[stepIndex] = setTimeout(() => alert(`Step ${stepIndex + 1} done!`), duration);
  };

  // Toggle ingredient
  const toggleIngredient = (i) => {
    setCheckedIngredients({ ...checkedIngredients, [i]: !checkedIngredients[i] });
  };

  // Save theme
  useEffect(() => {
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // Load theme
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) setDark(saved === "dark");
  }, []);

  const styles = {
    container: {
      padding: 10,
      fontFamily: "sans-serif",
      background: dark ? "#1e1e1e" : "#f8f8f8",
      color: dark ? "white" : "#111",
      minHeight: "100vh",
    },
    button: { margin: 5, padding: 10, background: "green", color: "white", border: "none", borderRadius: 5 },
    input: { width: "100%", padding: 8, margin: 5 },
    recipeCard: {
      margin: 10,
      padding: 10,
      background: dark ? "#333" : "#fff",
      borderRadius: 10,
      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
    },
    ingredient: { display: "block", marginBottom: 5 },
  };

  // --- PAGE RENDERING ---
  if (page === "home")
    return (
      <div style={styles.container}>
        <h1>Cooking App</h1>
        <button style={styles.button} onClick={() => setPage("recipes")}>
          Recipes
        </button>
        <button style={styles.button} onClick={() => setPage("add")}>
          Add Recipe
        </button>
        <button style={styles.button} onClick={() => setDark(!dark)}>
          Toggle Theme
        </button>
      </div>
    );

  if (page === "recipes")
    return (
      <div style={styles.container}>
        <h2>Saved Recipes</h2>
        {recipes.map((r, i) => (
          <div key={i} style={styles.recipeCard} {...swipeHandlers} data-index={i}>
            <h3>{r.name}</h3>
            <button style={styles.button} onClick={() => { setCurrentRecipe(r); setPage("cook"); }}>
              Open Recipe
            </button>
            <button style={{ ...styles.button, background: "orange" }} onClick={() => editRecipe(i)}>
              Edit
            </button>
            <button style={{ ...styles.button, background: "red" }} onClick={() => deleteRecipe(i)}>
              Delete
            </button>
            <button style={{ ...styles.button, background: r.favorite ? "gold" : "gray" }} onClick={() => toggleFavorite(i)}>
              ☆
            </button>
          </div>
        ))}
      </div>
    );

  if (page === "add")
    return (
      <div style={styles.container}>
        <h2>Add Recipe</h2>
        <input style={styles.input} placeholder="Recipe Name" value={newRecipeName} onChange={(e) => setNewRecipeName(e.target.value)} />
        <input type="file" onChange={handlePDFUpload} />
        <button style={styles.button} onClick={saveRecipe}>
          Save
        </button>
        <button style={styles.button} onClick={() => setPage("home")}>
          Back
        </button>
      </div>
    );

  if (page === "cook" && currentRecipe)
    return (
      <div style={styles.container}>
        <h2>{currentRecipe.name}</h2>
        <h3>Ingredients</h3>
        {currentRecipe.ingredients.map((ing, i) => (
          <label key={i} style={styles.ingredient}>
            <input type="checkbox" checked={checkedIngredients[i] || false} onChange={() => toggleIngredient(i)} /> {ing}
          </label>
        ))}
        <h3>Steps</h3>
        {currentRecipe.steps.map((s, i) => (
          <div key={i}>
            <p>{s.text}</p>
            <button onClick={() => startTimer(i, s.time)}>Start Timer</button>
          </div>
        ))}
        <button style={styles.button} onClick={() => setPage("recipes")}>
          Back
        </button>
      </div>
    );

  return <div style={styles.container}>Unknown Page</div>;
}
