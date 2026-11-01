mergeInto(LibraryManager.library, {
  SD_DogfightSnapshot: function (pointer) {
    var api = window.__SPACE_DRAGON_DOGFIGHT__;
    if (!api) return;
    try {
      api.latestSnapshot = JSON.parse(UTF8ToString(pointer));
      api.lastSnapshotError = null;
    } catch (error) {
      api.lastSnapshotError = String(error);
      console.warn('Dogfight snapshot was not valid JSON.');
    }
  }
});
