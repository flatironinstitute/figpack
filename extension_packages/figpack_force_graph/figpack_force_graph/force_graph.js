/**
 * Force Graph Extension for figpack
 * Provides interactive force-directed graph visualization using force-graph library
 */

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
                        <div style="margin-bottom: 10px; font-weight: 500;">Force Graph Error</div>
                        <div style="font-size: 12px;">${message}</div>
                    </div>
                </div>
            `;
}

const loadGraphData = async (zarrGroup) => {
  try {
    // Load the graph data from the zarr group
    const graphDataBytes = await zarrGroup.getDatasetData("graph_data", {});

    if (!graphDataBytes || graphDataBytes.length === 0) {
      return { nodes: [], links: [] };
    }

    // Convert bytes to string and parse JSON
    const jsonString = new TextDecoder("utf-8").decode(graphDataBytes);
    const graphData = JSON.parse(jsonString);

    // Validate data structure
    if (!graphData.nodes) graphData.nodes = [];
    if (!graphData.links) graphData.links = [];

    return graphData;
  } catch (error) {
    console.warn("Error loading graph data:", error);
    return { nodes: [], links: [] };
  }
};

const createForceGraph = async (
  container,
  graphData,
  config,
  width,
  height
) => {
  // Create the force graph instance
  const graph = window
    .ForceGraph()(container)
    .width(width)
    .height(height)
    .graphData(graphData);

  // Apply configuration
  if (config.backgroundColor) {
    graph.backgroundColor(config.backgroundColor);
  }

  if (config.nodeColor) {
    graph.nodeColor(config.nodeColor);
  } else {
    graph.nodeColor((node) => node.color || "#1f77b4");
  }

  if (config.linkColor) {
    graph.linkColor(config.linkColor);
  } else {
    graph.linkColor((link) => link.color || "#999");
  }

  // Set node size based on value
  graph.nodeVal((node) => node.val || 1);

  // Set node labels
  graph.nodeLabel((node) => node.name || node.id || "");

  // Set link width
  graph.linkWidth((link) => link.width || 1);

  // Configure interaction callbacks if specified
  if (config.enableNodeClick !== false) {
    graph.onNodeClick((node, event) => {
      console.log("Node clicked:", node);
    });
  }

  if (config.enableNodeHover !== false) {
    graph.onNodeHover((node, prevNode) => {
      // Optional: highlight connected nodes
      if (config.highlightConnected && node) {
        const connectedNodes = new Set();
        const connectedLinks = new Set();

        graphData.links.forEach((link) => {
          if (link.source === node || link.target === node) {
            connectedLinks.add(link);
            connectedNodes.add(link.source);
            connectedNodes.add(link.target);
          }
        });

        graph.nodeColor((n) =>
          connectedNodes.has(n) ? n.color || "#1f77b4" : "#ccc"
        );
        graph.linkColor((l) =>
          connectedLinks.has(l) ? l.color || "#999" : "#ccc"
        );
      } else if (!node) {
        // Reset colors when not hovering
        graph.nodeColor((n) => n.color || "#1f77b4");
        graph.linkColor((l) => l.color || "#999");
      }
    });
  }

  // Configure force simulation parameters
  if (config.dagMode) {
    graph.dagMode(config.dagMode);
  }

  if (config.cooldownTicks !== undefined) {
    graph.cooldownTicks(config.cooldownTicks);
  }

  if (config.warmupTicks !== undefined) {
    graph.warmupTicks(config.warmupTicks);
  }

  return graph;
};

const renderForceGraphView = async (params) => {
  const { container, zarrGroup, width, height, onResize } = params;
  container.innerHTML = "";

  try {
    // Load graph data from zarr
    const graphData = await loadGraphData(zarrGroup);
    const config = JSON.parse(zarrGroup.attrs.config || "{}");

    // Create and configure the force graph
    const graph = await createForceGraph(
      container,
      graphData,
      config,
      width,
      height
    );

    // Handle resize events
    onResize((newWidth, newHeight) => {
      if (graph) {
        graph.width(newWidth).height(newHeight);
      }
    });

    return {
      destroy: () => {
        if (graph) {
          // Clean up the graph instance
          container.innerHTML = "";
        }
      },
    };
  } catch (error) {
    console.error("Error rendering force graph:", error);
    renderError(container, width, height, error.message);
    return { destroy: () => {} };
  }
};

const registerExtension = () => {
  const registerFPViewComponent = window.figpack_p1.registerFPViewComponent;
  registerFPViewComponent({
    name: "force-graph.ForceGraphView",
    render: renderForceGraphView,
  });

  // const registerFPViewContextCreator = window.figpack_p1.registerFPViewContextCreator;

  const registerFPExtension = window.figpack_p1.registerFPExtension;
  registerFPExtension({ name: "figpack-force-graph" });
};

registerExtension();
