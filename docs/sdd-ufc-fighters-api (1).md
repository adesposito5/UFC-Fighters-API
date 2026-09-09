# SDD — UFC Fighters API
### Constitution → Specify → Clarify → Plan → Tasks → Implement → Analyze

> Calca la estructura de TicketLab (Clase 32), aplicada a la API de peleadores UFC
> del Cuarto Proyecto Integrador. Pensado para pegarlo como contexto cuando corras
> `specify init . --integration claude --script ps` y avanzar etapa por etapa.

---

## 1. CONSTITUTION — principios estables del proyecto

```
# UFC Fighters API Constitution
1. Toda regla de negocio requiere al menos un test de aceptación.
2. TypeScript strict debe permanecer habilitado.
3. Los datos de dominio (Fighter, Event) no se eliminan físicamente.
4. Ninguna ruta que exponga o modifique datos del usuario queda sin AuthGuard.
5. Un cambio en la API pública requiere actualizar este documento (la spec).
6. El ValidationPipe global rechaza propiedades no declaradas en los DTOs.
7. `npm run test` (o `pnpm test`) debe pasar antes de dar una tarea por terminada.
```

La constitution no cambia por feature — rige todo el proyecto. La spec (sección 2 en
adelante) sí evoluciona a medida que agregamos capacidades.

---

## 2. SPECIFY — la intención en texto llano

> UFC Fighters API administra peleadores y eventos de UFC.
> Cada Fighter pertenece a un usuario (`ownerId`) y tiene un `status`: `ACTIVE`,
> `SUSPENDED` o `RETIRED`.
> Las transiciones válidas son: `ACTIVE → SUSPENDED`, `ACTIVE → RETIRED`,
> `SUSPENDED → ACTIVE`, `RETIRED → ACTIVE` (comeback).
> Un Fighter que pasa a `SUSPENDED` requiere un motivo, que queda registrado en un
> historial completo (`SuspensionRecord`) — no se pisa entre suspensiones.
> Reactivar un Fighter (`SUSPENDED → ACTIVE`) cierra el registro de suspensión activo,
> sin borrarlo.
> DELETE realiza eliminación lógica (`deletedAt`).
> Los listados excluyen por defecto los Fighters eliminados.
>
> Primero identificá ambigüedades. No implementes hasta que la spec sea consistente.

### Modelo de dominio

**Fighter contiene:**
`id · name · nickname · weightClass · wins · losses · draws · nationality · status ·
reachCm · ownerId · deletedAt · createdAt · updatedAt`

**SuspensionRecord contiene** (relación 1:N — un Fighter tiene muchos registros):
`id · fighterId (FK → Fighter) · reason · suspendedAt · liftedAt (nullable) · createdAt`

**Weight classes válidas:**
`FLYWEIGHT | BANTAMWEIGHT | FEATHERWEIGHT | LIGHTWEIGHT | WELTERWEIGHT | MIDDLEWEIGHT | LIGHT_HEAVYWEIGHT | HEAVYWEIGHT`

**Estados válidos:** `ACTIVE | SUSPENDED | RETIRED`

**Event contiene:**
`id · name · date · location · ownerId · createdAt · updatedAt`

### El modelo de estados

```
ACTIVE ─────────────▶ SUSPENDED
  ▲  │                    │
  │  ▼                    │
  └── RETIRED ◀───────────┘
```

Transiciones permitidas:
- `ACTIVE → SUSPENDED`
- `ACTIVE → RETIRED`
- `SUSPENDED → ACTIVE`
- `RETIRED → ACTIVE`

Toda transición que no aparezca en la lista es inválida (ej. `SUSPENDED → RETIRED`
directo no está permitido en esta versión — un peleador suspendido primero vuelve a
`ACTIVE` y desde ahí se retira).

### Regla escrita como escenario (Given / When / Then)

```
## Regla: suspensión requiere motivo
Given un fighter con status=ACTIVE
When se solicita cambiar status a SUSPENDED
And no se envía un reason (o viene vacío)
Then la API responde 422
And el fighter conserva status=ACTIVE
And updatedAt no cambia
And no se crea ningún SuspensionRecord
```

```
## Regla: suspender crea un registro de historial
Given un fighter con status=ACTIVE
When se solicita cambiar status a SUSPENDED con reason="conducta antideportiva"
Then el fighter queda con status=SUSPENDED
And se crea un SuspensionRecord con reason="conducta antideportiva",
    suspendedAt=ahora, liftedAt=null
```

```
## Regla: reactivar cierra el registro activo, no lo borra
Given un fighter con status=SUSPENDED
And existe un SuspensionRecord de ese fighter con liftedAt=null
When se solicita cambiar status a ACTIVE
Then el fighter queda con status=ACTIVE
And ese SuspensionRecord se actualiza con liftedAt=ahora
And el SuspensionRecord NO se elimina (queda como historial)
And si el fighter vuelve a suspenderse más adelante, se crea
    un SuspensionRecord NUEVO (no se reutiliza ni se pisa el anterior)
```

### Eliminación lógica

```
## Eliminación
DELETE /fighters/:id no elimina la fila.
La operación asigna deletedAt con la fecha actual.
Los listados (GET /fighters) excluyen por defecto los fighters
cuyo deletedAt no sea null.
GET /fighters/:id sobre un fighter eliminado SÍ lo devuelve (200),
incluyendo un campo `eliminado: true` en la respuesta.
Un segundo DELETE sobre un fighter ya eliminado responde 409 (Conflict).
PATCH sobre un fighter eliminado responde 409 (Conflict): no se puede editar.
Un fighter eliminado no puede cambiar de estado.
```

Un `SuspensionRecord` eliminado nunca ocurre — este historial no se borra bajo ninguna
operación de este proyecto (ver Constitution, principio 3: los datos de dominio no se
eliminan físicamente).

### Fuera de alcance (por ahora)

```
## Fuera de alcance
- relación N:N Fighter↔Event (quién peleó contra quién, resultado) — sería un
  recurso `Fight`/`Bout` a futuro.
- restauración de fighters eliminados.
- notificaciones o webhooks.
- panel de estadísticas históricas.
```

---

## 3. CLARIFY — preguntas y decisiones

Igual que con TicketLab: cada duda relevante recorre el ciclo
`ambigüedad → pregunta → decisión → regla`. Estas ya están resueltas para que no
te frenen al implementar:

| Pregunta | Decisión |
|---|---|
| ¿Qué devuelve `GET /fighters/:id` sobre un fighter ya eliminado? | 200, incluyendo un campo `eliminado: true` en la respuesta (no 404). |
| ¿`GET /fighters` (listado) es por usuario o global? | Filtra por `ownerId` del usuario autenticado (privado). |
| ¿`RETIRED` puede pasar directo a `SUSPENDED`? | No, solo puede volver a `ACTIVE` primero (comeback). |
| ¿Qué devuelve un segundo `DELETE` sobre un fighter ya eliminado? | 409 Conflict — no es idempotente, se marca como error. |
| ¿Puede editarse (`PATCH`) un fighter ya eliminado? | No, responde 409 Conflict. |
| ¿El motivo de suspensión se borra al volver de `SUSPENDED` a `ACTIVE`? | No, se conserva como historial. Se modela como entidad propia `SuspensionRecord` (1:N con Fighter) en vez de un solo campo de texto, para poder guardar varias suspensiones a lo largo del tiempo sin que una pise a la otra. |
| ¿`wins`/`losses`/`draws` se actualizan por el mismo `PATCH` general? | No, en esta versión no se tocan manualmente — quedan fuera de alcance hasta sumar el recurso `Fight`. |
| ¿Qué pasa si mandan un `weightClass` inválido? | 400 del DTO, antes de llegar al service (validación, no lógica de negocio). |

Si en el momento de implementar te surge una pregunta nueva, la regla es la misma que
en la clase: **la respuesta vuelve a este documento**, no se queda solo en el chat con
el agente.

---

## 4. PLAN — cómo lo construimos en este stack

La spec responde *qué debe ser verdad*. El plan responde *cómo lo construimos con
NestJS + Prisma*:

- NestJS 11 + TypeScript, un módulo por recurso (`FightersModule`, `EventsModule`).
- Prisma + PostgreSQL como persistencia real (no repositorio en memoria, a diferencia
  de TicketLab que era una demo).
- `FightersService` concentra la lógica de transición de estados — los controllers no
  contienen reglas de negocio, solo reciben el DTO validado y llaman al service.
- Suspender/reactivar un Fighter y crear/cerrar el `SuspensionRecord` correspondiente
  ocurre en la **misma transacción** de Prisma (`prisma.$transaction`), para que nunca
  quede un fighter en `SUSPENDED` sin su registro, ni viceversa.
- La función de "listar visibles" (`deletedAt: null`) se define **una sola vez** en el
  service y la reutiliza tanto `findAll` como cualquier futuro endpoint de
  estadísticas — evitando la divergencia que se vio en la clase (`list()` filtra
  eliminados pero `stats()` no).
- `JwtAuthGuard` protege todas las rutas de escritura y lectura (a diferencia de
  TicketLab que dejaba auth fuera de alcance, acá la consigna del proyecto sí la pide).
- Un guard/chequeo adicional en el service verifica `ownerId === req.user.id` antes
  de permitir `PATCH`/`DELETE`.
- Tests con Jest (el default de Nest) cubriendo los escenarios Given/When/Then de
  arriba.

---

## 5. TASKS — desglose en unidades verificables

```
T01  definir Fighter, SuspensionRecord, WeightClass y FighterStatus en schema.prisma
     (relación 1:N Fighter → SuspensionRecord)
T02  generar y correr la migración inicial (prisma migrate dev)
T03  implementar CreateFighterDto / UpdateFighterDto con class-validator
T04  implementar FightersService: create, findAll (excluye deletedAt), findOne, update
     (update responde 409 si el fighter ya tiene deletedAt)
T05  implementar la máquina de estados de status en el service
T06  implementar creación/cierre de SuspensionRecord dentro de la transición de
     estado (transacción: suspender crea registro, reactivar cierra el activo)
T07  probar transiciones válidas e inválidas + creación/cierre de SuspensionRecord
T08  implementar eliminación lógica (DELETE asigna deletedAt; responde 409 si
     ya tenía deletedAt asignado)
T09  filtrar eliminados en findAll y devolver `eliminado:true` en findOne
T10  agregar JwtAuthGuard + chequeo de ownerId en update/delete
T11  repetir T01-T04 y T08-T10 para Event (sin máquina de estados)
T12  agregar tests de aceptación de los escenarios Given/When/Then
T13  documentar en README las reglas/invariantes públicas
```

Cada tarea es acotada, observable y trazable a una regla concreta — si `T06` falla,
sabés exactamente qué quedó incompleto sin tener que revisar todo el proyecto.

---

## 6. IMPLEMENT — cómo pedirle al agente que ejecute una tarea

En vez de "implementá todo el CRUD", se pide una **slice vertical** por vez, igual que
en la clase. Ejemplo con T05/T06:

```
Elegimos una sola regla:
"Un fighter no puede pasar a SUSPENDED sin un suspensionReason no vacío."

Pedile al agente:
1. localizar el escenario correspondiente en este documento (sección 2);
2. implementar el cambio mínimo en FightersService;
3. agregar el test que cubre esa regla;
4. ejecutar `pnpm test`;
5. mostrar qué criterio de la spec quedó satisfecho.
```

No alcanza con que el agente diga "ya funciona" — pedile siempre la evidencia
(el test corriendo, no solo la afirmación).

### Trazabilidad

```
Regla: suspender crea un registro de historial
  ↓
Escenario (sección 2, Given/When/Then)
  ↓
Tarea T06 / T07
  ↓
Test: fighters-suspension-record.spec.ts
  ↓
Resultado: pass
```

### Definición de terminado (para cada slice)

- El criterio de aceptación está implementado.
- El test nuevo falla antes del cambio y pasa después.
- No se rompen tests existentes.
- No quedan preguntas críticas abiertas (o quedaron anotadas en Clarify).
- Esta spec refleja cualquier decisión nueva que haya surgido.
- El diff no incluye cambios fuera de lo pedido en la tarea.
- `pnpm test` termina en verde.

---

## 7. ANALYZE — checklist final

**Revisión de la spec:**
- [ ] El problema y el resultado esperado son claros.
- [ ] El alcance y lo que queda fuera están explícitos.
- [ ] Las reglas de negocio tienen nombre y ejemplo (Given/When/Then).
- [ ] Los estados y transiciones de `Fighter` están definidos.
- [ ] Los errores importantes (422, 404, 400) tienen comportamiento esperado.
- [ ] Las preguntas abiertas son visibles (sección Clarify).

**Revisión de la implementación:**
- [ ] Cada criterio aceptado tiene un test como evidencia.
- [ ] Las decisiones nuevas que surgieron durante el implement volvieron a este
      documento.
- [ ] El `AuthGuard` cubre todas las rutas de escritura, sin excepciones no
      justificadas (regla de oro de la consigna del proyecto).
- [ ] No hay cambios fuera de alcance en el diff.
- [ ] `pnpm test` pasa.
- [ ] Podrías explicarle a otra persona por qué el cambio está completo.

---

*Este documento cubre `Fighter` en detalle (por tener estados) y deja `Event` como
CRUD simple sin máquina de estados — repetir T01-T04/T07-T09 alcanza para ese
recurso.*
