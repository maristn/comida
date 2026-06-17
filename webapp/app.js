const STORAGE_KEY = "comida.items";
const RECIPES_STORAGE_KEY = "comida.recipes";
const IGNORED_INGREDIENTS = new Set(["water", "água", "agua"]);

// ── utils ──────────────────────────────────────────────────────────────────

function normalize(s) {
  return s.trim().toLowerCase();
}

// "3 eggs" → {qty: 3, base: "eggs"} | "eggs" → {qty: null, base: "eggs"}
function parseQtyAndBase(text) {
  const n = normalize(text);
  const m = n.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (m) return { qty: parseFloat(m[1].replace(",", ".")), base: m[2] };
  return { qty: null, base: n };
}

// Migrate old items that had qty in the name ("10 eggs" → name:"eggs" qty:"10")
function migrateItem(item) {
  if (item.qty !== undefined) return item;
  const { qty, base } = parseQtyAndBase(item.name);
  return { ...item, name: qty !== null ? base : item.name, qty: qty !== null ? String(qty) : "" };
}

// Sum two qty strings; returns null if either is empty or non-numeric
function sumQty(a, b) {
  if (!a || !b) return null;
  const na = parseFloat(a), nb = parseFloat(b);
  if (isNaN(na) || isNaN(nb)) return null;
  const total = na + nb;
  return Number.isInteger(total) ? String(total) : total.toFixed(1);
}

// ── storage ────────────────────────────────────────────────────────────────

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw).map(migrateItem) : [];
  } catch { return []; }
}

function saveItems(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function loadRecipes() {
  try {
    const raw = localStorage.getItem(RECIPES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecipes(arr) {
  localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(arr));
}

let items = loadItems();
let recipes = loadRecipes();

// ── DOM refs ───────────────────────────────────────────────────────────────

const toBuyList        = document.getElementById("to-buy-list");
const pantryList       = document.getElementById("pantry-list");
const toBuyEmpty       = document.getElementById("to-buy-empty");
const pantryEmpty      = document.getElementById("pantry-empty");
const addForm          = document.getElementById("add-form");
const newItemQtyInput  = document.getElementById("new-item-qty");
const newItemInput     = document.getElementById("new-item-input");
const addPantryForm    = document.getElementById("add-pantry-form");
const newPantryQtyInput= document.getElementById("new-pantry-qty");
const newPantryInput   = document.getElementById("new-pantry-input");
const recipesList      = document.getElementById("recipes-list");
const recipesEmpty     = document.getElementById("recipes-empty");
const addRecipeForm    = document.getElementById("add-recipe-form");
const recipeNameInput  = document.getElementById("recipe-name-input");
const recipeIngredientsInput = document.getElementById("recipe-ingredients-input");
const tabButtons       = document.querySelectorAll(".tab-button");
const pages            = document.querySelectorAll(".page");

// ── matching ───────────────────────────────────────────────────────────────

function getPantryItems() {
  return items.filter(i => i.status === "inPantry");
}

// Match recipe ingredient text (may contain qty: "3 eggs") against a pantry item
function ingredientMatchesPantryItem(ingText, pantryItem) {
  const ingBase  = parseQtyAndBase(ingText).base;
  const itemBase = normalize(pantryItem.name); // name is already base after migration
  return ingBase === itemBase || itemBase.includes(ingBase);
}

function ingredientInPantry(ingText, pantryItems) {
  return pantryItems.some(p => ingredientMatchesPantryItem(ingText, p));
}

// Find an existing item by name (exact, post-migration names are already bases)
function findMatchingItem(name, searchItems) {
  const norm = normalize(name);
  return searchItems.find(i => normalize(i.name) === norm) || null;
}

// ── render ─────────────────────────────────────────────────────────────────

function render() {
  const toBuy  = items.filter(i => i.status === "toBuy");
  const pantry = items.filter(i => i.status === "inPantry");
  renderList(toBuyList, toBuy);
  renderList(pantryList, pantry);
  toBuyEmpty.style.display  = toBuy.length  ? "none" : "block";
  pantryEmpty.style.display = pantry.length ? "none" : "block";
  renderRecipes();
}

function renderList(listEl, listItems) {
  listEl.innerHTML = "";
  for (const item of listItems) {
    const li = document.createElement("li");
    li.className = "item-row" + (item.status === "inPantry" ? " in-pantry" : "");

    const toggle = document.createElement("button");
    toggle.className = "toggle";
    toggle.type = "button";
    toggle.textContent = item.status === "inPantry" ? "✓" : "";
    toggle.addEventListener("click", () => toggleStatus(item.id));

    const mid = document.createElement("span");
    mid.className = "item-mid";

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = item.name;
    mid.appendChild(name);

    if (item.qty) {
      const badge = document.createElement("span");
      badge.className = "qty-badge";
      badge.textContent = item.qty;
      mid.appendChild(badge);
    }

    const del = document.createElement("button");
    del.className = "delete";
    del.type = "button";
    del.textContent = "×";
    del.addEventListener("click", () => deleteItem(item.id));

    li.append(toggle, mid, del);
    listEl.appendChild(li);
  }
}

function renderRecipes() {
  const pantryItems = getPantryItems();

  const withStatus = recipes.map(recipe => {
    const missing = recipe.ingredients.filter(ing => !ingredientInPantry(ing, pantryItems));
    return { recipe, missing };
  });
  withStatus.sort((a, b) => a.missing.length - b.missing.length);

  recipesList.innerHTML = "";
  for (const { recipe, missing } of withStatus) {
    const li = document.createElement("li");
    li.className = "item-row recipe-card";

    const header = document.createElement("div");
    header.className = "recipe-card-header";

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = recipe.name;

    const status = document.createElement("span");
    status.className = "recipe-status " + (missing.length === 0 ? "ready" : "missing");
    status.textContent = missing.length === 0 ? "Ready to cook" : `${missing.length} missing`;

    const del = document.createElement("button");
    del.className = "delete";
    del.type = "button";
    del.textContent = "×";
    del.addEventListener("click", () => deleteRecipe(recipe.id));

    header.append(name, status, del);

    const ingredients = document.createElement("ul");
    ingredients.className = "ingredients";
    for (const ing of recipe.ingredients) {
      const ingEl = document.createElement("li");
      ingEl.textContent = ing;
      ingEl.className = ingredientInPantry(ing, pantryItems) ? "have" : "missing";
      ingredients.appendChild(ingEl);
    }

    li.append(header, ingredients);

    if (missing.length > 0) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "add-missing-button";
      btn.textContent = "Add missing to shopping list";
      btn.addEventListener("click", () => addMissingToList(missing));
      li.append(btn);
    } else {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cook-button";
      btn.textContent = "Cooked!";
      btn.addEventListener("click", () => cookRecipe(recipe));
      li.append(btn);
    }

    recipesList.appendChild(li);
  }

  recipesEmpty.style.display = recipes.length ? "none" : "block";
}

// ── mutations ──────────────────────────────────────────────────────────────

function toggleStatus(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  item.status = item.status === "toBuy" ? "inPantry" : "toBuy";
  saveItems(items);
  render();
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  saveItems(items);
  render();
}

function addItem(name, qty = "") {
  const trimmedName = name.trim();
  const trimmedQty  = qty.trim();
  if (!trimmedName) return;
  if (IGNORED_INGREDIENTS.has(normalize(trimmedName))) return;

  const existing = findMatchingItem(trimmedName, items);
  if (existing) {
    if (existing.status === "toBuy") {
      const merged = sumQty(existing.qty, trimmedQty);
      if (merged) { existing.qty = merged; saveItems(items); render(); }
    }
    return;
  }
  items.unshift({ id: crypto.randomUUID(), name: trimmedName, qty: trimmedQty, status: "toBuy" });
  saveItems(items);
  render();
}

function addToPantry(name, qty = "") {
  const trimmedName = name.trim();
  const trimmedQty  = qty.trim();
  if (!trimmedName) return;

  const existing = findMatchingItem(trimmedName, items);
  if (existing) {
    existing.status = "inPantry";
    existing.name   = trimmedName;
    existing.qty    = trimmedQty;
    saveItems(items);
    render();
    return;
  }
  items.unshift({ id: crypto.randomUUID(), name: trimmedName, qty: trimmedQty, status: "inPantry" });
  saveItems(items);
  render();
}

function addMissingToList(missingIngredients) {
  for (const ing of missingIngredients) {
    if (IGNORED_INGREDIENTS.has(normalize(ing))) continue;
    const { qty, base: ingName } = parseQtyAndBase(ing);
    const qtyStr = qty !== null ? String(qty) : "";

    const existing = findMatchingItem(ingName, items);
    if (existing) {
      if (existing.status === "toBuy" && qtyStr) {
        const merged = sumQty(existing.qty, qtyStr);
        if (merged) existing.qty = merged;
      }
      continue;
    }
    items.unshift({ id: crypto.randomUUID(), name: ingName, qty: qtyStr, status: "toBuy" });
  }
  saveItems(items);
  render();
}

function cookRecipe(recipe) {
  const pantryItems = getPantryItems();
  for (const ing of recipe.ingredients) {
    const { qty: ingQty } = parseQtyAndBase(ing);
    const match = pantryItems.find(p => ingredientMatchesPantryItem(ing, p));
    if (!match) continue;

    if (ingQty !== null && match.qty) {
      const remaining = parseFloat(match.qty) - ingQty;
      if (!isNaN(remaining) && remaining > 0) {
        match.qty = Number.isInteger(remaining) ? String(remaining) : remaining.toFixed(1);
        continue; // stays in pantry with reduced qty
      }
    }
    match.status = "toBuy"; // fully consumed or can't calculate
  }
  saveItems(items);
  render();
}

function addRecipe(name, ingredientsText) {
  const trimmedName = name.trim();
  const ingredients = ingredientsText.split("\n").map(l => l.trim()).filter(Boolean);
  if (!trimmedName || ingredients.length === 0) return;
  recipes.unshift({ id: crypto.randomUUID(), name: trimmedName, ingredients });
  saveRecipes(recipes);
  renderRecipes();
}

function deleteRecipe(id) {
  recipes = recipes.filter(r => r.id !== id);
  saveRecipes(recipes);
  renderRecipes();
}

// ── event listeners ────────────────────────────────────────────────────────

addForm.addEventListener("submit", e => {
  e.preventDefault();
  addItem(newItemInput.value, newItemQtyInput.value);
  newItemInput.value = "";
  newItemQtyInput.value = "";
  newItemInput.focus();
});

addPantryForm.addEventListener("submit", e => {
  e.preventDefault();
  addToPantry(newPantryInput.value, newPantryQtyInput.value);
  newPantryInput.value = "";
  newPantryQtyInput.value = "";
  newPantryInput.focus();
});

addRecipeForm.addEventListener("submit", e => {
  e.preventDefault();
  addRecipe(recipeNameInput.value, recipeIngredientsInput.value);
  recipeNameInput.value = "";
  recipeIngredientsInput.value = "";
  recipeNameInput.focus();
});

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    tabButtons.forEach(b => b.classList.toggle("active", b === btn));
    pages.forEach(p => p.classList.toggle("active", p.id === `${tab}-page`));
    addForm.classList.toggle("active", tab === "shopping");
  });
});

if ("serviceWorker" in navigator && location.hostname !== "localhost") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

render();
