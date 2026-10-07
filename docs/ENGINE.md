# Prescription Engine

El ENGINE F14.1 se conserva sin cambios deportivos en F14.2. Su flujo conceptual es:

```text
Athlete baseline
  → viability
  → target and current volume
  → recommended frequency
  → phases
  → weekly prescription
  → workout construction
  → taper
  → race strategy
```

## Baseline y viabilidad

La baseline combina capacidad continua, frecuencia reciente, minutos semanales, tirada habitual, experiencia y tolerancia a días consecutivos. La viabilidad cruza esa base con distancia, horizonte y disponibilidad. Un objetivo insuficiente puede conservarse, pero recibe advertencia y estrategia conservadora.

## Prescripción semanal

El motor proyecta capacidad de forma conservadora, calcula volumen y frecuencia y elige un microciclo específico para 2–6 sesiones. Las semanas de consolidación reducen carga real. La colocación separa calidad y tirada larga cuando los días disponibles lo permiten.

## Workouts

Cada sesión tiene una fuente de verdad computable:

- `totalDurationMin`
- `warmupDurationMin`
- `mainDurationMin`
- `recoveryDurationMin`
- `cooldownDurationMin`
- bloques con `durationSec`, repeticiones y pasos

CaCo y las pausas caminando son parte normal del entrenamiento. La estrategia de carrera deriva de la capacidad proyectada, la viabilidad y la duración estimada de la prueba.

## Taper y carrera

El taper reduce carga desde su primera semana y no vuelve a aumentarla. La carrera usa estrategia continua o CaCo según lo entrenado. F14.2 no añade adaptación por feedback; esa responsabilidad pertenece a F15.
