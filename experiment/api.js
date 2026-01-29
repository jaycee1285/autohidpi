"use strict";

/* global ExtensionAPI, Services */

this.prefs = class extends ExtensionAPI {
  getAPI(context) {
    return {
      prefs: {
        async get(name) {
          try {
            return Services.prefs.getStringPref(name);
          } catch (e) {
            return null;
          }
        },
        async set(name, value) {
          Services.prefs.setStringPref(name, value);
        }
      }
    };
  }
};
