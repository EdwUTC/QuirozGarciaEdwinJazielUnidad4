// scripts/crear-esquema.js
//
// Carga schema.sql en la base indicada por DATABASE_URL.
// Se usa DATABASE_URL_UNPOOLED cuando existe: las sentencias DDL
// conviene ejecutarlas contra la conexión directa, no la agrupada.
//
//   node scripts/crear-esquema.js
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!url) {
    console.error("Falta DATABASE_URL. Ejecuta antes: neon env pull");
    process.exit(1);
}

const esquema = path.join(__dirname, "..", "schema.sql");

async function main() {
    const cliente = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
    });

    await cliente.connect();

    const sql = fs.readFileSync(esquema, "utf8");
    await cliente.query(sql);

    const tablas = await cliente.query(
        `SELECT tablename FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename`
    );

    console.log("Esquema aplicado. Tablas:");
    tablas.rows.forEach((fila) => console.log("  -", fila.tablename));

    await cliente.end();
}

main().catch((error) => {
    console.error("Error al crear el esquema:", error.message);
    process.exit(1);
});
