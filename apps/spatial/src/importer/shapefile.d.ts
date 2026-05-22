declare module 'shapefile' {
  export interface ShapeReader {
    read(): Promise<{ done: boolean; value: unknown }>;
    close(): Promise<void>;
  }
  export function open(filename: string): Promise<ShapeReader>;
}
