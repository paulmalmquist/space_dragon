mergeInto(LibraryManager.library, {
  TownDriveReceiveSnapshot: function (pointer) {
    var bridge = window.__SPACE_DRAGON_TOWN_DRIVE__;
    if (bridge && typeof bridge.receiveSnapshot === 'function') bridge.receiveSnapshot(UTF8ToString(pointer));
  }
});
