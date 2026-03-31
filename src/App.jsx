import { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
import { useSwipeable } from "react-swipeable";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const beepUrl = "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg";

// ---------- Card ----------
function RecipeCard({ recipe, index, onOpen, onDelete, onEdit, styles }) {
  const swipe = useSwipeable({ onSwipedLeft: () => onDelete(index) });

  return (
    <div {...swipe} style={styles.card}>
      <div style={styles.recipeTitle}>{recipe.name}</div>
      <button style={styles.primaryButton} onClick={() => onOpen(index)}>
        Open Recipe
      </button>
      <div style={styles.row}>
        <button style={styles.edit} onClick={() => onEdit(index)}>✏️</button>
        <button style={styles.delete} onClick={() => onDelete(index)}>🗑</button>
      </div>
    </div>
  );
}

// ---------- App ----------
export default function App() {
  const [page, setPage] = useState("home");
  const [recipes, setRecipes] = useState(JSON.parse(localStorage.getItem("recipes") || "[]"));
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [newRecipe, setNewRecipe] = useState({ name: "", ingredients: [], steps: [] });
  const [editIndex, setEditIndex] = useState(null);
  const [apiKey, setApiKey] = useState(localStorage.getItem("key") || "");
  const [dark, setDark] = useState(false);
  const [toast, setToast] = useState("");
  const [timers, setTimers] = useState({});
  const [checked, setChecked] = useState({});

  const styles = getStyles(dark);

  useEffect(() => {
    localStorage.setItem("recipes", JSON.stringify(recipes));
    localStorage.setItem("key", apiKey);
  }, [recipes, apiKey]);

  useEffect(() => {
    if (toast) setTimeout(() => setToast(""), 2500);
  }, [toast]);

  // ---------- PDF ----------
  const handlePDF = (file) => {
    if (!file) return;
    if (!apiKey) return setToast("Enter API key");

    const reader = new FileReader();
    reader.onload = async function () {
      const pdf = await pdfjsLib.getDocument(new Uint8Array(this.result)).promise;
      let text = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const p = await pdf.getPage(i);
        const c = await p.getTextContent();
        text += c.items.map(x => x.str).join(" ");
      }

      callAI(text);
    };
    reader.readAsArrayBuffer(file);
  };

  const callAI = async (text) => {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Return ONLY JSON." },
            {
              role: "user",
              content: `Extract recipe JSON: { "name":"Recipe","ingredients":[{"name":"item","amount":"qty"}],"steps":[{"text":"step","time":0}] } TEXT: ${text}`
            }
          ]
        })
      });

      const data = await res.json();
      const match = data.choices?.[0]?.message?.content?.match(/\{[\s\S]*\}/);

      if (!match) throw new Error();

      const parsed = JSON.parse(match[0]);

      setNewRecipe(parsed);
      setPage("add");
      setToast("Imported ✅");
    } catch {
      setToast("Parse failed ❌");
    }
  };

  // ---------- Save ----------
  const saveRecipe = () => {
    if (!newRecipe.name) return setToast("Add name");

    if (editIndex !== null) {
      const copy = [...recipes];
      copy[editIndex] = newRecipe;
      setRecipes(copy);
      setEditIndex(null);
    } else {
      setRecipes([...recipes, newRecipe]);
    }

    setNewRecipe({ name: "", ingredients: [], steps: [] });
    setPage("recipes");
  };

  // ---------- Timer ----------
  const startTimer = (i, t) => {
    if (!t || timers[i]) return;

    const id = setInterval(() => {
      setTimers(prev => {
        const v = prev[i] - 1;
        if (v <= 0) {
          clearInterval(id);
          new Audio(beepUrl).play();
          const copy = { ...prev };
          delete copy[i];
          return copy;
        }
        return { ...prev, [i]: v };
      });
    }, 1000);

    setTimers(p => ({ ...p, [i]: t }));
  };

  // ---------- HOME ----------
  if (page === "home") {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Cooking App</h1>

        {toast && <div style={styles.toast}>{toast}</div>}

        <button style={styles.button} onClick={() => setPage("recipes")}>
          Recipes
        </button>

        <button style={styles.button} onClick={() => setPage("add")}>
          Add Recipe
        </button>

        <input
          style={styles.input}
          placeholder="OpenAI API Key"
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
        />

        <button style={styles.button} onClick={() => setDark(!dark)}>
          Toggle Theme
        </button>
      </div>
    );
  }

  // ---------- RECIPES ----------
  if (page === "recipes") {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Recipes</h1>

        {recipes.length === 0 && <p>No recipes yet</p>}

        {recipes.map((r, i) => (
          <RecipeCard
            key={i}
            recipe={r}
            index={i}
            onOpen={(i) => {
              setCurrentRecipe(recipes[i]);
              setPage("cook");
            }}
            onDelete={(i) => {
              setRecipes(recipes.filter((_, x) => x !== i));
            }}
            onEdit={(i) => {
              setNewRecipe(recipes[i]);
              setEditIndex(i);
              setPage("add");
            }}
            styles={styles}
          />
        ))}

        <button style={styles.button} onClick={() => setPage("home")}>
          Back
        </button>
      </div>
    );
  }

  // ---------- ADD ----------
  if (page === "add") {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Add Recipe</h1>

        <input
          style={styles.input}
          placeholder="Recipe name"
          value={newRecipe.name || ""}
          onChange={e => setNewRecipe({ ...newRecipe, name: e.target.value })}
        />

        <input type="file" accept="application/pdf" onChange={e => handlePDF(e.target.files[0])} />

        <button style={styles.button} onClick={saveRecipe}>
          Save
        </button>

        <button style={styles.button} onClick={() => setPage("home")}>
          Back
        </button>
      </div>
    );
  }

  // ---------- COOK ----------
  if (page === "cook" && currentRecipe) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>{currentRecipe.name}</h1>

        <h3>Ingredients</h3>
        {(currentRecipe.ingredients || []).map((ing, i) => (
          <div key={i}>
            <input
              type="checkbox"
              checked={checked[i] || false}
              onChange={() => setChecked({ ...checked, [i]: !checked[i] })}
            />
            {ing.name} {ing.amount || ""}
          </div>
        ))}

        <h3>Steps</h3>
        {(currentRecipe.steps || []).map((s, i) => (
          <div key={i} style={styles.step}>
            {s.text}
            {s.time > 0 && (
              <>
                <button onClick={() => startTimer(i, s.time)}>Start</button>
                {timers[i] && <span> ⏱ {timers[i]}</span>}
              </>
            )}
          </div>
        ))}

        <button style={styles.button} onClick={() => setPage("recipes")}>
          Back
        </button>
      </div>
    );
  }

  return <div>Loading...</div>;
}

// ---------- Styles ----------
const getStyles = (dark) => ({
  container: {
    maxWidth: "500px",
    margin: "auto",
    padding: "20px",
    fontFamily: "sans-serif",
    background: dark ? "#111" : "#fff",
    color: dark ? "#fff" : "#000",
    minHeight: "100vh"
  },
  title: { textAlign: "center" },
  card: {
    background: dark ? "#222" : "#f5f5f5",
    padding: "15px",
    borderRadius: "12px",
    marginBottom: "15px"
  },
  recipeTitle: { textAlign: "center", marginBottom: "10px" },
  primaryButton: { width: "100%", padding: "10px", marginBottom: "10px" },
  row: { display: "flex", gap: "10px" },
  edit: { flex: 1 },
  delete: { flex: 1 },
  button: { width: "100%", padding: "10px", marginTop: "10px" },
  input: { width: "100%", padding: "10px", marginTop: "10px" },
  toast: { background: "green", color: "white", padding: "10px", marginBottom: "10px" },
  step: { marginBottom: "10px", padding: "10px", borderRadius: "8px", background: dark ? "#333" : "#eee" }
});
