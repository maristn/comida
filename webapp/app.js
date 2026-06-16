const STORAGE_KEY = "comida.items";
const RECIPES_STORAGE_KEY = "comida.recipes";

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadRecipes() {
  try {
    const raw = localStorage.getItem(RECIPES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecipes(recipes) {
  localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(recipes));
}

let items = loadItems();
let recipes = loadRecipes();

const toBuyList = document.getElementById("to-buy-list");
const pantryList = document.getElementById("pantry-list");
const toBuyEmpty = document.getElementById("to-buy-empty");
const pantryEmpty = document.getElementById("pantry-empty");
const addForm = document.getElementById("add-form");
const newItemInput = document.getElementById("new-item-input");

const recipesList = document.getElementById("recipes-list");
const recipesEmpty = document.getElementById("recipes-empty");
const addRecipeForm = document.getElementById("add-recipe-form");
const recipeNameInput = document.getElementById("recipe-name-input");
const recipeIngredientsInput = document.getElementById("recipe-ingredients-input");

const tabButtons = document.querySelectorAll(".tab-button");
const pages = document.querySelectorAll(".page");

function normalize(name) {
  return name.trim().toLowerCase();
}

function getPantryNames() {
  return new Set(
    items.filter((item) => item.status === "inPantry").map((item) => normalize(item.name))
  );
}

function render() {
  const toBuy = items.filter((item) => item.status === "toBuy");
  const pantry = items.filter((item) => item.status === "inPantry");

  renderList(toBuyList, toBuy);
  renderList(pantryList, pantry);

  toBuyEmpty.style.display = toBuy.length ? "none" : "block";
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

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = item.name;

    const del = document.createElement("button");
    del.className = "delete";
    del.type = "button";
    del.textContent = "×";
    del.addEventListener("click", () => deleteItem(item.id));

    li.append(toggle, name, del);
    listEl.appendChild(li);
  }
}

function toggleStatus(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.status = item.status === "toBuy" ? "inPantry" : "toBuy";
  saveItems(items);
  render();
}

function deleteItem(id) {
  items = items.filter((i) => i.id !== id);
  saveItems(items);
  render();
}

function addItem(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  if (items.some((item) => normalize(item.name) === normalize(trimmed))) return;
  items.unshift({
    id: crypto.randomUUID(),
    name: trimmed,
    status: "toBuy",
  });
  saveItems(items);
  render();
}

addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addItem(newItemInput.value);
  newItemInput.value = "";
  newItemInput.focus();
});

function renderRecipes() {
  const pantryNames = getPantryNames();

  const withStatus = recipes.map((recipe) => {
    const missing = recipe.ingredients.filter((ing) => !pantryNames.has(normalize(ing)));
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
    for (const ingredient of recipe.ingredients) {
      const item = document.createElement("li");
      item.textContent = ingredient;
      item.className = pantryNames.has(normalize(ingredient)) ? "have" : "missing";
      ingredients.appendChild(item);
    }

    li.append(header, ingredients);

    if (missing.length > 0) {
      const addMissingButton = document.createElement("button");
      addMissingButton.type = "button";
      addMissingButton.className = "add-missing-button";
      addMissingButton.textContent = "Add missing to shopping list";
      addMissingButton.addEventListener("click", () => addMissingToList(missing));
      li.append(addMissingButton);
    }

    recipesList.appendChild(li);
  }

  recipesEmpty.style.display = recipes.length ? "none" : "block";
}

function addMissingToList(missingIngredients) {
  const existingNames = new Set(items.map((item) => normalize(item.name)));
  for (const ingredient of missingIngredients) {
    if (existingNames.has(normalize(ingredient))) continue;
    items.unshift({
      id: crypto.randomUUID(),
      name: ingredient,
      status: "toBuy",
    });
    existingNames.add(normalize(ingredient));
  }
  saveItems(items);
  render();
}

function addRecipe(name, ingredientsText) {
  const trimmedName = name.trim();
  const ingredients = ingredientsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!trimmedName || ingredients.length === 0) return;

  recipes.unshift({
    id: crypto.randomUUID(),
    name: trimmedName,
    ingredients,
  });
  saveRecipes(recipes);
  renderRecipes();
}

function deleteRecipe(id) {
  recipes = recipes.filter((r) => r.id !== id);
  saveRecipes(recipes);
  renderRecipes();
}

addRecipeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addRecipe(recipeNameInput.value, recipeIngredientsInput.value);
  recipeNameInput.value = "";
  recipeIngredientsInput.value = "";
  recipeNameInput.focus();
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;

    tabButtons.forEach((b) => b.classList.toggle("active", b === button));
    pages.forEach((page) => page.classList.toggle("active", page.id === `${tab}-page`));
    addForm.classList.toggle("active", tab === "shopping");
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

render();
