# Figure GUI

This document details the implementation of figpack's figure GUI component and how to extend it with new view types.

## Role in the Figpack Ecosystem

The figpack-figure component is the React-based web application that renders interactive figures in the browser. It serves as the data visualization engine for the figpack system:

- **Build Integration**: The GUI is built from TypeScript/React source code into compiled static assets
- **Python Package Inclusion**: These compiled assets are bundled into the Python figpack package
- **Figure Deployment**: When Python code creates a figure using `show()`, the compiled GUI assets are copied into the figure directory alongside the Zarr data
- **Self-Contained Figures**: Each figure becomes a complete, portable web application containing both the rendering logic and data

This architecture enables figpack's core feature: **self-contained HTML bundles** that can be shared, archived, and viewed without requiring a figpack installation.

## Architecture Overview

The figpack-figure GUI is built on three key architectural principles:

### Plugin-Based View System

- **Extensible**: New view types can be added through plugins without modifying core code
- **Modular**: Each view type is implemented as a separate React component
- **Registered**: Plugins register their view components with a central registry

### Remote Zarr Data Access

- **Efficient Loading**: Data is loaded on-demand from Zarr arrays using chunk-based access
- **Large Dataset Support**: For some view components, hierarchical downsampling enables smooth interaction with large datasets
- **Standardized Interface**: All view components access data through consistent Zarr interfaces

### React Component Architecture

- **Component Props**: Views receive `zarrGroup`, `width`, `height`, and `FPView` props (FPView allows nested views)
- **State Management**: Shared state (time ranges, selections) coordinated through React contexts
- **Responsive**: Dynamic sizing and layout adaptation

## Package Structure

The figpack-figure codebase uses a monorepo workspace structure with multiple interconnected packages:

```
figpack-figure/
├── src/                          # Main application code
├── packages/
│   ├── figpack-plugin-sdk/       # Core interfaces and types
│   ├── figpack-main-plugin/      # Standard view components
│   ├── figpack-spike-sorting-plugin/  # Neurophysiology views
│   └── figpack-franklab-plugin/  # Lab-specific extensions
```

### Package Roles

- **figpack-plugin-sdk**: Defines core interfaces (`FPPlugin`, `FPViewComponent`, `FPViewComponentProps`) and Zarr types
- **figpack-main-plugin**: Implements standard views (TimeseriesGraph, Image, Markdown, layouts)
- **figpack-spike-sorting-plugin**: Provides neurophysiology-specific visualizations
- **figpack-franklab-plugin**: Contains lab-specific view components
- **Main application**: Orchestrates plugin loading, data access, and rendering

### Build Dependencies

The build system compiles packages in dependency order:

1. **plugin-sdk** builds first (provides interfaces)
2. **Plugin packages** build next (depend on SDK)
3. **Main application** builds last (depends on all plugins)

## Plugin System

### Core Plugin Interface

Plugins implement the `FPPlugin` interface:

```typescript
interface FPPlugin {
  registerViewComponents: (registry: FPViewComponentRegistry) => void;
  provideAppContexts?: (node: React.ReactNode) => React.ReactNode;
}
```

### View Component Structure

Each view component implements `FPViewComponent`:

```typescript
interface FPViewComponent {
  type: string; // Matches Python view_type
  component: React.ComponentType<FPViewComponentProps>;
}

interface FPViewComponentProps {
  zarrGroup: ZarrGroup; // Root data access
  width: number; // Available width
  height: number; // Available height
  FPView: React.ComponentType; // For rendering nested views
}
```

### Registration Process

Plugins register their view components during application startup:

```typescript
// In plugin index file
const registerViewComponents = (registry: FPViewComponentRegistry) => {
  registry.registerViewComponent({
    type: "MyCustomView",
    component: MyCustomViewComponent,
  });
};

export default { registerViewComponents };
```

## Creating View Components

### Basic Component Structure

```typescript
import { FPViewComponentProps } from "@figpack/plugin-sdk";

export const MyViewComponent: React.FC<FPViewComponentProps> = ({
  zarrGroup,
  width,
  height,
}) => {
  // Access view-specific attributes
  const title = zarrGroup.attrs.title;

  // Load data from Zarr datasets
  // (see existing implementations for patterns)

  return <div style={{ width, height }}>{/* Your view implementation */}</div>;
};
```

### Data Access Patterns

View components access data through the `zarrGroup` prop:

- **Attributes**: `zarrGroup.attrs` contains view configuration
- **Datasets**: Use `zarrGroup.getDataset(path)` and `getDatasetData()` to access data arrays
- **Nested Groups**: Use `zarrGroup.getGroup(path)` for hierarchical data

### Common Patterns

Study existing view implementations for data loading patterns. For example:

- **TimeseriesGraph**: Efficient line series rendering with downsampling
- **MultiChannelTimeseries**: Large multi-channel data with virtual scrolling
- **Image**: Binary data loading and display
- **Box/Splitter**: Layout composition with nested views

## Development Workflow

### Setup

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Start development server
npm run dev
```

### Development Commands

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build all packages for production
- `npm run clean`: Clean all build artifacts
- `npm run format:all`: Format code with Prettier

### Adding New Plugins

You can either add views to existing plugins or create new plugin packages. To create a new plugin:

1. **Create Package**: Add new package directory under `packages/`
2. **Implement Plugin**: Create plugin following the `FPPlugin` interface
3. **Register Plugin**: Add to plugin list in `src/main.tsx`
4. **Update Build**: Add build commands to root `package.json`

### Testing Integration

- **Local Development**: Use `npm run dev` to test changes with hot reload
- **Build Verification**: Run `npm run build` to ensure production builds work
- **Python Integration**: Test with Python figpack package to verify end-to-end workflow (use \_dev=True in `show()`)

## Key Files for Learning

### Essential Reading

- `packages/figpack-plugin-sdk/src/plugin-interface/FPPluginInterface.ts`: Core interfaces
- `packages/figpack-main-plugin/src/index.tsx`: Plugin registration example
- `src/main.tsx`: Plugin loading and application setup
- `src/App.tsx`: Main application structure

### Example Implementations

- `packages/figpack-main-plugin/src/views/FPTimeseriesGraph.tsx`: Data visualization
- `packages/figpack-main-plugin/src/views/FPBox.tsx`: Layout composition
- `packages/figpack-main-plugin/src/views/FPImage.tsx`: Binary data handling
