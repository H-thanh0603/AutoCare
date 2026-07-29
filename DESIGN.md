# AutoCare UI System

## Direction
Modern-minimal operational UI. Existing shadcn/Base UI primitives and semantic Tailwind tokens are source of truth.

## Page patterns
- Staff schedule: date/status filters, chronological rows, explicit action buttons.
- Customer appointment: one booking CTA, owned vehicle selector, clear slot/time, editable only while open.
- Reception: compact intake form, visible mileage/fuel/checklist, clear success route to repair-order detail.

## Interaction
- Server actions own authorization and validation.
- Buttons use existing `Button` variants and visible focus state.
- Status never relies on color alone.
- Loading/submission state prevents duplicate mutations.

## Responsive
- Forms stack at mobile width.
- Tables/lists wrap without horizontal scroll.
- Actions retain visible text labels.
