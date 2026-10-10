export const HOOK_RANGE = 820;

export function nearestHook(player, hooks, getPosition, maxRange = HOOK_RANGE) {
  let best = null;
  let bestDistance = Infinity;

  for (const hook of hooks) {
    const pos = getPosition(hook);
    const dx = pos.x - player.x;
    const dy = pos.y - player.y;
    const d = Math.hypot(dx, dy);

    // One simple rule: if a hook is reachable, the nearest one wins.
    // Hooks are intentionally allowed behind the player after they are crossed.
    if (d < 48 || d > maxRange) continue;

    if (d < bestDistance) {
      bestDistance = d;
      best = { hook, pos, distance: d };
    }
  }

  return best;
}
