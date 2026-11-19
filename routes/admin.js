// routes/admin.js
//
// Ãrea de administraciÃ³n. Solo accesible para el rol "administrador".
//
//   /admin/usuarios       Crear usuarios, cambiar rol, activar o desactivar
//   /admin/especialistas  Alta y ediciÃ³n del catÃ¡logo de especialistas
//   /admin/buzon          Bandeja de sugerencias (el paciente solo escribe)
//
// Reglas de protecciÃ³n:
//   - Un administrador no puede cambiarse el rol a sÃ­ mismo.
//   - No se puede desactivar la Ãºltima cuenta de administrador activa.
//   - Una cuenta desactivada no puede iniciar sesiÃ³n.
const express = require("express");
const bcrypt = require("bcrypt");

const router = express.Router();
const conexion = require("../database/conexion");
const { protegerRol } = require("./middleware");
const { idUsuario } = require("../services/usuario");

const ROLES = ["paciente", "medico", "administrador"];
const MIN_PASSWORD = 8;

// Todo lo que cuelga de /admin exige el rol de administrador.
router.use(protegerRol("administrador"));

function mensaje(req, tipo, texto) {
    req.session.mensaje = { tipo, texto };
}

/* =========================================================
   USUARIOS
   ========================================================= */

router.get("/usuarios", async (req, res) => {
    const rol = String(req.query.rol || "").trim();
    const busqueda = String(req.query.q || "").trim();

    try {
        const condiciones = [];
        const valores = [];

        if (ROLES.includes(rol)) {
            valores.push(rol);
            condiciones.push(`rol = $${valores.length}`);
        }

        if (busqueda) {
            valores.push(`%${busqueda.toLowerCase()}%`);
            condiciones.push(`(LOWER(nombre) LIKE $${valores.length} OR LOWER(correo) LIKE $${valores.length})`);
        }

        const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

        const usuarios = await conexion.query(
            `SELECT id, nombre, correo, rol, activo,
                    TO_CHAR(creado_en, 'DD/MM/YYYY') AS alta,
                    (SELECT COUNT(*) FROM citas c WHERE c.usuario_id = usuarios.id)::int AS citas
               FROM usuarios
               ${where}
              ORDER BY activo DESC, id`,
            valores
        );

        res.render("admin/usuarios", {
            titulo: "Usuarios",
            usuarios: usuarios.rows,
            roles: ROLES,
            filtroRol: rol,
            busqueda: busqueda,
            usuarioActual: await idUsuario(req)
        });
    } catch (error) {
        console.error("Error al listar usuarios:", error);
        mensaje(req, "error", "No se pudo cargar la lista de usuarios");
        res.redirect("/dashboard");
    }
});

router.post("/usuarios", async (req, res) => {
    const nombre = String(req.body.nombre || "").trim();
    const correo = String(req.body.correo || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const rol = String(req.body.rol || "paciente");

    if (nombre.length < 3) {
        mensaje(req, "error", "Escribe el nombre completo");
        return res.redirect("/admin/usuarios");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        mensaje(req, "error", "El correo no es vÃ¡lido");
        return res.redirect("/admin/usuarios");
    }

    if (password.length < MIN_PASSWORD) {
        mensaje(req, "error", `La contraseÃ±a debe tener al menos ${MIN_PASSWORD} caracteres`);
        return res.redirect("/admin/usuarios");
    }

    if (!ROLES.includes(rol)) {
        mensaje(req, "error", "El rol no es vÃ¡lido");
        return res.redirect("/admin/usuarios");
    }

    try {
        const hash = await bcrypt.hash(password, 10);

        await conexion.query(
            `INSERT INTO usuarios (nombre, correo, password, rol)
             VALUES ($1, $2, $3, $4)`,
            [nombre, correo, hash, rol]
        );

        mensaje(req, "success", `Usuario ${nombre} creado como ${rol}`);
    } catch (error) {
        if (error && error.code === "23505") {
            mensaje(req, "warning", "Ese correo ya estÃ¡ registrado");
        } else {
            console.error("Error al crear usuario:", error);
            mensaje(req, "error", "No se pudo crear el usuario");
        }
    }

    res.redirect("/admin/usuarios");
});

router.post("/usuarios/:id/rol", async (req, res) => {
    const objetivo = Number(req.params.id);
    const rol = String(req.body.rol || "");
    const propio = await idUsuario(req);

    if (!ROLES.includes(rol)) {
        mensaje(req, "error", "El rol no es vÃ¡lido");
        return res.redirect("/admin/usuarios");
    }

    if (objetivo === propio) {
        mensaje(req, "warning", "No puedes cambiarte el rol a ti mismo");
        return res.redirect("/admin/usuarios");
    }

    try {
        // Si se quita el rol de administrador, debe quedar otro activo.
        if (rol !== "administrador") {
            const admins = await conexion.query(
                "SELECT COUNT(*)::int AS total FROM usuarios WHERE rol = 'administrador' AND activo = true AND id <> $1",
                [objetivo]
            );

            if (admins.rows[0].total === 0) {
                mensaje(req, "error", "Debe quedar al menos un administrador activo");
                return res.redirect("/admin/usuarios");
            }
        }

        const resultado = await conexion.query(
            "UPDATE usuarios SET rol = $1 WHERE id = $2 RETURNING nombre",
            [rol, objetivo]
        );

        if (resultado.rowCount === 0) {
            mensaje(req, "warning", "El usuario no existe");
        } else {
            mensaje(req, "success", `${resultado.rows[0].nombre} ahora tiene el rol ${rol}`);
        }
    } catch (error) {
        console.error("Error al cambiar el rol:", error);
        mensaje(req, "error", "No se pudo cambiar el rol");
    }

    res.redirect("/admin/usuarios");
});

router.post("/usuarios/:id/estado", async (req, res) => {
    const objetivo = Number(req.params.id);
    const propio = await idUsuario(req);

    if (objetivo === propio) {
        mensaje(req, "warning", "No puedes desactivar tu propia cuenta");
        return res.redirect("/admin/usuarios");
    }

    try {
        const actual = await conexion.query(
            "SELECT nombre, rol, activo FROM usuarios WHERE id = $1",
            [objetivo]
        );

        if (actual.rows.length === 0) {
            mensaje(req, "warning", "El usuario no existe");
            return res.redirect("/admin/usuarios");
        }

        const usuario = actual.rows[0];

        // No dejar el sistema sin administradores activos.
        if (usuario.rol === "administrador" && usuario.activo) {
            const admins = await conexion.query(
                "SELECT COUNT(*)::int AS total FROM usuarios WHERE rol = 'administrador' AND activo = true AND id <> $1",
                [objetivo]
            );

            if (admins.rows[0].total === 0) {
                mensaje(req, "error", "Debe quedar al menos un administrador activo");
                return res.redirect("/admin/usuarios");
            }
        }

        const nuevo = !usuario.activo;

        await conexion.query("UPDATE usuarios SET activo = $1 WHERE id = $2", [nuevo, objetivo]);

        mensaje(
            req,
            "success",
            `${usuario.nombre} quedÃ³ ${nuevo ? "activo" : "desactivado"}`
        );
    } catch (error) {
        console.error("Error al cambiar el estado:", error);
        mensaje(req, "error", "No se pudo cambiar el estado");
    }

    res.redirect("/admin/usuarios");
});

/* =========================================================
   ESPECIALISTAS
   ========================================================= */

router.get("/especialistas", async (req, res) => {
    const editar = Number(req.query.editar) || 0;

    try {
        const lista = await conexion.query(
            `SELECT id, nombre, especialidad, descripcion, activo
               FROM especialistas
              ORDER BY activo DESC, nombre`
        );

        const enEdicion = editar
            ? (await conexion.query("SELECT * FROM especialistas WHERE id = $1", [editar])).rows[0] || null
            : null;

        res.render("admin/especialistas", {
            titulo: "Especialistas",
            especialistas: lista.rows,
            enEdicion: enEdicion
        });
    } catch (error) {
        console.error("Error al listar especialistas:", error);
        mensaje(req, "error", "No se pudo cargar el catÃ¡logo");
        res.redirect("/dashboard");
    }
});

router.post("/especialistas", async (req, res) => {
    const nombre = String(req.body.nombre || "").trim();
    const especialidad = String(req.body.especialidad || "").trim();
    const descripcion = String(req.body.descripcion || "").trim();

    if (nombre.length < 3 || especialidad.length < 3) {
        mensaje(req, "error", "El nombre y la especialidad son obligatorios");
        return res.redirect("/admin/especialistas");
    }

    try {
        await conexion.query(
            `INSERT INTO especialistas (nombre, especialidad, descripcion)
             VALUES ($1, $2, $3)`,
            [nombre, especialidad, descripcion || null]
        );

        mensaje(req, "success", "Especialista agregado");
    } catch (error) {
        console.error("Error al crear especialista:", error);
        mensaje(req, "error", "No se pudo agregar el especialista");
    }

    res.redirect("/admin/especialistas");
});

router.post("/especialistas/:id", async (req, res) => {
    const id = Number(req.params.id);
    const nombre = String(req.body.nombre || "").trim();
    const especialidad = String(req.body.especialidad || "").trim();
    const descripcion = String(req.body.descripcion || "").trim();

    if (nombre.length < 3 || especialidad.length < 3) {
        mensaje(req, "error", "El nombre y la especialidad son obligatorios");
        return res.redirect("/admin/especialistas");
    }

    try {
        const resultado = await conexion.query(
            `UPDATE especialistas
                SET nombre = $1, especialidad = $2, descripcion = $3
              WHERE id = $4
              RETURNING nombre`,
            [nombre, especialidad, descripcion || null, id]
        );

        mensaje(
            req,
            resultado.rowCount ? "success" : "warning",
            resultado.rowCount ? "Especialista actualizado" : "El especialista no existe"
        );
    } catch (error) {
        console.error("Error al actualizar especialista:", error);
        mensaje(req, "error", "No se pudo actualizar");
    }

    res.redirect("/admin/especialistas");
});

router.post("/especialistas/:id/estado", async (req, res) => {
    const id = Number(req.params.id);

    try {
        const resultado = await conexion.query(
            `UPDATE especialistas SET activo = NOT activo WHERE id = $1
             RETURNING nombre, activo`,
            [id]
        );

        if (resultado.rowCount === 0) {
            mensaje(req, "warning", "El especialista no existe");
        } else {
            const e = resultado.rows[0];
            mensaje(req, "success", `${e.nombre} quedÃ³ ${e.activo ? "activo" : "inactivo"}`);
        }
    } catch (error) {
        console.error("Error al cambiar el estado del especialista:", error);
        mensaje(req, "error", "No se pudo cambiar el estado");
    }

    res.redirect("/admin/especialistas");
});

/* =========================================================
   BUZÃ“N DE SUGERENCIAS
   ========================================================= */

router.get("/buzon", async (req, res) => {
    try {
        const mensajes = await conexion.query(
            `SELECT id, nombre, asunto, mensaje, leido,
                    TO_CHAR(fecha, 'DD/MM/YYYY HH24:MI') AS fecha
               FROM buzon
              ORDER BY leido ASC, fecha DESC`
        );

        const sinLeer = mensajes.rows.filter((m) => !m.leido).length;

        res.render("admin/buzon", {
            titulo: "BuzÃ³n de sugerencias",
            mensajes: mensajes.rows,
            sinLeer: sinLeer
        });
    } catch (error) {
        console.error("Error al cargar el buzÃ³n:", error);
        mensaje(req, "error", "No se pudo cargar el buzÃ³n");
        res.redirect("/dashboard");
    }
});

router.post("/buzon/:id/leido", async (req, res) => {
    const id = Number(req.params.id);

    try {
        await conexion.query("UPDATE buzon SET leido = NOT leido WHERE id = $1", [id]);
    } catch (error) {
        console.error("Error al marcar el mensaje:", error);
        mensaje(req, "error", "No se pudo actualizar el mensaje");
    }

    res.redirect("/admin/buzon");
});

router.post("/buzon/:id/eliminar", async (req, res) => {
    const id = Number(req.params.id);

    try {
        await conexion.query("DELETE FROM buzon WHERE id = $1", [id]);
        mensaje(req, "success", "Mensaje eliminado");
    } catch (error) {
        console.error("Error al eliminar el mensaje:", error);
        mensaje(req, "error", "No se pudo eliminar el mensaje");
    }

    res.redirect("/admin/buzon");
});

module.exports = router;
