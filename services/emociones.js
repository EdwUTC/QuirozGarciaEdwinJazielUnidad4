// services/emociones.js
//
// Catálogo de emociones que se usan en el diario, en el dashboard y en
// la sección "Aprende las emociones" del Rincón de Rayito.
const EMOCIONES = [
    {
        clave: "feliz",
        emoji: "😀",
        nombre: "Feliz",
        siente: "Se siente como cosquillas en la panza y ganas de saltar.",
        ayuda: "Compártela con alguien que quieras: la alegría crece cuando se cuenta."
    },
    {
        clave: "triste",
        emoji: "😢",
        nombre: "Triste",
        siente: "Se siente como un nudo en la garganta y ganas de llorar.",
        ayuda: "Llorar está bien. Pide un abrazo o habla con alguien de confianza."
    },
    {
        clave: "enojado",
        emoji: "😡",
        nombre: "Enojado",
        siente: "Se siente como calor en la cara y los puños apretados.",
        ayuda: "Respira profundo, cuenta hasta 10 o aprieta un cojín."
    },
    {
        clave: "asustado",
        emoji: "😨",
        nombre: "Asustado",
        siente: "Se siente como mariposas en la panza y ganas de esconderse.",
        ayuda: "Busca a un adulto de confianza y respira despacio."
    },
    {
        clave: "cansado",
        emoji: "😴",
        nombre: "Cansado",
        siente: "Se siente como el cuerpo pesado y ganas de bostezar.",
        ayuda: "Descansa, toma agua y duerme tus horas."
    },
    {
        clave: "tranquilo",
        emoji: "😌",
        nombre: "Tranquilo",
        siente: "Se siente como el cuerpo suave y la respiración lenta.",
        ayuda: "Disfrútalo y recuerda este momento cuando algo te preocupe."
    }
];

const MAPA = {};
EMOCIONES.forEach((emocion) => {
    MAPA[emocion.clave] = emocion;
});

module.exports = { EMOCIONES, MAPA };
