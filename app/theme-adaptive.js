// --- РђР”РђРџРўРР’РќР«Р™ РњР•РќР•Р”Р–Р•Р  РўР•Рњ ---
const AdaptiveThemeManager = {
  getLib() {
    return window.materialColorUtilities || null;
  },

  async generateThemeFromWallpaper(imageSrc, isDark = null) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 50;
          canvas.height = 50;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 50, 50);

          const imgData = ctx.getImageData(0, 0, 50, 50).data;
          let r = 0, g = 0, b = 0, count = 0;
          const pixels = [];
          
          for (let i = 0; i < imgData.length; i += 4) {
            const alpha = imgData[i + 3];
            if (alpha > 150) {
              const pr = imgData[i];
              const pg = imgData[i + 1];
              const pb = imgData[i + 2];
              
              r += pr;
              g += pg;
              b += pb;
              count++;

              // РЎРѕР·РґР°РµРј ARGB РёР· РїРёРєСЃРµР»СЏ РґР»СЏ РєРІР°РЅС‚РёР·Р°С‚РѕСЂР° (Celebrity Quantizer)
              if (alpha >= 255) {
                const argb = ((255 << 24) | (pr << 16) | (pg << 8) | pb) >>> 0;
                pixels.push(argb);
              }
            }
          }
          
          const avgR = count > 0 ? Math.round(r / count) : 128;
          const avgG = count > 0 ? Math.round(g / count) : 128;
          const avgB = count > 0 ? Math.round(b / count) : 128;
          
          const luminance = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
          const themeMode = isDark !== null ? isDark : (luminance < 140);

          const lib = this.getLib();
          let sourceColorArgb;

          if (lib && lib.QuantizerCelebi && lib.Score) {
            // РљРІР°РЅС‚РёР·РёСЂСѓРµРј РїРёРєСЃРµР»Рё Рё РІС‹Р±РёСЂР°РµРј Р»СѓС‡С€РёР№ С†РІРµС‚
            const quantized = lib.QuantizerCelebi.quantize(pixels, 128);
            const scored = lib.Score.score(quantized);
            if (scored && scored.length > 0) {
              sourceColorArgb = scored[0];
            } else {
              sourceColorArgb = ((255 << 24) | (avgR << 16) | (avgG << 8) | avgB) >>> 0;
            }
          } else {
            sourceColorArgb = ((255 << 24) | (avgR << 16) | (avgG << 8) | avgB) >>> 0;
          }

          const themeData = this.buildScheme(sourceColorArgb, themeMode);
          resolve(themeData);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = (err) => {
        reject(new Error("Не удалось загрузить изображение: " + err));
      };

      img.src = imageSrc;
    });
  },

  buildScheme(sourceColorArgb, isDark) {
    const lib = this.getLib();

    if (!lib) {
      return this.getFallbackTheme(isDark);
    }

    const theme = lib.themeFromSourceColor(sourceColorArgb);
    const scheme = isDark ? theme.schemes.dark : theme.schemes.light;

    return {
      isDark: isDark,
      sourceColor: this.argbToHex(sourceColorArgb),
      primary: this.argbToHex(scheme.primary),
      primaryRgb: this.argbToRgbComponents(scheme.primary),
      onPrimary: this.argbToHex(scheme.onPrimary),
      secondary: this.argbToHex(scheme.secondary),
      secondaryRgb: this.argbToRgbComponents(scheme.secondary),
      onSecondary: this.argbToHex(scheme.onSecondary),
      surface: this.argbToHex(scheme.surface),
      surfaceRgb: this.argbToRgbComponents(scheme.surface),
      onSurface: this.argbToHex(scheme.onSurface),
      onSurfaceRgb: this.argbToRgbComponents(scheme.onSurface),
      outline: this.argbToHex(scheme.outline),
      outlineRgb: this.argbToRgbComponents(scheme.outline)
    };
  },

  applyThemeToCss(themeData) {
    const root = document.documentElement;
    
    root.style.setProperty('--adapt-primary', themeData.primary);
    root.style.setProperty('--adapt-primary-rgb', themeData.primaryRgb);
    root.style.setProperty('--adapt-on-primary', themeData.onPrimary);
    
    root.style.setProperty('--adapt-secondary', themeData.secondary);
    root.style.setProperty('--adapt-secondary-rgb', themeData.secondaryRgb);
    root.style.setProperty('--adapt-on-secondary', themeData.onSecondary);
    
    root.style.setProperty('--adapt-surface', themeData.surface);
    root.style.setProperty('--adapt-surface-rgb', themeData.surfaceRgb);
    root.style.setProperty('--adapt-on-surface', themeData.onSurface);
    root.style.setProperty('--adapt-on-surface-rgb', themeData.onSurfaceRgb);
    
    root.style.setProperty('--adapt-outline', themeData.outline);
    root.style.setProperty('--adapt-outline-rgb', themeData.outlineRgb);

    if (themeData.isDark) {
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
    }
  },

  argbToHex(argb) {
    const r = (argb >> 16) & 255;
    const g = (argb >> 8) & 255;
    const b = argb & 255;
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  },

  argbToRgbComponents(argb) {
    const r = (argb >> 16) & 255;
    const g = (argb >> 8) & 255;
    const b = argb & 255;
    return `${r}, ${g}, ${b}`;
  },

  getFallbackTheme(isDark) {
    return isDark ? {
      isDark: true,
      primary: '#ffffff',
      primaryRgb: '255, 255, 255',
      onPrimary: '#000000',
      secondary: '#aaaaaa',
      secondaryRgb: '170, 170, 170',
      onSecondary: '#ffffff',
      surface: '#121212',
      surfaceRgb: '18, 18, 18',
      onSurface: '#e0e0e0',
      onSurfaceRgb: '224, 224, 224',
      outline: '#333333',
      outlineRgb: '51, 51, 51'
    } : {
      isDark: false,
      primary: '#000000',
      primaryRgb: '0, 0, 0',
      onPrimary: '#ffffff',
      secondary: '#555555',
      secondaryRgb: '85, 85, 85',
      onSecondary: '#000000',
      surface: '#f5f5f7',
      surfaceRgb: '245, 245, 247',
      onSurface: '#1d1d1f',
      onSurfaceRgb: '29, 29, 31',
      outline: '#e2e2e7',
      outlineRgb: '226, 226, 231'
    };
  }
};

