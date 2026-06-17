// ── Supabase ───────────────────────────────────────────────────────────────

const { createClient } = supabase;
const db = createClient(
  "https://ckhwneyrpopoijfxxrps.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNraHduZXlycG9wb2lqZnh4cnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2OTYxMzUsImV4cCI6MjA5NzI3MjEzNX0.Qt9jJ9ojrQmEukcs0szv_CpwlVxnd8o8ekQlYU-I3z4"
);

function dbErr(label) {
  return ({ error }) => { if (error) console.error(label, error); };
}

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

// ── state ──────────────────────────────────────────────────────────────────

let items   = [];
let recipes = [];
let editingRecipeId = null;
const expandedInstructionIds = new Set();

// ── DOM refs ───────────────────────────────────────────────────────────────

const toBuyList               = document.getElementById("to-buy-list");
const pantryList              = document.getElementById("pantry-list");
const toBuyEmpty              = document.getElementById("to-buy-empty");
const pantryEmpty             = document.getElementById("pantry-empty");
const addForm                 = document.getElementById("add-form");
const newItemQtyInput         = document.getElementById("new-item-qty");
const newItemInput            = document.getElementById("new-item-input");
const addPantryForm           = document.getElementById("add-pantry-form");
const newPantryQtyInput       = document.getElementById("new-pantry-qty");
const newPantryInput          = document.getElementById("new-pantry-input");
const recipesList             = document.getElementById("recipes-list");
const recipesEmpty            = document.getElementById("recipes-empty");
const addRecipeForm           = document.getElementById("add-recipe-form");
const recipeNameInput         = document.getElementById("recipe-name-input");
const recipeIngredientsInput  = document.getElementById("recipe-ingredients-input");
const recipeInstructionsInput = document.getElementById("recipe-instructions-input");
const tabButtons              = document.querySelectorAll(".tab-button");
const pages                   = document.querySelectorAll(".page");

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
  render();
  db.from("items").update({ status: item.status }).eq("id", id).then(dbErr("toggleStatus"));
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  render();
  db.from("items").delete().eq("id", id).then(dbErr("deleteItem"));
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
      if (merged) {
        existing.qty = merged;
        render();
        db.from("items").update({ qty: merged }).eq("id", existing.id).then(dbErr("addItem:update"));
      }
    }
    return;
  }
  const newItem = { id: crypto.randomUUID(), name: trimmedName, qty: trimmedQty, status: "toBuy" };
  items.unshift(newItem);
  render();
  db.from("items").insert(newItem).then(dbErr("addItem:insert"));
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
    render();
    db.from("items").update({ status: "inPantry", name: trimmedName, qty: trimmedQty }).eq("id", existing.id).then(dbErr("addToPantry:update"));
    return;
  }
  const newItem = { id: crypto.randomUUID(), name: trimmedName, qty: trimmedQty, status: "inPantry" };
  items.unshift(newItem);
  render();
  db.from("items").insert(newItem).then(dbErr("addToPantry:insert"));
}

function addMissingToList(missingIngredients) {
  const toInsert = [];
  const toUpdate = [];

  for (const ing of missingIngredients) {
    if (isIgnoredIngredient(ing)) continue;
    const { qty, base: ingName } = parseQtyAndBase(ing);
    const qtyStr = qty !== null ? qty : "";
    const existing = findMatchingItem(ingName, items);
    if (existing) {
      if (existing.status === "toBuy" && qtyStr) {
        const merged = sumQty(existing.qty, qtyStr);
        if (merged) {
          existing.qty = merged;
          toUpdate.push({ id: existing.id, qty: merged });
        }
      }
      continue;
    }
    const newItem = { id: crypto.randomUUID(), name: ingName, qty: qtyStr, status: "toBuy" };
    items.unshift(newItem);
    toInsert.push(newItem);
  }
  render();
  if (toInsert.length) db.from("items").insert(toInsert).then(dbErr("addMissing:insert"));
  toUpdate.forEach(({ id, qty }) =>
    db.from("items").update({ qty }).eq("id", id).then(dbErr("addMissing:update"))
  );
}

function cookRecipe(recipe) {
  const pantryItems = getPantryItems();
  const toUpdate    = [];
  const toSetToBuy  = [];

  for (const ing of recipe.ingredients) {
    if (isIgnoredIngredient(ing)) continue;
    const { qty: ingQty } = parseQtyAndBase(ing);
    const match = pantryItems.find(p => ingredientMatchesPantryItem(ing, p));
    if (!match) continue;

    if (ingQty !== null && match.qty) {
      const remaining = parseFloat(match.qty) - parseFloat(ingQty);
      if (!isNaN(remaining) && remaining > 0) {
        const newQty = Number.isInteger(remaining) ? String(remaining) : remaining.toFixed(1);
        match.qty = newQty;
        toUpdate.push({ id: match.id, qty: newQty });
        continue;
      }
    }
    match.status = "toBuy";
    toSetToBuy.push(match.id);
  }
  render();
  toUpdate.forEach(({ id, qty }) =>
    db.from("items").update({ qty }).eq("id", id).then(dbErr("cook:update"))
  );
  toSetToBuy.forEach(id =>
    db.from("items").update({ status: "toBuy" }).eq("id", id).then(dbErr("cook:setToBuy"))
  );
}

function addRecipe(name, ingredientsText, instructions) {
  const trimmedName = name.trim();
  const ingredients = ingredientsText.split("\n").map(l => l.trim()).filter(Boolean);
  if (!trimmedName || ingredients.length === 0) return;
  const newRecipe = { id: crypto.randomUUID(), name: trimmedName, ingredients, instructions: instructions.trim() };
  recipes.unshift(newRecipe);
  renderRecipes();
  db.from("recipes").insert(newRecipe).then(dbErr("addRecipe"));
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
  db.from("recipes").update({ name: trimmedName, ingredients, instructions: instructions.trim() }).eq("id", id).then(dbErr("updateRecipe"));
}

function startEditRecipe(id) {
  editingRecipeId = id;
  renderRecipes();
}

function deleteRecipe(id) {
  recipes = recipes.filter(r => r.id !== id);
  renderRecipes();
  db.from("recipes").delete().eq("id", id).then(dbErr("deleteRecipe"));
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

// ── init ───────────────────────────────────────────────────────────────────

async function init() {
  const [{ data: itemsData, error: e1 }, { data: recipesData, error: e2 }] = await Promise.all([
    db.from("items").select("*").order("created_at", { ascending: false }),
    db.from("recipes").select("*").order("created_at", { ascending: false }),
  ]);
  if (e1) console.error("items load:", e1);
  if (e2) console.error("recipes load:", e2);
  items   = itemsData   || [];
  recipes = recipesData || [];
  render();
}

init();
