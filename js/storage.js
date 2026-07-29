const DB_KEY = "wardrobe_app_db_v1";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function defaultDB() {
  return {
    profile: { name: "" },
    settings: {
      lang: "en",
      theme: "system",
      pinEnabled: false,
      pin: null,
      hideCycleTab: false,
      notificationsEnabled: false
    },
    unlocked: false,
    cycleProfile: null,
    items: [],
    outfits: [],
    cycleEntries: [],
    events: [],
    journalEntries: [],
    tasks: [],
    habits: [],
    firedReminders: [],
    shoppingList: []
  };
}

function migrateItem(item) {
  if (!item.categoryGroup) {
    const oldCat = item.category || "top";
    if (oldCat === "shoes") { item.categoryGroup = "shoes"; item.subCategory = "sneakers"; }
    else if (oldCat === "bag") { item.categoryGroup = "accessories"; item.subCategory = "handbag"; }
    else if (oldCat === "accessory") { item.categoryGroup = "accessories"; item.subCategory = "necklace"; }
    else { item.categoryGroup = "parts"; item.subCategory = oldCat; }
  }
  return item;
}

const Store = {
  data: null,

  load() {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      try {
        this.data = Object.assign(defaultDB(), JSON.parse(raw));
      } catch (e) {
        this.data = defaultDB();
      }
    } else {
      this.data = defaultDB();
    }
    this.data.items.forEach(migrateItem);
    return this.data;
  },

  save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this.data));
  },

  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }
};

function resizeImageFile(file, maxDim, callback) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
