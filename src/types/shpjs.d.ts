declare module "shpjs" {
  interface ShpFeature {
    type: string;
    geometry: {
      type: string;
      coordinates: unknown;
    };
    properties: Record<string, unknown>;
  }

  interface ShpResult {
    type: "FeatureCollection";
    features: ShpFeature[];
  }

  function shp(input: ArrayBuffer | string): Promise<ShpResult | ShpResult[]>;
  
  export = shp;
}