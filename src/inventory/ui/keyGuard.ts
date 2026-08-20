/**
 * Once-per-event keyboard guard (interactive inventory foundation).
 *
 * Phaser 3.90's KeyboardManager pushes every DOM keyboard event into a
 * queue and processes the WHOLE queue synchronously on each new event;
 * the queue is only cleared on the game's POST_STEP. When several key
 * presses land inside one (slow) frame — low-end hardware, or the
 * software-GL verification environment — every earlier event is
 * re-emitted with each new one, so a naive `keydown-X` handler fires
 * multiple times per physical press.
 *
 * Wrapping a handler with `guardKeyHandler` makes it run exactly once
 * per DOM event: each wrapped handler tracks the event objects it has
 * already seen (per-handler WeakSet — different handlers legitimately
 * observe the same event object).
 */

export function guardKeyHandler<E extends object>(
  handler: (event: E) => void,
): (event: E) => void {
  const seen = new WeakSet<E>();

  return (event: E) => {
    if (seen.has(event)) {
      return;
    }

    seen.add(event);
    handler(event);
  };
}
