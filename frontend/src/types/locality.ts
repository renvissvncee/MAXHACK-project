export interface Locality {
  id: string;
  name: string;
  type: string;
  typeShort: string;
  region: string;
  district: string | null;
  shortLabel: string;
  fullLabel: string;
}
