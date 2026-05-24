import React from 'react';
import MapboxGL from '@rnmapbox/maps';
import { PulsePoint } from '../hooks/usePulseZones';

interface Props {
  points: PulsePoint[];
}

export default function PulseLayer({ points }: Props) {
  if (points.length === 0) return null;

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { weight: p.weight },
    })),
  };

  return (
    <MapboxGL.ShapeSource id="pulse-source" shape={geojson}>
      <MapboxGL.HeatmapLayer
        id="pulse-heat"
        sourceID="pulse-source"
        style={{
          heatmapWeight: ['get', 'weight'],
          heatmapRadius: ['interpolate', ['linear'], ['zoom'], 11, 18, 13, 28, 15, 50],
          heatmapOpacity: ['interpolate', ['linear'], ['zoom'], 11, 0.85, 15, 0.55],
          heatmapIntensity: ['interpolate', ['linear'], ['zoom'], 11, 2, 15, 3.5],
          heatmapColor: [
            'interpolate', ['linear'], ['heatmap-density'],
            0,    'rgba(0,0,0,0)',
            0.15, 'rgba(60,0,120,0.25)',
            0.35, 'rgba(100,20,180,0.55)',
            0.55, 'rgba(150,60,230,0.75)',
            0.75, 'rgba(199,125,255,0.9)',
            1.0,  'rgba(230,190,255,1)',
          ],
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
