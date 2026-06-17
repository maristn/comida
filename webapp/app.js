const STORAGE_KEY = "comida.items";
const RECIPES_STORAGE_KEY = "comida.recipes";

// ── utils ──────────────────────────────────────────────────────────────────

function normalize(s) {
  return s.trim().toLowerCase();
}

function isIgnoredIngredient(name) {
  const n = normalize(name);
  return /\bwater\b/.test(n) || /\bágua\b/.test(n) || /\bagua\b/.test(n);
}

// "3 eggs" → {qty:"3", base:"eggs"} | "600ml milk" → {qty:"600ml", base:"milk"} | "1 cup of sugar" → {qty:"1 cup", base:"sugar"}
function parseQtyAndBase(text) {
  const n = normalize(text);
  const m = n.match(/^([\d.,\/]+\s*(?:ml|kg|g|oz|lbs?|cups?|tablespoons?|tbsp|teaspoons?|tsp|colheres?|xícaras?|latas?|cans?)?)\s+(?:(?:of|de)\s+)?(.+)$/i);
  if (m) return { qty: m[1].trim(), base: m[2].trim() };
  return { qty: null, base: n };
}

// Unit prefix that signals a bad prior migration (e.g. name:"ml of milk" qty:"600")
const BAD_UNIT_PREFIX_RE = /^(ml|kg|g|oz|lbs?|cups?|tbsp|tsp|colheres?|xícaras?|latas?|cans?)\b/i;

// Migrate old items that had qty embedded in name ("10 eggs" → name:"eggs" qty:"10")
// Also repairs bad migrations where the unit ended up at the start of the name
function migrateItem(item) {
  if (item.qty !== undefined) {
    if (item.qty && BAD_UNIT_PREFIX_RE.test(item.name)) {
      const fullText = `${item.qty} ${item.name}`;
      const parsed = parseQtyAndBase(fullText);
      if (parsed.qty !== null) return { ...item, name: parsed.base, qty: parsed.qty };
    }
    return item;
  }
  const { qty, base } = parseQtyAndBase(item.name);
  return { ...item, name: qty !== null ? base : item.name, qty: qty !== null ? qty : "" };
}

// Sum two qty strings; returns null if non-numeric. Preserves unit when both match.
function sumQty(a, b) {
  if (!a || !b) return null;
  const na = parseFloat(a), nb = parseFloat(b);
  if (isNaN(na) || isNaN(nb)) return null;
  const t = na + nb;
  const sumStr = Number.isInteger(t) ? String(t) : t.toFixed(1);
  const unitA = a.replace(/^[\d.,\s]+/, "").trim();
  const unitB = b.replace(/^[\d.,\s]+/, "").trim();
  if (unitA && unitA === unitB) return `${sumStr} ${unitA}`;
  return sumStr;
}

// Emoji map: [regex, emoji]
const EMOJI_MAP = [
  [/\begg|ovo/,           "🥚"],
  [/\bmilk\b|leite/,      "🥛"],
  [/\bflour\b|farinh/,    "🌾"],
  [/\bbutter\b|manteig/,  "🧈"],
  [/\bsugar\b|açúcar|acucar/, "🍬"],
  [/\bsalt\b|sal\b/,      "🧂"],
  [/\boil\b|óleo|azeite/, "🫙"],
  [/\bonion\b|cebola/,    "🧅"],
  [/\bgarlic\b|alho/,     "🧄"],
  [/\btomato|tomate/,     "🍅"],
  [/\bpotato|batata/,     "🥔"],
  [/\bcarrot|cenoura/,    "🥕"],
  [/\brice\b|arroz/,      "🍚"],
  [/\bpasta\b|macarrão/,  "🍝"],
  [/\bchicken\b|frango/,  "🍗"],
  [/\bbeef\b|carne\b/,    "🥩"],
  [/\bfish\b|peixe/,      "🐟"],
  [/\bcheese\b|queijo/,   "🧀"],
  [/\bcream\b/,           "🥛"],
  [/\bchocolat/,          "🍫"],
  [/\bbread\b|pão/,       "🍞"],
  [/\bapple\b|maçã/,      "🍎"],
  [/\bbanana/,            "🍌"],
  [/\blemon\b|limão/,     "🍋"],
  [/\borange\b|laranja/,  "🍊"],
  [/\bpepper\b|pimenta/,  "🌶️"],
  [/\bbean\b|feijão/,     "🫘"],
  [/\bcoffee\b|café/,     "☕"],
  [/\btea\b|chá\b/,       "🍵"],
  [/\bhoney\b|mel\b/,     "🍯"],
  [/\bcondensed/,         "🥫"],
  [/\bvanilla\b/,         "🌿"],
  [/\bcinnamon\b|canela/,  "🍂"],
  [/\bcorn\b|milho/,      "🌽"],
  [/\bmushroom\b|cogumelo/, "🍄"],
  [/\bavocado\b|abacate/,  "🥑"],
  [/\bcoconut\b|coco\b/,   "🥥"],
  [/\bstrawberry|morango/, "🍓"],
  [/\bham\b|presunto/,    "🥓"],
  [/\bbacon/,             "🥓"],
  [/\bshrimp\b|camarão/,  "🦐"],
  [/\bsalmon\b|salmão/,   "🍣"],
  [/\bpancake/,           "🥞"],
  [/\bpudim|pudding/,     "🍮"],
  [/\byogurt|iogurte/,    "🫙"],
  [/\bsauce\b|molho/,     "🫙"],
];

function getIngredientEmoji(name) {
  const n = normalize(name);
  for (const [pattern, emoji] of EMOJI_MAP) {
    if (pattern.test(n)) return emoji;
  }
  return "🛒";
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

let items   = loadItems();
let recipes = loadRecipes();
let editingRecipeId = null;
const expandedInstructionIds = new Set();

// ── DOM refs ───────────────────────────────────────────────────────────────

const toBuyList             = document.getElementById("to-buy-list");
const pantryList            = document.getElementById("pantry-list");
const toBuyEmpty            = document.getElementById("to-buy-empty");
const pantryEmpty           = document.getElementById("pantry-empty");
const addForm               = document.getElementById("add-form");
const newItemQtyInput       = document.getElementById("new-item-qty");
const newItemInput          = document.getElementById("new-item-input");
const addPantryForm         = document.getElementById("add-pantry-form");
const newPantryQtyInput     = document.getElementById("new-pantry-qty");
const newPantryInput        = document.getElementById("new-pantry-input");
const recipesList           = document.getElementById("recipes-list");
const recipesEmpty          = document.getElementById("recipes-empty");
const addRecipeForm         = document.getElementById("add-recipe-form");
const recipeNameInput       = document.getElementById("recipe-name-input");
const recipeIngredientsInput = document.getElementById("recipe-ingredients-input");
const recipeInstructionsInput = document.getElementById("recipe-instructions-input");
const recipeSubmitBtn       = addRecipeForm.querySelector("button[type=submit]");
const tabButtons            = document.querySelectorAll(".tab-button");
const pages                 = document.querySelectorAll(".page");

// ── matching ───────────────────────────────────────────────────────────────

function getPantryItems() {
  return items.filter(i => i.status === "inPantry");
}

function ingredientMatchesPantryItem(ingText, pantryItem) {
  const ingBase  = parseQtyAndBase(ingText).base;
  const itemBase = normalize(pantryItem.name);
  return ingBase === itemBase || itemBase.includes(ingBase);
}

function ingredientInPantry(ingText, pantryItems) {
  return pantryItems.some(p => ingredientMatchesPantryItem(ingText, p));
}

function findMatchingItem(name, searchItems) {
  const norm = normalize(name);
  return searchItems.find(i => normalize(i.name) === norm) || null;
}

// ── render ─────────────────────────────────────────────────────────────────

function render() {
  const toBuy  = items.filter(i => i.status === "toBuy");
  const pantry = items.filter(i => i.status === "inPantry");
  renderGrid(toBuyList, toBuy);
  renderGrid(pantryList, pantry);
  toBuyEmpty.style.display  = toBuy.length  ? "none" : "block";
  pantryEmpty.style.display = pantry.length ? "none" : "block";
  renderRecipes();
}

function renderGrid(gridEl, listItems) {
  gridEl.innerHTML = "";
  for (const item of listItems) {
    const li = document.createElement("li");
    li.className = "item-card" + (item.status === "inPantry" ? " in-pantry" : "");
    li.addEventListener("click", e => {
      if (!e.target.closest(".card-delete")) toggleStatus(item.id);
    });

    const del = document.createElement("button");
    del.className = "card-delete";
    del.type = "button";
    del.textContent = "×";
    del.addEventListener("click", e => { e.stopPropagation(); deleteItem(item.id); });

    const icon = document.createElement("span");
    icon.className = "card-icon";
    icon.textContent = getIngredientEmoji(item.name);

    const nameEl = document.createElement("span");
    nameEl.className = "card-name";
    nameEl.textContent = item.name;

    li.append(del, icon);

    if (item.qty) {
      const qtyEl = document.createElement("span");
      qtyEl.className = "card-qty";
      qtyEl.textContent = item.qty;
      li.appendChild(qtyEl);
    }

    li.appendChild(nameEl);

    if (item.status === "inPantry") {
      const check = document.createElement("span");
      check.className = "card-check";
      check.textContent = "✓";
      li.appendChild(check);
    }

    gridEl.appendChild(li);
  }
}

function renderRecipes() {
  const pantryItems = getPantryItems();

  const withStatus = recipes.map(recipe => {
    const missing = recipe.ingredients.filter(ing =>
      !isIgnoredIngredient(ing) && !ingredientInPantry(ing, pantryItems)
    );
    return { recipe, missing };
  });
  withStatus.sort((a, b) => a.missing.length - b.missing.length);

  recipesList.innerHTML = "";

  for (const { recipe, missing } of withStatus) {
    const li = document.createElement("li");
    li.className = "item-row recipe-card";

    if (editingRecipeId === recipe.id) {
      li.appendChild(buildRecipeEditForm(recipe));
      recipesList.appendChild(li);
      continue;
    }

    // Header row
    const header = document.createElement("div");
    header.className = "recipe-card-header";

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = recipe.name;

    const status = document.createElement("span");
    status.className = "recipe-status " + (missing.length === 0 ? "ready" : "missing");
    status.textContent = missing.length === 0 ? "Ready to cook" : `${missing.length} missing`;

    const editBtn = document.createElement("button");
    editBtn.className = "recipe-edit-btn";
    editBtn.type = "button";
    editBtn.textContent = "✏️";
    editBtn.setAttribute("aria-label", "Edit recipe");
    editBtn.addEventListener("click", () => startEditRecipe(recipe.id));

    const del = document.createElement("button");
    del.className = "delete";
    del.type = "button";
    del.textContent = "×";
    del.addEventListener("click", () => deleteRecipe(recipe.id));

    header.append(name, status, editBtn, del);

    // Ingredients list
    const ingredients = document.createElement("ul");
    ingredients.className = "ingredients";
    for (const ing of recipe.ingredients) {
      const ingEl = document.createElement("li");
      ingEl.textContent = ing;
      ingEl.className = (isIgnoredIngredient(ing) || ingredientInPantry(ing, pantryItems)) ? "have" : "missing";
      ingredients.appendChild(ingEl);
    }

    li.append(header, ingredients);

    // Instructions toggle
    if (recipe.instructions && recipe.instructions.trim()) {
      const expanded = expandedInstructionIds.has(recipe.id);
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "instructions-toggle";
      toggle.textContent = expanded ? "▾ Instructions" : "▸ Instructions";
      toggle.addEventListener("click", () => {
        if (expandedInstructionIds.has(recipe.id)) {
          expandedInstructionIds.delete(recipe.id);
        } else {
          expandedInstructionIds.add(recipe.id);
        }
        renderRecipes();
      });
      li.appendChild(toggle);

      if (expanded) {
        const instr = document.createElement("p");
        instr.className = "instructions-text";
        instr.textContent = recipe.instructions;
        li.appendChild(instr);
      }
    }

    // Action buttons
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

function buildRecipeEditForm(recipe) {
  const wrapper = document.createElement("div");
  wrapper.className = "recipe-edit-wrapper";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = recipe.name;
  nameInput.className = "recipe-edit-field";
  nameInput.placeholder = "Recipe name";

  const ingTextarea = document.createElement("textarea");
  ingTextarea.value = recipe.ingredients.join("\n");
  ingTextarea.className = "recipe-edit-field";
  ingTextarea.placeholder = "Ingredients, one per line";
  ingTextarea.rows = 4;

  const instrTextarea = document.createElement("textarea");
  instrTextarea.value = recipe.instructions || "";
  instrTextarea.className = "recipe-edit-field";
  instrTextarea.placeholder = "Instructions (optional)";
  instrTextarea.rows = 4;

  const actions = document.createElement("div");
  actions.className = "recipe-edit-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "recipe-cancel-button";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    editingRecipeId = null;
    renderRecipes();
  });

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "recipe-save-button";
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", () => {
    updateRecipe(recipe.id, nameInput.value, ingTextarea.value, instrTextarea.value);
    editingRecipeId = null;
    renderRecipes();
  });

  actions.append(cancelBtn, saveBtn);
  wrapper.append(nameInput, ingTextarea, instrTextarea, actions);
  return wrapper;
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
  if (isIgnoredIngredient(trimmedName)) return;

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
    if (isIgnoredIngredient(ing)) continue;
    const { qty, base: ingName } = parseQtyAndBase(ing);
    const qtyStr = qty !== null ? qty : "";

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
      const remaining = parseFloat(match.qty) - parseFloat(ingQty);
      if (!isNaN(remaining) && remaining > 0) {
        match.qty = Number.isInteger(remaining) ? String(remaining) : remaining.toFixed(1);
        continue;
      }
    }
    match.status = "toBuy";
  }
  saveItems(items);
  render();
}

function addRecipe(name, ingredientsText, instructions) {
  const trimmedName = name.trim();
  const ingredients = ingredientsText.split("\n").map(l => l.trim()).filter(Boolean);
  if (!trimmedName || ingredients.length === 0) return;
  recipes.unshift({ id: crypto.randomUUID(), name: trimmedName, ingredients, instructions: instructions.trim() });
  saveRecipes(recipes);
  renderRecipes();
}

function updateRecipe(id, name, ingredientsText, instructions) {
  const recipe = recipes.find(r => r.id === id);
  if (!recipe) return;
  const trimmedName = name.trim();
  const ingredients = ingredientsText.split("\n").map(l => l.trim()).filter(Boolean);
  if (!trimmedName || ingredients.length === 0) return;
  recipe.name         = trimmedName;
  recipe.ingredients  = ingredients;
  recipe.instructions = instructions.trim();
  saveRecipes(recipes);
}

function startEditRecipe(id) {
  editingRecipeId = id;
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
  newItemInput.value    = "";
  newItemQtyInput.value = "";
  newItemInput.focus();
});

addPantryForm.addEventListener("submit", e => {
  e.preventDefault();
  addToPantry(newPantryInput.value, newPantryQtyInput.value);
  newPantryInput.value    = "";
  newPantryQtyInput.value = "";
  newPantryInput.focus();
});

addRecipeForm.addEventListener("submit", e => {
  e.preventDefault();
  addRecipe(recipeNameInput.value, recipeIngredientsInput.value, recipeInstructionsInput.value);
  recipeNameInput.value         = "";
  recipeIngredientsInput.value  = "";
  recipeInstructionsInput.value = "";
  recipeNameInput.focus();
});

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    tabButtons.forEach(b => b.classList.toggle("active", b === btn));
    pages.forEach(p => p.classList.toggle("active", p.id === `${tab}-page`));
  });
});

if ("serviceWorker" in navigator && location.hostname !== "localhost") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

render();
