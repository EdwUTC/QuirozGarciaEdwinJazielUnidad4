-- ============================================================
--  Esquema de la base de datos
--  Consultorio Psicológico Infantil "Un Rayito de Sol"
--  Motor: PostgreSQL
--
--  Uso:
--      createdb rayito_de_sol
--      psql -d rayito_de_sol -f schema.sql
--
--  El script es idempotente: se puede volver a ejecutar sobre una
--  base que ya existe sin perder información.
-- ============================================================

-- ------------------------------------------------------------
--  Usuarios del sistema (pacientes, médicos y administradores)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id        SERIAL PRIMARY KEY,
    nombre    VARCHAR(120) NOT NULL,
    correo    VARCHAR(160) NOT NULL UNIQUE,
    password  VARCHAR(255) NOT NULL,
    rol       VARCHAR(20)  NOT NULL DEFAULT 'paciente'
              CHECK (rol IN ('paciente', 'medico', 'administrador')),
    creado_en TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Datos de contacto (se agregaron después, por eso van con ALTER)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono         VARCHAR(30);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

-- ------------------------------------------------------------
--  Especialistas del consultorio
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS especialistas (
    id           SERIAL PRIMARY KEY,
    nombre       VARCHAR(120) NOT NULL,
    especialidad VARCHAR(120) NOT NULL,
    descripcion  TEXT,
    activo       BOOLEAN NOT NULL DEFAULT true,
    creado_en    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Datos de ejemplo (solo si la tabla está vacía)
INSERT INTO especialistas (nombre, especialidad, descripcion)
SELECT v.nombre, v.especialidad, v.descripcion
FROM (VALUES
    ('Dra. Ana Martínez',   'Psicología Infantil',   'Atención a niñas y niños de 3 a 12 años.'),
    ('Dr. Carlos Hernández','Orientación Familiar',  'Acompañamiento a madres, padres y tutores.'),
    ('Lic. Sofía Ramírez',  'Terapia de Lenguaje',   'Evaluación y apoyo en la comunicación.'),
    ('Lic. Diego Torres',   'Psicopedagogía',        'Apoyo en el aprendizaje y los hábitos de estudio.')
) AS v(nombre, especialidad, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM especialistas);

-- ------------------------------------------------------------
--  Citas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citas (
    id              SERIAL PRIMARY KEY,
    usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    especialista_id INTEGER NOT NULL REFERENCES especialistas(id),
    fecha           DATE NOT NULL,
    hora            TIME NOT NULL,
    motivo          TEXT NOT NULL,
    estado          VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente', 'confirmada', 'atendida', 'cancelada')),
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Un especialista no puede tener dos citas a la misma hora,
-- pero un horario cancelado sí puede volver a ocuparse.
CREATE UNIQUE INDEX IF NOT EXISTS idx_citas_horario
    ON citas (especialista_id, fecha, hora)
    WHERE estado <> 'cancelada';

CREATE INDEX IF NOT EXISTS idx_citas_usuario ON citas (usuario_id, fecha);

-- ------------------------------------------------------------
--  Diario de emociones (una entrada por día y por usuario)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diario_emociones (
    id         SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    emocion    VARCHAR(30) NOT NULL
               CHECK (emocion IN ('feliz', 'triste', 'enojado', 'asustado', 'cansado', 'tranquilo')),
    nota       TEXT,
    fecha      DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_en  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (usuario_id, fecha)
);

-- ------------------------------------------------------------
--  Biblioteca para padres y cuidadores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recursos (
    id            SERIAL PRIMARY KEY,
    slug          VARCHAR(160) NOT NULL UNIQUE,
    titulo        VARCHAR(200) NOT NULL,
    categoria     VARCHAR(60)  NOT NULL,
    resumen       TEXT NOT NULL,
    contenido     TEXT NOT NULL,
    edad_sugerida VARCHAR(60),
    minutos       INTEGER NOT NULL DEFAULT 4,
    publicado     BOOLEAN NOT NULL DEFAULT true,
    creado_en     TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO recursos (slug, titulo, categoria, resumen, contenido, edad_sugerida, minutos)
SELECT v.slug, v.titulo, v.categoria, v.resumen, v.contenido, v.edad_sugerida, v.minutos
FROM (VALUES
(
 'cuando-pedir-ayuda',
 '¿Cuándo pedir ayuda para mi hijo?',
 'Señales de alerta',
 'Cambios que conviene no dejar pasar y que justifican una consulta a tiempo.',
 E'Todos los niños atraviesan momentos difíciles. La mayoría se resuelve con apoyo de la familia y un poco de tiempo. Pero hay señales que conviene no dejar pasar.\n\nBusca apoyo profesional si, durante más de tres o cuatro semanas, notas varios de estos cambios:\n\nCambios bruscos en el ánimo, con tristeza o irritabilidad casi todos los días.\nPérdida de interés por cosas que antes disfrutaba.\nProblemas para dormir o para comer que antes no tenía.\nRetrocesos: vuelve a hacerse pipí, a hablar como bebé o pide ayuda para cosas que ya hacía solo.\nMiedo intenso a separarse de mamá o papá, o negarse a ir a la escuela.\nDificultad para concentrarse o caída notoria en las calificaciones.\nConductas agresivas, o aislamiento de amigos y familia.\nQuejas físicas frecuentes (dolor de cabeza o de panza) sin causa médica.\n\nPide ayuda de inmediato si el niño habla de lastimarse, deja de comer o de dormir, o si hay violencia en casa.\n\nConsultar a tiempo no significa que algo esté mal. Significa que estás acompañando a tu hijo antes de que el problema crezca.',
 '3 a 12 años', 5
),
(
 'primera-consulta',
 'Cómo preparar a tu hijo para su primera consulta',
 'Primera visita',
 'Qué decirle, qué llevarle y qué esperar de la primera sesión.',
 E'La primera visita suele generar dudas en toda la familia. Estas ideas ayudan a que tu hijo llegue tranquilo.\n\nExplícale qué es un psicólogo con palabras sencillas: alguien que ayuda a entender lo que sentimos y a encontrar mejores formas de resolverlo. Evita frases como estás mal o vas a que te arreglen.\n\nDile la verdad sobre la visita: a dónde van, cuánto dura y que tú estarás cerca. No hace falta adelantar todos los detalles, pero tampoco conviene inventar una salida al parque.\n\nAnímalo a llevar un objeto que le dé seguridad: un peluche, un cuaderno o un dibujo.\n\nAclárale que no tiene que contar secretos. Lo que hable con el especialista es su espacio y puede decidir qué comparte.\n\nEn la primera sesión normalmente se conoce al niño, se escucha a la familia y se acuerdan los objetivos. Es común que el especialista pregunte por el embarazo, el desarrollo, la escuela y la dinámica en casa; llevar esa información ayuda mucho.\n\nSi tu hijo no quiere entrar, no lo forces. Muchas veces la primera sesión sirve solo para conocerse.',
 '4 a 12 años', 4
),
(
 'berrinches',
 'Berrinches: qué hacer y qué evitar',
 'Conducta',
 'Por qué ocurren y cómo responder sin gritos ni premios.',
 E'Un berrinche no es manipulación: es la forma en que un cerebro pequeño expresa algo que todavía no sabe decir. Entre los 2 y los 6 años es esperable.\n\nQué ayuda:\n\nMantén la calma. Tu tono regula el suyo; si gritas, el berrinche crece.\nNombra la emoción: veo que estás muy enojado porque querías el helado.\nPon el límite con pocas palabras y sostenlo: hoy no vamos a comprar el helado.\nOfrece una opción válida: puedes elegir llevar la pelota o el libro.\nEspera. Muchas veces lo mejor es quedarse cerca y en silencio hasta que baje la tormenta.\nDespués del berrinche, habla de lo que pasó y de qué puede hacer la próxima vez.\n\nQué evitar:\n\nGritar, humillar o amenazar.\nCeder para que se calle: le enseña que el berrinche funciona.\nPrometer premios para que se tranquilice.\nIgnorarlo por completo en un lugar peligroso.\n\nConsulta si los berrinches son muy frecuentes, duran más de 20 minutos, incluyen agresión a sí mismo o a otros, o si aparecen después de los 7 años.',
 '2 a 6 años', 5
),
(
 'sueno-infantil',
 'El sueño infantil: rutinas que sí funcionan',
 'Hábitos',
 'Rutinas sencillas que mejoran el descanso y el ánimo.',
 E'El sueño es la base del ánimo, la atención y el aprendizaje. Estas rutinas suelen funcionar mejor que cualquier regaño.\n\nHorario estable. Acostarse y levantarse a la misma hora, incluso el fin de semana. El cuerpo aprende por repetición.\n\nRutina previa de 20 a 30 minutos: baño, pijama, cuento y luz baja, siempre en el mismo orden.\n\nPantallas fuera una hora antes. La luz de las pantallas retrasa la hormona del sueño y activa la cabeza.\n\nEl cuarto, para dormir. Evita que la cama sea el lugar de las tareas o de los castigos.\n\nAdiós corto y seguro. Si sales y vuelves diez veces, el niño aprende que vale la pena llamarte. Un ritual breve y siempre igual funciona mejor.\n\nMiedos nocturnos. Valida el miedo, revisen juntos que no hay nada y deja una luz tenue. No lo avergüences por tener miedo.\n\nQué evitar: castigarlo con la cama, dejarlo llorar durante mucho tiempo en niños pequeños, o meterlo a tu cama todas las noches (mejor acompañarlo de forma gradual en su cuarto).\n\nSi ronca fuerte, se despierta muchas veces o tiene mucho sueño durante el día, coméntalo con su pediatra.',
 '2 a 10 años', 4
),
(
 'pantallas',
 'Pantallas: cómo poner límites sin pelear',
 'Hábitos',
 'Acuerdos claros que reducen las discusiones diarias.',
 E'Las pantallas no son el enemigo; la falta de acuerdos sí.\n\nAcuerda las reglas en un momento tranquilo, no en medio de una discusión. Escríbelas y pégalas donde se vean.\n\nDefine cuánto y cuándo. Por ejemplo: 30 minutos después de la tarea y antes de la cena. Un temporizador evita que tú seas el malo.\n\nNada de pantallas en la mesa ni una hora antes de dormir.\n\nElige contenido con intención. Mejor un juego o un video que puedan comentar juntos que una sucesión infinita de videos cortos.\n\nOfrece alternativas concretas. Es más fácil soltar la tablet si hay un plan: vamos a armar el rompecabezas.\n\nEvita usarla como premio o castigo constante: le da un valor exagerado.\n\nCuida tu ejemplo. Si tú revisas el celular mientras le hablas, el mensaje es claro.\n\nSi quitar la pantalla provoca crisis muy intensas, no cedas de golpe: reduce el tiempo poco a poco y avisa con anticipación cuándo termina.',
 '3 a 12 años', 5
),
(
 'ansiedad-escolar',
 'Ansiedad por separación al entrar a la escuela',
 'Emociones',
 'Cómo despedirse para que la mañana no se vuelva una tragedia.',
 E'Es normal que un niño pequeño llore al separarse de mamá o papá. La clave está en cómo se despide el adulto.\n\nRitual breve y siempre igual: un abrazo, un choque de manos y adiós. Corto y predecible.\n\nDespídete de verdad. Irse sin avisar cuando se distrae genera más inseguridad que el llanto.\n\nNunca amenaces con dejarlo ni lo compares con otros niños.\n\nValida lo que siente: sé que te da pena y yo también te extraño; nos vemos a la salida.\n\nConfía en la escuela. Si te quedas veinte minutos junto a la puerta, el mensaje es que el lugar no es seguro.\n\nAnticipa el cambio: la noche anterior, cuéntale qué va a pasar.\n\nCuándo consultar: si el llanto dura más de 30 minutos cada mañana durante más de un mes, si aparecen dolores de panza o vómitos solo en días de escuela, si se niega a dormir solo, o si el malestar le impide aprender.',
 '3 a 8 años', 4
)
) AS v(slug, titulo, categoria, resumen, contenido, edad_sugerida, minutos)
WHERE NOT EXISTS (SELECT 1 FROM recursos);

CREATE INDEX IF NOT EXISTS idx_recursos_categoria ON recursos (categoria);

-- ------------------------------------------------------------
--  Mensajes privados entre el paciente y la licenciada.
--  (Sustituye al antiguo "chat", donde todos veían todo.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mensajes (
    id         SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    autor      VARCHAR(20) NOT NULL CHECK (autor IN ('paciente', 'licenciada')),
    texto      TEXT NOT NULL,
    leido      BOOLEAN NOT NULL DEFAULT false,
    creado_en  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_usuario ON mensajes (usuario_id, creado_en);

-- ------------------------------------------------------------
--  Buzón de sugerencias (área privada)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS buzon (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(120) NOT NULL,
    asunto  VARCHAR(160) NOT NULL,
    mensaje TEXT         NOT NULL,
    fecha   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- (La tabla "chat" del proyecto original ya no se usa: permitía que
--  cualquier paciente leyera los mensajes de los demás. Fue sustituida
--  por "mensajes", que es privada entre cada paciente y la licenciada.)

-- ------------------------------------------------------------
--  Tokens de recuperación de contraseña.
--  Se guarda el HASH del token, nunca el token en claro.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reset_tokens (
    id         SERIAL PRIMARY KEY,
    correo     VARCHAR(160) NOT NULL,
    token_hash VARCHAR(64)  NOT NULL UNIQUE,
    expira     TIMESTAMP    NOT NULL,
    usado      BOOLEAN      NOT NULL DEFAULT false,
    creado_en  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_hash ON reset_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_usuarios_correo_lower ON usuarios (LOWER(correo));
