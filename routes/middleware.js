// routes/middleware.js
const conexion = require("../database/conexion");
const { idUsuario } = require("../services/usuario");

// Verifica que haya sesión y que la cuenta siga activa.
// Además refresca el rol, para que un cambio del administrador se aplique
// de inmediato sin esperar a que el usuario vuelva a iniciar sesión.
function cuentaActiva(req, res, next) {
    if (!req.session || !req.session.usuario) {
        req.session.mensaje = {
            tipo: "warning",
            texto: "Debes iniciar sesión para acceder"
        };

        return res.redirect("/login");
    }

    idUsuario(req)
        .then((usuarioId) =>
            conexion.query("SELECT activo, rol FROM usuarios WHERE id = $1", [usuarioId])
        )
        .then((resultado) => {
            const cuenta = resultado.rows[0];

            if (!cuenta || !cuenta.activo) {
                return req.session.destroy(() => res.redirect("/login?desactivada=1"));
            }

            req.session.rol = cuenta.rol;
            return next();
        })
        .catch((error) => {
            console.error("Error al verificar la cuenta:", error);

            res.status(500).render("error", {
                titulo: "Error interno",
                codigo: 500,
                detalle: "No se pudo verificar tu cuenta. Inténtalo más tarde."
            });
        });
}

// Exige sesión iniciada y cuenta activa.
const protegerRuta = cuentaActiva;

// Exige además uno de los roles indicados.
// Uso: protegerRol("medico", "administrador")
function protegerRol(...roles) {
    return (req, res, next) => {
        cuentaActiva(req, res, () => {
            if (!roles.includes(req.session.rol)) {
                req.session.mensaje = {
                    tipo: "error",
                    texto: "No tienes permiso para entrar a esa sección"
                };

                return res.redirect("/dashboard");
            }

            next();
        });
    };
}

module.exports = { protegerRuta, protegerRol };
