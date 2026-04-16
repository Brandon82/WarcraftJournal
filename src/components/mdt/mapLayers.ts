/** Layer toggle state for the dungeon map. Lives in its own module so the
 *  component file can comply with `react-refresh/only-export-components`. */
export interface MapLayers {
  outlines: boolean;
  labels: boolean;
  lines: boolean;
  patrols: boolean;
  trash: boolean;
}

export const DEFAULT_LAYERS: MapLayers = {
  outlines: true,
  labels: true,
  lines: true,
  patrols: false,
  trash: true,
};
