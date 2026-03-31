import React, { useState, useEffect } from "react";
import recipesData from "./recipes.json";

export default function App() {
  const [page, setPage] = useState("home");
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [theme, setTheme] = useState("light");

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
      padding: "12px",
      margin: "10px 0",
      borderRadius: "10px",
      border: "none",
      cursor: "pointer",
      fontSize: "16px",
    },
    card: {
      background: theme === "dark" ? "#222" : "#fff",
      padding: 15,
      borderRadius: 12,
      marginBottom: 10,
      boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    },
  };

  // ---------------- HOME ----------------
  if (page === "home") {
    return (
      <div style={styles.container}>
        <h1>Cooking App</h1>

        <button style={styles.button} onClick={() => setPage("recipes")}>
          Recipes
        </button>

        <button style={styles.button} onClick={toggleTheme}>
          Toggle Theme
        </button>
      </div>
    );
  }

  // ---------------- RECIPES ----------------
  if (page === "recipes") {
    return (
      <div style={styles.container}>
        <h1>Recipes</h1>

        {recipesData.map((r, i) => (
          <div key={i} style={styles.card}>
            <h3>{r.name}</h3>

            <button
              style={{ ...styles.button, background: "green", color: "white" }}
              onClick={() => {
                setCurrentRecipe(r);
                setPage("cook");
              }}
            >
              Open Recipe
            </button>
          </div>
        ))}

        <button style={styles.button} onClick={() => setPage("home")}>
          Back
        </button>
      </div>
    );
  }

  // ---------------- COOK VIEW ----------------
  if (page === "cook") {
    if (!currentRecipe) {
      return (
        <div style={styles.container}>
          <h1>Error</h1>
          <button onClick={() => setPage("recipes")}>Back</button>
        </div>
      );
    }

    return (
      <div style={{ ...styles.container, padding: 0 }}>
        <div style={{ padding: 10 }}>
          <button onClick={() => setPage("recipes")}>← Back</button>
          <h2 style={{ textAlign: "center" }}>{currentRecipe.name}</h2>
        </div>

        {/* FULL SCREEN PDF */}
        <iframe
          src={currentRecipe.path}
          title={currentRecipe.name}
          style={{
            width: "100%",
            height: "90vh",
            border: "none",
          }}
        />
      </div>
    );
  }

  return <div>Unknown page</div>;
}
