---
description: Revisar un PR hacia main verificando que respete la arquitectura del proyecto
argument-hint: "[número de PR (opcional)]"
allowed-tools: Bash(gh pr *), Bash(gh api *), Read, Grep, Glob
---

# Revisión de arquitectura de PR

Argumento recibido: `$ARGUMENTS`

## Paso 1 — Selección del PR

- Si `$ARGUMENTS` contiene un número de PR, úsalo directamente.
- Si está vacío: ejecuta `gh pr list --base main --state open --json number,title,author,headRefName,updatedAt` y muestra al usuario la lista de PRs disponibles (número, título, autor, rama). Pregunta cuál desea revisar con AskUserQuestion y espera la elección antes de continuar.

## Paso 2 — Obtener el diff

- `gh pr view <N> --json title,body,baseRefName,headRefName,files`
- `gh pr diff <N>` para el diff completo.
- Lee (Read) los archivos modificados en su versión final cuando el diff no dé suficiente contexto.

## Paso 3 — Checklist de arquitectura

Evalúa el diff contra estas reglas del proyecto (fuente: `AGENTS.md`). Reporta cada punto como ✅ cumple / ❌ viola / ⚠️ dudoso, con archivo y línea:

### Estructura y convenciones

- Next.js: seguir las convenciones de ESTA versión (docs en `node_modules/next/dist/docs/`), sin APIs deprecadas.
- Componentes en su capa correcta: primitivos en `src/components/ui/`, wrappers de formulario en `src/components/form/`, dominio en carpetas propias (ej. `auth/`), hooks en `src/hooks/`, utilidades en `src/lib/`.

### Formularios

- Usan react-hook-form + zod con `zodResolver`.
- NUNCA componentes crudos de `src/components/ui/` directamente dentro de un form, ni `Controller` inline en páginas/screens.
- Si falta un wrapper, debe crearse en `src/components/form/` siguiendo el patrón existente (label, error de `fieldState`, `aria-invalid`/`aria-describedby`).

### Diseño (Linear/Vercel collection UI — ver AGENTS.md)

- Fondo nunca blanco puro; canvas gris frío (oklch hue ~255) con superficies casi blancas.
- Neutrales todos en hue ~255, baja chroma — sin grises cálidos.
- Cards: borde 1px + sombra suave (`shadow-card`), `rounded-lg`; preferir `Card`/tokens de superficie.
- Primary blue como único acento fuerte; tiles soft multi-hue OK en listas; Squareline opcional en heroes de colección; sin gradientes de fill/marketing.
- Densidad compacta en forms/tables; aire editorial OK en collection screens; `text-sm` en UI densa; motion sutil con `motion-reduce`.

### Tooling

- Dependencias/scripts solo con **pnpm** (revisar lockfile: no debe aparecer `package-lock.json` ni `yarn.lock`).
- Estilo consistente con el código circundante (naming, densidad de comentarios, idioma).

## Paso 4 — Reporte

Entrega un resumen en español con:

1. **Veredicto general**: APROBADO / APROBADO CON OBSERVACIONES / CAMBIOS REQUERIDOS.
2. Tabla de violaciones encontradas (regla, archivo:línea, severidad, sugerencia de corrección).
3. Observaciones menores opcionales.

No apliques cambios ni publiques comentarios en GitHub salvo que el usuario lo pida explícitamente después de ver el reporte.
