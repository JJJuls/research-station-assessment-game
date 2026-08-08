# Pump House (`proto_pump_house`)

Status: PROVISIONAL — action-assessment rebuild Unit 2 shell; Unit 3
adds the manifold trench (M13), diagnostic board (M18) and the
standardised setback (M22); Unit 4 adds the pump restart interlock
(M25). Every identifier is `proto_*`; no canonical names, no scoring.

## Purpose (Unit 2 shell)

Interior head of the coolant red line. The Pressure Console presents
the failure (Loop B at 31%) and the work order: survey the yard,
recover line components, free the spare coupling, rebuild the manifold.
Logging the work order (`proto_work_order_read`) closes the
investigation task and opens the yard recovery objective.

## Connections

- South doorway → Coolant Yard (`proto_coolant_yard`).

## Debug

`?scene=pump_house` direct launch. Spec coverage: work-order beat in
`e2e/coolant_yard_route.spec.ts`.
