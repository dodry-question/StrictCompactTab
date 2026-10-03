window.storage = {
  get: (keys, callback) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(keys, callback);
    } else {
      const result = {};
      const isArray = Array.isArray(keys);
      const queryKeys = isArray ? keys : [keys];

      queryKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            result[key] = JSON.parse(value);
          } catch (e) {
            result[key] = value;
          }
        } else {
          result[key] = null;
        }
      });
      callback(isArray ? result : result[keys]);
    }
  },
  set: (data, callback) => {
    if (data && Object.prototype.hasOwnProperty.call(data, 'customFavicon')) {
      if (data.customFavicon === null) {
        localStorage.removeItem('customFavicon');
      } else {
        const favVal = data.customFavicon;
        localStorage.setItem('customFavicon', (typeof favVal === 'object' && favVal !== null) ? JSON.stringify(favVal) : favVal);
      }
    }
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(data, callback);
    } else {
      Object.keys(data).forEach(key => {
        const val = data[key];
        if (val === null || val === undefined) {
          localStorage.removeItem(key);
        } else if (typeof val === 'object' && val !== null) {
          localStorage.setItem(key, JSON.stringify(val));
        } else {
          localStorage.setItem(key, val);
        }
      });
      if (callback) callback();
    }
  },
  getAll: (callback) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(null, callback);
    } else {
      const result = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
          result[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          result[key] = localStorage.getItem(key);
        }
      }
      callback(result);
    }
  },
  clearAndSet: (data, callback) => {
    if (data && Object.prototype.hasOwnProperty.call(data, 'customFavicon')) {
      if (data.customFavicon === null) {
        localStorage.removeItem('customFavicon');
      } else {
        const favVal = data.customFavicon;
        localStorage.setItem('customFavicon', (typeof favVal === 'object' && favVal !== null) ? JSON.stringify(favVal) : favVal);
      }
    } else {
      localStorage.removeItem('customFavicon');
    }
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.clear(() => {
        chrome.storage.local.set(data, callback);
      });
    } else {
      localStorage.clear();
      Object.keys(data).forEach(key => {
        const val = data[key];
        if (val === null || val === undefined) {
          localStorage.removeItem(key);
        } else if (typeof val === 'object' && val !== null) {
          localStorage.setItem(key, JSON.stringify(val));
        } else {
          localStorage.setItem(key, val);
        }
      });
      if (callback) callback();
    }
  }
};
