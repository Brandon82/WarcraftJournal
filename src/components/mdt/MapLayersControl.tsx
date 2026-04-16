import { useEffect, useMemo, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MapLayers } from './mapLayers';

interface Props {
  layers: MapLayers;
  onChange: (next: MapLayers) => void;
}

/** Custom Leaflet control rendered as an HTML panel in the top-right. Mounted
 *  imperatively so it sits inside the Leaflet control hierarchy (and inherits
 *  pointer-event handling) instead of being a sibling overlay. */
export default function MapLayersControl({ layers, onChange }: Props) {
  const map = useMap();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keep the latest onChange in a ref so the imperative event handler doesn't
  // need to be torn down and re-attached on every render.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Mount the control container once. We rebuild its inner HTML each time
  // `layers` changes (in the second effect below).
  useEffect(() => {
    const Control = L.Control.extend({
      onAdd() {
        const div = L.DomUtil.create('div', 'mdt-layer-control');
        // Stop map drag/zoom from firing through the control panel.
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        containerRef.current = div;
        return div;
      },
    });
    const control = new Control({ position: 'bottomright' });
    control.addTo(map);
    return () => {
      control.remove();
      containerRef.current = null;
    };
  }, [map]);

  // Render the checkbox markup imperatively whenever `layers` updates.
  // Cheap because we only have 5 toggles and re-paints on user click.
  const labels = useMemo(
    () => [
      { key: 'outlines', label: 'Pull outlines' },
      { key: 'labels', label: 'Pull labels' },
      { key: 'lines', label: 'Pull lines' },
      { key: 'patrols', label: 'Patrol paths' },
      { key: 'trash', label: 'Non-pull trash' },
    ] as const,
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = `
      <h5>Layers</h5>
      ${labels
        .map(
          ({ key, label }) => `
            <label>
              <input type="checkbox" data-layer="${key}" ${layers[key] ? 'checked' : ''} />
              <span>${label}</span>
            </label>
          `,
        )
        .join('')}
    `;
    function handle(e: Event) {
      const target = e.target as HTMLInputElement;
      const key = target.dataset.layer as keyof MapLayers | undefined;
      if (!key) return;
      onChangeRef.current({ ...layers, [key]: target.checked });
    }
    container.addEventListener('change', handle);
    return () => container.removeEventListener('change', handle);
  }, [layers, labels]);

  return null;
}
