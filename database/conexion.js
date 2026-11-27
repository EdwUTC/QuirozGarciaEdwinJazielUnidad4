// database/conexion.js
const { Pool } = require("pg");

// Los proveedores de base de datos gestionada (Neon, Azure, RDS) exigen TLS.
// DB_SSL=true lo activa; si se entrega DB_SSL_CA se valida el certificado
// en lugar de aceptarlo a ciegas.
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

// Se prefiere DATABASE_URL cuando existe (es lo que entrega Neon y la
// mayoría de los proveedores); si no, se usan las variables DB_* sueltas
// que utiliza el entorno local.
function configuracion() {
    const url = process.env.DATABASE_URL;

    let config;

    if (url) {
        config = { connectionString: url };

        // Neon ya incluye sslmode en la cadena; si no viniera, se fuerza TLS.
        const ssl = opcionesSSL();
        if (ssl) {
            config.ssl = ssl;
        } else if (!/sslmode=/i.test(url)) {
            config.ssl = { rejectUnauthorized: false };
        }
    } else {
        config = {
            user: process.env.DB_USUARIO,
            host: process.env.DB_HOST,
            database: process.env.DB_NOMBRE,
            password: String(process.env.DB_PASSWORD || ""),
            port: Number(process.env.DB_PUERTO) || 5432,
            ssl: opcionesSSL()
        };
    }

    config.max = Number(process.env.DB_POOL_MAX) || 10;
    config.idleTimeoutMillis = 30000;
    config.connectionTimeoutMillis = 10000;

    return config;
}

const conexion = new Pool(configuracion());

conexion.query("SELECT NOW()", (error) => {
    if (error) {
        console.log("Error de conexión:", error.message);
    } else {
        console.log("Conexión exitosa a PostgreSQL");
    }
});

module.exports = conexion;
