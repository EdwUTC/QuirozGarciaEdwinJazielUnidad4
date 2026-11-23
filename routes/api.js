// routes/api.js
//
// API REST propia del consultorio.
//
//   GET    /api/estado            Estado del servicio (público)
//   GET    /api/especialistas     Catálogo (público)
//   GET    /api/citas             Citas del usuario
//   POST   /api/citas             Agendar
//   PATCH  /api/citas/:id         Cancelar
//   GET    /api/diario            Últimos registros
//   POST   /api/diario            Registrar emoción
//   GET    /api/mensajes          Conversación
//   POST   /api/mensajes          Enviar mensaje
//   GET    /api/mensajes/estado   Número de mensajes (para el refresco)
//
// Todas las respuestas son JSON con la forma { ok, ... }.
// La autenticación usa la misma sesión que la web y los POST/PATCH
// exigen el token CSRF en la cabecera `x-csrf-token`.
const express = require("express");
const os = require("os");

const router = express.Router();
const conexion = require("../database/conexion");
const { idUsuario } = require("../services/usuario");
const { EMOCIONES } = require("../services/emociones");
const { listarCitas, crearCita, cancelarCita } = require("../services/citas");

const VERSION = "1.0.0";
const LARGO_MENSAJE = 1000;

/* =========================================================
   Utilidades
   ========================================================= */

function sesion(req, res, next) {
    if (!req.session || !req.session.usuario) {
        return res.status(401).json({ ok: false, error: "Debes iniciar sesión" });
    }

    next();
}

function esStaff(req) {
    return req.session.rol === "medico" || req.session.rol === "administrador";
}

function fallo(res, codigo, mensaje, extra) {
    const cuerpo = { ok: false, error: mensaje };

    if (extra) Object.assign(cuerpo, extra);

    return res.status(codigo).json(cuerpo);
}

/* =========================================================
   Estado del servicio
   ========================================================= */
router.get("/estado", async (req, res) => {
    let baseDatos = "desconectada";

    try {
        await conexion.query("SELECT 1");
        baseDatos = "conectada";
    } catch (error) {
        console.error("API /estado: sin conexión a la base:", error.message);
    }

    res.json({
        ok: true,
        servicio: "consultorio-rayito-de-sol",
        version: VERSION,
        // Permite comprobar el balanceo: cada instancia se identifica.
        instancia: process.env.INSTANCE_ID || os.hostname(),
        base_datos: baseDatos,
        hora: new Date().toISOString()
    });
});

/* =========================================================
   Especialistas (público)
   ========================================================= */
router.get("/especialistas", async (req, res) => {
    try {
        const resultado = await conexion.query(
            `SELECT id, nombre, especialidad, descripcion
               FROM especialistas
              WHERE activo = true
              ORDER BY nombre`
        );

        res.json({ ok: true, total: resultado.rowCount, datos: resultado.rows });
    } catch (error) {
        console.error("API /especialistas:", error);
        fallo(res, 500, "No se pudo consultar el catálogo");
    }
});

/* =========================================================
   Citas
   ========================================================= */
router.get("/citas", sesion, async (req, res) => {
    try {
        const usuarioId = await idUsuario(req);
        if (!usuarioId) return fallo(res, 401, "Debes iniciar sesión");

        const citas = await listarCitas(usuarioId);
        res.json({ ok: true, total: citas.length, datos: citas });
    } catch (error) {
        console.error("API GET /citas:", error);
        fallo(res, 500, "No se pudieron consultar las citas");
    }
});

router.post("/citas", sesion, async (req, res) => {
    const cuerpo = req.body || {};

    try {
        const usuarioId = await idUsuario(req);
        if (!usuarioId) return fallo(res, 401, "Debes iniciar sesión");

        const resultado = await crearCita({
            usuarioId,
            especialistaId: Number(cuerpo.especialista_id),
            fecha: String(cuerpo.fecha || ""),
            hora: String(cuerpo.hora || ""),
            motivo: String(cuerpo.motivo || "").trim()
        });

        if (!resultado.ok) {
            return fallo(res, resultado.codigo, resultado.error);
        }

        res.status(201).json({ ok: true, datos: resultado.cita });
    } catch (error) {
        console.error("API POST /citas:", error);
        fallo(res, 500, "No se pudo agendar la cita");
    }
});

// PATCH /api/citas/:id  →  cancela la cita propia
router.patch("/citas/:id", sesion, async (req, res) => {
    try {
        const usuarioId = await idUsuario(req);
        if (!usuarioId) return fallo(res, 401, "Debes iniciar sesión");

        const resultado = await cancelarCita({
            usuarioId,
            citaId: Number(req.params.id)
        });

        if (!resultado.ok) {
            return fallo(res, resultado.codigo, resultado.error);
        }

        res.json({ ok: true, mensaje: "Cita cancelada" });
    } catch (error) {
        console.error("API PATCH /citas:", error);
        fallo(res, 500, "No se pudo cancelar la cita");
    }
});

/* =========================================================
   Diario de emociones
   ========================================================= */
router.get("/diario", sesion, async (req, res) => {
    try {
        const usuarioId = await idUsuario(req);
        if (!usuarioId) return fallo(res, 401, "Debes iniciar sesión");

        const resultado = await conexion.query(
            `SELECT emocion, nota, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha
               FROM diario_emociones
              WHERE usuario_id = $1
              ORDER BY fecha DESC
              LIMIT 30`,
            [usuarioId]
        );

        res.json({ ok: true, total: resultado.rowCount, datos: resultado.rows });
    } catch (error) {
        console.error("API GET /diario:", error);
        fallo(res, 500, "No se pudo consultar el diario");
    }
});

router.post("/diario", sesion, async (req, res) => {
    const cuerpo = req.body || {};
    const emocion = String(cuerpo.emocion || "");
    const nota = String(cuerpo.nota || "").trim().slice(0, 500);

    const permitidas = EMOCIONES.map((item) => item.clave);

    if (!permitidas.includes(emocion)) {
        return fallo(res, 400, "Emoción no válida", { permitidas: permitidas });
    }

    try {
        const usuarioId = await idUsuario(req);
        if (!usuarioId) return fallo(res, 401, "Debes iniciar sesión");

        const resultado = await conexion.query(
            `INSERT INTO diario_emociones (usuario_id, emocion, nota)
             VALUES ($1, $2, $3)
             ON CONFLICT (usuario_id, fecha)
             DO UPDATE SET emocion   = EXCLUDED.emocion,
                           nota      = EXCLUDED.nota,
                           creado_en = NOW()
             RETURNING emocion, nota, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha`,
            [usuarioId, emocion, nota || null]
        );

        res.status(201).json({ ok: true, datos: resultado.rows[0] });
    } catch (error) {
        console.error("API POST /diario:", error);
        fallo(res, 500, "No se pudo guardar el registro");
    }
});

/* =========================================================
   Mensajes
   ========================================================= */

// Cuántos mensajes hay: lo usa el refresco automático del chat.
router.get("/mensajes/estado", sesion, async (req, res) => {
    try {
        const usuarioId = esStaff(req) ? Number(req.query.usuario) : await idUsuario(req);

        if (!usuarioId) return res.json({ ok: true, total: 0 });

        const resultado = await conexion.query(
            "SELECT COUNT(*)::int AS total FROM mensajes WHERE usuario_id = $1",
            [usuarioId]
        );

        res.json({ ok: true, total: resultado.rows[0].total });
    } catch (error) {
        console.error("API /mensajes/estado:", error);
        res.json({ ok: false, total: 0 });
    }
});

router.get("/mensajes", sesion, async (req, res) => {
    try {
        const usuarioId = esStaff(req) ? Number(req.query.usuario) : await idUsuario(req);

        if (!usuarioId) return fallo(res, 400, "Indica el usuario de la conversación");

        const resultado = await conexion.query(
            `SELECT autor, texto, TO_CHAR(creado_en, 'YYYY-MM-DD HH24:MI') AS fecha
               FROM mensajes
              WHERE usuario_id = $1
              ORDER BY id ASC`,
            [usuarioId]
        );

        res.json({ ok: true, total: resultado.rowCount, datos: resultado.rows });
    } catch (error) {
        console.error("API GET /mensajes:", error);
        fallo(res, 500, "No se pudo consultar la conversación");
    }
});

router.post("/mensajes", sesion, async (req, res) => {
    const cuerpo = req.body || {};
    const texto = String(cuerpo.texto || "").trim().slice(0, LARGO_MENSAJE);

    if (!texto) {
        return fallo(res, 400, "El mensaje está vacío");
    }

    try {
        let usuarioId;
        let autor;

        if (esStaff(req)) {
            usuarioId = Number(cuerpo.usuario_id);
            autor = "licenciada";

            if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
                return fallo(res, 400, "Indica el usuario_id del paciente");
            }
        } else {
            usuarioId = await idUsuario(req);
            autor = "paciente";
        }

        const resultado = await conexion.query(
            `INSERT INTO mensajes (usuario_id, autor, texto)
             VALUES ($1, $2, $3)
             RETURNING id, autor, texto, TO_CHAR(creado_en, 'YYYY-MM-DD HH24:MI') AS fecha`,
            [usuarioId, autor, texto]
        );

        res.status(201).json({ ok: true, datos: resultado.rows[0] });
    } catch (error) {
        console.error("API POST /mensajes:", error);
        fallo(res, 500, "No se pudo enviar el mensaje");
    }
});

/* =========================================================
   Rutas no encontradas dentro de /api
   ========================================================= */
router.use((req, res) => {
    res.status(404).json({ ok: false, error: "Ruta de la API no encontrada" });
});

module.exports = router;
