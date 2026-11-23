// database/conexion.js
const { Pool } = require("pg");

// Los proveedores de base de datos gestionada (DigitalOcean, Azure, RDS)
// exigen TLS. DB_SSL=true lo activa; si se entrega DB_SSL_CA se valida
// el certificado en lugar de aceptarlo a ciegas.
function opcionesSSL() {
    const modo = String(process.env.DB_SSL || "").toLowerCase();

    if (modo === "true") {
        return { rejectUnauthorized: false };
    }

    if (modo === "ca" && process.env.DB_SSL_CA) {
        return {
            ca: String(process.env.DB_SSL_CA).replace(/\\n/g, "\n"),
            rejectUnauthorized: true
        };
    }

    return false;
}

const conexion = new Pool({
    user: process.env.DB_USUARIO,
    host: process.env.DB_HOST,
    database: process.env.DB_NOMBRE,
    password: String(process.env.DB_PASSWORD),
    port: Number(process.env.DB_PUERTO),
    ssl: opcionesSSL(),
    // En producción conviene un límite explícito de conexiones.
    max: Number(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

conexion.query("SELECT NOW()", (error) => {
    if (error) {
        console.log("Error de conexión:", error.message);
    } else {
        console.log("Conexión exitosa a PostgreSQL");
    }
});

module.exports = conexion;
