// deploy/cloudflare-worker.js
//
// Balanceador de carga en el borde de Cloudflare.
//
// - Reparte las peticiones entre las dos instancias de Render.
// - Si una responde con error 5xx o no responde, prueba la otra.
// - Un cron cada 10 minutos las mantiene despiertas, porque el plan
//   gratuito de Render suspende el servicio tras 15 minutos sin uso.
//   Solo se ejecuta en la franja de clase: Render da 750 horas de
//   instancia al mes y dos servicios encendidos 24/7 consumirían 1460.
//
// Variables de entorno del Worker:
//   ORIGEN_1 = https://rayito-app-1.onrender.com
//   ORIGEN_2 = https://rayito-app-2.onrender.com
//   SITIO    = rayitodesol.me   (opcional; si falta se usa el host pedido)

let turno = 0;

function origenes(env) {
    return [env.ORIGEN_1, env.ORIGEN_2].filter(Boolean);
}

async function reenviar(peticion, origen, sitio) {
    const url = new URL(peticion.url);
    const destino = new URL(url.pathname + url.search, origen);

    const cabeceras = new Headers(peticion.headers);
    cabeceras.set("X-Forwarded-Host", sitio);
    cabeceras.set("X-Forwarded-Proto", "https");

    // Sin esto, la aplicación vería la IP del Worker para todos los
    // visitantes y el límite de peticiones los contaría como uno solo.
    const ip = peticion.headers.get("CF-Connecting-IP");
    if (ip) {
        cabeceras.set("X-Forwarded-For", ip);
    }

    const opciones = {
        method: peticion.method,
        headers: cabeceras,
        redirect: "manual"
    };

    if (peticion.method !== "GET" && peticion.method !== "HEAD") {
        opciones.body = peticion.body;
        // Cloudflare no lo necesita; Node sí para reenviar un cuerpo en
        // streaming desde la prueba local (deploy/probar-worker.mjs).
        opciones.duplex = "half";
    }

    return fetch(destino.toString(), opciones);
}

export default {
    async fetch(peticion, env) {
        const url = new URL(peticion.url);

        // El sitio no debe servirse en claro: se fuerza HTTPS antes de
        // reenviar nada a las instancias.
        if (url.protocol === "http:") {
            url.protocol = "https:";
            return Response.redirect(url.toString(), 301);
        }

        const lista = origenes(env);
        const sitio = env.SITIO || url.hostname;

        for (let intento = 0; intento < lista.length; intento++) {
            const indice = (turno + intento) % lista.length;

            try {
                const respuesta = await reenviar(peticion, lista[indice], sitio);

                if (respuesta.status < 500) {
                    turno = (indice + 1) % lista.length;
                    return respuesta;
                }
            } catch (error) {
                // Se intenta con la siguiente instancia.
            }
        }

        return new Response("Servicio temporalmente no disponible.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
    },

    // Mantiene despiertas las dos instancias.
    async scheduled(evento, env, ctx) {
        const lista = origenes(env);

        ctx.waitUntil(
            Promise.all(
                lista.map((origen) =>
                    fetch(origen + "/api/estado").catch(() => null)
                )
            )
        );
    }
};
