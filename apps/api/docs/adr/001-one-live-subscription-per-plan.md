# ADR 001: One live subscription per customer per plan

## Context

Subscribing creates a row and starts billing. Double-clicked buttons, flaky
networks and client retries can send the same subscribe request twice. If
duplicates are allowed, the customer gets two subscriptions and is billed twice.

## Decision

A customer may have at most one live subscription per plan. "Live" means any
status except `canceled`, including `pending`. Enforced by a partial unique index
on (tenant_id, customer_id, plan_id) WHERE status <> 'canceled'.

## Alternatives considered

- Allow multiple live subscriptions (e.g. two households). Rejected: the
  double-billing risk outweighs a use case no merchant has asked for yet.
- Prevent duplicates in app code only. Rejected: two concurrent requests can
  both pass an app-level check before either inserts (the read-then-write gap).

## Consequences

- Duplicate submissions cannot double-bill, whatever bugs the app has.
- The subscribe endpoint must handle the unique-violation error and return
  the existing subscription instead of a 500.
- Multiple deliveries of the same plan need a quantity field or delivery
  addresses later.
- A canceled customer can resubscribe; the canceled row stays as history.
