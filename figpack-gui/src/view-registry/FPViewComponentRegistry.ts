import { FPViewComponent } from "@figpack/plugin-sdk";

class FPViewComponentRegistry {
  private viewComponents = new Map<string, FPViewComponent>();

  registerViewComponent(viewComponent: FPViewComponent) {
    this.viewComponents.set(viewComponent.type, viewComponent);
  }

  get(type: string) {
    return this.viewComponents.get(type);
  }

  // Add method to check if a type exists
  hasType(type: string): boolean {
    return this.viewComponents.has(type);
  }

  // Add method to get all registered types
  getRegisteredTypes(): string[] {
    return Array.from(this.viewComponents.keys());
  }
}

// Export a singleton instance
export const viewComponentRegistry = new FPViewComponentRegistry();
