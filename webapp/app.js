// ── Supabase ───────────────────────────────────────────────────────────────

const { createClient } = supabase;
const db = createClient(
  "https://ckhwneyrpopoijfxxrps.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNraHduZXlycG9wb2lqZnh4cnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2OTYxMzUsImV4cCI6MjA5NzI3MjEzNX0.Qt9jJ9ojrQmEukcs0szv_CpwlVxnd8o8ekQlYU-I3z4"
);

function showToast(msg, color = "#c0392b") {
  let t = document.getElementById("db-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "db-toast";
    t.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:10px 18px;border-radius:8px;color:#fff;font-size:13px;font-weight:600;z-index:9999;max-width:90vw;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.3)";
    document.body.appendChild(t);
  }
  t.style.background = color;
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = "none"; }, 5000);
}

function dbErr(label) {
  return ({ error }) => {
    if (error) {
      console.error(label, error);
      showToast(`Save error (${label}): ${error.message}`);
    }
  };
}

// ── utils ──────────────────────────────────────────────────────────────────

function normalize(s) {
  return s.trim().toLowerCase();
}

function isIgnoredIngredient(name) {
  const n = normalize(name);
  return /\bwater\b/.test(n) || /\bágua\b/.test(n) || /\bagua\b/.test(n);
}

// Normalize unicode fractions to ASCII (½ → 1/2, ¼ → 1/4, etc.)
function normalizeFractions(s) {
  return s.replace(/½/g,"1/2").replace(/¼/g,"1/4").replace(/¾/g,"3/4")
          .replace(/⅓/g,"1/3").replace(/⅔/g,"2/3").replace(/⅛/g,"1/8");
}

// "3 eggs" → {qty:"3", base:"eggs"} | "600ml milk" → {qty:"600ml", base:"milk"} | "2 cloves of garlic" → {qty:"2 cloves", base:"garlic"}
function parseQtyAndBase(text) {
  const n = normalizeFractions(normalize(text));
  const m = n.match(/^([\d.,\/]+\s*(?:ml|kg|g|oz|lbs?|cups?|tablespoons?|tbsp|teaspoons?|tsp|cloves?|bunche?s?|stalks?|heads?|slices?|pieces?|colheres?|xícaras?|latas?|cans?)?)\s+(?:(?:of|de)\s+)?(.+)$/i);
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
  [/\begg|yolk|ovo/,      "🥚"],
  [/\bmilk\b|leite/,      "🥛"],
  [/\bflour\b|farinh/,    "🌾"],
  [/\bbutter\b|manteig/,  "🧈"],
  [/\bsugar\b|açúcar|acucar/, "🍬"],
  [/\bsalt\b|sal\b/,      "🧂"],
  [/\bpowder\b|em pó/,   "🧂"],
  [/olive/,               "🫒"],
  [/\boil\b|óleo|azeite/, "🫙"],
  [/\bonions?\b|cebola/,  "🧅"],
  [/\bgarlic\b|alho/,     "🧄"],
  [/\btomato|tomate/,     "🍅"],
  [/\bpotato|batata/,     "🥔"],
  [/\bcarrot|cenoura/,    "🥕"],
  [/\brice\b|arroz/,      "🍚"],
  [/\bpasta\b|macarrão|spaghetti|fusilli/, "🍝"],
  [/noodle|ramen/,        "🍜"],
  [/\bchicken\b|frango/,  "🍗"],
  [/\bbeef\b|carne\b/,    "🥩"],
  [/\bfish\b|peixe/,      "🐟"],
  [/\bcheese\b|queijo|käse|kase/, "🧀"],
  [/\bcream\b/,           "🥛"],
  [/\bchocolat|cacao|cacau/, "🍫"],
  [/breadcrumb/,          "🌾"],
  [/\bbread\b|pão/,       "🍞"],
  [/\bapple\b|maçã/,      "🍎"],
  [/\bbanana/,            "🍌"],
  [/\blemon\b|limão/,     "🍋"],
  [/\borange\b|laranja/,  "🍊"],
  [/sriracha/,            "🌶️"],
  [/\bpepper\b|pimenta/,  "🌶️"],
  [/\bbeans?\b|feijão|chickpea|grão.de.bico|carioca/, "🫘"],
  [/\bcoffee\b|café/,     "☕"],
  [/\btea\b|chá\b/,       "🍵"],
  [/\bhoney\b|mel\b/,     "🍯"],
  [/\bcondensed/,         "🥫"],
  [/\bvanilla\b/,         "🌿"],
  [/\bcinnamon\b|canela/,  "🍂"],
  [/\bcorn/,              "🌽"],
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
  [/broth|caldo/,         "🍜"],
  [/\bmiso\b/,            "🫙"],
  [/\bsauce\b|molho/,     "🫙"],
  [/mayo|maionese|mayonnaise/, "🫙"],
  [/turmeric|açafrão.da.terra/, "🧂"],
  [/\bcumin\b|cominho/,   "🧂"],
  [/ras.?el.?hanout|harissa|za.?atar|sumac|paprik/, "🧂"],
  [/\bice\b/,             "🧊"],
  [/vinegar|vinagre/,     "🍶"],
  [/\baloe\b/,            "🫙"],
  [/\bchia\b/,            "🌾"],
  [/cilantro/,            "🧂"],
  [/coriand/,             "🌿"],
  [/\bdill\b/,            "🧂"],
  [/\bjam\b|geleia/,      "🫙"],
  [/flax/,                "🌱"],
  [/mustard|mostarda/,    "🫙"],
  [/\boat\b|aveia/,       "🌾"],
  [/passion.fruit|maracujá/, "🍹"],
  [/paçoca/,              "🍬"],
  [/polvilho/,            "🌾"],
  [/popcorn|pipoca/,      "🍿"],
  [/quinoa/,              "🌾"],
  [/tahini/,              "🧂"],
  [/tamarind/,            "🫙"],
  [/tapioca/,             "🫙"],
  [/\btofu\b/,            "⬜"],
  [/couscous/,            "🍚"],
  [/leibniz|biscoito/,    "🍪"],
];

// ── Emoji picker ───────────────────────────────────────────────────────────

const RECIPE_EMOJIS = [
  "🥘","🍲","🥗","🍜","🍝","🍛","🍣","🍱","🥙","🌮","🌯","🥪",
  "🍞","🥐","🥖","🍳","🥞","🧇","🥩","🍗","🍔","🍕","🥫","🫕",
  "🥣","🧆","🥚","🧈","🥦","🧄","🧅","🍅","🥕","🌽","🥑","🍓",
  "🍎","🍌","🍋","🍊","🍰","🎂","🧁","🍩","🍪","🍫","🍮","🍯",
  "☕","🫖","🍵","🥤","🧃","🫙","🥂","🍷","🍸","🍹","🫗","🧋",
];

function attachEmojiPicker(input) {
  const picker = document.createElement("div");
  picker.className = "emoji-picker";
  document.body.appendChild(picker);

  RECIPE_EMOJIS.forEach(em => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = em;
    const choose = e => {
      e.preventDefault();
      input.value = em;
      picker.classList.remove("open");
    };
    btn.addEventListener("mousedown", choose);
    btn.addEventListener("touchstart", choose, { passive: false });
    picker.appendChild(btn);
  });

  function reposition() {
    const r = input.getBoundingClientRect();
    picker.style.top  = (r.bottom + 6) + "px";
    picker.style.left = Math.min(r.left, window.innerWidth - 300) + "px";
  }

  input.addEventListener("focus", () => { reposition(); picker.classList.add("open"); });
  input.addEventListener("blur",  () => setTimeout(() => picker.classList.remove("open"), 200));
}

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
const expandedRecipeIds = new Set();

const CATEGORIES = [
  { key: "breakfast", label: "Breakfast", emoji: "🍳" },
  { key: "meal",      label: "Meal",      emoji: "🍽️" },
  { key: "snack",     label: "Snack",     emoji: "🥨" },
  { key: "dessert",   label: "Dessert",   emoji: "🍰" },
  { key: "",          label: "Other",     emoji: "📋" },
];

// ── DOM refs ───────────────────────────────────────────────────────────────

const toBuyList               = document.getElementById("to-buy-list");
const pantryList              = document.getElementById("pantry-list");
const toBuyEmpty              = document.getElementById("to-buy-empty");
const pantryEmpty             = document.getElementById("pantry-empty");
const addForm                 = document.getElementById("add-form");
const newItemInput            = document.getElementById("new-item-input");
const addPantryForm           = document.getElementById("add-pantry-form");
const newPantryInput          = document.getElementById("new-pantry-input");
const recipesList             = document.getElementById("recipes-list");
const recipesEmpty            = document.getElementById("recipes-empty");
const addRecipeForm           = document.getElementById("add-recipe-form");
const recipeNameInput         = document.getElementById("recipe-name-input");
const recipeCategoryInput     = document.getElementById("recipe-category-input");
const recipeEmojiInput        = document.getElementById("recipe-emoji-input");
attachEmojiPicker(recipeEmojiInput);
const recipeIngredientsInput  = document.getElementById("recipe-ingredients-input");
const recipeInstructionsInput = document.getElementById("recipe-instructions-input");
const recipeSourceInput       = document.getElementById("recipe-source-input");
const tabButtons              = document.querySelectorAll(".tab-button");
const pages                   = document.querySelectorAll(".page");

// ── matching ───────────────────────────────────────────────────────────────

function getPantryItems() {
  return items.filter(i => i.status === "inPantry");
}

function stem(s) { return s.replace(/es$/, "").replace(/s$/, ""); }

const INGREDIENT_ALIASES = [
  [/\begg yolks?\b/, "eggs"],
  [/\byolks?\b/,     "eggs"],
];

function normalizeIngredient(s) {
  for (const [pattern, replacement] of INGREDIENT_ALIASES) {
    if (pattern.test(s)) return replacement;
  }
  return s;
}

function ingredientMatchesPantryItem(ingText, pantryItem) {
  const ingBase  = normalizeIngredient(parseQtyAndBase(ingText).base);
  const itemBase = normalizeIngredient(normalize(pantryItem.name));
  return ingBase === itemBase || stem(ingBase) === stem(itemBase);
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

    const iconWrap = document.createElement("div");
    iconWrap.className = "card-icon-wrap";
    const icon = document.createElement("span");
    icon.className = "card-icon";
    icon.textContent = getIngredientEmoji(item.name);
    iconWrap.appendChild(icon);

    const body = document.createElement("div");
    body.className = "card-body";
    const nameEl = document.createElement("span");
    nameEl.className = "card-name";
    nameEl.textContent = item.name;
    body.appendChild(nameEl);
    if (item.qty) {
      const qtyEl = document.createElement("span");
      qtyEl.className = "card-qty";
      qtyEl.textContent = item.qty;
      body.appendChild(qtyEl);
    }

    const right = document.createElement("div");
    right.className = "card-right";

    if (item.status === "inPantry") {
      const check = document.createElement("span");
      check.className = "card-check";
      check.textContent = "✓";
      right.appendChild(check);
    }

    const del = document.createElement("button");
    del.className = "card-delete";
    del.type = "button";
    del.textContent = "×";
    del.addEventListener("click", e => { e.stopPropagation(); deleteItem(item.id); });
    right.appendChild(del);

    li.append(iconWrap, body, right);
    gridEl.appendChild(li);
  }
}

function buildInstructions(text) {
  const div = document.createElement("div");
  div.className = "instructions-text";
  text.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const p = document.createElement("p");
    p.className = "instructions-line";
    const m = trimmed.match(/^(\d+)\.\s*(.*)/);
    if (m) {
      const num = document.createElement("span");
      num.className = "step-number";
      num.textContent = m[1];
      p.append(num, " " + m[2]);
    } else {
      p.textContent = trimmed;
    }
    div.appendChild(p);
  });
  return div;
}

function renderRecipes() {
  const pantryItems = getPantryItems();

  const withStatus = recipes.map(recipe => {
    const missing = recipe.ingredients.filter(ing =>
      !isIgnoredIngredient(ing) && !ingredientInPantry(ing, pantryItems)
    );
    return { recipe, missing };
  });

  recipesList.innerHTML = "";

  for (const { key, label, emoji } of CATEGORIES) {
    const group = withStatus
      .filter(({ recipe }) => (recipe.category || "") === key)
      .sort((a, b) => a.missing.length - b.missing.length);

    if (!group.length) continue;

    const section = document.createElement("div");
    section.className = "recipe-section";

    const heading = document.createElement("h3");
    heading.className = "recipe-section-heading";
    heading.textContent = `${emoji} ${label}`;
    section.appendChild(heading);

    const ul = document.createElement("ul");
    ul.className = "recipe-list";

    for (const { recipe, missing } of group) {
      const li = document.createElement("li");
      li.className = "recipe-compact-card";

      if (editingRecipeId === recipe.id) {
        li.appendChild(buildRecipeEditForm(recipe));
        ul.appendChild(li);
        continue;
      }

      // Clicking anywhere on the card toggles it
      li.addEventListener("click", () => {
        if (expandedRecipeIds.has(recipe.id)) {
          expandedRecipeIds.delete(recipe.id);
        } else {
          expandedRecipeIds.add(recipe.id);
        }
        renderRecipes();
      });

      // Compact header (always visible)
      const header = document.createElement("div");
      header.className = "recipe-compact-header";

      const catEmoji = document.createElement("span");
      catEmoji.className = "recipe-cat-emoji";
      catEmoji.textContent = recipe.emoji || emoji;

      const nameEl = document.createElement("span");
      nameEl.className = "recipe-compact-name";
      nameEl.textContent = recipe.name;

      const badge = document.createElement("span");
      badge.className = "recipe-badge " + (missing.length === 0 ? "ready" : "missing");
      badge.textContent = missing.length === 0 ? "✓" : `${missing.length} missing`;

      const chevron = document.createElement("span");
      chevron.className = "recipe-chevron";
      chevron.textContent = expandedRecipeIds.has(recipe.id) ? "▾" : "▸";

      header.append(catEmoji, nameEl, badge, chevron);
      li.appendChild(header);

      // Expanded detail
      if (expandedRecipeIds.has(recipe.id)) {
        const detail = document.createElement("div");
        detail.className = "recipe-detail";

        const ingsHeading = document.createElement("p");
        ingsHeading.className = "recipe-detail-heading";
        ingsHeading.textContent = "Ingredients";
        detail.appendChild(ingsHeading);

        const ings = document.createElement("ul");
        ings.className = "ingredients";
        for (const ing of recipe.ingredients) {
          const ingEl = document.createElement("li");
          ingEl.textContent = ing;
          ingEl.className = (isIgnoredIngredient(ing) || ingredientInPantry(ing, pantryItems)) ? "have" : "missing";
          ings.appendChild(ingEl);
        }
        detail.appendChild(ings);

        if (recipe.instructions && recipe.instructions.trim()) {
          const instrHeading = document.createElement("p");
          instrHeading.className = "recipe-detail-heading";
          instrHeading.textContent = "Instructions";
          detail.appendChild(instrHeading);
          const instrEl = buildInstructions(recipe.instructions);
          detail.appendChild(instrEl);
        }

        if (recipe.source_url && recipe.source_url.trim()) {
          const sourceLink = document.createElement("a");
          sourceLink.href = recipe.source_url.trim();
          sourceLink.target = "_blank";
          sourceLink.rel = "noopener noreferrer";
          sourceLink.className = "recipe-source-link";
          sourceLink.textContent = "🔗 Source";
          detail.appendChild(sourceLink);
        }

        const actions = document.createElement("div");
        actions.className = "recipe-actions";

        if (missing.length > 0) {
          const addBtn = document.createElement("button");
          addBtn.type = "button";
          addBtn.className = "add-missing-button";
          addBtn.textContent = "Add missing to list";
          addBtn.addEventListener("click", e => { e.stopPropagation(); addMissingToList(missing); });
          actions.appendChild(addBtn);
        } else {
          const cookBtn = document.createElement("button");
          cookBtn.type = "button";
          cookBtn.className = "cook-button";
          cookBtn.textContent = "Cooked!";
          cookBtn.addEventListener("click", e => { e.stopPropagation(); cookRecipe(recipe); });
          actions.appendChild(cookBtn);
        }

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "recipe-edit-btn";
        editBtn.textContent = "✏️ Edit";
        editBtn.addEventListener("click", e => { e.stopPropagation(); startEditRecipe(recipe.id); });

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "delete";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", e => { e.stopPropagation(); deleteRecipe(recipe.id); });

        actions.append(editBtn, delBtn);
        detail.appendChild(actions);
        li.appendChild(detail);
      }

      ul.appendChild(li);
    }

    section.appendChild(ul);
    recipesList.appendChild(section);
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

  const categorySelect = document.createElement("select");
  categorySelect.className = "recipe-edit-field";
  for (const { key, label, emoji } of CATEGORIES) {
    if (key === "" && label === "Other") continue;
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${emoji} ${label}`;
    if ((recipe.category || "") === key) opt.selected = true;
    categorySelect.appendChild(opt);
  }
  const noneOpt = document.createElement("option");
  noneOpt.value = "";
  noneOpt.textContent = "No category";
  if (!recipe.category) noneOpt.selected = true;
  categorySelect.insertBefore(noneOpt, categorySelect.firstChild);

  const emojiInput = document.createElement("input");
  emojiInput.type = "text";
  emojiInput.value = recipe.emoji || "";
  emojiInput.className = "recipe-edit-field recipe-emoji-field";
  emojiInput.placeholder = "✨";
  emojiInput.maxLength = 4;
  attachEmojiPicker(emojiInput);

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

  const sourceInput = document.createElement("input");
  sourceInput.type = "url";
  sourceInput.value = recipe.source_url || "";
  sourceInput.className = "recipe-edit-field";
  sourceInput.placeholder = "Source URL (optional)";

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
    updateRecipe(recipe.id, nameInput.value, ingTextarea.value, instrTextarea.value, categorySelect.value, emojiInput.value, sourceInput.value);
    editingRecipeId = null;
    renderRecipes();
  });

  const formRow = document.createElement("div");
  formRow.className = "recipe-form-row";
  formRow.append(categorySelect, emojiInput);

  actions.append(cancelBtn, saveBtn);
  wrapper.append(nameInput, formRow, ingTextarea, instrTextarea, sourceInput, actions);
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
    if (existing.status === "inPantry") {
      existing.status = "toBuy";
      if (trimmedQty) existing.qty = trimmedQty;
      render();
      db.from("items").update({ status: "toBuy", qty: existing.qty }).eq("id", existing.id).then(dbErr("addItem:fromPantry"));
    } else {
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

function addRecipe(name, ingredientsText, instructions, category = "", emoji = "", sourceUrl = "") {
  const trimmedName = name.trim();
  const ingredients = ingredientsText.split("\n").map(l => l.trim()).filter(Boolean);
  if (!trimmedName || ingredients.length === 0) return;
  const newRecipe = { id: crypto.randomUUID(), name: trimmedName, ingredients, instructions: instructions.trim(), category, emoji: emoji.trim(), source_url: sourceUrl.trim() };
  recipes.unshift(newRecipe);
  renderRecipes();
  db.from("recipes").insert(newRecipe).then(dbErr("addRecipe"));
}

function updateRecipe(id, name, ingredientsText, instructions, category = "", emoji = "", sourceUrl = "") {
  const recipe = recipes.find(r => r.id === id);
  if (!recipe) return;
  const trimmedName = name.trim();
  const ingredients = ingredientsText.split("\n").map(l => l.trim()).filter(Boolean);
  if (!trimmedName || ingredients.length === 0) return;
  recipe.name         = trimmedName;
  recipe.ingredients  = ingredients;
  recipe.instructions = instructions.trim();
  recipe.category     = category;
  recipe.emoji        = emoji.trim();
  recipe.source_url   = sourceUrl.trim();
  db.from("recipes").update({ name: trimmedName, ingredients, instructions: instructions.trim(), category, emoji: emoji.trim(), source_url: sourceUrl.trim() }).eq("id", id).then(dbErr("updateRecipe"));
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
  const { base: name, qty } = parseQtyAndBase(newItemInput.value);
  addItem(name, qty || "");
  newItemInput.value = "";
  newItemInput.focus();
});

addPantryForm.addEventListener("submit", e => {
  e.preventDefault();
  const { base: name, qty } = parseQtyAndBase(newPantryInput.value);
  addToPantry(name, qty || "");
  newPantryInput.value = "";
  newPantryInput.focus();
});

addRecipeForm.addEventListener("submit", e => {
  e.preventDefault();
  addRecipe(recipeNameInput.value, recipeIngredientsInput.value, recipeInstructionsInput.value, recipeCategoryInput.value, recipeEmojiInput.value, recipeSourceInput.value);
  recipeNameInput.value         = "";
  recipeCategoryInput.value     = "";
  recipeEmojiInput.value        = "";
  recipeIngredientsInput.value  = "";
  recipeInstructionsInput.value = "";
  recipeSourceInput.value       = "";
  recipeNameInput.focus();
});

function switchTab(tab) {
  tabButtons.forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  pages.forEach(p => p.classList.toggle("active", p.id === `${tab}-page`));
  localStorage.setItem("active_tab", tab);
}

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

const savedTab = localStorage.getItem("active_tab");
if (savedTab) switchTab(savedTab);

if ("serviceWorker" in navigator && location.hostname !== "localhost") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// ── AI recipe suggestions ──────────────────────────────────────────────────

const suggestBtn      = document.getElementById("suggest-btn");
const suggestQuery    = document.getElementById("suggest-query");
const suggestResult   = document.getElementById("suggest-result");
const geminiKeyForm   = document.getElementById("gemini-key-form");
const geminiKeyInput  = document.getElementById("gemini-key-input");
const geminiKeySave   = document.getElementById("gemini-key-save");

async function loadGeminiKey() {
  const cached = localStorage.getItem("gemini_key");
  if (cached) return cached;
  const { data } = await db.from("settings").select("value").eq("key", "gemini_key").maybeSingle();
  if (data?.value) {
    localStorage.setItem("gemini_key", data.value);
    return data.value;
  }
  return null;
}

async function saveGeminiKey(key) {
  localStorage.setItem("gemini_key", key);
  db.from("settings").upsert({ key: "gemini_key", value: key }).then(dbErr("saveGeminiKey"));
}

async function clearGeminiKey() {
  localStorage.removeItem("gemini_key");
  db.from("settings").delete().eq("key", "gemini_key").then(dbErr("clearGeminiKey"));
}

geminiKeySave.addEventListener("click", async () => {
  const key = geminiKeyInput.value.trim();
  if (!key) return;
  await saveGeminiKey(key);
  geminiKeyForm.style.display = "none";
  geminiKeyInput.value = "";
  runSuggest(key);
});

suggestBtn.addEventListener("click", async () => {
  const key = await loadGeminiKey();
  if (!key) {
    geminiKeyForm.style.display = "flex";
    geminiKeyInput.focus();
    return;
  }
  runSuggest(key);
});

async function callGemini(geminiKey, model, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    }
  );
  return res.json();
}

async function runSuggest(geminiKey) {
  const pantry = getPantryItems();
  if (!pantry.length) {
    suggestResult.textContent   = "Add some items to your pantry first!";
    suggestResult.style.display = "block";
    return;
  }

  suggestBtn.disabled    = true;
  suggestBtn.textContent = "⏳ Getting ideas...";
  suggestResult.style.display = "none";

  const ingredientList = pantry
    .map(i => i.qty ? `${i.qty} ${i.name}` : i.name)
    .join(", ");

  const query = suggestQuery.value.trim();
  const focus = query ? `${query} ` : "";
  const userPrompt = `I have these ingredients in my pantry: ${ingredientList}.
Suggest 3 simple ${focus}recipes I can make. For each recipe include: name, ingredients needed, and brief step-by-step instructions. Be concise.`;

  const models = ["gemini-2.5-flash", "gemini-2.0-flash"];

  try {
    let text = null;
    let lastError = "";
    let lastData = null;

    for (const model of models) {
      const data = await callGemini(geminiKey, model, userPrompt);
      text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) { lastData = data; break; }

      const code = data.error?.code;
      lastError  = data.error?.message || "";

      if (code === 400 || code === 401 || code === 403) {
        clearGeminiKey();
        suggestResult.textContent   = "❌ Invalid API key — cleared. Click the button again to enter a new one.";
        suggestResult.style.display = "block";
        return;
      }
      // 429 (quota) or 503 (overload) → try next model
    }

    if (!text) {
      suggestResult.textContent   = `⚠️ Error: ${lastError || "No response from Gemini."}`;
      suggestResult.style.display = "block";
      return;
    }

    suggestResult.innerHTML = "";
    suggestResult.style.display = "block";

    const textEl = document.createElement("p");
    textEl.style.whiteSpace = "pre-wrap";
    textEl.style.margin = "0";
    textEl.textContent = text;
    suggestResult.appendChild(textEl);

    // Show grounding sources if available
    const chunks = lastData?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.map(c => c.web).filter(Boolean);
    if (sources.length) {
      const sourcesEl = document.createElement("div");
      sourcesEl.className = "suggest-sources";
      const label = document.createElement("p");
      label.className = "suggest-sources-label";
      label.textContent = "Sources";
      sourcesEl.appendChild(label);
      sources.forEach(({ uri, title }) => {
        const a = document.createElement("a");
        a.href = uri;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "suggest-source-link";
        a.textContent = title || uri;
        sourcesEl.appendChild(a);
      });
      suggestResult.appendChild(sourcesEl);
    }
  } catch {
    suggestResult.textContent   = "Failed to reach Gemini. Check your connection.";
    suggestResult.style.display = "block";
  } finally {
    suggestBtn.disabled    = false;
    suggestBtn.textContent = "✨ Suggest from pantry";
  }
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
