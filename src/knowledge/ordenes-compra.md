# Proceso de órdenes de compra (OC)

## Contexto

Cada compra llega a administración por correo con tres piezas: la solicitud (Excel), la cotización del proveedor y el correo de aprobación del líder. La analista crea la OC en SAP con proveedor, descripción, centro de costo y subárea, valor, indicador de IVA, aprobador y condiciones de pago, y adjunta la aprobación como evidencia.

Hallazgo del proceso actual: muchas OC se crean **después** de recibir la factura (retroactivas), saltándose la cotización. La dirección quiere medirlo.

## Controles (RC1–RC10)

| Regla | Qué verifica                                                                    | Efecto                          |
| ----- | ------------------------------------------------------------------------------- | ------------------------------- |
| RC1   | El proveedor existe en el maestro (por NIT; sin NIT, por nombre) y está activo  | Bloqueo                         |
| RC2   | Hay aprobación, contiene "Aprobado" y la envió un aprobador del centro de costo | Bloqueo                         |
| RC3   | El valor total no supera el tope del aprobador en ese centro                    | Bloqueo                         |
| RC4   | La subárea pertenece al centro de costo                                         | Bloqueo                         |
| RC5   | Cotización y solicitud difieren como máximo 2 %; sin cotización se confirma     | Confirmación                    |
| RC6   | Sin indicador de IVA se toma el del proveedor y se confirma                     | Confirmación + derivado         |
| RC7   | Sin condiciones de pago se toman las del proveedor                              | Derivado (informativo)          |
| RC8   | Factura anterior a la solicitud: OC retroactiva                                 | Confirmación + marca en control |
| RC9   | La aprobación no puede ser anterior a la solicitud                              | Confirmación                    |
| RC10  | Cantidad × valor unitario = valor total (± 1)                                   | Bloqueo                         |

- **Bloqueo**: la OC no se crea. Se informa la razón y la acción sugerida.
- **Confirmación**: la OC se crea solo si el usuario confirma explícitamente.
- **Derivado**: valor completado desde el maestro; se informa.

## Glosario SAP

- **Sociedad / organización de compras**: unidad legal y de compras de Periferia (código 1000).
- **Código SAP del proveedor**: identificador del proveedor en el maestro de SAP.
- **Indicador de IVA** (referencia; los valores vigentes salen siempre de las herramientas): C0 excluido, C1 IVA 19 %, C2 IVA 5 %.
- **Condición de pago** (referencia; los valores vigentes salen siempre de las herramientas): Z000 inmediato, Z015, Z030 y Z060 días fecha factura.
- **Unidad**: UN unidades, H horas, MES meses.
- **Texto breve**: la descripción de la posición en SAP admite 40 caracteres.

## Registro de control

Cada intento queda en `out/control.csv` (creada, pendiente, bloqueada o idempotente) con la marca `retroactiva`, para que contabilidad y la dirección midan el desvío del proceso.
