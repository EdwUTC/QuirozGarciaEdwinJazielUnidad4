// scripts/crear-demo.js
//
// Crea las tres cuentas de demostración (paciente, médico y administrador)
// en la base indicada por DATABASE_URL, si no existen.
//
//   npm run db:demo
require("dotenv").config();

const bcrypt = require("bcrypt");
const { Client } = require("pg");

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!url) {
    console.error("Falta DATABASE_URL. Ejecuta antes: neon env pull");
    process.exit(1);
}

const CUENTAS = [
    { nombre: "Usuario de Prueba", correo: "prueba@rayito.test", rol: "paciente" },
    { nombre: "Dra. Ana Martinez", correo: "medico@rayito.test", rol: "medico" },
    { nombre: "Administrador", correo: "admin@rayito.test", rol: "administrador" }
];

const CLAVE = "Prueba123";

async function main() {
    const cliente = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
    });

    await cliente.connect();

    const hash = await bcrypt.hash(CLAVE, 10);

    for (const cuenta of CUENTAS) {
        await cliente.query(
            `INSERT INTO usuarios (nombre, correo, password, rol)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (correo) DO NOTHING`,
            [cuenta.nombre, cuenta.correo, hash, cuenta.rol]
        );
    }

    const total = await cliente.query("SELECT COUNT(*)::int AS total FROM usuarios");

    console.log("Cuentas de demostración listas:");
    CUENTAS.forEach((c) => console.log(`  ${c.correo}  (${c.rol})`));
    console.log(`Contraseña: ${CLAVE}`);
    console.log(`Usuarios en la base: ${total.rows[0].total}`);

    await cliente.end();
}

main().catch((error) => {
    console.error("Error al crear las cuentas:", error.message);
    process.exit(1);
});
