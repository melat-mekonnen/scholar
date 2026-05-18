const listenersByChannel = new Map();

function subscribe(channelId, listener) {
  if (!listenersByChannel.has(channelId)) {
    listenersByChannel.set(channelId, new Set());
  }
  const set = listenersByChannel.get(channelId);
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listenersByChannel.delete(channelId);
  };
}

function publish(channelId, event) {
  const set = listenersByChannel.get(channelId);
  if (!set) return;
  for (const listener of set) {
    try {
      listener(event);
    } catch {
      // ignore one broken stream listener
    }
  }
}

module.exports = {
  subscribe,
  publish,
};
