// routes/padres.js
//
// Biblioteca para madres, padres y cuidadores.
// El contenido vive en la tabla `recursos` para poder crecer sin tocar código.
const express = require("express");
const router = express.Router();

const conexion = require("../database/conexion");

// Divide el contenido en bloques: un bloque con varias líneas se
// muestra como lista y un bloque de una línea como párrafo.
function bloques(contenido) {
    return String(contenido || "")
        .split("\n\n")
        .map((bloque) => bloque.trim())
        .filter(Boolean)
        .map((bloque) => {
            const lineas = bloque.split("\n").map((l) => l.trim()).filter(Boolean);

            return lineas.length > 1
                ? { tipo: "lista", items: lineas }
                : { tipo: "texto", texto: lineas[0] };
        });
}

// Listado de artículos, con filtro por categoría.
router.get("/padres", async (req, res) => {
    const categoria = String(req.query.categoria || "").trim();

    try {
        const [recursos, categorias] = await Promise.all([
            categoria
                ? conexion.query(
                      `SELECT slug, titulo, categoria, resumen, edad_sugerida, minutos
                         FROM recursos
                        WHERE publicado = true AND categoria = $1
                        ORDER BY id`,
                      [categoria]
                  )
                : conexion.query(
                      `SELECT slug, titulo, categoria, resumen, edad_sugerida, minutos
                         FROM recursos
                        WHERE publicado = true
                        ORDER BY id`
                  ),
            conexion.query(
                `SELECT categoria, COUNT(*)::int AS total
                   FROM recursos
                  WHERE publicado = true
                  GROUP BY categoria
                  ORDER BY categoria`
            )
        ]);

        res.render("padres", {
            titulo: "Para padres y cuidadores",
            recursos: recursos.rows,
            categorias: categorias.rows,
            activa: categoria
        });
    } catch (error) {
        console.error("Error al cargar los recursos:", error);
        res.status(500).render("error", {
            titulo: "Error",
            codigo: 500,
            detalle: "No se pudo cargar la biblioteca. Inténtalo más tarde."
        });
    }
});

// Detalle de un artículo.
router.get("/padres/:slug", async (req, res) => {
    const slug = String(req.params.slug || "");

    try {
        const resultado = await conexion.query(
            `SELECT slug, titulo, categoria, resumen, contenido, edad_sugerida, minutos
               FROM recursos
              WHERE slug = $1 AND publicado = true`,
            [slug]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).render("404", { titulo: "Artículo no encontrado" });
        }

        const articulo = resultado.rows[0];

        const relacionados = await conexion.query(
            `SELECT slug, titulo, categoria
               FROM recursos
              WHERE publicado = true AND categoria = $1 AND slug <> $2
              ORDER BY id
              LIMIT 3`,
            [articulo.categoria, slug]
        );

        res.render("padres-articulo", {
            titulo: articulo.titulo,
            articulo: articulo,
            bloques: bloques(articulo.contenido),
            relacionados: relacionados.rows
        });
    } catch (error) {
        console.error("Error al cargar el artículo:", error);
        res.status(500).render("error", {
            titulo: "Error",
            codigo: 500,
            detalle: "No se pudo cargar el artículo. Inténtalo más tarde."
        });
    }
});

module.exports = router;
