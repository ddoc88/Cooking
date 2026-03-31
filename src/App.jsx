import React, { useState, useEffect } from "react";

// Main App
export default function App() {
  const [page, setPage] = useState("home"); // home, recipes, cook
  const [theme, setTheme] = useState("light");
  const [recipes, setRecipes] = useState([]);
  const [currentRecipe, setCurrentRecipe] = useState(null);

  // Load recipes from generated JSON
  useEffect(() => {
    import("./recipes.json")
      .then((mod) => setRecipes(mod.default))
      .catch((err) => console.error("Failed to load recipes.json", err));
  }, []);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const containerStyle = {
    padding: "20px",
    fontFamily: "sans-serif",
    background: theme === "dark" ? "#111" : "#f9f9f9",
    minHeight: "100vh",
    color: theme === "dark" ? "#eee" : "#111",
  };

  const buttonStyle = {
    display: "block",
    margin: "10px 0",
    width: "100%",
    padding: "10px",
    fontSize: "16px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  };

  const cardStyle = {
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "15px",
    margin: "10px 0",
    background: theme === "dark" ? "#222" : "#fff",
  };

  // --- Pages ---
  if (page === "home") {
    return (
      <div style={containerStyle}>
        <h1>Cooking App</h1>
        <button
          style={{ ...buttonStyle, background: "#4CAF50", color: "white" }}
          onClick={() => setPage("recipes")}
        >
          Recipes
        </button>
        <button
          style={{ ...buttonStyle, background: "#2196F3", color: "white" }}
          onClick={() => setPage("add")}
        >
          + Add Recipe (for future upload)
        </button>
        <button
          style={{ ...buttonStyle, background: "#555", color: "white" }}
          onClick={toggleTheme}
        >
          Toggle Theme
        </button>
      </div>
    );
  }

  if (page === "recipes") {
    return (
      <div style={containerStyle}>
        <h1>Saved Recipes</h1>
        <button
          style={{ ...buttonStyle, background: "#777", color: "white" }}
          onClick={() => setPage("home")}
        >
          ← Back
        </button>

        {recipes.length === 0 && <p>No recipes found.</p>}

        {recipes.map((r, i) => (
          <div key={i} style={cardStyle}>
            <h2>{r.name}</h2>
            <button
              style={{ ...buttonStyle, background: "#4CAF50", color: "white" }}
              onClick={() => {
                setCurrentRecipe(r);
                setPage("cook");
              }}
            >
              Open Recipe
            </button>
          </div>
        ))}
      </div>
    );
  }

  if (page === "cook") {
    return (
      <div style={containerStyle}>
        <h1>{currentRecipe.name}</h1>
        <button
          style={{ ...buttonStyle, background: "#777", color: "white" }}
          onClick={() => setPage("recipes")}
        >
          ← Back
        </button>

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

        <button
          style={{ ...buttonStyle, background: "#4CAF50", color: "white" }}
          onClick={() => alert("Full-screen cook mode coming soon!")}
        >
          Full Screen Cook Mode
        </button>
      </div>
    );
  }

  if (page === "add") {
    return (
      <div style={containerStyle}>
        <h1>Add Recipe</h1>
        <p>
          For now, recipes are automatically loaded from the <code>recipes.json</code> file. 
          You can add PDFs to the <code>recipes/</code> folder and regenerate JSON.
        </p>
        <button
          style={{ ...buttonStyle, background: "#777", color: "white" }}
          onClick={() => setPage("home")}
        >
          ← Back
        </button>
      </div>
    );
  }

  return <div style={containerStyle}>Unknown page</div>;
}
