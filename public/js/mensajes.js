// public/js/mensajes.js
//
// Consume la API propia del consultorio:
//   GET  /api/mensajes/estado  → saber si llegó algo nuevo
//   POST /api/mensajes         → enviar sin recargar
//
// Si algo falla, el formulario sigue funcionando de la forma tradicional
// (no se llama a preventDefault hasta que la API responde).
document.addEventListener("DOMContentLoaded", () => {

    const contenedor = document.querySelector("[data-mensajes]");
    if (!contenedor) return;

    // Ir al final del hilo.
    contenedor.scrollTop = contenedor.scrollHeight;

    const totalInicial = Number(contenedor.dataset.total || 0);
    const urlEstado = contenedor.dataset.estado;

    const meta = document.querySelector('meta[name="csrf-token"]');
    const token = meta ? meta.getAttribute("content") : "";

    /* ---------------- Refresco automático ---------------- */
    if (urlEstado) {
        setInterval(async () => {
            // No molestar mientras la pestaña está en segundo plano.
            if (document.hidden) return;

            try {
                const respuesta = await fetch(urlEstado, {
                    headers: { Accept: "application/json" }
                });

                if (!respuesta.ok) return;

                const datos = await respuesta.json();

                if (Number(datos.total) !== totalInicial) {
                    window.location.reload();
                }
            } catch (error) {
                // Si falla la red se reintenta en el siguiente ciclo.
            }
        }, 10000);
    }

    /* ---------------- Envío por la API ---------------- */
    const formulario = document.querySelector(".form-mensaje");
    if (!formulario || !window.fetch) return;

    const campo = formulario.querySelector("textarea[name='texto']");
    const boton = formulario.querySelector("button[type='submit']");
    const usuario = formulario.querySelector("input[name='usuario_id']");

    formulario.addEventListener("submit", async (evento) => {
        const texto = (campo.value || "").trim();

        if (!texto) {
            evento.preventDefault();
            return;
        }

        evento.preventDefault();

        if (boton) boton.disabled = true;

        try {
            const cuerpo = { texto: texto };

            if (usuario && usuario.value) {
                cuerpo.usuario_id = Number(usuario.value);
            }

            const respuesta = await fetch("/api/mensajes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "x-csrf-token": token
                },
                body: JSON.stringify(cuerpo)
            });

            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                throw new Error(datos.error || "No se pudo enviar el mensaje");
            }

            window.location.reload();
        } catch (error) {
            if (boton) boton.disabled = false;

            if (window.Swal) {
                Swal.fire({
                    icon: "error",
                    title: "No se pudo enviar",
                    text: error.message
                });
            } else {
                window.alert(error.message);
            }
        }
    });

});
