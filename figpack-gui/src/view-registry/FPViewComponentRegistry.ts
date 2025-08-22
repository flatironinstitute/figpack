import { FPViewComponent } from "./types";

class FPViewComponentRegistry {
  private plugins = new Map<string, FPViewComponent>();

  register(plugin: FPViewComponent) {
    this.plugins.set(plugin.type, plugin);
  }

  get(type: string) {
    return this.plugins.get(type);
  }

  // Add method to check if a type exists
  hasType(type: string): boolean {
    return this.plugins.has(type);
  }

  // Add method to get all registered types
  getRegisteredTypes(): string[] {
    return Array.from(this.plugins.keys());
  }
}

// Export a singleton instance
export const viewComponentRegistry = new FPViewComponentRegistry();
