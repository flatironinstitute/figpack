/**
 * Plotly Extension for figpack
 * Provides interactive graph visualization using Plotly library
 */

const loadFigureData = async (zarrGroup) => {
    // Get the figure data from the zarr array
    const data = await zarrGroup.getDatasetData(
        "figure_data",
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

const renderPlotlyFigure = async (params) => {
  const { container, zarrGroup, width, height, onResize } = params;
  container.innerHTML = "";

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
            );
        };

        makePlot();

        // Handle resize events
        onResize((newWidth, newHeight) => {
            window.Plotly.relayout(container, { width: newWidth, height: newHeight });
        });

        return {
            destroy: () => {
                window.Plotly.purge(container);
            }
        };

    } catch (error) {
        console.error('Error rendering plotly figure:', error);
        renderError(container, width, height, error.message);
        return { destroy: () => {} };
    }
};

const renderError = (container, width, height, message) => {
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
        <div style="margin-bottom: 10px; font-weight: 500;">Plotly Figure Error</div>
        <div style="font-size: 12px;">${message}</div>
      </div>
    </div>
  `;
};

const registerExtension = () => {
  const registerFPViewComponent = window.figpack_p1.registerFPViewComponent;
  registerFPViewComponent({
    name: "plotly.PlotlyFigure",
    render: renderPlotlyFigure,
  });

  // const registerFPViewContextCreator = window.figpack_p1.registerFPViewContextCreator;

  const registerFPExtension = window.figpack_p1.registerFPExtension;
  registerFPExtension({ name: "figpack-plotly" });
};

registerExtension();