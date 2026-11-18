// routes/public.js
//
// Páginas de acceso libre (no requieren sesión).
const express = require("express");

const router = express.Router();
const conexion = require("../database/conexion");
const { EMOCIONES } = require("../services/emociones");
const {
    LICENCIADA,
    PILARES,
    PARTICIPACIONES,
    ACTIVIDADES
} = require("../services/contenido");

// Especialistas activos, tomados de la base de datos.
async function especialistasActivos() {
    const resultado = await conexion.query(
        `SELECT id, nombre, especialidad, descripcion
           FROM especialistas
          WHERE activo = true
          ORDER BY nombre`
    );

    return resultado.rows;
}

// ---------------- Inicio ----------------
router.get("/", async (req, res) => {
    let especialistas = [];

    try {
        especialistas = await especialistasActivos();
    } catch (error) {
        // El inicio debe cargar aunque la base esté caída.
        console.error("No se pudieron cargar los especialistas:", error);
    }

    res.render("index", {
        titulo: "Un Rayito de Sol",
        licenciada: LICENCIADA,
        pilares: PILARES,
        participaciones: PARTICIPACIONES,
        actividades: ACTIVIDADES,
        especialistas: especialistas.slice(0, 3)
    });
});

// ---------------- Páginas informativas ----------------
router.get("/nosotros", (req, res) => {
    res.render("nosotros", { titulo: "Nosotros", licenciada: LICENCIADA, pilares: PILARES });
});

router.get("/servicios", (req, res) => {
    res.render("servicios", { titulo: "Servicios" });
});

router.get("/especialistas", async (req, res) => {
    let especialistas = [];

    try {
        especialistas = await especialistasActivos();
    } catch (error) {
        console.error("No se pudieron cargar los especialistas:", error);
    }

    res.render("especialistas", { titulo: "Especialistas", especialistas });
});

router.get("/actividades", (req, res) => {
    res.render("actividades", {
        titulo: "Nuestras actividades",
        actividades: ACTIVIDADES
    });
});

// Nota: /padres se atiende en routes/padres.js (biblioteca de la tabla
// `recursos`), no aquí.

router.get("/contacto", (req, res) => {
    res.render("contacto", { titulo: "Contacto" });
});

router.get("/ayuda", (req, res) => {
    res.render("ayuda", { titulo: "Ayuda" });
});

router.get("/mapa-sitio", (req, res) => {
    res.render("mapa-sitio", { titulo: "Mapa del Sitio" });
});

router.get("/rincon", (req, res) => {
    res.render("rincon", {
        titulo: "Rincón de Rayito",
        emociones: EMOCIONES
    });
});

// Búsqueda sencilla: redirige al usuario a la página que escribió.
router.get("/buscar", (req, res) => {
    const busqueda = String(req.query.q || "").trim().toLowerCase();

    const paginas = {
        inicio: "/",
        nosotros: "/nosotros",
        servicios: "/servicios",
        especialistas: "/especialistas",
        actividades: "/actividades",
        contacto: "/contacto",
        ayuda: "/ayuda",
        registro: "/registro",
        login: "/login",
        recuperar: "/recuperar",
        mapa: "/mapa-sitio",
        padres: "/padres",
        madres: "/padres",
        rincon: "/rincon",
        ninos: "/rincon",
        ninas: "/rincon",
        mensajes: "/mensajes"
    };

    if (paginas[busqueda]) {
        return res.redirect(paginas[busqueda]);
    }

    res.status(404).render("404", { titulo: "Resultado no encontrado" });
});

module.exports = router;

// Nota: el buzón y la recuperación de contraseña viven en las rutas
// privadas (routes/dashboard.js) y en routes/auth.js respectivamente.
// Antes había copias duplicadas aquí que nunca se ejecutaban.
