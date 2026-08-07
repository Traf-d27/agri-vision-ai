import React from 'react';
import IndiaIntelView from './IndiaIntelView';

export default function GeoIntelligenceView({ initialTabMode = 'regional_forecast' }) {
  return <IndiaIntelView initialMode={initialTabMode} />;
}
