// services/contenido.js
//
// Contenido editorial del sitio público: licenciada, pilares del
// consultorio, participaciones académicas y actividades.
//
// La biblioteca para padres NO vive aquí: se administra desde la tabla
// `recursos` (routes/padres.js), para poder crecer sin tocar código.
//
// ⚠️  CONTENIDO DE EJEMPLO: sustituye los textos, las fechas y el
//     nombre por la información real del consultorio.

const LICENCIADA = {
    nombre: "Lic. Ana Martínez",
    titulo: "Psicóloga infantil y familiar",
    cedula: "Cédula profesional 0000000",
    foto: null, // p. ej. "/img/licenciada.jpg"
    presentacion:
        "Acompaño a niñas, niños y familias en el proceso de entender y " +
        "expresar lo que sienten. Mi trabajo combina juego, palabra y " +
        "evidencia científica, en un espacio donde nada de lo que se dice " +
        "se juzga.",
    formacion: [
        "Licenciatura en Psicología",
        "Especialidad en Psicología Infantil y del Adolescente",
        "Diplomado en Terapia de Juego",
        "Formación en intervención en crisis y duelo infantil"
    ]
};

// Valores del consultorio; son cualidades, no cifras inventadas.
const PILARES = [
    {
        icono: "fa-shield-halved",
        titulo: "Confidencialidad",
        texto: "Lo que se habla en sesión se queda en sesión."
    },
    {
        icono: "fa-people-roof",
        titulo: "Enfoque familiar",
        texto: "La familia es parte del tratamiento, no un espectador."
    },
    {
        icono: "fa-puzzle-piece",
        titulo: "Terapia de juego",
        texto: "Las niñas y los niños aprenden y sanan jugando."
    },
    {
        icono: "fa-clipboard-check",
        titulo: "Trabajo con evidencia",
        texto: "Evaluación, objetivos claros y seguimiento medible."
    }
];

// Participaciones académicas y comunitarias.
const PARTICIPACIONES = [
    {
        anio: "2025",
        tipo: "Ponencia",
        titulo: "El juego como lenguaje: intervención en niños de 3 a 8 años",
        lugar: "Congreso Estatal de Psicología Infantil, Saltillo"
    },
    {
        anio: "2025",
        tipo: "Taller",
        titulo: "Límites sin gritos: disciplina positiva para familias",
        lugar: "Centro Comunitario Colonia Norte"
    },
    {
        anio: "2024",
        tipo: "Ponencia",
        titulo: "Ansiedad por separación en el inicio escolar",
        lugar: "Foro de Educación Inicial, Monterrey"
    },
    {
        anio: "2024",
        tipo: "Colaboración",
        titulo: "Programa de salud emocional en escuelas primarias",
        lugar: "Secretaría de Educación, Coahuila"
    }
];

// Actividades del consultorio.
// `foto` es opcional: si no hay imagen se muestra un panel decorativo
// con el ícono, así nunca aparece una imagen rota.
const ACTIVIDADES = [
    {
        titulo: "Taller de emociones",
        descripcion:
            "Niñas y niños identifican y nombran lo que sienten con tarjetas, " +
            "títeres y juegos de roles.",
        icono: "fa-face-smile",
        tono: "azul",
        foto: null
    },
    {
        titulo: "Terapia de juego",
        descripcion:
            "El juego dirigido permite elaborar miedos y situaciones difíciles " +
            "sin necesidad de hablarlo todo con palabras.",
        icono: "fa-puzzle-piece",
        tono: "menta",
        foto: null
    },
    {
        titulo: "Escuela para padres",
        descripcion:
            "Sesiones mensuales para madres, padres y tutores sobre crianza, " +
            "límites y comunicación.",
        icono: "fa-people-roof",
        tono: "arena",
        foto: null
    },
    {
        titulo: "Rincón de lectura",
        descripcion:
            "Cuentos que hablan de emociones, pérdidas y amistad, con una guía " +
            "de preguntas para conversar en casa.",
        icono: "fa-book-open",
        tono: "lila",
        foto: null
    },
    {
        titulo: "Evaluaciones",
        descripcion:
            "Pruebas estandarizadas para entender el desarrollo, el aprendizaje " +
            "y el estado emocional del menor.",
        icono: "fa-clipboard-check",
        tono: "azul",
        foto: null
    },
    {
        titulo: "Grupos de hermanos",
        descripcion:
            "Un espacio donde los hermanos comparten lo que implica tener un " +
            "familiar en terapia.",
        icono: "fa-children",
        tono: "menta",
        foto: null
    }
];

// Servicios con el detalle que una familia necesita antes de llamar.
const SERVICIOS = [
    {
        icono: "fa-child-reaching",
        tono: "azul",
        titulo: "Terapia infantil",
        resumen:
            "Atención psicológica para niñas y niños de 3 a 12 años: miedos, " +
            "berrinches, duelo, ansiedad y cambios de conducta.",
        para: "Niñas y niños de 3 a 12 años",
        duracion: "45 a 50 minutos por sesión",
        incluye: [
            "Entrevista inicial con la familia",
            "Objetivos terapéuticos por escrito",
            "Sesiones de juego y palabra según la edad",
            "Retroalimentación periódica a los padres"
        ]
    },
    {
        icono: "fa-people-roof",
        tono: "menta",
        titulo: "Orientación familiar",
        resumen:
            "Acompañamiento a madres, padres y tutores para acordar límites, " +
            "mejorar la comunicación y sostener los cambios en casa.",
        para: "Madres, padres y cuidadores",
        duracion: "50 minutos por sesión",
        incluye: [
            "Revisión de rutinas y acuerdos familiares",
            "Estrategias de disciplina positiva",
            "Manejo de berrinches y pantallas",
            "Coordinación con la escuela si hace falta"
        ]
    },
    {
        icono: "fa-clipboard-check",
        tono: "arena",
        titulo: "Evaluaciones psicológicas",
        resumen:
            "Valoraciones con pruebas estandarizadas para entender el " +
            "desarrollo, el aprendizaje y el estado emocional del menor.",
        para: "Cuando se necesita un informe o una segunda opinión",
        duracion: "2 a 3 sesiones + entrega de resultados",
        incluye: [
            "Aplicación de pruebas según el motivo",
            "Entrevista con padres y escuela",
            "Informe escrito con recomendaciones",
            "Sesión de devolución de resultados"
        ]
    }
];

// Cómo es el proceso, paso a paso.
const PROCESO = [
    {
        titulo: "Primera conversación",
        texto:
            "Una entrevista con la familia para entender qué está pasando y " +
            "qué esperan del proceso."
    },
    {
        titulo: "Evaluación",
        texto:
            "Sesiones con el menor y, si hace falta, pruebas estandarizadas " +
            "para tener un panorama claro."
    },
    {
        titulo: "Plan de trabajo",
        texto:
            "Objetivos concretos y un número estimado de sesiones, explicados " +
            "sin tecnicismos."
    },
    {
        titulo: "Seguimiento",
        texto:
            "Revisión periódica de avances con la familia y ajustes cuando " +
            "algo no está funcionando."
    }
];

module.exports = {
    LICENCIADA,
    PILARES,
    PARTICIPACIONES,
    ACTIVIDADES,
    SERVICIOS,
    PROCESO
};
