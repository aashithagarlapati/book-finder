const MAX_NOTIFICATIONS_PER_USER = 100;

/**
 * Push a notification into store.notifications[targetUserId].
 * Must be called inside an updateStore() closure so changes are persisted.
 */
const notify = (store, targetUserId, { type, message, actorId, actorName, ref = null }) => {
  if (!store.notifications) store.notifications = {};
  if (!store.notifications[targetUserId]) store.notifications[targetUserId] = [];

  if (!store.counters) store.counters = {};
  if (!store.counters.notification) store.counters.notification = 1;

  const notifId = `notif-${store.counters.notification++}`;
  const notification = {
    id: notifId,
    type,
    message,
    actorId,
    actorName,
    ref,
    read: false,
    createdAt: new Date().toISOString(),
  };

  store.notifications[targetUserId].unshift(notification);

  if (store.notifications[targetUserId].length > MAX_NOTIFICATIONS_PER_USER) {
    store.notifications[targetUserId] = store.notifications[targetUserId].slice(0, MAX_NOTIFICATIONS_PER_USER);
  }

  return notification;
};

module.exports = { notify };
