// scripts/verificar.js
//
// Paso de "build" para una aplicación que no se compila: valida la
// sintaxis de todos los archivos JavaScript del proyecto.
//
//   npm run build
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const IGNORAR = new Set(["node_modules", ".git", ".neon"]);

function recorrer(directorio, encontrados = []) {
    for (const entrada of fs.readdirSync(directorio, { withFileTypes: true })) {
        if (IGNORAR.has(entrada.name)) continue;

        const ruta = path.join(directorio, entrada.name);

        if (entrada.isDirectory()) {
            recorrer(ruta, encontrados);
        } else if (entrada.name.endsWith(".js")) {
            encontrados.push(ruta);
        }
    }

    return encontrados;
}

const raiz = path.join(__dirname, "..");
const archivos = recorrer(raiz);

let errores = 0;

for (const archivo of archivos) {
    try {
        execFileSync(process.execPath, ["--check", archivo], { stdio: "pipe" });
    } catch (error) {
        errores++;
        console.error("Error de sintaxis en:", path.relative(raiz, archivo));
        console.error(String(error.stderr || error.message).trim());
    }
}

if (errores > 0) {
    console.error(`\n${errores} archivo(s) con errores de sintaxis.`);
    process.exit(1);
}

console.log(`Build correcto: ${archivos.length} archivos JavaScript validados.`);
