const ShortcutLayout = {
  getGridMetrics(count, size, configuredColumns, viewportWidth) {
    let itemWidth = 85;
    if (size === 'medium') itemWidth = 98;
    if (size === 'large') itemWidth = 110;

    const gap = 12;
    const padding = 24;
    const maxColumns = Math.max(1, parseInt(configuredColumns, 10) || 6);
    let columns = Math.max(1, Math.min(count || 1, maxColumns));

    let maxWidth = (itemWidth * columns) + (gap * (columns - 1)) + padding + 8;
    maxWidth = Math.min(maxWidth, viewportWidth - 96);
    const perRow = Math.max(1, Math.min(columns, Math.floor((maxWidth - padding + gap) / (itemWidth + gap))));
    columns = perRow;
    maxWidth = Math.max(itemWidth + padding + 8, maxWidth);

    return { itemWidth, gap, padding, columns, maxWidth, perRow };
  }
};

// Мост для классических app/* — уберём в фазе 3 шага «в».
window.ShortcutLayout = ShortcutLayout;
export { ShortcutLayout };
