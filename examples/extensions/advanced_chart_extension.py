"""
Advanced chart extension example with multiple javascript files
"""

import numpy as np
from figpack import FigpackExtension, ExtensionView

# Simple chart utility functions
chart_utils_js = """
window.ChartUtils = {
    createSVG: function(container, width, height) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.style.border = '1px solid #eee';
        svg.style.backgroundColor = 'white';
        container.appendChild(svg);
        return svg;
    },
    createScale: function(domain, range) {
        return function(value) {
            const ratio = (value - domain[0]) / (domain[1] - domain[0]);
            return range[0] + ratio * (range[1] - range[0]);
        };
    }
};
"""

# Main extension code with simplified structure
main_extension_js = """
(function() {
    window.figpackExtensions = window.figpackExtensions || {};
    
    window.figpackExtensions['advanced-chart'] = {
        render: async function(a) {
            const { container, zarrGroup, width, height, onResize } = a;
            container.innerHTML = '';
            
            try {
                const svg = window.ChartUtils.createSVG(container, width, height);
                await this.renderChart(svg, zarrGroup, width, height);
                
                onResize((newWidth, newHeight) => {
                    svg.setAttribute('width', newWidth);
                    svg.setAttribute('height', newHeight);
                    svg.innerHTML = '';
                    this.renderChart(svg, zarrGroup, newWidth, newHeight);
                });
            } catch (error) {
                console.error('Error:', error);
                container.innerHTML = '<div style="color: #666; padding: 20px;">Unable to render chart</div>';
            }
            
            return { destroy: () => {} };
        },
        
        renderChart: async function(svg, zarrGroup, width, height) {
            try {
                const xData = await zarrGroup.getDatasetData("x", {});
                const yData = await zarrGroup.getDatasetData("y", {});
                
                if (!xData || !yData || xData.length !== yData.length) {
                    this.renderPlaceholder(svg, width, height);
                    return;
                }
                
                const margin = { top: 40, right: 30, bottom: 40, left: 50 };
                const chartWidth = width - margin.left - margin.right;
                const chartHeight = height - margin.top - margin.bottom;
                
                if (chartWidth <= 0 || chartHeight <= 0) {
                    this.renderPlaceholder(svg, width, height);
                    return;
                }
                
                const xScale = window.ChartUtils.createScale(
                    [Math.min(...xData), Math.max(...xData)],
                    [margin.left, margin.left + chartWidth]
                );
                
                const yScale = window.ChartUtils.createScale(
                    [Math.min(...yData), Math.max(...yData)],
                    [margin.top + chartHeight, margin.top]
                );
                
                // Draw axes
                const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                xAxis.setAttribute('x1', margin.left);
                xAxis.setAttribute('y1', margin.top + chartHeight);
                xAxis.setAttribute('x2', margin.left + chartWidth);
                xAxis.setAttribute('y2', margin.top + chartHeight);
                xAxis.setAttribute('stroke', '#666');
                xAxis.setAttribute('stroke-width', '1');
                svg.appendChild(xAxis);
                
                const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                yAxis.setAttribute('x1', margin.left);
                yAxis.setAttribute('y1', margin.top);
                yAxis.setAttribute('x2', margin.left);
                yAxis.setAttribute('y2', margin.top + chartHeight);
                yAxis.setAttribute('stroke', '#666');
                yAxis.setAttribute('stroke-width', '1');
                svg.appendChild(yAxis);
                
                // Create data path
                let pathData = '';
                for (let i = 0; i < xData.length; i++) {
                    const x = xScale(xData[i]);
                    const y = yScale(yData[i]);
                    pathData += (i === 0 ? 'M' : 'L') + ` ${x} ${y}`;
                }
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', pathData);
                path.setAttribute('stroke', zarrGroup.attrs.color || '#2196f3');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('fill', 'none');
                svg.appendChild(path);
                
                // Add title
                const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                title.setAttribute('x', width / 2);
                title.setAttribute('y', margin.top / 2);
                title.setAttribute('text-anchor', 'middle');
                title.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
                title.setAttribute('font-size', '14');
                title.setAttribute('fill', '#333');
                title.textContent = zarrGroup.attrs.title || 'Data Visualization';
                svg.appendChild(title);
            } catch (error) {
                console.warn('Error rendering chart:', error);
                this.renderPlaceholder(svg, width, height);
            }
        },
        
        renderPlaceholder: function(svg, width, height) {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', 20);
            rect.setAttribute('y', 20);
            rect.setAttribute('width', Math.max(0, width - 40));
            rect.setAttribute('height', Math.max(0, height - 40));
            rect.setAttribute('fill', '#f8f9fa');
            rect.setAttribute('stroke', '#dee2e6');
            svg.appendChild(rect);
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', width / 2);
            text.setAttribute('y', height / 2);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
            text.setAttribute('font-size', '14');
            text.setAttribute('fill', '#666');
            text.textContent = 'No data available';
            svg.appendChild(text);
        }
    };
})();
"""

# Create and register the extension
advanced_chart_extension = FigpackExtension(
    name="advanced-chart",
    javascript_code=main_extension_js,
    additional_files={"chart-utils.js": chart_utils_js},
    version="1.0.0",
)


class AdvancedChartView(ExtensionView):
    """A chart view featuring multiple .js files"""

    def __init__(
        self, *, x_data=None, y_data=None, title="Data Visualization", color="#2196f3"
    ):
        super().__init__(
            extension=advanced_chart_extension,
            view_type="advanced-chart.AdvancedChartView",
        )
        self.x_data = x_data
        self.y_data = y_data
        self.title = title
        self.color = color

    def _write_to_zarr_group(self, group):
        super()._write_to_zarr_group(group)
        group.attrs["title"] = self.title
        group.attrs["color"] = self.color

        if self.x_data is not None:
            group.create_dataset("x", data=np.array(self.x_data, dtype=np.float32))
        if self.y_data is not None:
            group.create_dataset("y", data=np.array(self.y_data, dtype=np.float32))


if __name__ == "__main__":
    # Create sample data for a damped sine wave
    x = np.linspace(0, 4 * np.pi, 200)
    y = np.sin(x) * np.exp(-x / 8)

    view = AdvancedChartView(
        x_data=x,
        y_data=y,
        title="Damped Sine Wave",
        color="#2196f3",  # Material Design blue
    )

    view.show(title="Advanced Chart Demo", open_in_browser=True)
