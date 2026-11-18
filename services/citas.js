// services/citas.js
//
// Reglas de negocio de las citas, compartidas por la web (routes/clinica.js)
// y por la API REST (routes/api.js). Así no hay dos versiones de la misma
// validación que puedan separarse con el tiempo.
const conexion = require("../database/conexion");

const HORARIOS = ["09:00", "10:00", "11:00", "12:00", "13:00", "16:00", "17:00", "18:00"];

function esFecha(valor) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(valor)) && !Number.isNaN(Date.parse(valor));
}

// Lista las citas de un paciente.
async function listarCitas(usuarioId) {
    const resultado = await conexion.query(
        `SELECT c.id,
                TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha,
                TO_CHAR(c.hora, 'HH24:MI')    AS hora,
                c.motivo,
                c.estado,
                e.nombre       AS especialista,
                e.especialidad
           FROM citas c
           JOIN especialistas e ON e.id = c.especialista_id
          WHERE c.usuario_id = $1
          ORDER BY c.fecha DESC, c.hora DESC`,
        [usuarioId]
    );

    return resultado.rows;
}

// Crea una cita.
// Devuelve { ok: true, cita } o { ok: false, codigo, error }.
async function crearCita({ usuarioId, especialistaId, fecha, hora, motivo }) {
    if (!Number.isInteger(especialistaId) || especialistaId <= 0) {
        return { ok: false, codigo: 400, error: "Elige un especialista" };
    }

    if (!esFecha(fecha)) {
        return { ok: false, codigo: 400, error: "Elige una fecha válida" };
    }

    if (!HORARIOS.includes(hora)) {
        return { ok: false, codigo: 400, error: "Elige un horario válido" };
    }

    if (!motivo || motivo.length < 5) {
        return {
            ok: false,
            codigo: 400,
            error: "Describe el motivo de la consulta (mínimo 5 caracteres)"
        };
    }

    if (motivo.length > 600) {
        return { ok: false, codigo: 400, error: "El motivo es demasiado largo" };
    }

    try {
        // La fecha y la hora se validan contra el reloj de la base de datos.
        const rango = await conexion.query(
            `SELECT ($1::date + $2::time) > LOCALTIMESTAMP           AS futura,
                    $1::date >= CURRENT_DATE                        AS de_hoy_en_adelante,
                    $1::date <= (CURRENT_DATE + INTERVAL '6 months') AS dentro_del_rango`,
            [fecha, hora]
        );

        const chequeo = rango.rows[0];

        if (!chequeo.de_hoy_en_adelante) {
            return { ok: false, codigo: 400, error: "La fecha debe ser de hoy en adelante" };
        }

        if (!chequeo.dentro_del_rango) {
            return {
                ok: false,
                codigo: 400,
                error: "La fecha debe estar dentro de los próximos 6 meses"
            };
        }

        if (!chequeo.futura) {
            return { ok: false, codigo: 400, error: "Esa hora ya pasó. Elige un horario más tarde." };
        }

        const especialista = await conexion.query(
            "SELECT id FROM especialistas WHERE id = $1 AND activo = true",
            [especialistaId]
        );

        if (especialista.rows.length === 0) {
            return { ok: false, codigo: 404, error: "El especialista no está disponible" };
        }

        const insertado = await conexion.query(
            `INSERT INTO citas (usuario_id, especialista_id, fecha, hora, motivo)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id,
                       TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
                       TO_CHAR(hora, 'HH24:MI')     AS hora,
                       motivo,
                       estado`,
            [usuarioId, especialistaId, fecha, hora, motivo]
        );

        return { ok: true, cita: insertado.rows[0] };
    } catch (error) {
        if (error && error.code === "23505") {
            return { ok: false, codigo: 409, error: "Ese horario ya está ocupado. Elige otro." };
        }

        console.error("Error al crear la cita:", error);
        return { ok: false, codigo: 500, error: "No se pudo agendar la cita" };
    }
}

// Cancela una cita propia.
async function cancelarCita({ usuarioId, citaId }) {
    if (!Number.isInteger(citaId) || citaId <= 0) {
        return { ok: false, codigo: 400, error: "La cita no es válida" };
    }

    try {
        const resultado = await conexion.query(
            `UPDATE citas
                SET estado = 'cancelada'
              WHERE id = $1 AND usuario_id = $2
                AND estado IN ('pendiente', 'confirmada')
              RETURNING id`,
            [citaId, usuarioId]
        );

        if (resultado.rowCount === 0) {
            return { ok: false, codigo: 404, error: "La cita no existe o ya no se puede cancelar" };
        }

        return { ok: true };
    } catch (error) {
        console.error("Error al cancelar la cita:", error);
        return { ok: false, codigo: 500, error: "No se pudo cancelar la cita" };
    }
}

module.exports = { HORARIOS, esFecha, listarCitas, crearCita, cancelarCita };
