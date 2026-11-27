// deploy/probar-worker.mjs
//
// Prueba local del balanceador sin publicarlo: se importa el Worker y se
// llama a su función fetch() con peticiones reales contra las dos
// instancias de Render.
//
//   node deploy/probar-worker.mjs
//
// Comprueba, en este orden:
//   1. Que las peticiones se repartan entre app-1 y app-2.
//   2. Que el inicio de sesión funciona a través del dominio.
//   3. Que si una instancia no responde, la otra atiende la petición.
//   4. Que la tarea programada mantiene despiertas ambas instancias.

import worker from "./cloudflare-worker.mjs";

const ORIGEN_1 = process.env.ORIGEN_1 || "https://rayito-app-1.onrender.com";
const ORIGEN_2 = process.env.ORIGEN_2 || "https://rayito-app-2.onrender.com";
const SITIO = process.env.SITIO || "rayitodesol.me";

const BASE = `https://${SITIO}`;

let correctas = 0;
let fallas = 0;

function revisar(nombre, condicion, detalle = "") {
    if (condicion) {
        correctas++;
        console.log(`  [OK]    ${nombre}`);
    } else {
        fallas++;
        console.log(`  [FALLA] ${nombre}  ${detalle}`);
    }
}

function conEnv(origen1, origen2 = ORIGEN_2) {
    return { ORIGEN_1: origen1, ORIGEN_2: origen2, SITIO };
}

async function pedir(ruta, opciones = {}, env = conEnv(ORIGEN_1)) {
    return worker.fetch(new Request(BASE + ruta, opciones), env);
}

function cookieDe(respuesta, nombre) {
    const galletas = respuesta.headers.getSetCookie
        ? respuesta.headers.getSetCookie()
        : [respuesta.headers.get("set-cookie")].filter(Boolean);

    const buscada = galletas.find((c) => c.startsWith(nombre + "="));
    return buscada ? buscada.split(";")[0] : null;
}

function csrfDe(html) {
    const coincidencia = html.match(/name="_csrf" value="([a-f0-9]+)"/);
    return coincidencia ? coincidencia[1] : null;
}

async function main() {
    console.log(`Balanceador: ${SITIO} -> ${ORIGEN_1} | ${ORIGEN_2}\n`);

    console.log("1. Reparto entre instancias");
    const reparto = [];
    for (let i = 0; i < 6; i++) {
        const respuesta = await pedir("/api/estado");
        if (respuesta.status !== 200) {
            reparto.push(`HTTP ${respuesta.status}`);
            continue;
        }
        const datos = await respuesta.json();
        reparto.push(datos.instancia);
    }
    console.log(`  orden: ${reparto.join(" -> ")}`);
    revisar("responde siempre 200", reparto.every((i) => i.startsWith("app-")), reparto.join(","));
    revisar(
        "alterna entre las dos instancias",
        new Set(reparto).size === 2 && reparto.every((v, i) => i === 0 || v !== reparto[i - 1]),
        reparto.join(",")
    );

    console.log("\n2. Inicio de sesión a través del dominio");
    const entrada = await pedir("/login");
    const html = await entrada.text();
    const csrf = csrfDe(html);
    const galleta = cookieDe(entrada, "rayito.sid");

    revisar("el formulario trae CSRF", Boolean(csrf));
    revisar("el dominio entrega cookie de sesión", Boolean(galleta));

    const cuerpo = new URLSearchParams({
        _csrf: csrf,
        correo: "prueba@rayito.test",
        password: "Prueba123"
    }).toString();

    const acceso = await pedir("/login", {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            cookie: galleta
        },
        body: cuerpo
    });

    const destino = acceso.headers.get("location") || "";
    revisar("el acceso redirige al panel", destino.endsWith("/dashboard"), destino);
    revisar("el redirect no escapa del dominio", !destino.includes("onrender.com"), destino);

    const sesion = cookieDe(acceso, "rayito.sid") || galleta;
    const panel = await pedir("/dashboard", { headers: { cookie: sesion } });
    const texto = await panel.text();

    revisar("el panel reconoce la sesión", panel.status === 200 && texto.includes("Hola,"));
    revisar("aparece el nombre del usuario", texto.includes("Usuario de Prueba"));

    console.log("\n3. Tolerancia a fallos");
    const caido = await pedir("/api/estado", {}, conEnv("https://app-caida.invalid"));
    revisar("si app-1 falla, responde app-2", caido.status === 200, `HTTP ${caido.status}`);
    if (caido.status === 200) {
        const datos = await caido.json();
        revisar("la respuesta viene de app-2", datos.instancia === "app-2", datos.instancia);
    }

    const ambosCaidos = await pedir(
        "/api/estado",
        {},
        conEnv("https://app-uno.invalid", "https://app-dos.invalid")
    );
    revisar("con las dos caídas devuelve 503", ambosCaidos.status === 503, `HTTP ${ambosCaidos.status}`);

    console.log("\n4. Tarea programada (keep-alive)");
    let pendientes = null;
    await worker.scheduled({}, conEnv(ORIGEN_1), {
        waitUntil: (promesa) => {
            pendientes = promesa;
        }
    });
    revisar("la tarea programa el trabajo", Boolean(pendientes));
    const respuestas = pendientes ? await pendientes : [];
    const vivas = (respuestas || []).filter((r) => r && r.ok).length;
    revisar("las dos instancias quedan despiertas", vivas === 2, `${vivas}/2`);

    console.log(`\nResultado: ${correctas} correctas, ${fallas} fallas`);
    process.exit(fallas === 0 ? 0 : 1);
}

main().catch((error) => {
    console.error("Error en la prueba:", error);
    process.exit(1);
});
