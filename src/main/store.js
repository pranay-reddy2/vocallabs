const fs = require("fs");
const path = require("path");
const { app } = require("electron");

class Store {
  constructor() {
    this.filePath = path.join(app.getPath("userData"), "settings.json");
    this._data = this._load();
  }

  _load() {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    } catch {
      return {};
    }
  }

  _save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this._data, null, 2));
  }

  get(key) {
    return this._data[key];
  }

  set(key, value) {
    this._data[key] = value;
    this._save();
  }

  getAll() {
    return { ...this._data };
  }

  setAll(obj) {
    this._data = { ...this._data, ...obj };
    this._save();
  }
}

module.exports = Store;
