const recordActivity = (store, activity) => {
  const activityId = `activity-${store.counters.activity++}`;
  const nextActivity = {
    id: activityId,
    createdAt: new Date().toISOString(),
    ...activity,
  };

  store.activities.unshift(nextActivity);
  store.activities = store.activities.slice(0, 500);
  return nextActivity;
};

module.exports = {
  recordActivity,
};