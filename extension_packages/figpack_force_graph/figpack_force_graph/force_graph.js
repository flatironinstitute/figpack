/**
 * Force Graph Extension for figpack
 * Provides interactive force-directed graph visualization using force-graph library
 */

(function() {
    window.figpackExtensions = window.figpackExtensions || {};
    
    window.figpackExtensions['force-graph'] = {
        render: async function(container, zarrGroup, width, height, onResize, utils) {
            container.innerHTML = '';
            
            try {
                // Load force-graph library from CDN
                await this.loadForceGraphLibrary();
                
                // Load graph data from zarr
                const graphData = await this.loadGraphData(zarrGroup);
                
                // Create and configure the force graph
                const graph = await this.createForceGraph(container, graphData, width, height);
                
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
                            container.innerHTML = '';
                        }
                    }
                };
                
            } catch (error) {
                console.error('Error rendering force graph:', error);
                this.renderError(container, width, height, error.message);
                return { destroy: () => {} };
            }
        },
        
        loadForceGraphLibrary: async function() {
            // Check if ForceGraph is already loaded
            if (window.ForceGraph) {
                return;
            }
            
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/force-graph@1.50.1/dist/force-graph.min.js';
                script.onload = () => {
                    if (window.ForceGraph) {
                        resolve();
                    } else {
                        reject(new Error('ForceGraph library failed to load'));
                    }
                };
                script.onerror = () => reject(new Error('Failed to load ForceGraph library from CDN'));
                document.head.appendChild(script);
            });
        },
        
        loadGraphData: async function(zarrGroup) {
            try {
                // Load the graph data from the zarr group
                const graphDataBytes = await zarrGroup.file.getDatasetData(
                    this.joinPath(zarrGroup.path, 'graph_data'), 
                    {}
                );
                
                if (!graphDataBytes || graphDataBytes.length === 0) {
                    return { nodes: [], links: [] };
                }
                
                // Convert bytes to string and parse JSON
                const jsonString = new TextDecoder('utf-8').decode(graphDataBytes);
                const graphData = JSON.parse(jsonString);
                
                // Validate data structure
                if (!graphData.nodes) graphData.nodes = [];
                if (!graphData.links) graphData.links = [];
                
                return graphData;
                
            } catch (error) {
                console.warn('Error loading graph data:', error);
                return { nodes: [], links: [] };
            }
        },
        
        createForceGraph: async function(container, graphData, width, height) {
            // Create the force graph instance
            const graph = window.ForceGraph()(container)
                .width(width)
                .height(height)
                .graphData(graphData);
            
            // Configure basic styling from zarr attributes if available
            const attrs = container.closest('[data-zarr-attrs]')?.dataset.zarrAttrs;
            let config = {};
            if (attrs) {
                try {
                    config = JSON.parse(attrs);
                } catch (e) {
                    console.warn('Could not parse zarr attributes:', e);
                }
            }
            
            // Apply configuration
            if (config.backgroundColor) {
                graph.backgroundColor(config.backgroundColor);
            }
            
            if (config.nodeColor) {
                graph.nodeColor(config.nodeColor);
            } else {
                graph.nodeColor(node => node.color || '#1f77b4');
            }
            
            if (config.linkColor) {
                graph.linkColor(config.linkColor);
            } else {
                graph.linkColor(link => link.color || '#999');
            }
            
            // Set node size based on value
            graph.nodeVal(node => node.val || 1);
            
            // Set node labels
            graph.nodeLabel(node => node.name || node.id || '');
            
            // Set link width
            graph.linkWidth(link => link.width || 1);
            
            // Configure interaction callbacks if specified
            if (config.enableNodeClick !== false) {
                graph.onNodeClick((node, event) => {
                    console.log('Node clicked:', node);
                });
            }
            
            if (config.enableNodeHover !== false) {
                graph.onNodeHover((node, prevNode) => {
                    // Optional: highlight connected nodes
                    if (config.highlightConnected && node) {
                        const connectedNodes = new Set();
                        const connectedLinks = new Set();
                        
                        graphData.links.forEach(link => {
                            if (link.source === node || link.target === node) {
                                connectedLinks.add(link);
                                connectedNodes.add(link.source);
                                connectedNodes.add(link.target);
                            }
                        });
                        
                        graph.nodeColor(n => connectedNodes.has(n) ? (n.color || '#1f77b4') : '#ccc');
                        graph.linkColor(l => connectedLinks.has(l) ? (l.color || '#999') : '#ccc');
                    } else if (!node) {
                        // Reset colors when not hovering
                        graph.nodeColor(n => n.color || '#1f77b4');
                        graph.linkColor(l => l.color || '#999');
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
        },
        
        joinPath: function(p1, p2) {
            if (p1.endsWith('/')) p1 = p1.slice(0, -1);
            if (p2.startsWith('/')) p2 = p2.slice(1);
            return p1 + '/' + p2;
        }
    };
})();
