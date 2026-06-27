## 1. User (turn 1)

“Hola, quiero hacer un algoritmo para generar árboles, vegetación en un terreno también generado proceduralmente y quiero que se pueda generar por zonas, así solamente compute lo que está en pantalla visible y todo lo demás no. Entonces, se subdivide la esfera en un cubo y el cubo se subdivide en zonas y la zona misma, las coordenadas de la zona sirven como semilla de un generador de números al azar y que generen, no sé, entre cinco a cien árboles cada zona y de esa manera se puede limitar las zonas que se computan.”

---

## 2. Assistant (turn 2)

Haz un sistema de nivel de detalle (LOD) por sectores. Divide la esfera en una cuadrícula cúbica (tipo octree o similar). Cada sector, al activarse (por proximidad o visibilidad), usa sus coordenadas como semilla para un generador pseudoaleatorio. Ese generador decide cuántos árboles y dónde. Mantén un rango de densidad controlado por parámetros. Así, solo computas lo que el jugador ve, y el resto queda latente.

---

## 3. User (turn 3)

“Entonces, ¿estás de acuerdo con el algoritmo? ¿Puedes generar un código básico en TypeScript?”

---

## 4. Assistant (turn 4)

Estoy de acuerdo con el enfoque. Te doy un ejemplo básico en TypeScript:

Primero, defines una función que subdivide el mundo en zonas. Cada zona tiene una semilla. Luego, usando esa semilla, generas una cantidad

---

## 5. User (turn 5)

“Ah, en realidad, después te iba a pedir que lo generes. Entonces un poco, porque se me imagino y lo podemos hacer después. ¿Qué otro algoritmo parecido o que pueda servir para ese propósito te imaginas o conoces?”

---

## 6. Assistant (turn 6)

Un enfoque similar es usar un "quadtree" en lugar de un octree si trabajas en una proyección 2D del terreno. También podrías usar un "noise function" como Perlin o Simplex, pero en lugar de generar textura, usarlo para decidir densidad y ubicación. Otra opción es una grilla Voronoi para definir regiones naturales con características de vegetación distintas.

---

## 7. User (turn 7)

“Sí, me suena que el ruido Perlin va a ser más eficiente y más rápido y va a tener mejor performance que el que he propuesto yo.”

---

## 8. Assistant (turn 8)

En general, sí. Un ruido como Perlin es muy eficiente porque es continuo, rápido de calcular y no requiere subdividir en estructuras espaciales. Puedes usar las coordenadas de la zona como entrada a la función de ruido, obtener valores de densidad y distribuir vegetación sin subdivisiones complejas. Además, garantiza patrones naturales y suaves.

---

## 9. User (turn 9)

“Exacto, y la segmentación de unos y ceros del perling en 3D se podría hacer hasta con densidad, se podría manejar en qué lugar se segmenta y incluso se le podría agregar ruido de alta frecuencia para hacer bosques y zonas de bosques con claros.”

---

## 10. Assistant (turn 10)

Exacto. Puedes controlar el umbral del ruido para decidir en qué zonas hay vegetación y en cuáles no. Ajustando la frecuencia, puedes definir grandes regiones o detalles finos. Si combinas ruidos de distintas escalas (fBm), puedes generar bosques con claros o transiciones suaves. En suma, te da flexibilidad y naturalidad.

---

## 11. User (turn 11)

“Bien, y el SRGB del ruido sería en color, podría servir para hacer diferentes tipos de vegetación.”

---

## 12. Assistant (turn 12)

Exacto. Si mapeas los valores del ruido a distintos rangos de color, puedes asignar tipos de vegetación. Por ejemplo, valores bajos pueden ser zonas áridas, valores medios bosques, y valores altos vegetación densa. Así, la paleta de colores del ruido define biomas o tipos de plantas, todo procedimentalmente.

---

## 13. User (turn 13)

“Sí, yo estaba pensando más bien que el rojo sea en árboles, el verde es en arbustos y el azul sea pasto.”

---

## 14. Assistant (turn 14)

Justamente. Puedes interpretar cada canal del ruido como un indicador de un tipo de vegetación. Por ejemplo, si en un sector el canal rojo domina, se generan más árboles. Si predomina el verde, habrá más arbustos. Si el azul es alto, el terreno tendrá más pasto. Todo se mantiene procedimental, coherente y fácil de ajustar.

---

## 15. User (turn 15)

bien, ahora quiero que hagas un documento de diseño en inglés con las especificaciones de lo que acabamos de hablar.

---

## 16. Assistant (turn 16)

# Procedural Vegetation Generation Design
## Overview
This document describes a deterministic procedural vegetation generation system for a fully procedural planetary renderer. The primary design goals are:
- Infinite procedural generation.
- Zero persistent storage of vegetation instances.
- Deterministic regeneration.
- View-dependent computation.
- High scalability from orbital to ground-level views.
- Support for multiple vegetation types and future biome expansion.
The system is designed to integrate naturally with a GPU-driven terrain renderer.
---
# Design Goals
The vegetation system should:
- Generate vegetation only where needed.
- Produce identical results every time for the same world location.
- Require no serialized vegetation database.
- Support extremely large planets.
- Allow seamless streaming as the camera moves.
- Support future additions such as rocks, flowers, fallen trees, mushrooms and wildlife.
---
# Spatial Partitioning
The planet is already represented as a cube projected onto a sphere.
Vegetation generation follows the same hierarchy.
```
Planet
    Cube Face
        Terrain Tile
            Vegetation Cell
```
Vegetation Cells are relatively small regions whose size depends on the desired density.
Typical sizes might range between:
- 32 × 32 meters
- 64 × 64 meters
- 128 × 128 meters
Only cells intersecting the visible terrain are generated.
Cells outside the current working set simply do not exist.
---
# Deterministic Generation
Every vegetation cell is completely deterministic.
Its world-space coordinates are hashed into a seed:
```
seed = Hash(face, level, tileX, tileY)
```
This guarantees:
- identical regeneration
- no saved instance data
- reproducible worlds
- thread-safe generation
---
# Procedural Density Fields
Instead of randomly scattering vegetation uniformly, distribution is driven by continuous procedural noise.
Several octaves of noise (fBm) produce natural large-scale variation.
Low-frequency noise defines:
- forests
- plains
- rocky areas
- sparse vegetation
Higher-frequency noise introduces:
- clearings
- clusters
- natural irregularity
This avoids the artificial appearance of purely random placement.
---
# Multi-Channel Noise
Instead of generating a single scalar field, generate a three-channel procedural field.
```
RGB Noise

R = Trees
G = Shrubs
B = Grass
```
Each channel represents vegetation suitability.
For example:
```
R = 0.92
G = 0.30
B = 0.15
```
produces a dense forest.
Meanwhile:
```
R = 0.15
G = 0.80
B = 0.95
```
produces grassy terrain with scattered bushes.
The channels are independent but may share underlying noise octaves.
---
# Density Thresholds
Each vegetation type defines its own spawning threshold.
Example:
Trees
```
R > 0.75
```
Shrubs
```
G > 0.45
```
Grass
```
B > 0.20
```
Thresholds become artist-adjustable parameters.
Changing thresholds immediately changes biome appearance without altering terrain.
---
# Hierarchical Noise
Different frequencies define different ecological scales.
Example:
Very Low Frequency
- continents
- climate zones
Low Frequency
- forests
- deserts
- grasslands
Medium Frequency
- forest clearings
- shrub clusters
High Frequency
- individual placement variation
This hierarchy creates visually convincing landscapes.
---
# Candidate Generation
Within every vegetation cell:
1. Generate a deterministic set of candidate positions.
2. Evaluate terrain suitability.
3. Evaluate RGB vegetation noise.
4. Apply biome rules.
5. Accept or reject the instance.
Example:
```
candidate

↓

terrain slope

↓

altitude

↓

soil/moisture

↓

RGB density

↓

spawn
```
No candidate list needs to be stored.
---
# Terrain Constraints
Vegetation placement should consider terrain properties:
- slope
- altitude
- curvature
- exposure
- moisture (future)
- drainage (future)
- temperature (future)
Example rules:
Trees
- low slope
- medium altitude
Shrubs
- moderate slope
- wider altitude range
Grass
- almost everywhere
---
# Level of Detail
Vegetation generation is camera dependent.
Orbital View
- no individual vegetation
High Altitude
- vegetation represented statistically
Medium Distance
- simplified impostors
Ground Level
- full procedural instances
This greatly reduces rendering cost.
---
# Streaming
As the camera moves:
New vegetation cells are generated.
Old cells are discarded.
Because generation is deterministic, discarded cells can always be regenerated later.
Memory usage remains nearly constant regardless of world size.
---
# Performance
The system is embarrassingly parallel.
Each vegetation cell is independent.
Generation can execute on:
- CPU worker threads
- GPU compute shaders
- WebGPU compute pipelines
No synchronization between cells is required.
---
# Future Extensions
The same framework can generate:
- rocks
- flowers
- mushrooms
- fallen logs
- cacti
- snow patches
- animal spawn points
- procedural villages
- ruins
- resource nodes
Each additional feature simply consumes one or more procedural channels.
---
# Advantages
Compared with purely random placement:
- more natural ecosystems
- deterministic
- zero storage
- infinite worlds
- scalable
- GPU-friendly
- artist-controllable
- biome-independent
- compatible with procedural terrain generation
The RGB density field also provides a simple but powerful abstraction that can later be expanded to additional channels (RGBA or multiple layered fields) to represent richer ecological variables such as moisture, fertility, seasonal variation, or species diversity without changing the overall architecture.

---

## 17. User (turn 17)

Bueno, este algoritmo es para el generador de planetas este que estamos trabajando, así que, y hay muchas cosas hechas. Aquí lo que faltaría, por ejemplo, el generador de planetas tiene todas las coordenadas de las texturas del planeta en coordenadas esféricas. Pero en el caso de los árboles y la vegetación, los árboles, no importa el tamaño del planeta, van a tener siempre más o menos una distancia en metros, que va a ser, siendo constante. Entonces, este ruido Perlin va a usar un sistema de coordenadas diferente en metros absolutos que las coordenadas esféricas para generar el terreno.

---

## 18. Assistant (turn 18)

Sí, esa corrección es importante.

El terreno puede usar coordenadas esféricas normalizadas, pero la vegetación debería usar **coordenadas métricas locales**.

La idea sería:

```
sphereCoord = planet texture / terrain coordinateworldMeters = position on planet surface in metersvegetationNoise = noise(worldMeters / vegetationScale)
```

Así, un bosque no cambia de escala porque el planeta sea más grande o más chico.

El flujo correcto sería:

```
spherical terrain coordinate        ↓surface point on sphere        ↓local tangent-space / world-space meters        ↓vegetation density noise        ↓tree / shrub / grass placement
```

Para vegetación, evitaría usar directamente lat/lon o UV porque cerca de polos y bordes de cube-face se distorsiona. Mejor:

```
const p = surfacePositionMeters; // vec3 desde centro del planetaconst density = noise3D(  p.x / forestScaleMeters,  p.y / forestScaleMeters,  p.z / forestScaleMeters);
```

Y para posiciones individuales dentro de una celda:

```
const cellSizeMeters = 64;const cell = floor(surfaceLocalMeters / cellSizeMeters);const seed = hash(cell.x, cell.y, cell.z, faceId);
```

Entonces separás dos cosas:

```
Terrain:  spherical / cube-sphere coordinatesVegetation:  metric surface coordinates  absolute distances in meters
```

Esto es especialmente importante para que:

- los árboles mantengan tamaño real;
- la distancia entre árboles sea constante;
- la densidad sea comparable entre planetas;
- no aparezcan estiramientos en polos o bordes;
- el mismo algoritmo funcione para planetas chicos y enormes.

Yo modificaría el documento con una sección explícita: **Metric Vegetation Coordinate Space**.

---

## 19. User (turn 19)

Sí, no es tanto problema las coordenadas. Las coordenadas pueden ser directamente x, y, z. Aquí lo que va a importar va a ser la densidad y, cuando se traspase cierto umbral de cierta densidad en cierto canal RGB, en ese momento ya, en ese punto de la superficie de la esfera que está interseccionada con la coordenada x, y, z, se decidiría si va una vegetación o algo ahí en ese lugar. Así que eso no es problema.

---

## 20. Assistant (turn 20)

Sí. Entonces la regla central queda:

```
vegetation = threshold(RGB_noise(surfaceXYZ_meters))
```

No se genera “por coordenadas esféricas”, sino evaluando ruido 3D en el punto real de superficie.

Algo así:

```
const p = surfacePositionMeters; // xyz sobre la esfera deformadaconst r = noise3D(p.x * treeFreq,  p.y * treeFreq,  p.z * treeFreq);const g = noise3D(p.x * bushFreq,  p.y * bushFreq,  p.z * bushFreq);const b = noise3D(p.x * grassFreq, p.y * grassFreq, p.z * grassFreq);const hasTree  = r > treeThreshold;const hasBush  = g > bushThreshold;const hasGrass = b > grassThreshold;
```

La subdivisión por zonas seguiría sirviendo, pero solo como **límite de cómputo/streaming**, no como lógica ecológica.

```
Zone:  decides what to evaluateNoise:  decides what grows there
```

Y dentro de cada zona podés muestrear puntos candidatos en metros:

```
for each candidatePoint on visible terrain:  densityRGB = vegetationNoise(candidatePoint.xyzMeters)  if densityRGB.r > treeThreshold:    spawn tree candidate  if densityRGB.g > shrubThreshold:    spawn shrub candidate  if densityRGB.b > grassThreshold:    mark grass coverage
```

Eso es más limpio: la zona no “contiene 5 a 100 árboles”; la zona contiene una porción de superficie donde se evalúa una función continua. Así evitás discontinuidades entre zonas.

---

## 21. User (turn 21)

Sí, lo que me faltaba decir es que tenemos dos frecuencias de ruido. Tenemos una frecuencia baja, que es la densidad, y una frecuencia alta, que es la ubicación específica de cada arbolito. Y de esa manera, con la frecuencia alta, es esa la que iría en metros absolutos.

---

## 22. Assistant (turn 22)

Sí, eso cierra mejor:

```
low-frequency noise  = biome / density fieldhigh-frequency noise = individual placement mask
```

Entonces:

```
const densityRGB = lowFreqVegetationNoise(surfaceXYZ);const placement = highFreqPlacementNoise(surfaceXYZMeters);const tree =  densityRGB.r > treeDensityThreshold &&  placement > treePlacementThreshold;
```

Conceptualmente:

```
Density noise:  “¿Esta zona admite bosque?”Placement noise:  “¿Este punto exacto contiene un árbol?”
```

La baja frecuencia puede estar en escala grande:

```
forestScale = 500;   // metersclearingScale = 80;  // meters
```

La alta frecuencia en escala real de individuos:

```
treeSpacingScale = 6;   // metersbushSpacingScale = 2;   // metersgrassScale = 0.25;      // meters
```

Y por canal:

```
const treeDensity = densityNoise.r;const shrubDensity = densityNoise.g;const grassDensity = densityNoise.b;const treePlacement = noise3D(p.x / 6, p.y / 6, p.z / 6);const shrubPlacement = noise3D(p.x / 2, p.y / 2, p.z / 2);const grassPlacement = noise3D(p.x / 0.25, p.y / 0.25, p.z / 0.25);
```

Regla final:

```
hasTree =  treeDensity > 0.65 &&  treePlacement > 0.82 &&  slope < maxTreeSlope;
```

Esto separa muy bien:

```
ecología       → ruido de baja frecuenciaposición real → ruido de alta frecuencia en metrosrestricciones → pendiente, altura, agua, roca, etc.
```

Y las zonas siguen siendo solo cache/streaming/visibilidad.

---

## 23. User (turn 23)

Bien, actualiza el documento de diseño y de especificaciones.

---

## 24. Assistant (turn 24)

Aquí tienes una versión actualizada que incorpora las dos escalas de ruido y el uso de coordenadas métricas para el posicionamiento de la vegetación.

# Procedural Vegetation Generation
## Design & Technical Specification
### Overview
This document describes the procedural vegetation generation system for the **Virtual Planet** renderer.
Unlike terrain generation, which operates in spherical cube-space coordinates, vegetation is generated from deterministic 3D procedural fields evaluated in world-space metric coordinates. This guarantees that vegetation density and spacing remain physically consistent regardless of planet size.
The system is designed for:
- Infinite procedural worlds
- Zero vegetation storage
- Deterministic regeneration
- View-dependent streaming
- GPU-friendly execution
- Physically consistent vegetation spacing
---
# Core Principles
The vegetation system separates three independent concerns:
1. **Streaming**
  Determines which regions are evaluated.
2. **Ecology**
  Determines what type of vegetation can grow.
3. **Placement**
  Determines the exact location of individual instances.
These three layers are intentionally independent.
---
# Spatial Streaming
The existing cube-sphere terrain hierarchy is reused.
```
Planet
    Cube Face
        Terrain Tile
            Vegetation Cell
```
Vegetation Cells exist only to limit computation.
They **do not** define ecosystem boundaries.
Cells outside the visible working set simply do not exist.
Since generation is deterministic, discarded cells can always be regenerated.
---
# Coordinate Spaces
Two coordinate systems coexist.
## Terrain Coordinates
Terrain generation uses the existing procedural spherical coordinate system.
This controls:
- terrain height
- geology
- continental features
- large-scale terrain noise
---
## Vegetation Coordinates
Vegetation uses absolute 3D world-space coordinates expressed in meters.
```
Surface Position

↓

World XYZ (meters)

↓

Procedural vegetation fields
```
This ensures that:
- tree spacing remains constant
- vegetation scale is independent of planet radius
- no distortion occurs near poles or cube-face edges
The procedural fields operate directly on the surface position expressed as a 3D vector.
---
# Dual-Frequency Vegetation Model
Vegetation is generated using two completely different procedural fields.
## Low-Frequency Field
Purpose:
Defines ecological suitability.
This answers:
> "Should a forest exist here?"
Typical frequencies:
- hundreds of meters
- kilometers
This field produces:
- forests
- grasslands
- sparse regions
- clearings
- ecological transitions
---
## High-Frequency Field
Purpose:
Determines the exact placement of individual vegetation instances.
This answers:
> "Should there be a tree exactly here?"
Typical frequencies:
- meters
- fractions of meters
This field creates:
- natural spacing
- irregular clustering
- individual tree locations
- shrub distribution
- grass variation
Because it operates in metric space, vegetation spacing remains physically correct on every planet.
---
# RGB Density Fields
The ecological field is represented as a three-channel procedural noise.
```
R → Trees

G → Shrubs

B → Grass
```
Each channel represents habitat suitability rather than vegetation itself.
Example:
```
R = 0.90

G = 0.20

B = 0.15
```
Dense forest.
Example:
```
R = 0.15

G = 0.70

B = 0.95
```
Grassland with scattered shrubs.
Additional channels can later represent:
- flowers
- rocks
- fungi
- snow
- moss
- moisture
- fertility
---
# Placement Algorithm
For every candidate point on the visible terrain:
1. Compute surface position.
2. Convert to world-space XYZ (meters).
3. Evaluate the low-frequency RGB ecological field.
4. Evaluate the high-frequency placement field.
5. Apply terrain constraints.
6. Spawn vegetation if all conditions are satisfied.
Conceptually:
```
Surface Point

↓

Ecological Density

↓

Placement Noise

↓

Slope

↓

Altitude

↓

Spawn Decision
```
---
# Spawn Rules
Example:
```
Tree

TreeDensity > 0.70

AND

TreePlacement > 0.82

AND

Slope < MaxTreeSlope

AND

Altitude inside allowed range
```
Shrubs and grass use independent thresholds and placement frequencies.
---
# Terrain Constraints
Each vegetation type may additionally depend on:
- slope
- altitude
- local curvature
- exposure
- soil type
- moisture
- drainage
- future climate simulation
These rules remain independent from the procedural noise.
---
# Level of Detail
Different viewing distances generate different representations.
**Orbit**
No vegetation.
**High altitude**
Statistical vegetation coverage.
**Medium distance**
Simplified impostors or clusters.
**Ground level**
Full procedural vegetation instances.
---
# Performance
Each vegetation cell is completely independent.
Generation is embarrassingly parallel and suitable for:
- CPU workers
- Web Workers
- GPU Compute
- WebGPU Compute Shaders
Only visible cells are evaluated.
Memory usage therefore remains nearly constant regardless of planet size.
---
# Future Extensions
The same architecture can procedurally generate:
- rocks
- flowers
- mushrooms
- fallen logs
- cacti
- snow patches
- debris
- ruins
- resource nodes
- wildlife spawn locations
Only new procedural channels and placement rules need to be added.
---
# Summary
The vegetation system intentionally separates:
```
Terrain
    ↓
Provides the surface geometry

Streaming
    ↓
Determines what is evaluated

Low-Frequency RGB Noise
    ↓
Defines ecological density

High-Frequency Metric Noise
    ↓
Determines exact vegetation placement

Terrain Constraints
    ↓
Slope, altitude, moisture, etc.

Vegetation Instances
```
This separation yields a deterministic, scalable, planet-independent vegetation system that produces natural ecosystems while remaining highly efficient and well suited to GPU-driven procedural rendering.

---

## 25. User (turn 25)

Sí, la única dificultad que queda es que si estoy haciendo muestreo, estoy sampleando sobre la superficie y tengo que pintar varios píxeles que todos estos crucen el umbral para un solo árbol, no quiero generar un árbol por píxel. Entonces habría que hacer una detección de picos por encima, o sea, un multisampleo, un multimuestreo, para ver si se encuentra un pico y solamente si hay un pico, de ahí recién sacar la intensidad del pico para ver si entra, si pasa el umbral o no.

---

## 26. Assistant (turn 26)

Exacto. Ahí conviene cambiar el modelo de “cada sample decide” a “cada máximo local decide”.

Regla:

```
no spawn if noise > thresholdspawn only if this sample is a local peak above threshold
```

Entonces para árboles:

```
const v = placementNoise(p);const isPeak =  v > sample(p + dx) &&  v > sample(p - dx) &&  v > sample(p + dy) &&  v > sample(p - dy) &&  v > sample(p + dxy1) &&  v > sample(p + dxy2);const hasTree =  density.r > treeDensityThreshold &&  isPeak &&  v > treePlacementThreshold;
```

Pero mejor todavía: hacer el pico por **celdas métricas**.

```
one candidate search region ≈ one possible tree
```

Por ejemplo, celda de 6 m:

1. Dividís la superficie visible en celdas de 6 × 6 m aproximados.
2. En cada celda hacés varios samples del ruido de alta frecuencia.
3. Buscás el máximo.
4. Solo ese máximo puede generar un árbol.
5. La intensidad del máximo decide si supera umbral.

```
for (const cell of visibleMetricCells) {  let bestPoint = null;  let bestValue = -Infinity;  for (const sample of cell.multiSamples) {    const p = projectToSurface(sample);    const v = treePlacementNoise(p.xyzMeters);    if (v > bestValue) {      bestValue = v;      bestPoint = p;    }  }  if (    bestValue > treePlacementThreshold &&    treeDensityNoise(bestPoint.xyzMeters) > treeDensityThreshold  ) {    spawnTree(bestPoint);  }}
```

Eso evita:

```
un pixel → un árbol
```

y lo convierte en:

```
una celda métrica → cero o un árbol
```

Para más naturalidad, podés permitir:

```
tree cell: 0–1 árbolshrub cell: 0–3 arbustosgrass cell: cobertura continua
```

El punto clave es este:

```
high-frequency noise is not sampled as occupancy per pixel;it is sampled as a peak field inside metric candidate cells.
```

Eso además te da control directo de spacing mínimo:

```
treeCellSize = 5–8 meters;shrubCellSize = 1–3 meters;grassCellSize = coverage, not instances;
```

Yo actualizaría el documento con una sección: **Peak-Based Placement / Metric Candidate Cells**.

---

## 27. User (turn 27)

Sí, no está mal el algoritmo, pero me parece que dividir en celdas es más procesamiento. Cuando simplemente detectar picos y después pasarlos por un umbral, podemos ya tener una medida de densidad, incluso dentro de las zonas de bosques, también tener zonas, gracias a las frecuencias bajas, altas quiero decir, zonas de arbolitos.

---

## 28. Assistant (turn 28)

Sí, de acuerdo: la celda métrica era una forma simple de limitar duplicados, pero no es la forma más elegante.

Mejor:

```
sampling surface → detect local maxima → threshold peak intensity → spawn
```

La frecuencia alta deja de ser “máscara binaria” y pasa a ser un **campo de candidatos**. Solo los máximos locales cuentan.

```
const v = placementNoise(p);const isPeak =  v > noise(p + tangentX * eps) &&  v > noise(p - tangentX * eps) &&  v > noise(p + tangentY * eps) &&  v > noise(p - tangentY * eps);const spawnTree =  isPeak &&  v > treePlacementThreshold &&  density.r > treeDensityThreshold;
```

Así:

```
low frequency RGB → zonas ecológicasmid/high frequency → subzonas densas dentro del bosquelocal maxima → árboles individualespeak intensity → probabilidad / vigor / tamaño
```

Y evitás:

```
muchos píxeles sobre umbral = muchos árboles
```

porque solo uno, el pico, puede generar el árbol.

La distancia entre árboles sale indirectamente de:

```
frequency of placement noisesampling resolutionpeak thresholdpeak suppression radius, optional
```

Para robustez agregaría una condición de “prominencia”:

```
const prominence =  v - maxNeighborValue;const spawnTree =  isPeak &&  prominence > minTreeProminence &&  v > treePlacementThreshold &&  density.r > treeDensityThreshold;
```

Eso evita mesetas o ondulaciones suaves generando demasiados candidatos.

En el documento yo reemplazaría “metric candidate cells” por:

**Peak-Based Placement Field**

con esta regla:

```
Vegetation instances are generated only at local maxima of the high-frequency placement field. Thresholding is applied to peak values, not to every sampled surface point.
```

---

## 29. User (turn 29)

Sí, y también, aunque podemos dividir por canales, podemos usar un solo canal para árboles y pasto, por ejemplo, porque donde hay árboles no hay pasto. Entonces, las intensidades bajas de ese canal serían pasto y las intensidades altas serían, los picos bajos, mejor dicho. Bueno, en el caso del pasto podría no ser pico, podría ser una zona, ya se verá cómo se resuelve eso. Hay que tener cuidado con eso. Pero los picos altos serían los árboles y las zonas bajas sería el pasto. Que ver de vuelta ahí, si no usar otra frecuencia más alta todavía para el pasto.

---

## 30. Assistant (turn 30)

Sí. Yo lo formularía como **canales semánticos opcionales**, no fijos.

Un canal puede representar un gradiente ecológico:

```
low values  → grassmid values  → shrubs / transitionhigh peaks  → trees
```

Entonces para un mismo canal:

```
const v = vegetationField(p);// cobertura continuaconst grass = v < grassMax;// instancias puntualesconst tree =  isLocalPeak(v, p) &&  v > treePeakThreshold;
```

Pero hay que separar dos tipos de vegetación:

```
coverage vegetation:  grass, moss, low plants  uses zones / bands / masksinstance vegetation:  trees, shrubs, rocks  uses peaks
```

Para pasto probablemente conviene:

```
const grassCoverage =  smoothstep(grassMax, grassMin, v) *  highFreqGrassDetail(p);
```

Es decir:

```
canal principal:  decide si domina bosque o pastofrecuencia extra:  rompe la uniformidad del pasto
```

Regla limpia:

```
Tree placement consumes high peaks.Grass occupies the remaining low-density regions, optionally modulated by a finer grass noise.
```

Así evitás que árboles y pasto compitan mal:

```
const treeMask = treePeakMask(p);const grassMask =  (1.0 - treeInfluenceMask(p)) *  grassSuitability *  grassMicroNoise;
```

La clave: **no todos los canales tienen que mapear 1:1 a especies**. Pueden mapear a relaciones ecológicas: bosque↔pasto, humedad↔sequedad, roca↔suelo, etc.

---

## 31. User (turn 31)

Sí, algo de eso ya estoy haciendo con el, porque en este momento también tengo generadores Perlin, ruido Perlin para generar montañas, valles, erosión, playas. Lo que haría falta de todas formas es formalizar todo esto en un lenguaje especializado para generar código WebGPU, que se pueda dibujar con un editor de grafos.

---

## 32. Assistant (turn 32)

Tiene sentido formalizarlo como un DSL visual primero, no como “código suelto”. La clave sería que el grafo produzca funciones puras WGSL reutilizables para terreno, vegetación, biomas y máscaras.

---

## 33. User (turn 33)

Sí, además de ser reutilizable, tendría que tener un solo grafo con múltiples salidas, que vaya al vertex shader, al fragment shader, a donde sea. Incluso para salida multiple vertex shader, para que el mismo código genere el terreno, genere la decisión de los árboles en otro, con salida a otro shader.

---

## 34. Assistant (turn 34)

Sí: **un solo grafo procedural multi-output**, compilado a varias funciones WGSL y usado por varios pipelines.

Modelo:

```
Procedural Planet Graph  inputs:    positionSphere    positionMeters    normal    altitude    slope    seed  outputs:    terrainHeight        → vertex shader    terrainNormal        → vertex/fragment shader    terrainAlbedo        → fragment shader    biomeMask            → fragment shader / vegetation    treeDensity          → vegetation compute/vertex    treePeakField        → vegetation compute    grassCoverage        → fragment shader / grass pass    rockMask             → fragment shader / props
```

La clave es que el grafo no genere “un shader”, sino una **biblioteca de funciones puras**:

```
fn terrain_height(p: vec3<f32>) -> f32fn biome_mask(p: vec3<f32>) -> vec4<f32>fn tree_density(p: vec3<f32>) -> f32fn tree_peak_field(p: vec3<f32>) -> f32fn grass_coverage(p: vec3<f32>) -> f32
```

Después cada shader importa o recibe solo lo que necesita:

```
terrain vertex shader:  uses terrain_height  uses terrain_normalterrain fragment shader:  uses terrain_albedo  uses biome_mask  uses grass_coveragevegetation compute shader:  uses tree_density  uses tree_peak_field  uses slope  emits tree instancestree vertex shader:  uses instance position  uses wind field  uses biome variation
```

Arquitectura correcta:

```
Graph  ↓Typed IR  ↓Dependency slicing per output  ↓WGSL function library  ↓Pipeline-specific shader assembly
```

Lo importante es **dependency slicing**: si el shader de árboles solo necesita `treeDensity`, no arrastra todo el cálculo de playas, albedo o erosión.

Ejemplo:

```
Output: terrainHeightdepends on:  continentNoise  mountainNoise  erosionNoiseOutput: treeSpawndepends on:  biomeMask  treeDensity  treePeakField  slopeMaskOutput: grassColordepends on:  biomeMask  grassCoverage  microNoise
```

Así el editor muestra un grafo grande, pero el compilador produce shaders especializados y eficientes.

Yo agregaría al documento una sección fuerte:

**Multi-Output Procedural Field Graph**

con esta regla:

```
The graph is the canonical procedural description of the planet.Shaders are generated views of that graph, not separate authored programs.
```

---

## 35. User (turn 35)

Sí, agrégalo.

---

## 36. Assistant (turn 36)

# Design Extension: Multi-Output Procedural Field Graph
## Overview
The procedural graph is the **single source of truth** describing the planet.
It is **not** a terrain graph, vegetation graph, or material graph.
Instead, it represents a collection of interconnected procedural fields that can be evaluated by any rendering or simulation pipeline.
Every system derives its data from this common graph.
---
# Core Principle
Rather than generating individual shaders, the graph generates a library of reusable procedural functions.
```
Procedural Planet Graph
        │
        ▼
Typed Intermediate Representation (IR)
        │
        ▼
Dependency Analysis
        │
        ▼
WGSL Function Library
        │
        ├──────────────┐
        ▼              ▼
Terrain Pipeline   Vegetation Pipeline
        │              │
        ▼              ▼
Fragment Shader   Compute Shader
Vertex Shader     Instance Generator
```
The graph is authored once and consumed many times.
---
# Typed Procedural Fields
Every node produces a typed field.
Examples:
```
Field<float>
Field<vec2>
Field<vec3>
Field<vec4>
Field<bool>
```
Typical outputs include:
```
terrainHeight
terrainNormal
terrainColor
erosion
beachMask
snowMask
moisture
temperature
biome
treeDensity
treePeakField
grassCoverage
rockDistribution
windStrength
```
Fields are pure functions of procedural inputs.
---
# Graph Inputs
Typical inputs include:
```
positionSphere
positionMeters
surfaceNormal
planetRadius
altitude
slope
curvature
seed
time
```
Additional simulation fields may be added later.
---
# Multiple Outputs
The graph exposes many named outputs.
Example:
```
terrainHeight
terrainNormal
terrainAlbedo
treeDensity
treePeakField
grassCoverage
rockMask
erosionMask
waterMask
snowMask
```
Each output may be consumed independently.
---
# Pipeline Specialization
Each rendering pipeline requests only the outputs it needs.
For example:
## Terrain Vertex Shader
Requires:
```
terrainHeight
terrainNormal
```
---
## Terrain Fragment Shader
Requires:
```
terrainAlbedo
grassCoverage
snowMask
beachMask
rockMask
```
---
## Vegetation Compute Shader
Requires:
```
treeDensity
treePeakField
slope
altitude
```
Produces:
```
tree instances
```
---
## Tree Vertex Shader
Requires:
```
windStrength
seasonVariation
```
---
# Dependency Analysis
The compiler performs dependency slicing.
Example:
```
treePeakField

depends on

highFrequencyNoise

depends on

Perlin3D
```
The vegetation shader does **not** compile terrain erosion, beaches, snow, or unrelated fields.
Likewise, the terrain shader never evaluates tree placement logic unless explicitly requested.
This minimizes generated WGSL and improves runtime performance.
---
# Reusable Procedural Functions
Rather than generating monolithic shaders, the compiler emits reusable WGSL functions.
Example:
```
fn terrain_height(...) -> f32

fn terrain_normal(...) -> vec3<f32>

fn biome(...) -> vec4<f32>

fn tree_density(...) -> f32

fn tree_peak_field(...) -> f32

fn grass_coverage(...) -> f32
```
Pipeline-specific shaders are assembled by importing only the required functions.
---
# Shared Evaluation
A single procedural evaluation can feed multiple systems.
Example:
```
Mountain Noise
        │
        ├────────► Terrain Height
        │
        ├────────► Rock Distribution
        │
        ├────────► Snow Accumulation
        │
        └────────► Vegetation Suppression
```
The same field contributes to several outputs without duplication.
---
# Vegetation Model
Vegetation generation uses two distinct procedural layers.
### Ecological Field
Low-frequency.
Determines habitat suitability.
Outputs:
```
treeDensity
grassSuitability
shrubSuitability
```
---
### Placement Field
High-frequency.
Represents candidate locations.
Instances are generated **only at local maxima** of this field.
The peak value determines instance strength, probability, or maturity.
This avoids creating one instance per sampled point.
---
# Coverage vs. Instances
The graph distinguishes between continuous coverage and discrete instances.
Continuous fields:
```
grass
moss
sand
snow
```
Discrete fields:
```
trees
rocks
boulders
shrubs
fallen logs
```
Coverage fields are evaluated continuously during rendering.
Instance fields are converted into procedural objects through peak detection.
---
# Future Graph Editor
The visual editor represents only procedural relationships.
It does not encode rendering stages.
Rendering pipelines simply subscribe to the outputs they require.
This allows new systems—such as rivers, weather, wildlife, particle effects, or gameplay—to reuse the same procedural graph without modifying its structure.
---
# Guiding Principle
**The procedural graph is the canonical description of the planet. Terrain generation, vegetation, materials, simulation, and rendering are all different consumers of the same procedural field network.**

---

## 37. User (turn 37)

Y como esto es WebGPU, no solamente estamos usando vertex y fragment shaders, también estamos usando shaders que generan vértices para teselación. Así que también puede ser una salida para el teselador.

---

## 38. Assistant (turn 38)

Sí, y creo que ahí está una de las ideas más fuertes de la arquitectura.

No deberíamos pensar en **Vertex Shader**, **Fragment Shader** o **Compute Shader**. Esos son simplemente consumidores del grafo.

En WebGPU la arquitectura debería ser algo así:

```
Procedural Graph        │        ▼Compiler        │        ▼WGSL Function Library        │        ├───────────────┬─────────────────┬──────────────────┬─────────────────┐        ▼               ▼                 ▼                  ▼Compute         Vertex Shader      Fragment Shader     Mesh GenerationPipeline        Pipeline           Pipeline            Pipeline
```

Y el "Mesh Generation Pipeline" (teselación por compute, ya que WebGPU no tiene tessellation shaders fijos) puede consumir exactamente los mismos campos.

Por ejemplo:

```
terrainHeight        ├──► Terrain mesh generation        ├──► Collision mesh        ├──► Physics        └──► Navigation
```

Mientras que:

```
treePeakField        ├──► Instance generation        ├──► Collision objects        └──► AI navigation obstacles
```

Y:

```
grassCoverage        ├──► Terrain material        ├──► Grass renderer        └──► Ecology simulation
```

De hecho, yo iría un paso más allá y cambiaría la terminología del documento.

En lugar de hablar de "shader outputs", hablaría de **procedural products** o **procedural consumers**.

```
Procedural Graph        │        ├──► Terrain Mesh Generator        ├──► Terrain Material Generator        ├──► Vegetation Generator        ├──► Water Generator        ├──► Collision Generator        ├──► Physics Fields        ├──► Navigation Fields        ├──► Atmospheric Scattering        ├──► LOD Generator        └──► Debug Visualizers
```

Cada uno de esos productos puede terminar ejecutándose en uno o varios pipelines de WebGPU (compute, vertex o fragment), pero eso pasa a ser un detalle de implementación.

Creo que este cambio conceptual es importante porque convierte el editor de grafos en un **lenguaje procedimental del planeta**, no en un editor de shaders. Es decir, el usuario describe el planeta y sus campos; el compilador decide cómo distribuir esa lógica entre los distintos pipelines de WebGPU según las dependencias y el uso de cada salida. Ese enfoque hace que la arquitectura sea mucho más escalable y preparada para futuras extensiones.

---

## 39. User (turn 39)

Ya tengo cierta especificación sobre lo que quiero en el proyecto en el repositorio, pero viene bien esto. Y también querría que te fijes en el URL que te pego aquí, que adjunto, porque ahí hay un linker compilador para WebGPU, que podría servir como arquitectura. https://acko.net/blog/use-gpu-goes-trad/

---

## 40. Assistant (turn 40)

Voy a revisar ese artículo y contrastarlo con la arquitectura del grafo/compilador que venimos definiendo, especialmente la parte de linker, módulos WGSL y generación por pipeline.

---

## 41. User (turn 41)

También tiene otra cosa interesante para nosotros. Él tiene una máquina parecida a React, para hacer todo declarativo con markup. Nosotros podríamos hacer lo mismo, pero tiene que ser para Svelte.

---

## 42. Assistant (turn 42)

Sí. Para Virtual Planet convendría una capa declarativa tipo **Svelte-GPU**, no React.

Idea:

```
<PlanetGraph>  <Field name="height" type="float">    <FBM input="positionSphere" scale={0.8} octaves={6} />  </Field>  <Field name="treeDensity" type="float">    <SmoothThreshold input="biomeForest" min={0.55} max={0.8} />  </Field>  <Field name="treePeakField" type="float">    <Perlin3D input="positionMeters" scale={1 / 6} />  </Field>  <Consumer type="tessellator" outputs={["height", "normal", "lodDensity"]} />  <Consumer type="terrain-fragment" outputs={["albedo", "grassCoverage"]} />  <Consumer type="vegetation-compute" outputs={["treeDensity", "treePeakField"]} /></PlanetGraph>
```

La diferencia con Use.GPU sería que su runtime usa un modelo “React-like” propio, con componentes declarativos, captures y una arquitectura component-driven; incluso dice que las funciones shader no son shaders completos sino funciones linkeadas dentro de stubs. [[![image](https://www.google.com/s2/favicons?domain=https://acko.net&sz=128)Acko](https://acko.net/blog/use-gpu-goes-trad/)]

Para Svelte, yo evitaría clonar React. Haría:

```
Svelte components = authoring layerstores/runes      = reactive parametersgraph compiler    = source of truthWGSL linker       = generated backend
```

Arquitectura:

```
.svelte markup   ↓Graph builder   ↓Typed IR   ↓Dependency slicing   ↓WGSL function library   ↓Pipeline-specific assembly
```

Y el punto importante: los componentes Svelte no deberían representar objetos 3D mutables. Deberían declarar **campos procedurales y consumidores**.

```
<FBM> no dibuja nada<TreeGenerator> no guarda árboles<Tessellator> consume campos y produce buffers
```

Eso encaja mejor con Svelte que una escena tradicional: el estado reactivo cambia parámetros, el grafo recompila o actualiza uniforms, y los pipelines consumen funciones generadas.

---

## 43. User (turn 43)

Exacto. De todas formas, para el editor tenemos que poder editar directamente en el documento vivo, no solamente con markup, así que tiene que contemplar ambos métodos. E incluso el formato para guardar el archivo podría llegar a ser un documento de Svelte, ya veremos eso después.

---

## 44. Assistant (turn 44)

Sí. Entonces habría que separar **modelo interno** de **formas de autoría**.

```
Canonical Graph IR   ↑            ↑Visual Editor   Svelte Markup
```

El grafo real debería vivir en un IR serializable, no en el DOM ni solo en Svelte.

Luego podés tener dos frontends:

```
1. Visual node editor   edita nodos, conexiones, parámetros2. Svelte declarative document   declara el mismo grafo como componentes
```

Y ambos producen lo mismo:

```
Graph IR → compiler → WGSL/linker/pipelines
```

Ejemplo de guardado posible:

```
type GraphDocument = {  version: string;  nodes: GraphNode[];  edges: GraphEdge[];  outputs: GraphOutput[];  consumers: ProceduralConsumer[];};
```

Después se puede decidir si el archivo fuente es:

```
.planet.json      // más fácil para editor visual.planet.ts        // más programable.planet.svelte    // autoría declarativa viva
```

La opción más flexible sería soportar dos formatos:

```
Authoring format:  .planet.svelteCanonical save/export:  .planet.json / .planet.graph
```

Pero si querés “documento vivo”, entonces `.svelte` es muy atractivo porque puede contener:

```
<PlanetGraph bind:graph>  <FBM id="mountains" scale={mountainScale} />  <Threshold id="snow" input="altitude" min={snowLine} />  <Output name="terrainHeight" from="height" /></PlanetGraph><GraphEditor bind:graph /><PlanetViewport graph={graph} />
```

Eso permitiría:

```
markup declarativo+ editor visual+ preview+ runtime
```

Mi recomendación: **el editor visual edita el IR; Svelte es una representación/autoring layer opcional del IR**. Así no quedás encerrado en un parser Svelte desde el día uno.

---

## 45. User (turn 45)

Sí, debería poder incluso funcionar con otros, con otras herramientas como Svelte, como React o Vue. Eso, si es genérico de esa manera, no hay problema. Y creo que sí es posible con esta arquitectura. Pero de todas formas, lo primero que vamos a implementar va a ser Svelte.

---

## 46. Assistant (turn 46)

Sí. Entonces la arquitectura correcta sería:

```
Core engine:  framework-agnosticAdapters:  Svelte first  React later  Vue later
```

Separación:

```
@virtual-planet/graph  IR, nodes, types, validation@virtual-planet/compiler  dependency slicing, WGSL codegen, linker@virtual-planet/runtime-webgpu  buffers, pipelines, bind groups@virtual-planet/svelte  Svelte components, stores/runes, editor integrationfuture:@virtual-planet/react@virtual-planet/vue
```

La regla clave:

```
Framework components are only authoring/runtime adapters.They do not own the graph model.
```

Para Svelte primero:

```
<PlanetGraph bind:graph>  <FBM id="mountains" input="positionMeters" scale={0.002} />  <Output name="terrainHeight" from="mountains" />  <Consumer type="tessellator" outputs={["terrainHeight"]} /></PlanetGraph>
```

Pero internamente eso solo crea/actualiza:

```
GraphIR
```

Así el editor visual, Svelte markup, JSON, React o Vue pueden todos producir el mismo grafo.

---

## 47. User (turn 47)

También podríamos copiar las primitivas de useGPU.

---

## 48. Assistant (turn 48)

Voy a tratarlo como inspiración arquitectónica, no como dependencia directa: conviene copiar las ideas/primitivas útiles, pero adaptarlas al modelo de campos procedurales del planeta.

---

## 49. User (turn 49)

Sí, como primitivas me refiero únicamente a los generadores de ruido, a los umbrales, etcétera.

---

## 50. Assistant (turn 50)

Sí. Entonces serían **primitivas de grafo/campo**, no primitivas GPU.

Ejemplo base:

```
Noise:  Perlin2D  Perlin3D  Simplex3D  ValueNoise  Worley  FBM  RidgedFBM  DomainWarpShaping:  Remap  Clamp  Smoothstep  Threshold  Bandpass  Curve  Pow  Bias/GainComposition:  Add  Multiply  Mix  Min/Max  Mask  Invert  NormalizeTerrain:  Altitude  Slope  Curvature  ErosionApprox  BeachMask  RidgeMaskVegetation:  DensityField  PeakDetect  Prominence  CoverageMask  SuppressionMask
```

La idea sería que cada primitiva tenga:

```
type NodePrimitive = {  id: string;  inputs: Port[];  outputs: Port[];  params: ParamSchema[];  emitWGSL(ctx): WGSLExpr;  evalCPU?(ctx): Value;};
```

Y que el grafo sea combinación de esas primitivas.

Use.GPU serviría como inspiración de “biblioteca de funciones composables”, pero el vocabulario propio sería procedural:

```
field primitives → procedural graph → WGSL functions → consumers
```

Sí: eso hay que agregarlo como **Procedural Field Primitive Library**.

---

## 51. User (turn 51)

Y obviamente el linker y el compilador de uCPU también puede servir. En ese caso, quizás valga como dependencia, pero quizás no. ¿Qué opinas?

---

## 52. Assistant (turn 52)

Opino que sí puede valer como dependencia, pero **solo para el linker WGSL**, no para el core del grafo.

Use.GPU expone `@use-gpu/shader`, con `linkBundle`, loaders WGSL/GLSL, imports y linking de módulos shader. Eso encaja con la necesidad de armar shaders especializados desde funciones reutilizables. [[![image](https://www.google.com/s2/favicons?domain=https://usegpu.live&sz=128)UseGPU](https://usegpu.live/docs/reference-library-%40use-gpu-shader?utm_source=chatgpt.com)]

Mi recomendación:

```
Core propio:  Graph IR  primitive nodes  type system  dependency slicing  editor modelDependencia posible:  WGSL linker / module bundler
```

Motivo: el grafo procedural de Virtual Planet es muy específico —terreno, teselador, vegetación, picos, coberturas— y no conviene atarlo a Use.GPU. Pero el problema de linking WGSL ya está bien pensado ahí; incluso se describe como una librería standalone, pequeña y separada del runtime. [[![image](https://www.google.com/s2/favicons?domain=https://news.ycombinator.com&sz=128)Hacker News](https://news.ycombinator.com/item?id=32777909&utm_source=chatgpt.com)]

Plan práctico:

```
1. Crear adapter interno: ShaderLinker2. Implementar backend inicial con @use-gpu/shader3. Mantener una interfaz propia4. Poder reemplazarlo luego por linker propio, WESL, wgsl-fns, etc.
```

Así no quedás encerrado.

```
interface ShaderLinker {  link(entry: WGSLFunction, deps: WGSLModule[]): string;}
```

Conclusión: **sí como dependencia opcional/encapsulada; no como fundamento del modelo procedural**.

---

## 53. User (turn 53)

Ahora la pregunta es, ¿sirve esto para hacer tree shaking y para múltiples salidas?

---

## 54. Assistant (turn 54)

Sí, sirve **para tree shaking de WGSL**, pero no reemplaza tu **dependency slicing del grafo**.

Arquitectura correcta:

```
Graph IR  ↓select requested outputs  ↓graph dependency slice  ↓emit only needed WGSL functions  ↓Use.GPU-style linker  ↓shader-stage tree shaking
```

Para múltiples salidas:

```
terrainHeight      → tessellator shaderterrainAlbedo      → fragment shadertreePeakField      → vegetation compute shadergrassCoverage      → fragment shader + grass pass
```

Cada consumer pide outputs distintos. El compilador hace un slice distinto por consumer. Luego el linker elimina funciones WGSL no usadas dentro de ese shader final.

Entonces:

```
Graph compiler:  decides which procedural fields are neededWGSL linker:  decides which generated shader functions/imports are needed
```

Conclusión: **sí, es útil**, especialmente si cada nodo emite funciones reutilizables. Pero el soporte de múltiples salidas tiene que vivir en tu IR/compiler, no depender solamente del linker.

---

## 55. User (turn 55)

OK, actualiza el documento entonces.

---

## 56. Assistant (turn 56)

# Design Update: Graph Compiler, Multi-Output Code Generation and Shader Linking
## Architectural Revision
The procedural graph is elevated from being a shader generator to becoming the canonical procedural description of an entire planet.
Rendering pipelines, mesh generation, simulation, vegetation, collision, debugging, and future gameplay systems are all consumers of the same graph.
---
# Architecture
```
Authoring Layer
──────────────────────────────────────
Visual Graph Editor
Svelte Components
Future React Adapter
Future Vue Adapter

                │
                ▼

Canonical Graph IR

                │
                ▼

Semantic Analysis
Type Checking
Validation

                │
                ▼

Dependency Slicing

                │
                ▼

WGSL Code Generation

                │
                ▼

WGSL Linker

                │
                ▼

Pipeline Assembly

                │
                ├──────────────┬──────────────┬──────────────┬──────────────┐
                ▼              ▼              ▼              ▼
        Mesh Generation   Compute      Vertex       Fragment
        Pipelines         Pipelines    Pipelines    Pipelines
```
The Graph IR is the only authoritative representation.
All authoring methods produce the same IR.
---
# Multiple Authoring Methods
The graph can be authored using:
- Visual node editor
- Declarative Svelte components
- Future React components
- Future Vue components
- JSON import/export
- Programmatic API
These are merely different frontends over the same graph.
---
# Procedural Primitive Library
The graph is built from reusable procedural primitives.
Examples include:
## Noise
- Perlin2D
- Perlin3D
- Simplex
- Value Noise
- Worley
- FBM
- Ridged FBM
- Domain Warp
## Mathematical Operations
- Add
- Multiply
- Clamp
- Normalize
- Remap
- Smoothstep
- Threshold
- Bandpass
- Curve
- Bias/Gain
## Terrain Analysis
- Altitude
- Slope
- Curvature
- Beach Mask
- Ridge Mask
- Erosion Approximation
## Vegetation
- Density Field
- Peak Detection
- Peak Prominence
- Coverage Mask
- Suppression Mask
Each primitive provides:
- graph metadata
- CPU evaluator (optional)
- WGSL code generator
- type information
---
# Multi-Output Graph
A single graph may expose many independent outputs.
Example:
```
terrainHeight
terrainNormal
terrainAlbedo
terrainMaterial
beachMask
snowMask
erosionMask

treeDensity
treePeakField
grassCoverage
rockDistribution

windField
temperature
moisture
```
Outputs are named procedural fields.
---
# Procedural Consumers
Consumers request one or more graph outputs.
Typical consumers include:
```
Terrain Mesh Generator

Terrain Material Generator

Vegetation Generator

Water Generator

Collision Generator

Navigation Generator

Physics Generator

Atmosphere Generator

LOD Generator

Debug Views
```
Consumers are independent from rendering stages.
---
# WebGPU Pipelines
Consumers may execute through different WebGPU pipelines.
Examples:
Mesh Generation
- Compute pipeline generating vertex/index buffers
Terrain Rendering
- Vertex shader
- Fragment shader
Vegetation
- Compute shader
- Instance rendering
Debug
- Compute
- Fragment
- Storage visualization
The graph itself is unaware of pipeline stages.
---
# Dependency Slicing
Every consumer specifies only the outputs it requires.
Example:
Terrain Mesh
Requires
```
terrainHeight
terrainNormal
lodDensity
```
Vegetation
Requires
```
treeDensity
treePeakField
slope
altitude
```
Terrain Material
Requires
```
terrainAlbedo
rockMask
snowMask
grassCoverage
```
The compiler traverses the graph backwards from requested outputs and extracts the minimal dependency graph.
No unrelated nodes are compiled.
---
# WGSL Function Generation
The graph compiler emits reusable WGSL functions.
Example:
```
fn terrain_height(...)
fn terrain_normal(...)
fn tree_density(...)
fn tree_peak(...)
fn grass_coverage(...)
fn beach_mask(...)
```
These are not complete shaders.
They are reusable procedural modules.
---
# Shader Linking
Pipeline-specific shaders are assembled from generated WGSL functions.
The project should define its own ShaderLinker abstraction.
Example:
```
Graph Slice

↓

WGSL Function Library

↓

Shader Linker

↓

Pipeline Shader
```
The initial implementation may leverage the modular WGSL linker architecture developed for Use.GPU.
The linker remains an implementation detail behind the project's own interface and can later be replaced without affecting the graph compiler.
---
# Tree Shaking
Tree shaking occurs at two distinct levels.
## Graph-Level Tree Shaking
Performed by the Graph Compiler.
Unused procedural fields and graph branches are eliminated before any WGSL is generated.
This is semantic tree shaking.
---
## WGSL-Level Tree Shaking
Performed by the Shader Linker.
Unused WGSL helper functions, imports and generated modules are removed from the final pipeline shader.
This is implementation-level tree shaking.
---
# Separation of Responsibilities
Graph Compiler
Responsible for:
- graph validation
- type checking
- dependency slicing
- procedural optimization
- WGSL function generation
Shader Linker
Responsible for:
- WGSL module composition
- function linking
- import resolution
- stage assembly
- WGSL-level dead code elimination
Keeping these concerns separate makes the architecture modular and future-proof.
---
# Framework Independence
The procedural engine itself has no dependency on any UI framework.
Recommended package layout:
```
@virtual-planet/graph

@virtual-planet/compiler

@virtual-planet/runtime-webgpu

@virtual-planet/svelte

Future:

@virtual-planet/react

@virtual-planet/vue
```
Only the authoring layer is framework-specific.
The Graph IR, compiler, runtime, and shader linker remain completely framework-agnostic.
---
# Guiding Principle
The procedural graph describes the planet—not the rendering.
Rendering pipelines, mesh generation, simulation systems, collision, vegetation, atmospheric effects, and future gameplay systems are simply independent consumers of the same typed procedural field graph.
This architecture enables deterministic procedural generation, efficient dependency slicing, dual-level tree shaking, reusable WGSL code generation, framework-independent authoring, and scalable multi-pipeline execution across WebGPU.

---

## 57. User (turn 57)

Cuán complicado, cuán complejo es el linter de useGPU? Porque si no es muy complicado, y solamente por eso lo hacemos dependencia, quizá valga la pena hacer el nuestro propio.

---

## 58. Assistant (turn 58)

Voy a verificar la estructura actual del paquete de shader/linker de Use.GPU antes de opinar, porque la complejidad real depende de cuánto parser/AST tenga y cuánto sea simple concatenación con dependencias.

---

## 59. User (turn 59)

Si te fijas en el repositorio de Virtual Planet, que ahí tienes el link en algún lado, vas a ver que ya tenemos nosotros una arquitectura para describir esquemas de objetos que pueden servir para asegurarnos de que sea, ya con eso podemos hacer un grafo tipeado. Fíjate lo que tenemos ahí y cómo se puede aplicar.

---

## 60. Assistant (turn 60)

Voy a revisar el repo actual para no proponer algo abstracto: buscaré el esquema de objetos existente y cómo convertirlo en base del Graph IR tipeado.

---

## 61. User (turn 61)

Bien, actualiza el documento de especificaciones con todos estos datos nuevos.

---

## 62. Assistant (turn 62)

# Virtual Planet
# Procedural Graph Architecture
## Design Specification (Revision 2)
## Vision
The procedural graph is the canonical description of a planet.
It is **not** a shader graph, a material graph, or a terrain graph.
Instead, it defines a typed network of procedural fields from which every planetary system is derived.
Everything—including terrain, vegetation, tessellation, rendering, simulation, collision, atmosphere and future gameplay systems—is generated from the same graph.
---
# Architectural Layers
```
Authoring Layer
──────────────────────────────────

Visual Graph Editor

Declarative Svelte Components

Future React Adapter

Future Vue Adapter

JSON Import / Export

Programmatic API

            │
            ▼

Typed Graph IR

            │
            ▼

Graph Validation

Type Checking

Dependency Analysis

Optimization

            │
            ▼

WGSL Function Generation

            │
            ▼

Shader Linker

            │
            ▼

WebGPU Pipeline Assembly

            │
            ├──────────────┬──────────────┬──────────────┬──────────────┐
            ▼              ▼              ▼              ▼

Compute

Mesh Generation

Vertex

Fragment
```
---
# Existing Schema System
The project already contains a schema framework capable of describing strongly typed objects.
This system should become the foundation of the procedural graph.
Graph nodes should therefore be schema objects rather than handwritten classes.
Each node schema provides:
- runtime validation
- TypeScript inference
- serialization
- editor metadata
- default values
- units
- constraints
- UI widgets
No second type system should be introduced.
Instead, the existing schema framework should be extended to describe graph nodes.
---
# Graph Extensions
Additional metadata required by the graph includes:
```
input ports

output ports

field type

WGSL type

units

default values

consumer hints

editor metadata

documentation

dependencies
```
Every node therefore becomes self-describing.
---
# Typed Ports
Ports are fully typed.
Examples:
```
float

vec2

vec3

vec4

bool

surfacePosition

normal

material

mask

densityField
```
Invalid graph connections become impossible.
The compiler validates all connections before code generation.
---
# Procedural Primitive Library
The graph is composed from reusable procedural primitives.
## Noise
- Perlin2D
- Perlin3D
- Simplex
- FBM
- Ridged FBM
- Worley
- Domain Warp
## Math
- Add
- Multiply
- Divide
- Clamp
- Normalize
- Remap
- Smoothstep
- Threshold
- Bandpass
- Curve
- Bias
- Gain
## Terrain
- Altitude
- Slope
- Curvature
- Ridge
- Beach Mask
- Erosion Approximation
## Vegetation
- Density Field
- Peak Detection
- Peak Prominence
- Coverage Mask
- Suppression Mask
Every primitive implements:
- schema
- graph metadata
- optional CPU evaluator
- WGSL emitter
---
# Dual-Frequency Vegetation
Vegetation generation uses two procedural fields.
## Ecological Field
Low frequency.
Represents habitat suitability.
Outputs:
- forest density
- shrub density
- grass suitability
---
## Placement Field
High frequency.
Represents candidate positions.
Instances are generated only from local maxima.
Thresholds are applied to peak values—not every sampled point.
This avoids producing one instance per sample.
Peak prominence may be used to suppress insignificant maxima.
---
# Coverage vs Instances
The graph distinguishes between continuous coverage and discrete procedural instances.
Continuous:
- grass
- moss
- snow
- sand
Discrete:
- trees
- shrubs
- rocks
- boulders
- fallen logs
Coverage fields remain continuous.
Instance fields are converted into objects using peak detection.
---
# Shared Procedural Fields
One procedural field may drive multiple systems simultaneously.
Example:
```
Mountain Noise

├── Terrain Height

├── Rock Distribution

├── Snow

├── Vegetation Suppression

└── Navigation Cost
```
No duplicated procedural logic should exist.
---
# Multi-Output Graph
The graph exposes many outputs simultaneously.
Examples:
```
terrainHeight

terrainNormal

terrainAlbedo

terrainMaterial

beachMask

snowMask

treeDensity

treePeakField

grassCoverage

windField

moisture

temperature

lodDensity
```
---
# Procedural Consumers
Consumers subscribe to outputs.
Examples:
```
Terrain Mesh Generator

Terrain Material Generator

Vegetation Generator

Atmosphere Generator

Collision Generator

Physics Generator

Navigation Generator

LOD Generator

Debug Visualizer
```
Consumers are independent of rendering stages.
---
# WebGPU Pipelines
Consumers execute through one or more WebGPU pipelines.
Examples:
Terrain Mesh Generation
Compute shader producing vertex/index buffers.
Terrain Rendering
Vertex + Fragment.
Vegetation
Compute pipeline producing procedural instances.
Tree Rendering
Vertex + Fragment.
Debug Views
Storage visualization.
The graph itself has no knowledge of rendering stages.
---
# Tessellation
Terrain tessellation is another procedural consumer.
It consumes fields such as:
- terrainHeight
- terrainNormal
- lodDensity
- displacement
- curvature
The implementation may use compute shaders to generate procedural mesh buffers.
The graph remains independent of this implementation detail.
---
# Dependency Slicing
Each consumer requests only the outputs it requires.
The compiler computes the minimal dependency graph.
Example:
Terrain Mesh
Requires:
```
terrainHeight

terrainNormal

lodDensity
```
Vegetation
Requires:
```
treeDensity

treePeakField

slope

altitude
```
Terrain Material
Requires:
```
terrainAlbedo

grassCoverage

snowMask

rockMask
```
Unused graph branches are eliminated before WGSL generation.
---
# WGSL Generation
Nodes emit reusable WGSL functions.
Example:
```
fn terrain_height()

fn terrain_normal()

fn tree_density()

fn tree_peak()

fn grass_coverage()

fn beach_mask()
```
The graph never generates complete shaders.
---
# Shader Linking
A dedicated ShaderLinker assembles stage-specific shaders.
The linker operates only on generated WGSL functions.
Responsibilities:
- dependency ordering
- duplicate elimination
- module composition
- stage assembly
- WGSL dead-code elimination
The first implementation should remain intentionally minimal.
Since dependency analysis already occurs at the graph level, the linker only needs to resolve WGSL module dependencies.
A lightweight implementation is preferred.
The modular linker architecture used by Use.GPU provides an excellent reference and may initially be reused behind an internal abstraction if doing so accelerates development.
However, the graph compiler must never depend on a specific linker implementation.
---
# Two Levels of Tree Shaking
## Graph Level
Performed by the Graph Compiler.
Removes unused procedural fields.
Produces the minimal procedural graph.
---
## WGSL Level
Performed by the Shader Linker.
Removes unused WGSL helper functions.
Produces the minimal shader for each pipeline.
---
# Framework Independence
The procedural engine remains framework-independent.
Recommended package layout:
```
@virtual-planet/schema

@virtual-planet/graph

@virtual-planet/compiler

@virtual-planet/runtime-webgpu

@virtual-planet/svelte

Future

@virtual-planet/react

@virtual-planet/vue
```
Only the authoring layer depends on UI frameworks.
---
# Authoring
Multiple authoring methods are supported.
- Visual Graph Editor
- Declarative Svelte
- Future React
- Future Vue
- JSON
- Programmatic API
All produce the same Typed Graph IR.
The visual editor edits the graph directly.
Declarative markup is simply another representation of that graph.
---
# Guiding Principle
**The procedural graph is the canonical procedural language of Virtual Planet.**
It is not tied to Svelte, WebGPU, WGSL, or any rendering pipeline.
It defines typed procedural fields that describe the planet.
Compilers, shader linkers, rendering pipelines, mesh generators, simulation systems, and future gameplay systems are merely consumers of that shared procedural description.
This architecture enables deterministic generation, strong typing, reusable procedural primitives, multiple authoring methods, dual-level tree shaking, multi-output compilation, and efficient execution across all current and future WebGPU pipelines.

---

## 63. User (turn 63)

Otra cosa para contemplar es en el paquete que tenemos o que vamos a crear para editar los grafos, que va a ser un paquete aparte, digamos que tenga toda esta cosa de tipificación, que ahí estén los componentes de Svelte y un app independiente para probar el editor, pero que también sean esos componentes integrables a la aplicación principal del generador de planetas.

---

## 64. Assistant (turn 64)

Sí. Lo agregaría como paquete separado:

```
@virtual-planet/graph-editor
```

Con dos modos de uso:

```
Standalone editor appReusable Svelte components
```

Estructura sugerida:

```
packages/  schema/  graph/  compiler/  runtime-webgpu/  graph-editor/    src/      components/        GraphEditor.svelte        NodePalette.svelte        InspectorPanel.svelte        PortView.svelte        EdgeLayer.svelte        OutputPanel.svelte      stores/        graphEditorState.ts      typing/        portCompatibility.ts      layout/        autoLayout.ts      index.tsapps/  graph-editor/    standalone test app  planet/    main Virtual Planet app
```

La regla:

```
graph-editor no debe poseer el modelo procedural;solo edita GraphIR producido por @virtual-planet/graph.
```

Entonces en la app principal:

```
<script>  import { GraphEditor } from '@virtual-planet/graph-editor';</script><GraphEditor bind:graph /><PlanetViewport {graph} />
```

Y en la app independiente:

```
<GraphEditor bind:graph /><PreviewPanel {graph} /><WGSLDebugOutput {graph} />
```

El paquete debería incluir:

```
- visual editor- typed port rendering- node inspector from schema metadata- validation feedback- graph serialization- Svelte components- editor stores/runes
```

Pero no debería incluir:

```
- planet renderer core- WebGPU runtime ownership- hardcoded terrain logic
```

Eso queda en:

```
@virtual-planet/runtime-webgpu@virtual-planet/compiler
```

Así el editor es integrable, testeable y reusable.

---

## 65. User (turn 65)

Perfecto, modifica el documento con la especificación.

---

## 66. Assistant (turn 66)

# Design Addendum
## Graph Editor Package Specification
### Overview
The procedural graph editor is a first-class component of the Virtual Planet architecture.
It is **not** part of the renderer and **does not own** the procedural graph model.
Instead, it is a reusable editor for the Typed Graph IR defined by the core graph package.
The editor must function both as:
- a standalone application for graph development and debugging
- an embeddable component library integrated into the main Virtual Planet application
This separation allows the editor to evolve independently from the renderer while remaining reusable by future projects.
---
# Package Layout
The project should be organized approximately as follows:
```
packages/

    schema/
        Existing schema system

    graph/
        Typed Graph IR
        Graph definitions
        Primitive registration
        Validation

    compiler/
        Dependency analysis
        WGSL generation
        Optimization

    runtime-webgpu/
        GPU execution
        Pipeline management
        Buffer management

    graph-editor/
        Reusable editor components
        Graph editing logic
        Inspector
        Layout
        Validation UI
        Serialization helpers

apps/

    planet/
        Main Virtual Planet application

    graph-editor/
        Standalone editor application
```
---
# Responsibilities
## graph-editor
Responsible for:
- graph visualization
- node editing
- edge editing
- typed connection validation
- property inspector
- graph serialization
- graph import/export
- automatic layout
- selection
- undo/redo
- clipboard
- keyboard shortcuts
It must never contain rendering logic specific to Virtual Planet.
---
## graph
Responsible for:
- Graph IR
- node definitions
- graph schemas
- primitive registration
- type system
- dependency graph
- serialization format
The editor edits this model directly.
---
# Standalone Application
A standalone application should exist for editor development.
Its purposes include:
- developing editor features
- testing new primitives
- debugging graph compilation
- WGSL inspection
- graph validation
- performance profiling
It should not require the planet renderer.
---
# Embedded Mode
The exact same editor components should be embeddable inside the main application.
Example:
```
<GraphEditor bind:graph />

<PlanetViewport {graph}/>
```
The renderer reacts to graph changes.
No duplicate editor implementation exists.
---
# Shared Graph Model
Both applications edit the same Graph IR instance.
```
Graph Editor

        │

        ▼

Typed Graph IR

        ▲

Planet Renderer
```
Neither application owns the graph.
The graph is the shared model.
---
# Svelte Components
The package exports reusable Svelte components.
Examples:
```
GraphEditor

GraphCanvas

NodePalette

InspectorPanel

PortView

ConnectionLayer

OutputPanel

MiniMap

Toolbar

ValidationPanel
```
These components are generic.
They contain no Virtual Planet-specific behavior.
---
# Schema Integration
The existing schema package drives the editor automatically.
Node schemas provide:
- property definitions
- editor widgets
- units
- limits
- documentation
- default values
The editor should not require handwritten inspectors.
Adding a new primitive should automatically expose editable properties.
---
# Type Safety
Port compatibility is entirely schema-driven.
Invalid graph connections are rejected immediately.
Validation occurs while editing rather than during compilation.
---
# Compiler Integration
The editor never generates WGSL directly.
Instead:
```
Graph Editor

↓

Typed Graph IR

↓

Compiler

↓

WGSL
```
This guarantees that every authoring method produces identical generated code.
---
# Runtime Preview
The standalone application should optionally include:
- WGSL preview
- dependency graph visualization
- graph statistics
- compilation diagnostics
- generated consumer list
- graph optimization statistics
These are development tools and not required by the renderer.
---
# Future Framework Support
Although Svelte is the initial implementation target, the editor architecture must remain framework-independent.
The Svelte package is simply the first UI adapter.
Future packages may include:
```
@virtual-planet/react-editor

@virtual-planet/vue-editor
```
without changing the Graph IR, compiler, runtime, or serialization format.
---
# Design Principle
The editor is **not** a planet editor.
It is a generic, typed procedural graph editor capable of editing any procedural field graph described by the Virtual Planet Graph IR.
The Virtual Planet application is simply the first consumer of that editor.

---

## 67. User (turn 67)

Sí, con el esquema ya generado de las funciones para armar los grafos, se puede armar, se utiliza también para hacer, así como se pueden hacer formularios, se puede hacer los nodos del grafo para cada función, ya con parámetros, etcétera, sacados del esquema.

---

## 68. Assistant (turn 68)

Exactamente. Creo que esa es una de las ideas más potentes de toda la arquitectura, porque elimina muchísimo código repetido.

En realidad, el esquema pasa a ser la **única fuente de verdad** (Single Source of Truth).

```
Schema    │    ├──► TypeScript types    ├──► Runtime validation    ├──► Serialization    ├──► Property inspector    ├──► Node appearance    ├──► Port definitions    ├──► Documentation    ├──► Svelte declarative components    ├──► Graph editor nodes    └──► WGSL code generation metadata
```

Por ejemplo, definís una sola vez:

```
const Perlin3DSchema = definePrimitive({    name: 'Perlin3D',    inputs: {        position: Field.vec3(),        scale: Field.float({ default: 0.002 })    },    outputs: {        value: Field.float()    },    parameters: {        octaves: Integer(5),        persistence: Float(0.5),        lacunarity: Float(2.0)    }});
```

Y automáticamente obtenés:

- un nodo en la paleta del editor;
- los puertos de entrada y salida;
- el inspector de propiedades;
- la validación;
- la serialización;
- la documentación;
- el componente declarativo de Svelte:

```
<Perlin3D    position={...}    scale={...}    octaves={6}/>
```

Todo generado.

Yo incluso agregaría un paso más: **la definición visual del nodo también debería salir del esquema**.

```
metadata: {    category: "Noise",    color: "#5d8cff",    icon: "perlin",    keywords: ["noise", "fbm"],    width: 220}
```

Entonces el editor puede construir automáticamente:

- la paleta de nodos;
- el color;
- el icono;
- el agrupamiento por categorías;
- la ayuda contextual;
- el buscador.

En otras palabras, el paquete `schema` deja de ser solamente un sistema de validación y se convierte en un **meta-modelo** de Virtual Planet.

De hecho, creo que habría que cambiar ligeramente el documento para dejar explícito este principio:

> **Every procedural primitive is defined exactly once through its schema. All user interfaces, graph nodes, declarative components, validation logic, serialization, documentation, and code generation metadata are derived automatically from that schema.**

Ese principio hace que agregar una nueva primitiva (por ejemplo, un nuevo tipo de ruido o un operador de erosión) sea casi completamente declarativo: definís el esquema y el resto del ecosistema aparece automáticamente. Es una arquitectura extremadamente mantenible y consistente.

---

## 69. User (turn 69)

Bien, agrega eso al documento de diseño.

---

## 70. Assistant (turn 70)

# Design Addendum
## Schema-Driven Procedural Primitives
### Single Source of Truth
The existing `@virtual-planet/schema` package becomes the canonical metadata system for the entire procedural graph architecture.
A procedural primitive is defined exactly once through its schema.
Every other representation is automatically derived from that definition.
No duplicate metadata should exist anywhere else in the system.
---
# Derived Artifacts
A primitive schema automatically generates or drives:
```
TypeScript types

Runtime validation

Serialization

Default values

Documentation

Editor widgets

Property inspector

Graph node definition

Input ports

Output ports

Port compatibility

Node appearance

Node category

Node icon

Search metadata

Declarative Svelte component

Compiler metadata

WGSL generation metadata
```
Adding a new primitive should require only a schema definition and a WGSL emitter.
Everything else should appear automatically.
---
# Primitive Definition
Conceptually, every primitive is described by:
```
Identity

Category

Inputs

Outputs

Parameters

Documentation

Editor Metadata

WGSL Generator

Optional CPU Evaluator
```
No handwritten editor code should be required.
---
# Automatic Graph Nodes
The graph editor does not contain hardcoded node definitions.
Instead, it queries the registered primitive schemas.
Each primitive automatically produces:
```
Palette entry

Graph node

Ports

Inspector

Context menu

Validation

Tooltips
```
The editor therefore becomes data-driven.
---
# Automatic Inspector
The property inspector is generated from schema metadata.
Examples include:
- sliders
- numeric inputs
- dropdowns
- colors
- vectors
- units
- ranges
Widget selection comes directly from the schema.
---
# Automatic Port Generation
Ports are inferred automatically.
Example:
```
Input

position : vec3

scale : float

Output

value : float
```
Connection compatibility is computed entirely from port types.
---
# Automatic Documentation
Schemas provide documentation metadata.
This information populates:
- tooltips
- online help
- searchable documentation
- primitive browser
- generated API reference
No duplicate documentation should exist.
---
# Automatic Declarative Components
Every primitive automatically exposes a declarative component.
Example:
```
<Perlin3D
    position={position}
    scale={0.002}
    octaves={6}
/>
```
These components are generated from the same schema that defines the graph node.
Visual editing and declarative editing therefore remain perfectly synchronized.
---
# Automatic Visual Representation
Editor metadata should also be schema-driven.
Typical metadata includes:
```
category

color

icon

keywords

width

group

tags
```
This allows the node palette to organize itself automatically.
---
# Compiler Integration
Compiler metadata also originates from the schema.
Examples:
```
WGSL type

CPU evaluator

deterministic

pure function

cacheable

requires derivatives

supports compute

supports fragment

supports vertex
```
This enables future compiler optimizations without modifying the editor.
---
# Registration System
Primitive registration becomes declarative.
Conceptually:
```
registerPrimitive(

    schema,

    wgslEmitter,

    optionalCpuEvaluator

)
```
Once registered, the primitive immediately becomes available to:
- the graph editor
- the compiler
- serialization
- documentation
- declarative authoring
- runtime validation
without additional implementation.
---
# Extensibility
Third-party packages may contribute primitives.
Example:
```
@virtual-planet/noise

@virtual-planet/erosion

@virtual-planet/vegetation

@virtual-planet/atmosphere
```
Each package simply registers additional schema-driven primitives.
The editor automatically discovers them.
---
# Guiding Principle
**Procedural primitives are defined exactly once.**
The schema is the single source of truth from which every user interface, graph node, declarative component, validation rule, serialization format, documentation page, compiler description, and WGSL generation pipeline is derived automatically.
This eliminates duplicated metadata, keeps every representation synchronized, and makes extending the procedural language largely declarative rather than imperative.

---

## 71. User (turn 71)

En el esquema se puede agregar de alguna forma la ruta al archivo WGSL con la función escrita o una manera de armar la ruta, un parámetro más abstraído, pero que con eso se pueda armar la ruta para cargar el archivo WGSL.

---

## 72. Assistant (turn 72)

Sí. Conviene que el esquema no tenga “código WGSL inline” como caso principal, sino una referencia declarativa al módulo WGSL.

Ejemplo:

```
const Perlin3DPrimitive = definePrimitive({  id: 'noise.perlin3d',  schema: Perlin3DSchema,  wgsl: {    module: 'noise/perlin3d',    function: 'perlin3d',    exports: ['perlin3d'],  },});
```

Eso se resolvería a algo como:

```
packages/procedural-wgsl/src/noise/perlin3d.wgsl
```

O más abstracto:

```
wgsl: {  package: '@virtual-planet/procedural-wgsl',  path: 'noise/perlin3d',  entry: 'perlin3d',}
```

La ventaja de usar un identificador abstracto es que después podés cambiar la estructura de archivos sin romper los grafos guardados.

Yo lo definiría así:

```
type WgslSourceRef = {  moduleId: string;      // stable ID: "noise.perlin3d"  entry: string;         // function name: "perlin3d"  exports?: string[];  dependencies?: string[];};
```

Y un resolver aparte:

```
type WgslModuleResolver = {  resolve(moduleId: string): Promise<string>;};
```

Ejemplo:

```
resolver.resolve('noise.perlin3d');// loads: /wgsl/noise/perlin3d.wgsl
```

Entonces:

```
Schema/Primitive:  declares which WGSL module/function it needsResolver:  decides where that WGSL livesLinker:  assembles only used modules/functions
```

Eso mantiene el esquema portable y evita meter rutas absolutas frágiles.

Regla recomendada:

```
Primitive schemas should reference WGSL modules by stable module IDs, not raw file paths.File paths are resolved by a WGSL module resolver owned by the compiler/runtime package.
```

---

## 73. User (turn 73)

Bien, integra eso al documento.

---

## 74. Assistant (turn 74)

# Design Addendum
## WGSL Module Resolution and Primitive Registration
### Overview
Procedural primitives should not embed WGSL source code directly inside their schema definitions.
Instead, schemas reference reusable WGSL modules through stable module identifiers.
This cleanly separates:
- procedural metadata
- editor metadata
- type information
- shader implementation
- module organization
The schema remains declarative while the compiler resolves implementation details.
---
# Stable Module Identifiers
Every primitive references one or more WGSL modules through a stable identifier rather than a filesystem path.
Example:
```
noise.perlin3d

noise.fbm

terrain.erosion

vegetation.treePeak

terrain.beachMask
```
These identifiers become part of the procedural language.
They should remain stable even if the internal project structure changes.
---
# WGSL Module Metadata
A primitive schema references its implementation conceptually as:
```
WGSL Module

Entry Function

Optional Exports

Optional Dependencies
```
The schema does not know where the module is stored.
It only knows which procedural module it requires.
---
# WGSL Module Resolver
A dedicated resolver maps module identifiers to actual WGSL sources.
Conceptually:
```
Primitive Schema

↓

Module Identifier

↓

WGSL Module Resolver

↓

WGSL Source

↓

Shader Linker
```
This makes primitive schemas independent of project layout.
---
# Compiler Responsibilities
The compiler performs:
1. dependency slicing
2. primitive discovery
3. module collection
4. module resolution
5. WGSL function generation
6. shader linking
The module resolver is simply another compilation stage.
---
# Package Organization
A dedicated package should contain reusable WGSL modules.
Suggested layout:
```
packages/

    procedural-wgsl/

        noise/

        terrain/

        vegetation/

        atmosphere/

        math/

        utilities/
```
Every WGSL module should export reusable procedural functions rather than complete shaders.
---
# Reusable Modules
Examples include:
```
noise.perlin3d

noise.simplex3d

noise.fbm

noise.domainWarp

terrain.erosion

terrain.slope

terrain.curvature

vegetation.treePeak

vegetation.coverage

math.remap

math.bias

math.gain
```
These become the standard library of the procedural language.
---
# Primitive Registration
Primitive registration remains declarative.
Conceptually:
```
registerPrimitive(

    schema,

    wgslModule,

    optionalCpuEvaluator

)
```
Where:
- schema defines behavior
- WGSL module implements GPU evaluation
- CPU evaluator enables previews and debugging
---
# Automatic Module Discovery
Because primitives declare their required WGSL modules, the compiler automatically discovers which modules are needed.
No manual shader dependency lists are maintained.
Dependency discovery is entirely graph-driven.
---
# Two-Level Dependency Resolution
The architecture now performs dependency analysis at two levels.
## Procedural Graph
Determines:
- which primitives are required
- which outputs are required
- which graph branches are required
This is semantic dependency analysis.
---
## WGSL Modules
Determines:
- which WGSL functions are required
- which helper modules are required
- module ordering
- duplicate elimination
This is implementation dependency analysis.
---
# Benefits
Using stable WGSL module identifiers instead of filesystem paths provides several advantages:
- project layout may evolve without breaking graphs
- modules can be relocated or packaged independently
- future package-based module distribution becomes trivial
- third-party procedural libraries can register their own modules
- graph documents remain portable and version-stable
---
# Third-Party Extensions
External packages may register additional procedural modules.
Example:
```
@virtual-planet/noise

@virtual-planet/erosion

@virtual-planet/weather

@virtual-planet/ocean
```
Each package contributes:
- primitive schemas
- WGSL modules
- optional CPU evaluators
The editor and compiler discover them automatically.
---
# Guiding Principle
Procedural primitives describe **what** they are.
WGSL modules describe **how** they execute on the GPU.
The connection between both is established through stable module identifiers resolved by the compiler, ensuring that schemas remain declarative, portable, and independent of implementation details while enabling efficient module reuse, dependency analysis, and shader linking.

---

## 75. User (turn 75)

La teselación actual del planeta en Virtual Planet se especifica para hacer esferas basadas en cubos, pero, aunque sería una de las maneras de las funciones que ayudan, que apoyan al GPU en el editor, en la aplicación separada, no sería la única. Eso también tendría que ser modular y tendría que poder enchufarse o parches, planos o diferentes tipos de cosas, o quizás solamente planos, y el cubo sería una aplicación de seis planos.

---

## 76. Assistant (turn 76)

Sí. Conviene separar **tessellation primitive** de **planet topology**.

El teselador no debería saber “planeta” ni “cubo-esfera”. Debería generar superficies paramétricas enchufables:

```
Tessellation Surface  plane patch  cube face = plane patch  cube sphere = 6 projected plane patches  terrain tile  water plane  debug surface  future: cylinder, ring, asteroid patch
```

La abstracción sería:

```
type TessellationSurface = {  id: string;  domain: "plane" | "cubeFace" | "custom";  uvToPosition: WGSLModuleRef;  uvToNormal?: WGSLModuleRef;  bounds?: SurfaceBounds;};
```

Entonces:

```
PlanePatch  uv → positionCubeFacePatch  uv + faceId → cube position → sphere positionPlanet  six CubeFacePatch surfaces
```

El grafo procedural consume `positionMeters`, `normal`, `uv`, `faceId`, etc., pero no impone cómo se generó esa superficie.

Añadiría al documento:

```
Tessellation must be modular.The default planet topology uses six projected plane patches forming a cube-sphere, but the tessellation system must be expressed in terms of generic parametric surface patches. A cube-sphere is therefore a composition of six plane-like patches, not a special hardcoded tessellator.
```

Eso también sirve para el editor standalone: puede probar nodos sobre un plano simple sin cargar todo el planeta.

---

## 77. User (turn 77)

Bien, agregar eso al documento de diseño. También, esto serviría para hacer una cosa como ShaderToy, pero sería GPUToy o WebGPUToy, podríamos hacer un sitio.

---

## 78. Assistant (turn 78)

# Design Addendum
## Modular Tessellation and Procedural Playground
### Generic Tessellation Architecture
The procedural graph must remain completely independent of any specific geometric topology.
The current Virtual Planet implementation uses a cube-sphere composed of six projected cube faces.
However, this is merely one consumer of the procedural graph—not part of the graph language itself.
---
# Parametric Surface Abstraction
All procedural fields operate on generic parametric surfaces.
The tessellation system therefore exposes abstract surface patches rather than planet-specific geometry.
Examples include:
```
Plane Patch

Cube Face

Cube Sphere Face

Terrain Tile

Water Surface

Debug Plane

Procedural Patch

Future Custom Surface
```
Every surface exposes a mapping from its local parameter space into world-space coordinates.
---
# Surface Providers
A tessellation provider supplies:
```
UV coordinates

World Position

Surface Normal

Tangents

Bounds

Optional LOD information
```
The procedural graph consumes these fields without knowledge of their origin.
---
# Planet Composition
A planet becomes a composition of generic patches.
```
Planet

↓

Six Cube Faces

↓

Six Parametric Plane Patches

↓

Procedural Projection

↓

Planet Surface
```
The cube-sphere implementation therefore becomes one specialization of the generic tessellation system.
---
# Alternative Surfaces
The same graph should execute on:
- infinite planes
- finite terrain patches
- cube faces
- cube spheres
- water surfaces
- procedural terrain tiles
- debugging surfaces
- future arbitrary parametric surfaces
No graph changes are required.
---
# Development Benefits
Using a simple plane during development provides:
- easier debugging
- faster compilation
- easier visualization
- simpler coordinate reasoning
- isolated primitive testing
The graph editor therefore does not require a planet renderer.
---
# Modular Tessellation Providers
The tessellation pipeline should be extensible.
Examples:
```
Plane Provider

Cube Face Provider

Cube Sphere Provider

Terrain Tile Provider

Ocean Provider

Custom Surface Provider
```
Each provider generates geometry while the procedural graph remains unchanged.
---
# Procedural Playground
The modular architecture naturally enables a standalone procedural playground.
Conceptually similar to ShaderToy, but operating on complete procedural graphs rather than handwritten shaders.
Possible capabilities include:
- visual graph editing
- live WGSL generation
- real-time WebGPU execution
- procedural primitive library
- reusable graph snippets
- parameter animation
- dependency visualization
- graph profiling
- performance analysis
- shader inspection
Unlike ShaderToy, the playground operates at the procedural language level instead of directly editing fragment shaders.
---
# WebGPUToy Vision
The architecture is intentionally general enough to support a future public application.
Conceptually:
```
Graph Editor

↓

Typed Graph

↓

Compiler

↓

WGSL

↓

WebGPU Runtime

↓

Interactive Playground
```
Users could:
- create procedural graphs
- share graphs
- publish reusable primitives
- preview outputs
- inspect generated WGSL
- benchmark procedural algorithms
- experiment with rendering pipelines
The Virtual Planet editor would therefore become the first application built on top of a much more general procedural graph platform.
---
# Long-Term Architecture
The procedural graph language should not be considered a planet-specific technology.
Instead, it should evolve into a reusable procedural programming environment for WebGPU.
Virtual Planet becomes its flagship application, while the same graph engine can power procedural materials, terrain generators, scientific visualization, simulation, educational tools, and an eventual "WebGPUToy"-style platform for sharing and experimenting with procedural GPU algorithms.
---
# Guiding Principle
The procedural graph describes computations over typed procedural fields.
Geometry is provided by interchangeable tessellation providers.
Rendering is performed by interchangeable WebGPU pipelines.
The same graph should execute correctly on a plane, a terrain tile, a cube face, a cube sphere, or any future parametric surface without modification, making the architecture reusable well beyond the Virtual Planet project.

---

## 79. User (turn 79)

Y a la aplicación, supongo que se le podría hacer también un servidor de MSP, ¿qué no? Para que se le pueda enchufar un ChatGPT o un Claudio.

---

## 80. Assistant (turn 80)

Sí — seguramente querés decir **MCP server**.

Tiene mucho sentido:

```
Graph Editor / WebGPUToy        ↑        │ MCP        ↓ChatGPT / Claude / agents
```

Serviría para que un agente pueda:

```
- listar nodos disponibles- leer el grafo actual- agregar nodos- conectar puertos- modificar parámetros- pedir compilación- ver errores- inspeccionar WGSL generado- crear presets- optimizar un grafo- explicar qué hace un grafo
```

Herramientas MCP mínimas:

```
graph.list_primitivesgraph.getgraph.validategraph.add_nodegraph.update_nodegraph.connectgraph.disconnectgraph.compilegraph.get_diagnosticsgraph.get_generated_wgslgraph.apply_patch
```

Arquitectura:

```
@virtual-planet/mcp-server  usa @virtual-planet/graph  usa @virtual-planet/compiler  no depende de Svelte  no depende del renderer
```

Esto encaja perfecto con el esquema tipado: el agente puede consultar schemas y saber qué parámetros acepta cada nodo.

Sí, lo agregaría al documento como **MCP / Agent Integration**.

---

## 81. User (turn 81)

Bien, actualizar documento de diseño entonces.

---

## 82. Assistant (turn 82)

# Design Addendum
## MCP Integration and AI-Assisted Procedural Authoring
### Overview
The procedural graph architecture is designed to be fully accessible to AI assistants through the Model Context Protocol (MCP).
Rather than interacting with the renderer or editor directly, AI systems communicate with the Typed Graph IR through a dedicated MCP server.
This makes the procedural language scriptable, inspectable, and editable by external tools while keeping the rendering engine and UI independent.
---
# Architecture
```
AI Assistant

(ChatGPT, Claude, IDE Agents)

            │

            │ MCP

            ▼

MCP Server

            │

            ▼

Typed Graph IR

            │

            ├───────────────┐

            ▼               ▼

Compiler        Graph Editor

            │

            ▼

WebGPU Runtime
```
The MCP server becomes another frontend over the Graph IR, alongside the visual editor and declarative authoring.
---
# Package Layout
A dedicated package should provide AI integration.
```
packages/

    mcp-server/

        Graph tools

        Compiler tools

        Validation

        Diagnostics

        WGSL inspection
```
This package depends only on:
- graph
- schema
- compiler
It has no dependency on Svelte or the renderer.
---
# MCP Capabilities
The server should expose operations such as:
```
List primitives

Read graph

Create graph

Update graph

Delete nodes

Connect ports

Disconnect ports

Validate graph

Compile graph

Inspect generated WGSL

Inspect dependencies

Apply graph patches

List compiler diagnostics

List graph outputs

List procedural consumers
```
These operations are sufficient for both conversational assistants and autonomous coding agents.
---
# Schema-Aware Editing
Because every primitive is schema-driven, AI assistants automatically understand:
- available parameters
- parameter types
- valid ranges
- units
- default values
- documentation
- compatible ports
No custom prompting or handwritten tool descriptions are required for each primitive.
Schemas provide the semantic contract.
---
# Compiler Diagnostics
The MCP server should expose compiler diagnostics.
Examples include:
- invalid graph connections
- missing dependencies
- unused outputs
- cyclic graphs
- unresolved WGSL modules
- type mismatches
- optimization opportunities
This enables iterative AI-assisted graph construction.
---
# WGSL Inspection
AI tools should be able to inspect generated code.
Examples:
```
Generated WGSL

Linked shader modules

Dependency tree

Procedural outputs

Consumer-specific shaders
```
This allows assistants to reason about both the procedural graph and the resulting GPU implementation.
---
# Graph Patching
Rather than replacing entire graphs, AI assistants should operate through incremental graph patches.
Examples:
```
Add primitive

Remove primitive

Update parameter

Reconnect edge

Create output

Rename field

Insert subgraph
```
This enables collaborative editing between humans and AI.
---
# Multiple Authoring Interfaces
The architecture now supports four complementary authoring methods.
```
Visual Graph Editor

Declarative Components

Programmatic API

MCP Tools
```
All produce and manipulate the same Typed Graph IR.
---
# Procedural Playground Integration
The future standalone procedural playground (WebGPUToy) naturally exposes the same MCP interface.
This enables AI assistants to:
- generate new procedural graphs
- optimize existing graphs
- explain procedural algorithms
- create reusable primitives
- benchmark procedural techniques
- assist with debugging
without requiring any renderer-specific knowledge.
---
# Long-Term Vision
The procedural graph language becomes an AI-native procedural programming environment.
Humans may edit visually.
Developers may edit declaratively.
Applications may edit programmatically.
AI systems may edit conversationally through MCP.
All operate on exactly the same strongly typed graph representation.
---
# Guiding Principle
The Typed Graph IR is the universal representation of procedural computations.
Every interface—including visual editors, declarative components, standalone applications, procedural playgrounds, compilers, rendering pipelines, and AI assistants—interacts with the same graph through well-defined abstractions.
The MCP server extends this architecture into an AI-native development environment, allowing language models and autonomous agents to participate as first-class collaborators in the creation, inspection, optimization, and maintenance of procedural GPU programs.

---

## 83. User (turn 83)

Bueno, hay que tener en cuenta que ese sigue un sistema multiusuarios. ¿Cómo haría el servidor MSP para identificarse? Tendría que haber algún método.

---

## 84. Assistant (turn 84)

Sí, en multiusuario el MCP no debería “ser el usuario”. Debería autenticarse como **cliente/agente autorizado por un usuario**.

Modelo:

```
User  ↓ login normalApp auth session  ↓ creates scoped tokenMCP client / agent  ↓ uses tokenMCP server  ↓ acts on user's graphs/projects
```

La identidad debería separar:

```
principal user:  seb@example.comclient identity:  Claude Desktop / ChatGPT / local agent / CI agentscope:  graph:read  graph:write  graph:compile  wgsl:inspect  project:read
```

Opciones prácticas:

```
Local dev:  one-time pairing code  local token stored by the MCP clientHosted multiuser:  OAuth / Clerk token / Supabase JWT  short-lived access token  refresh token optional
```

Para tu caso, si ya usás o pensás usar Clerk/Supabase, el MCP server debería validar el mismo JWT que la app.

Herramientas MCP siempre reciben contexto:

```
type McpContext = {  userId: string;  workspaceId: string;  projectId?: string;  clientId: string;  scopes: string[];};
```

Y cada operación valida permisos:

```
graph.get        requires graph:readgraph.update     requires graph:writegraph.compile    requires graph:compilewgsl.inspect     requires wgsl:inspect
```

También conviene auditar:

```
who changed whatwhich clientwhenold graph hashnew graph hashpatch diff
```

Regla para el documento:

```
The MCP server must authenticate both the user and the client application. It acts only within explicit user-granted scopes and never has global graph access by default.
```

---

## 85. User (turn 85)

Sí, además el servidor MSP tendría que estar también al lado del servidor web. No sería un servidor por cada cliente, por cada navegador que visita, me imagino. Entonces tendría que tener acceso a los documentos, independientemente de la instancia en el cliente. O sí se podría tener un servidor MSP por cada cliente. El problema de todas formas es publicar el puerto y el IP en una red interna, por ejemplo, en una LAN.

---

## 86. Assistant (turn 86)

Sí. Para multiusuario yo elegiría **MCP server compartido junto al backend web**, no uno por navegador.

Arquitectura recomendada:

```
Browser editor   ↔ web app/backend   ↔ document storeAI client   ↔ MCP server   ↔ same document store
```

El MCP no depende del estado del navegador. Lee y modifica documentos persistidos:

```
projectIdgraphDocumentIdversion/hashuserIdworkspaceId
```

Ventajas:

```
- no hay que publicar IP/puerto del navegador- funciona fuera de la LAN- sirve para ChatGPT/Claude/agents remotos- respeta auth multiusuario- puede auditar cambios- puede operar aunque el editor no esté abierto
```

El modelo “MCP por cliente” solo lo usaría para **modo local/dev**:

```
Local MCP:  edita archivos locales  localhost  útil para IDE/Claude DesktopHosted MCP:  edita documentos persistidos  mismo backend que la app  útil para multiusuario/web
```

Entonces el diseño queda doble:

```
@virtual-planet/mcp-server  modo hosted:    auth + DB + workspaces + documents  modo local:    filesystem + localhost + pairing token
```

Para concurrencia:

```
graph.patch(documentId, baseVersion, patch)
```

Si el documento cambió:

```
409 conflict → agent reloads → reapplies patch
```

Regla para el documento:

```
The hosted MCP server runs beside the web backend and operates on persisted graph documents, not browser-local state. Per-client MCP servers are supported only for local development and file-based workflows.
```

---

## 87. User (turn 87)

Sí, incluso el documento actual abierto en un navegador podría ser persistido en el servidor, como temporario, de todas formas como documento activo, o hay que considerar que puede haber varias pestañas abiertas, así que también eso habría que tener en cuenta.

---

## 88. Assistant (turn 88)

Sí. Conviene pensar en **documentos persistidos + sesiones activas**.

```
GraphDocument  estado guardado / versionadoGraphSession  instancia activa de edición  puede ser temporal  puede tener varias pestañas/clientes conectados
```

Modelo:

```
Browser tab A ┐Browser tab B ├── GraphSession ── GraphDocumentMCP client   ┘
```

Cada pestaña no “posee” el documento. Se conecta a una sesión compartida o crea una nueva.

Campos útiles:

```
type GraphSession = {  sessionId: string;  documentId: string;  baseVersion: string;  activeVersion: string;  participants: Participant[];  lastActivityAt: string;  autosave: boolean;  temporary: boolean;};
```

Para edición:

```
patch-based updatesbaseVersion/hashserver applies patchserver broadcasts patch to all tabs + MCP clients
```

Si hay varias pestañas:

```
Tab A edits node scale  → server applies patch  → Tab B receives patch  → MCP sees new version
```

Para temporarios:

```
untitled graph  → persisted as temporary session document  → expires if never saved  → can be promoted to real project document
```

Regla clave:

```
The active browser graph should still be server-backed.The browser holds a working copy, not the authoritative state.
```

Así el MCP puede editar el documento activo aunque venga de otro proceso, y el navegador se sincroniza por WebSocket/SSE.

---

## 89. User (turn 89)

El MSP tendría que también tener operaciones, funciones para poder consultar documentos que están supuestamente abiertos en las pestañas, además de listar documentos guardados.

---

## 90. Assistant (turn 90)

Sí. El MCP debería distinguir:

```
saved documentsactive sessions / open tabs
```

Herramientas MCP mínimas:

```
documents.list_saveddocuments.getdocuments.searchsessions.list_activesessions.getsessions.get_graphsessions.get_participantssessions.get_dirty_statesessions.apply_patchsessions.savesessions.promote_temporary
```

Modelo:

```
Saved GraphDocument:  documento persistente en proyecto/workspaceActive GraphSession:  documento abierto o temporal  puede tener pestañas conectadas  puede tener cambios no guardados
```

Ejemplo de respuesta:

```
type ActiveSessionSummary = {  sessionId: string;  documentId?: string;  title: string;  temporary: boolean;  dirty: boolean;  activeVersion: string;  savedVersion?: string;  participants: {    clientId: string;    kind: 'browser-tab' | 'mcp-client';    userId: string;    lastSeenAt: string;  }[];};
```

Regla importante:

```
MCP should edit active sessions when the user refers to “the graph I have open”.MCP should edit saved documents when the user refers to a project/document by name.
```

Así un agente puede preguntar/listar:

```
¿Qué grafos tiene Seb abiertos ahora?¿Cuál tiene cambios sin guardar?Editar el documento activo.Guardar esta sesión como preset.
```

Y varias pestañas quedan sincronizadas por el mismo canal de patches.

---

## 91. User (turn 91)

Bien, actualizar los documentos de diseño.

---

## 92. Assistant (turn 92)

Actualización integrada para la parte multiusuario/MCP, documentos activos y pestañas abiertas:

# Design Addendum
## Multiuser MCP, Active Sessions and Document State
### Overview
The MCP server is a shared server-side service, not a per-browser instance.
It runs beside the web backend and operates on persisted graph documents and active graph sessions.
This allows AI assistants, browser tabs, collaborative editors and future agents to access the same authoritative graph state.
---
# Core Model
The system distinguishes between two related entities:
```
GraphDocument
    Persistent saved document

GraphSession
    Active editing session
    May be temporary
    May have one or more connected clients
```
A document may exist without an active session.
A session may represent:
- a saved document currently open in one or more browser tabs
- a temporary unsaved document
- a document being edited by an MCP client
- a collaborative editing session
---
# Server-Side Authority
The browser does not own the canonical document state.
The browser holds a working view of a server-backed session.
```
Browser Tab A
Browser Tab B
MCP Client
        │
        ▼
GraphSession
        │
        ▼
GraphDocument
```
This ensures that MCP tools can inspect and modify active work even when the graph is open in a browser.
---
# Hosted MCP Server
The hosted MCP server runs next to the web backend.
It has access to:
- users
- workspaces
- projects
- saved graph documents
- active sessions
- temporary documents
- versions
- patches
- compiler diagnostics
It does not depend on browser-local state.
---
# Local MCP Mode
A separate local mode may exist for development.
Local mode may operate on:
- filesystem documents
- localhost projects
- temporary local graphs
This is useful for IDE agents and local Claude Desktop-style workflows.
However, hosted multiuser operation should use the shared server-side MCP service.
---
# Authentication and Client Identity
The MCP server must authenticate both:
```
User identity
Client identity
```
Example:
```
User:
    seb@example.com

Client:
    ChatGPT
    Claude Desktop
    IDE Agent
    Local CLI Agent

Scopes:
    graph:read
    graph:write
    graph:compile
    wgsl:inspect
    session:read
    session:write
```
The MCP server never has global access by default.
It operates only within explicit user-granted scopes.
---
# MCP Context
Every operation executes with context:
```
type McpContext = {
  userId: string;
  workspaceId: string;
  projectId?: string;
  clientId: string;
  scopes: string[];
};
```
Permissions are checked per operation.
---
# Saved Documents
Saved graph documents are persistent project assets.
MCP tools should support:
```
documents.list_saved
documents.search
documents.get
documents.create
documents.update
documents.delete
documents.get_versions
```
Saved documents are selected when the user refers to a named project, graph, preset, or stored document.
---
# Active Sessions
Active sessions represent documents currently open, temporary, or collaboratively edited.
MCP tools should support:
```
sessions.list_active
sessions.get
sessions.get_graph
sessions.get_participants
sessions.get_dirty_state
sessions.apply_patch
sessions.save
sessions.promote_temporary
sessions.close
```
Active sessions are selected when the user refers to:
```
the graph I have open
the current editor
the active document
that tab
the unsaved graph
```
---
# Active Session Summary
A session summary should expose:
```
type ActiveSessionSummary = {
  sessionId: string;
  documentId?: string;
  title: string;
  temporary: boolean;
  dirty: boolean;
  activeVersion: string;
  savedVersion?: string;
  lastActivityAt: string;
  participants: Participant[];
};
```
Participants include browser tabs, MCP clients and future collaborative users.
---
# Participants
```
type Participant = {
  clientId: string;
  kind: 'browser-tab' | 'mcp-client' | 'web-client' | 'agent';
  userId: string;
  displayName?: string;
  lastSeenAt: string;
};
```
This allows the system to know what is open and where.
---
# Temporary Documents
Untitled or unsaved graphs should still be persisted server-side as temporary session documents.
Temporary documents may:
- autosave
- expire after inactivity
- be promoted to saved documents
- be edited through MCP
- be shared across multiple tabs
This avoids losing state and allows agents to operate on unsaved work.
---
# Patch-Based Editing
All graph modifications should use versioned patches.
```
graph.patch(documentId/sessionId, baseVersion, patch)
```
The server validates the patch, applies it, updates the session version and broadcasts the change.
If the base version is stale:
```
409 Conflict
```
The client or agent reloads, rebases and reapplies the patch.
---
# Multi-Tab Behavior
Multiple tabs may attach to the same session.
```
Tab A edits node scale
        ↓
Server applies patch
        ↓
Tab B receives patch
        ↓
MCP client sees updated version
```
Tabs do not create divergent document authorities.
They subscribe to the same server-backed session.
---
# Synchronization
The server should broadcast session changes through:
- WebSocket
- Server-Sent Events
- future collaborative transport
MCP clients should be able to query current state even if they do not subscribe to live updates.
---
# Dirty State
A session may diverge from its last saved document version.
The MCP server must expose dirty state.
```
dirty = activeVersion != savedVersion
```
This allows agents to answer:
- what is currently unsaved?
- which graph is open?
- which session has changes?
- should this be saved as a document?
---
# Audit Log
Every MCP or browser edit should record:
- userId
- clientId
- sessionId
- documentId
- timestamp
- patch summary
- previous version
- new version
This is essential for multiuser trust and debugging.
---
# Tool Selection Rules
MCP behavior should follow these rules:
```
If the user refers to a named saved graph:
    operate on GraphDocument

If the user refers to the currently open graph:
    operate on GraphSession

If multiple sessions are active:
    ask or expose sessions.list_active

If a session is temporary:
    allow edit, save, or promote_temporary

If a session has unsaved changes:
    prefer session state over saved document state
```
---
# Guiding Principle
The hosted MCP server operates on the same server-backed document/session model as the browser editor.
Saved documents provide persistence.
Active sessions provide live editable state.
Browser tabs, AI assistants, local agents and future collaborative users all interact with the same authoritative graph through scoped, authenticated, versioned operations.

---

## 93. User (turn 93)

Integra todo en un solo documento, de forma que los addendums pasen a formar parte de la coraza y del plan de desarrollo.

---

## 94. Assistant (turn 94)

Sí. De hecho, creo que ya llegamos a un punto en el que no tiene sentido seguir acumulando addenda. Lo correcto sería consolidarlo como un único documento de arquitectura de referencia para el proyecto.

Le cambiaría el nombre a algo como:

> **`_docs/architecture/procedural-graph-system.md`**

o incluso

> **`_docs/architecture/procedural-language.md`**

porque ya no habla solo de vegetación, sino del lenguaje procedimental completo de Virtual Planet.

La estructura que propondría sería aproximadamente:

1. **Vision**
  - Goals
  - Design philosophy
  - Long-term vision (WebGPUToy, reusable procedural platform)
2. **High-Level Architecture**
  - Canonical Graph IR
  - Schema system
  - Compiler
  - Runtime
  - WebGPU pipelines
3. **Schema-Driven Architecture**
  - Single source of truth
  - Primitive registration
  - Automatic node generation
  - Automatic inspectors
  - Automatic documentation
  - Declarative Svelte components
  - Future React/Vue adapters
4. **Procedural Primitive Library**
  - Noise
  - Terrain
  - Vegetation
  - Math
  - Utilities
  - Third-party extensions
5. **Typed Graph System**
  - Ports
  - Validation
  - Dependency graph
  - Multi-output fields
6. **Compiler**
  - Dependency slicing
  - Multi-output compilation
  - WGSL function generation
  - WGSL module resolver
  - Shader linker
  - Two-level tree shaking
7. **WebGPU Runtime**
  - Consumers
  - Compute
  - Vertex
  - Fragment
  - Mesh generation
  - Generic tessellation providers
8. **Procedural Vegetation**
  - Dual-frequency fields
  - Peak detection
  - Coverage vs instances
  - Metric coordinates
9. **Graph Editor**
  - Standalone application
  - Embedded components
  - Shared Graph IR
  - Package structure
10. **Document & Session Model**
  - GraphDocument
  - GraphSession
  - Temporary documents
  - Autosave
  - Multi-tab synchronization
  - Patch-based editing
11. **MCP Architecture**
  - Hosted server
  - Local mode
  - Authentication
  - Active sessions
  - Saved documents
  - Tool definitions
  - AI collaboration
12. **Future Platform**
  - WebGPUToy
  - Public graph sharing
  - Presets
  - Third-party primitives
  - Plugin system
13. **Implementation Roadmap**
  - Phase 1: Typed Graph IR
  - Phase 2: Primitive registration
  - Phase 3: Graph compiler
  - Phase 4: WGSL linker
  - Phase 5: Standalone editor
  - Phase 6: Embedded editor
  - Phase 7: Procedural vegetation
  - Phase 8: MCP server
  - Phase 9: Collaborative editing
  - Phase 10: WebGPUToy

Creo además que ya estamos hablando de unas **40–60 páginas** de especificación técnica. Es decir, ya no es un simple documento de diseño, sino prácticamente el **Architecture Decision Record (ADR)** principal del proyecto. A partir de él podrían derivarse especificaciones más pequeñas para cada paquete (`graph`, `compiler`, `runtime-webgpu`, `graph-editor`, `mcp-server`, etc.), mientras este documento permanece como la referencia arquitectónica única para Virtual Planet.

### Typing User-Created Functions in WebGPUToy

**Dual approach:**  
The best workflow combines *automatic inference* from the function's AST and *optional user-supplied annotations*. This maximizes ergonomics while allowing semantic detail where needed.

#### Inference Pipeline

1. **User writes WGSL or graph function**
2. **Parse AST:** Extract signature and dependencies
3. **Infer types:** Gather input/output names and WGSL types
4. **Generate draft schema**
5. **Allow user to add/override metadata**

#### Example

Given WGSL:

```wgsl
fn ridgeMask(p: vec3<f32>, altitude: f32) -> f32 {
  // ...
}
```

Automatic inference produces:

```ts
{
  id: "user.ridgeMask",
  inputs: {
    p: { type: "vec3", wgslType: "vec3<f32>" },
    altitude: { type: "float", wgslType: "f32" }
  },
  outputs: {
    value: { type: "float", wgslType: "f32" }
  }
}
```

However, AST analysis *cannot* determine editor/UI semantics, such as:

- Units (`meters`, `degrees`, etc.)
- Ranges (`0..1`)
- Widget preferences (`slider`, `color`)
- Categories, documentation, or intent
- Semantic/meaningful context  
- Safe defaults

These are surfaced by user annotation, e.g.:

```ts
{
  altitude: {
    type: "float",
    unit: "m",
    min: 0,
    max: 9000,
    widget: "slider"
  }
}
```

**Ideal flow:**

1. Write function
2. Parse signature and dependencies
3. Type-check WGSL types
4. Draft initial node schema
5. Prompt for missing semantic metadata
6. Save as reusable graph node

- **AST = mechanical types and ports**
- **Annotations = semantics and UX**

This approach produces concise, low-boilerplate definitions with robust editor support.

---

### Annotating Metadata in WGSL

Current systems such as [Use.GPU](https://usegpu.live/docs/reference-library-%40use-gpu-shader?utm_source=chatgpt.com) do not provide formal schema annotations; they focus on module linkage. For Virtual Planet, a structured annotation scheme is beneficial.

#### Approaches

**1. Line-style Annotations**

```wgsl
/// @primitive noise.perlin3d
/// @category Noise
/// @description Classic Perlin noise
/// @pure
/// @deterministic
/// @input position vec3<f32> world meters
/// @input scale f32 unitless slider(0.0001,1.0)
/// @output value f32 normalized(0,1)

fn perlin3d(
    position: vec3<f32>,
    scale: f32
) -> f32 {
    ...
}
```

**2. Block-style YAML Frontmatter**

```wgsl
/*---
primitive: noise.perlin3d
category: Noise

inputs:
  - name: position
    unit: meters
    semantic: world-position

  - name: scale
    widget: slider
    min: 0.0001
    max: 1.0

outputs:
  - value
---*/
fn perlin3d(
    position: vec3<f32>,
    scale: f32
) -> f32 {
    ...
}
```

**Recommended:**  
The block-style format is easier to parse and validate, and avoids custom parsing logic.

#### Compiler Workflow

1. Parse the WGSL AST *(function name, params, WGSL types, return type, dependencies)*
2. Extract YAML block *(category, UI hints, units, docs, etc.)*
3. Merge both into a complete "primitive schema"

> **AST** = type safety, wiring  
> **Annotation** = UI & domain meaning

#### Self-Documenting Design

The function source becomes the *authoritative primitive* definition.

- Minimal redundant typing for the user
- All necessary editor schema in one file
- No requirement for TypeScript wrappers

This enables automatic registration and live integration in the editor—including property inspectors, connection validation, UI components, MCP API publishing, and node palette display.

---

### Using YAML Metadata in WGSL

**Standardize on YAML frontmatter inside block comments**:

```wgsl
/*---
id: noise.perlin3d
category: Noise
description: Classic Perlin noise over 3D position.
pure: true
deterministic: true

inputs:
  position:
    semantic: world-position
    unit: m

  scale:
    unit: 1/m
    widget: slider
    min: 0.0001
    max: 1.0
    default: 0.002

outputs:
  value:
    range: [0, 1]
    semantic: scalar-field
---*/

fn perlin3d(position: vec3<f32>, scale: f32) -> f32 {
  // ...
}
```

**Loader steps:**

1. Extract YAML block  
2. Parse with off-the-shelf YAML library  
3. Parse WGSL signature/AST  
4. Merge:
   - AST ⇒ mechanical types
   - YAML ⇒ metadata and editor semantics

**Final merged schema:**

```ts
{
  id: "noise.perlin3d",
  inputs: {
    position: {
      wgslType: "vec3<f32>",
      semantic: "world-position",
      unit: "m"
    },
    scale: {
      wgslType: "f32",
      unit: "1/m",
      widget: "slider",
      min: 0.0001,
      max: 1.0,
      default: 0.002
    }
  },
  outputs: {
    value: {
      wgslType: "f32",
      range: [0, 1]
    }
  }
}
```

**Adopt:**

```wgsl
/*--- YAML ---*/
fn ...
```

- This is easily extractable and validates well
- Remains fully compatible with WGSL tooling (just a comment)
- No need for a custom annotation parser

---
