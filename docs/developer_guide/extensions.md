# Extensions

The extension system allows developers to create custom view components that combine Python data handling with custom JavaScript rendering logic. Extensions enable the creation of specialized visualizations that can use external JavaScript libraries or custom rendering code.

## Creating an Extension

An extension consists of two main parts:

1. A Python extension definition that provides the JavaScript code and configuration
2. A Python view class that uses the extension

### Extension Definition

```python
from figpack import FigpackExtension

my_extension = FigpackExtension(
    name="my-extension",
    javascript_code="""
    // Extension JavaScript code here
    (function() {
        window.figpackExtensions = window.figpackExtensions || {};

        window.figpackExtensions['my-extension'] = {
            render: function(a) {
              const {container, zarrGroup, width, height, onResize, contexts} = a;
                // Implement rendering logic here
            }
        };
    })();
    """,
    version="1.0.0"
)
```

### Extension View

```python
from figpack import ExtensionView

class MyCustomView(ExtensionView):
    def __init__(self, *, some_data=None):
        super().__init__(extension=extension, view_type="my_extension.MyCustomView")
        self.some_data = some_data

    def _write_to_zarr_group(self, group):
        super()._write_to_zarr_group(group)  # Sets extension metadata
        # Add custom data
        group.create_dataset("some_data", data=self.some_data)
```

## Using Additional JavaScript Files

Extensions can load additional JavaScript files to modularize code or include external libraries. This is done by providing the files in the extension definition:

```python
my_extension = FigpackExtension(
    name="advanced-extension",
    javascript_code=main_js_code,  # Main extension code
    additional_files={
        "utils.js": utils_js_code,  # Utility functions
        "rendering.js": rendering_js_code,  # Rendering logic
        "lib/d3.min.js": d3_code,  # External library
    },
    version="1.0.0"
)
```

The files will be made available to the extension.

## Extension API Reference

### Python API

#### FigpackExtension

```python
class FigpackExtension:
    def __init__(
        self,
        *,
        name: str,              # Unique name for the extension
        javascript_code: str,   # Main JavaScript code
        additional_files: Optional[Dict[str, str]] = None,  # Additional JS files
        version: str = "1.0.0"  # Version string
    )
```

#### ExtensionView

```python
class ExtensionView(FigpackView):
    def __init__(self, *, extension_name: str)
    def _write_to_zarr_group(self, group: figpack.Group) -> None
```

### JavaScript API

#### Extension Registration

Extensions must register themselves in the `window.figpackExtensions` object:

```javascript
window.figpackExtensions["extension-name"] = {
  render: function (a) {
    const { 
      container, // HTMLElement to render into
      zarrGroup, // Zarr group containing data
      width, // Container width
      height, // Container height
      onResize, // Function to register resize callback
      contexts, // Contexts object
    } = a;

    // Return optional instance object
    return {
      destroy: function () {
        // Cleanup code
      },
    };
  },
};
```

#### Utils Object

The `utils` object provided to the render function contains:

```typescript
interface ExtensionUtils {
  // Load additional JavaScript files
  loadScript: (filename: string) => Promise<void>;

  // Base URL for loading files
  figureUrl: string;
}
```

## Examples

### Simple Hello World Extension

See `examples/extensions/hello_world_extension.py` for a basic example that shows:

- Basic extension setup
- Simple rendering with SVG
- Basic data passing through zarr attributes

### Advanced Chart Extension

See `examples/extensions/advanced_chart_extension.py` for a more complex example that demonstrates:

- Using multiple JavaScript files
- Loading utilities and helper functions
- Animated rendering
- Complex data visualization
- Error handling
- Responsive design
