export const TETHER_RANGE = 860;

export function nearestAnchor(player, anchors, getPosition, isAvailable = () => true, maxRange = TETHER_RANGE) {
  let best = null;
  let bestDistance = Infinity;

  for (const anchor of anchors) {
    if (!isAvailable(anchor)) continue;
    const pos = getPosition(anchor);
    const d = Math.hypot(pos.x - player.x, pos.y - player.y);
    if (d < 42 || d > maxRange) continue;
    if (d < bestDistance) {
      bestDistance = d;
      best = { anchor, pos, distance: d };
    }
  }

  return best;
}
