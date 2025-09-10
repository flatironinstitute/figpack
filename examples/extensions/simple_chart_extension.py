"""
Example extension that creates a simple chart using SVG
"""

import numpy as np
from figpack import FigpackExtension, ExtensionView


# Define the extension with JavaScript code
simple_chart_extension = FigpackExtension(
    name="simple-chart",
    javascript_code="""
// Simple Chart Extension using SVG
(function() {
    // Ensure figpackExtensions namespace exists
    window.figpackExtensions = window.figpackExtensions || {};
    
    // Define the extension
    window.figpackExtensions['simple-chart'] = {
        render: function(a) {
            const { container, zarrGroup, width, height, onResize } = a;

            // Clear container
            container.innerHTML = '';
            
            // Create SVG
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', width);
            svg.setAttribute('height', height);
            svg.style.border = '1px solid #ccc';
            svg.style.backgroundColor = 'white';
            container.appendChild(svg);
            
            // Get data from zarr group
            const title = zarrGroup.attrs.title || 'Simple Chart';
            const color = zarrGroup.attrs.color || 'steelblue';
            
            // Add title
            const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            titleElement.setAttribute('x', width / 2);
            titleElement.setAttribute('y', 30);
            titleElement.setAttribute('text-anchor', 'middle');
            titleElement.setAttribute('font-family', 'Arial, sans-serif');
            titleElement.setAttribute('font-size', '16');
            titleElement.setAttribute('font-weight', 'bold');
            titleElement.textContent = title;
            svg.appendChild(titleElement);
            
            // Load and render data if available
            this.loadAndRenderData(svg, zarrGroup, width, height, color);
            
            // Register resize callback
            onResize(function(newWidth, newHeight) {
                svg.setAttribute('width', newWidth);
                svg.setAttribute('height', newHeight);
                // Re-render with new dimensions
                svg.innerHTML = '';
                
                // Re-add title
                const newTitleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                newTitleElement.setAttribute('x', newWidth / 2);
                newTitleElement.setAttribute('y', 30);
                newTitleElement.setAttribute('text-anchor', 'middle');
                newTitleElement.setAttribute('font-family', 'Arial, sans-serif');
                newTitleElement.setAttribute('font-size', '16');
                newTitleElement.setAttribute('font-weight', 'bold');
                newTitleElement.textContent = title;
                svg.appendChild(newTitleElement);
                
                // Re-render data
                window.figpackExtensions['simple-chart'].loadAndRenderData(svg, zarrGroup, newWidth, newHeight, color);
            });
            
            return {
                destroy: function() {
                    console.log('Simple chart extension destroyed');
                }
            };
        },
        
        loadAndRenderData: async function(svg, zarrGroup, width, height, color) {
            try {
                // Try to load x and y data
                const xData = await zarrGroup.getDatasetData("x", {});
                const yData = await zarrGroup.getDatasetData("y", {});

                if (xData && yData && xData.length === yData.length) {
                    this.renderLineChart(svg, xData, yData, width, height, color);
                } else {
                    this.renderPlaceholder(svg, width, height);
                }
            } catch (error) {
                console.warn('Could not load chart data:', error);
                this.renderPlaceholder(svg, width, height);
            }
        },
        
        renderLineChart: function(svg, xData, yData, width, height, color) {
            const margin = { top: 50, right: 30, bottom: 40, left: 60 };
            const chartWidth = width - margin.left - margin.right;
            const chartHeight = height - margin.top - margin.bottom;
            
            if (chartWidth <= 0 || chartHeight <= 0) {
                this.renderPlaceholder(svg, width, height);
                return;
            }
            
            // Find data ranges
            const xMin = Math.min(...xData);
            const xMax = Math.max(...xData);
            const yMin = Math.min(...yData);
            const yMax = Math.max(...yData);
            
            // Create scales
            const xScale = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * chartWidth;
            const yScale = (y) => margin.top + chartHeight - ((y - yMin) / (yMax - yMin)) * chartHeight;
            
            // Create path for line
            let pathData = '';
            for (let i = 0; i < xData.length; i++) {
                const x = xScale(xData[i]);
                const y = yScale(yData[i]);
                if (i === 0) {
                    pathData += `M ${x} ${y}`;
                } else {
                    pathData += ` L ${x} ${y}`;
                }
            }
            
            // Add the line path
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathData);
            path.setAttribute('stroke', color);
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            svg.appendChild(path);
            
            // Add axes
            this.addAxes(svg, margin, chartWidth, chartHeight, xMin, xMax, yMin, yMax);
        },
        
        addAxes: function(svg, margin, chartWidth, chartHeight, xMin, xMax, yMin, yMax) {
            // X axis
            const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            xAxis.setAttribute('x1', margin.left);
            xAxis.setAttribute('y1', margin.top + chartHeight);
            xAxis.setAttribute('x2', margin.left + chartWidth);
            xAxis.setAttribute('y2', margin.top + chartHeight);
            xAxis.setAttribute('stroke', 'black');
            svg.appendChild(xAxis);
            
            // Y axis
            const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            yAxis.setAttribute('x1', margin.left);
            yAxis.setAttribute('y1', margin.top);
            yAxis.setAttribute('x2', margin.left);
            yAxis.setAttribute('y2', margin.top + chartHeight);
            yAxis.setAttribute('stroke', 'black');
            svg.appendChild(yAxis);
            
            // Add some tick labels
            const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            xLabel.setAttribute('x', margin.left + chartWidth / 2);
            xLabel.setAttribute('y', margin.top + chartHeight + 30);
            xLabel.setAttribute('text-anchor', 'middle');
            xLabel.setAttribute('font-family', 'Arial, sans-serif');
            xLabel.setAttribute('font-size', '12');
            xLabel.textContent = `X: ${xMin.toFixed(1)} - ${xMax.toFixed(1)}`;
            svg.appendChild(xLabel);
            
            const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            yLabel.setAttribute('x', 20);
            yLabel.setAttribute('y', margin.top + chartHeight / 2);
            yLabel.setAttribute('text-anchor', 'middle');
            yLabel.setAttribute('font-family', 'Arial, sans-serif');
            yLabel.setAttribute('font-size', '12');
            yLabel.setAttribute('transform', `rotate(-90, 20, ${margin.top + chartHeight / 2})`);
            yLabel.textContent = `Y: ${yMin.toFixed(1)} - ${yMax.toFixed(1)}`;
            svg.appendChild(yLabel);
        },
        
        renderPlaceholder: function(svg, width, height) {
            // Add placeholder content
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', 50);
            rect.setAttribute('y', 50);
            rect.setAttribute('width', Math.max(0, width - 100));
            rect.setAttribute('height', Math.max(0, height - 100));
            rect.setAttribute('fill', '#f0f0f0');
            rect.setAttribute('stroke', '#ccc');
            rect.setAttribute('stroke-dasharray', '5,5');
            svg.appendChild(rect);
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', width / 2);
            text.setAttribute('y', height / 2);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-family', 'Arial, sans-serif');
            text.setAttribute('font-size', '14');
            text.setAttribute('fill', '#666');
            text.textContent = 'Simple Chart Extension';
            svg.appendChild(text);
        }
    };
})();
""",
    version="1.0.0",
)


class SimpleChartView(ExtensionView):
    """
    A simple chart view that uses the simple-chart extension
    """

    def __init__(
        self, *, x_data=None, y_data=None, title="Simple Chart", color="steelblue"
    ):
        super().__init__(
            extension=simple_chart_extension, view_type="simple-chart.SimpleChartView"
        )
        self.x_data = x_data
        self.y_data = y_data
        self.title = title
        self.color = color

    def _write_to_zarr_group(self, group):
        # Call parent to set extension metadata
        super()._write_to_zarr_group(group)

        # Add our custom attributes
        group.attrs["title"] = self.title
        group.attrs["color"] = self.color

        # Add data if provided
        if self.x_data is not None:
            group.create_dataset("x", data=np.array(self.x_data, dtype=np.float32))
        if self.y_data is not None:
            group.create_dataset("y", data=np.array(self.y_data, dtype=np.float32))


if __name__ == "__main__":
    # Create some sample data
    x = np.linspace(0, 10, 100)
    y = np.sin(x) * np.exp(-x / 5)

    # Create the view
    view = SimpleChartView(x_data=x, y_data=y, title="Damped Sine Wave", color="red")

    # Show the figure
    view.show(title="Extension System Demo", open_in_browser=True)
