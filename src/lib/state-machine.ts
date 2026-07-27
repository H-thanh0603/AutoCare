/**
 * Generic state-machine helper.
 *
 * Every status change in AutoCare goes through a transition table so no code
 * path can assign an arbitrary status. Each domain declares its own table and
 * re-exports a typed `canTransition` / `assertTransition` pair.
 */

import { BusinessRuleError } from "./errors";

export type TransitionMap<TState extends string> = Readonly<
  Record<TState, readonly TState[]>
>;

export function canTransition<TState extends string>(
  map: TransitionMap<TState>,
  from: TState,
  to: TState,
): boolean {
  return map[from]?.includes(to) ?? false;
}

export function isTerminal<TState extends string>(
  map: TransitionMap<TState>,
  state: TState,
): boolean {
  return (map[state]?.length ?? 0) === 0;
}

/**
 * Throws a user-facing error when a transition is not allowed.
 *
 * `labels` maps states to Vietnamese wording so the message is readable by
 * garage staff rather than exposing enum names.
 */
export function assertTransition<TState extends string>(
  map: TransitionMap<TState>,
  from: TState,
  to: TState,
  labels: Readonly<Record<TState, string>>,
  entityLabel: string,
): void {
  if (from === to) {
    throw new BusinessRuleError(
      `${entityLabel} đã ở trạng thái "${labels[to]}".`,
    );
  }
  if (!canTransition(map, from, to)) {
    throw new BusinessRuleError(
      `Không thể chuyển ${entityLabel} từ "${labels[from]}" sang "${labels[to]}".`,
    );
  }
}

/** All states reachable from `from`, for building UI action lists. */
export function allowedTransitions<TState extends string>(
  map: TransitionMap<TState>,
  from: TState,
): readonly TState[] {
  return map[from] ?? [];
}
