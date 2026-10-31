mergeInto(LibraryManager.library, {
  SDPublishSnapshot: function (pointer) {
    if (window.__SPACE_DRAGON_UNITY__) {
      window.__SPACE_DRAGON_UNITY__.latestSnapshot = JSON.parse(UTF8ToString(pointer));
    }
  }
});
