// region.config.js — edit this file to change the map region and search area.
// Used by both the frontend (map views) and backend (geocode search constraints).

export const REGION = {
  // Map default center [latitude, longitude] — shown before any participants set locations
  center: [47.4979, 19.0402], // Budapest, Hungary

  // Default zoom levels
  groupMapZoom: 10, // admin/participant group overview map
  locationMapZoom: 13, // participant location picker map

  // Nominatim geocode search constraints
  geocode: {
    // viewbox: [lon_west, lat_north, lon_east, lat_south] — Budapest close agglomeration
    viewbox: [18.75, 47.75, 19.55, 47.25],
    bounded: 1, // restrict results to viewbox
    countrycodes: 'hu',
  },
};
