// public/js/carrusel.js
//
// Carrusel horizontal con desplazamiento por botones y teclado.
// Funciona sin librerías: la pista es un contenedor con scroll-snap.
document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll("[data-carrusel]").forEach((carrusel) => {

        const pista = carrusel.querySelector("[data-pista]");
        if (!pista) return;

        const flechas = carrusel.querySelectorAll(".carrusel-flecha");

        function desplazar(direccion) {
            const primera = pista.querySelector(".tarjeta-actividad");
            if (!primera) return;

            const estilo = window.getComputedStyle(pista);
            const separacion = parseFloat(estilo.columnGap || estilo.gap) || 16;

            const paso = (primera.getBoundingClientRect().width + separacion) * direccion;
            pista.scrollBy({ left: paso, behavior: "smooth" });
        }

        flechas.forEach((flecha) => {
            flecha.addEventListener("click", () => {
                desplazar(Number(flecha.dataset.dir) || 1);
            });
        });

        // Navegación con teclado cuando la pista tiene el foco.
        pista.addEventListener("keydown", (evento) => {
            if (evento.key === "ArrowRight") {
                evento.preventDefault();
                desplazar(1);
            }

            if (evento.key === "ArrowLeft") {
                evento.preventDefault();
                desplazar(-1);
            }
        });

    });

});
