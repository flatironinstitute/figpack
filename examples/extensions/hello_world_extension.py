"""
Simple Hello World extension example
"""

import figpack
from figpack import FigpackExtension, ExtensionView


# Define a simple hello world extension
hello_extension = FigpackExtension(
    name="hello-world",
    javascript_code="""
// Hello World Extension
(function() {
    window.figpackExtensions = window.figpackExtensions || {};
    
    window.figpackExtensions['hello-world'] = {
        render: function(a) {
            const { container, zarrGroup, width, height, onResize } = a;
            // Clear container
            container.innerHTML = '';
            
            // Create a simple div with hello world message
            const div = document.createElement('div');
            div.style.width = width + 'px';
            div.style.height = height + 'px';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'center';
            div.style.backgroundColor = '#e3f2fd';
            div.style.border = '2px solid #2196f3';
            div.style.borderRadius = '8px';
            div.style.fontFamily = 'Arial, sans-serif';
            div.style.fontSize = '18px';
            div.style.color = '#1976d2';
            
            // Get custom message from zarr attributes
            const message = zarrGroup.attrs.message || 'Hello from Extension!';
            const color = zarrGroup.attrs.color || '#1976d2';
            
            div.textContent = message;
            div.style.color = color;
            
            container.appendChild(div);
            
            // Register resize callback
            onResize(function(newWidth, newHeight) {
                div.style.width = newWidth + 'px';
                div.style.height = newHeight + 'px';
            });
            
            // Return instance with destroy method
            return {
                destroy: function() {
                    console.log('Hello World extension destroyed');
                }
            };
        }
    };
})();
""",
    version="1.0.0",
)


class HelloWorldView(ExtensionView):
    """
    A simple hello world view that uses the hello-world extension
    """

    def __init__(self, *, message="Hello from Extension!", color="#1976d2"):
        super().__init__(
            extension=hello_extension, view_type="hello-world.HelloWorldView"
        )
        self.message = message
        self.color = color

    def _write_to_zarr_group(self, group):
        # Call parent to set extension metadata
        super()._write_to_zarr_group(group)

        # Add our custom attributes
        group.attrs["message"] = self.message
        group.attrs["color"] = self.color


if __name__ == "__main__":
    # Create the view
    view = HelloWorldView(message="Hello from the Extension System!", color="#e91e63")

    # Show the figure
    view.show(title="Hello World Extension Demo", open_in_browser=True)
