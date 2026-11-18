// routes/mensajes.js
//
// Mensajería privada entre cada paciente y la licenciada.
//
// Sustituye al antiguo "chat", donde cualquier usuario con sesión veía
// los mensajes de todos los demás: en un consultorio eso es un problema
// de confidencialidad, no solo de diseño.
const express = require("express");

const router = express.Router();
const conexion = require("../database/conexion");
const { protegerRuta } = require("./middleware");
const { idUsuario } = require("../services/usuario");

const LARGO_MAXIMO = 1000;

function esStaff(req) {
    return req.session.rol === "medico" || req.session.rol === "administrador";
}

/* =========================================================
   Bandeja de la licenciada (todas las conversaciones)
   ========================================================= */
async function bandeja(req, res) {
    const conversaciones = await conexion.query(
        `SELECT u.id,
                u.nombre,
                MAX(m.creado_en) AS ultimo,
                TO_CHAR(MAX(m.creado_en), 'DD/MM/YYYY HH24:MI') AS ultimo_texto_fecha,
                (SELECT texto FROM mensajes x
                  WHERE x.usuario_id = u.id
                  ORDER BY x.id DESC LIMIT 1) AS ultimo_texto,
                COUNT(*) FILTER (WHERE m.autor = 'paciente' AND m.leido = false) AS sin_leer
           FROM usuarios u
           JOIN mensajes m ON m.usuario_id = u.id
          WHERE u.rol = 'paciente'
          GROUP BY u.id, u.nombre
          ORDER BY ultimo DESC`
    );

    res.render("mensajes-lista", {
        titulo: "Mensajes",
        conversaciones: conversaciones.rows
    });
}

/* =========================================================
   Conversación de un paciente
   ========================================================= */
async function hilo(req, res, usuarioId, esVistaStaff) {
    const mensajes = await conexion.query(
        `SELECT autor, texto, TO_CHAR(creado_en, 'DD/MM/YYYY HH24:MI') AS fecha
           FROM mensajes
          WHERE usuario_id = $1
          ORDER BY id ASC`,
        [usuarioId]
    );

    // Al abrir la conversación se marcan como leídos los mensajes
    // que escribió la otra parte.
    const autorLeido = esVistaStaff ? "paciente" : "licenciada";

    await conexion.query(
        `UPDATE mensajes SET leido = true
          WHERE usuario_id = $1 AND autor = $2 AND leido = false`,
        [usuarioId, autorLeido]
    );

    let paciente = null;

    if (esVistaStaff) {
        const datos = await conexion.query(
            "SELECT nombre, correo FROM usuarios WHERE id = $1",
            [usuarioId]
        );

        if (datos.rows.length === 0) return res.redirect("/mensajes");
        paciente = datos.rows[0];
    }

    res.render("mensajes", {
        titulo: "Mensajes",
        mensajes: mensajes.rows,
        paciente: paciente,
        esStaff: esVistaStaff,
        usuarioId: usuarioId,
        accion: esVistaStaff ? `/mensajes/${usuarioId}` : "/mensajes"
    });
}

/* =========================================================
   Rutas
   ========================================================= */

// Estado de la conversación (para el refresco automático).
// Debe ir antes de "/mensajes/:usuarioId".
router.get("/mensajes/estado", protegerRuta, async (req, res) => {
    try {
        const usuarioId = esStaff(req)
            ? Number(req.query.usuario) || 0
            : await idUsuario(req);

        if (!usuarioId) return res.json({ total: 0 });

        const r = await conexion.query(
            "SELECT COUNT(*)::int AS total FROM mensajes WHERE usuario_id = $1",
            [usuarioId]
        );

        res.json({ total: r.rows[0].total });
    } catch (error) {
        console.error("Error al consultar el estado de los mensajes:", error);
        res.json({ total: 0 });
    }
});

router.get("/mensajes", protegerRuta, async (req, res) => {
    try {
        if (esStaff(req)) return await bandeja(req, res);

        const usuarioId = await idUsuario(req);
        if (!usuarioId) return res.redirect("/login");

        return await hilo(req, res, usuarioId, false);
    } catch (error) {
        console.error("Error al cargar los mensajes:", error);
        req.session.mensaje = { tipo: "error", texto: "No se pudieron cargar los mensajes" };
        res.redirect("/dashboard");
    }
});

router.post("/mensajes", protegerRuta, async (req, res) => {
    const texto = String(req.body.texto || "").trim().slice(0, LARGO_MAXIMO);

    if (!texto) {
        req.session.mensaje = { tipo: "warning", texto: "Escribe un mensaje" };
        return res.redirect("/mensajes");
    }

    try {
        // Un médico o administrador responde desde la vista de la
        // conversación de un paciente concreto.
        if (esStaff(req)) {
            const usuarioId = Number(req.body.usuario_id);

            if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
                return res.redirect("/mensajes");
            }

            await conexion.query(
                `INSERT INTO mensajes (usuario_id, autor, texto)
                 VALUES ($1, 'licenciada', $2)`,
                [usuarioId, texto]
            );

            return res.redirect(`/mensajes/${usuarioId}`);
        }

        const usuarioId = await idUsuario(req);

        await conexion.query(
            `INSERT INTO mensajes (usuario_id, autor, texto)
             VALUES ($1, 'paciente', $2)`,
            [usuarioId, texto]
        );

        res.redirect("/mensajes");
    } catch (error) {
        console.error("Error al enviar el mensaje:", error);
        req.session.mensaje = { tipo: "error", texto: "No se pudo enviar el mensaje" };
        res.redirect("/mensajes");
    }
});

// La licenciada abre la conversación de un paciente.
router.get("/mensajes/:usuarioId", protegerRuta, async (req, res) => {
    try {
        if (!esStaff(req)) {
            // Un paciente solo puede ver su propia conversación.
            return res.redirect("/mensajes");
        }

        const usuarioId = Number(req.params.usuarioId);

        if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
            return res.redirect("/mensajes");
        }

        return await hilo(req, res, usuarioId, true);
    } catch (error) {
        console.error("Error al abrir la conversación:", error);
        res.redirect("/mensajes");
    }
});

router.post("/mensajes/:usuarioId", protegerRuta, async (req, res) => {
    if (!esStaff(req)) return res.redirect("/mensajes");

    const usuarioId = Number(req.params.usuarioId);
    const texto = String(req.body.texto || "").trim().slice(0, LARGO_MAXIMO);

    if (!Number.isInteger(usuarioId) || usuarioId <= 0 || !texto) {
        return res.redirect("/mensajes");
    }

    try {
        await conexion.query(
            `INSERT INTO mensajes (usuario_id, autor, texto)
             VALUES ($1, 'licenciada', $2)`,
            [usuarioId, texto]
        );

        res.redirect(`/mensajes/${usuarioId}`);
    } catch (error) {
        console.error("Error al responder:", error);
        req.session.mensaje = { tipo: "error", texto: "No se pudo enviar la respuesta" };
        res.redirect(`/mensajes/${usuarioId}`);
    }
});

module.exports = router;
