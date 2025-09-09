/**
 * Plotly Extension for figpack
 * Provides interactive graph visualization using Plotly library
 */

const loadFigureData = async (zarrGroup) => {
    // Get the figure data from the zarr array
    const data = await zarrGroup.file.getDatasetData(
        joinPath(zarrGroup.path, "figure_data"),
        {},
    );
    if (!data || data.length === 0) {
        throw new Error("Empty figure data");
    }

    // Convert the uint8 array back to string
    const uint8Array = new Uint8Array(data);
    const decoder = new TextDecoder("utf-8");
    const jsonString = decoder.decode(uint8Array);

    // Parse the JSON string
    const parsedData = JSON.parse(jsonString);

    return parsedData;
};

(function() {
    window.figpackExtensions = window.figpackExtensions || {};
    
    window.figpackExtensions['figpack_plotly'] = {
        render: async function(a) {
            const { container, zarrGroup, width, height, onResize } = a;
            container.innerHTML = '';
            
            try {
                const figureData = await loadFigureData(zarrGroup); 
                
                const makePlot = () => {
                    window.Plotly.newPlot(
                        container,
                        figureData.data || [],
                        {
                            ...figureData.layout,
                            width: width,
                            height: height,
                            margin: { l: 50, r: 50, t: 50, b: 50 },
                        },
                        {
                            responsive: true,
                            displayModeBar: true,
                            displaylogo: false,
                        },
                    )
                };
                
                makePlot();

                // Handle resize events
                onResize((newWidth, newHeight) => {
                    window.Plotly.relayout(container, {width: newWidth, height: newHeight});
                });
                
                return {
                    destroy: () => {
                        window.Plotly.purge(container);
                    }
                };
                
            } catch (error) {
                console.error('Error rendering plotly figure:', error);
                this.renderError(container, width, height, error.message);
                return { destroy: () => {} };
            }
        },
        
        renderError: function(container, width, height, message) {
            container.innerHTML = `
                <div style="
                    width: ${width}px; 
                    height: ${height}px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    background-color: #f8f9fa; 
                    border: 1px solid #dee2e6; 
                    color: #6c757d;
                    font-family: system-ui, -apple-system, sans-serif;
                    font-size: 14px;
                    text-align: center;
                    padding: 20px;
                    box-sizing: border-box;
                ">
                    <div>
                        <div style="margin-bottom: 10px; font-weight: 500;">Force Graph Error</div>
                        <div style="font-size: 12px;">${message}</div>
                    </div>
                </div>
            `;
        }
    };
})();

const joinPath = function(p1, p2) {
    if (p1.endsWith('/')) p1 = p1.slice(0, -1);
    if (p2.startsWith('/')) p2 = p2.slice(1);
    return p1 + '/' + p2;
};
