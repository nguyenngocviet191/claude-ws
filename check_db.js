
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM projects", [], (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log("PROJECTS:");
  console.log(JSON.stringify(rows.map(r => ({ id: r.id, name: r.name, path: r.path })), null, 2));
  
  db.all("SELECT * FROM project_settings", [], (err, settings) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log("SETTINGS:");
    console.log(JSON.stringify(settings, null, 2));
    db.close();
  });
});
