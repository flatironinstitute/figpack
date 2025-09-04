"""
Example usage of the ForceGraphView extension showing different types of force graphs arranged in a 2x2 grid
"""

import numpy as np
import figpack.views as vv
from figpack_force_graph import ForceGraphView


def main():
    view = create_example_layout()
    title = "Force Graph Examples"
    description_md = """
# Force Graph Examples

This example shows four different types of force-directed graph layouts:
1. Simple Cycle - A basic 4-node circular graph
2. Network Clusters - A complex network with interconnected clusters
3. Random Graph - A colorful graph with many nodes and random connections
4. Dynamic Graph - A graph built using the dynamic API
"""

    view.show(open_in_browser=True, title=title, description=description_md)


def create_example_layout():
    """Create a 2x2 grid of force graph examples"""
    graph1 = create_simple_graph()
    graph2 = create_network_graph()
    graph3 = create_random_graph()
    graph4 = create_dynamic_graph()

    # Create a box layout with 2x2 grid
    view = vv.Box(
        direction="vertical",
        show_titles=True,
        items=[
            # Top row
            vv.LayoutItem(
                vv.Box(
                    direction="horizontal",
                    show_titles=True,
                    items=[
                        vv.LayoutItem(
                            graph1,
                            stretch=1,
                            title="Simple Cycle",
                            min_size=400,
                        ),
                        vv.LayoutItem(
                            graph2,
                            stretch=1,
                            title="Network Clusters",
                            min_size=400,
                        ),
                    ],
                ),
                title="",
            ),
            # Bottom row
            vv.LayoutItem(
                vv.Box(
                    direction="horizontal",
                    show_titles=True,
                    items=[
                        vv.LayoutItem(
                            graph3,
                            stretch=1,
                            title="Random Graph",
                            min_size=400,
                        ),
                        vv.LayoutItem(
                            graph4,
                            stretch=1,
                            title="Graph created with dynamic API",
                            min_size=400,
                        ),
                    ],
                ),
                title="",
            ),
        ],
    )

    return view


def create_simple_graph():
    """Create a simple 4-node graph"""
    nodes = [
        {"id": "A", "name": "Node A", "val": 10, "color": "#ff6b6b"},
        {"id": "B", "name": "Node B", "val": 15, "color": "#4ecdc4"},
        {"id": "C", "name": "Node C", "val": 8, "color": "#45b7d1"},
        {"id": "D", "name": "Node D", "val": 12, "color": "#96ceb4"},
    ]

    links = [
        {"source": "A", "target": "B", "color": "#999", "width": 2},
        {"source": "B", "target": "C", "color": "#666", "width": 1},
        {"source": "C", "target": "D", "color": "#999", "width": 2},
        {"source": "D", "target": "A", "color": "#666", "width": 1},
    ]

    graph = ForceGraphView(
        nodes=nodes,
        links=links,
        background_color="#f8f9fa",
        highlight_connected=False,
        cooldown_ticks=100,
    )

    return graph


def create_network_graph():
    """Create a more complex network graph"""
    # Generate a small network with clusters
    np.random.seed(42)

    nodes = []
    links = []

    # Create 3 clusters of nodes
    clusters = [
        {"center": "cluster1", "color": "#ff6b6b", "size": 5},
        {"center": "cluster2", "color": "#4ecdc4", "size": 4},
        {"center": "cluster3", "color": "#45b7d1", "size": 6},
    ]

    node_id = 0
    cluster_centers = []

    for cluster in clusters:
        # Create cluster center
        center_id = f"node_{node_id}"
        cluster_centers.append(center_id)
        nodes.append(
            {
                "id": center_id,
                "name": f"Center {cluster['center']}",
                "val": 20,
                "color": cluster["color"],
            }
        )
        node_id += 1

        # Create cluster members
        for i in range(cluster["size"]):
            member_id = f"node_{node_id}"
            nodes.append(
                {
                    "id": member_id,
                    "name": f"Node {member_id}",
                    "val": np.random.randint(5, 15),
                    "color": cluster["color"],
                }
            )

            # Connect to cluster center
            links.append(
                {"source": center_id, "target": member_id, "color": "#999", "width": 1}
            )

            # Occasionally connect to other cluster members
            if i > 0 and np.random.random() < 0.3:
                prev_member = f"node_{node_id - 1}"
                links.append(
                    {
                        "source": prev_member,
                        "target": member_id,
                        "color": "#ccc",
                        "width": 0.5,
                    }
                )

            node_id += 1

    # Connect cluster centers
    for i in range(len(cluster_centers)):
        for j in range(i + 1, len(cluster_centers)):
            links.append(
                {
                    "source": cluster_centers[i],
                    "target": cluster_centers[j],
                    "color": "#333",
                    "width": 3,
                }
            )

    graph = ForceGraphView(
        nodes=nodes,
        links=links,
        background_color="#ffffff",
        highlight_connected=False,
        cooldown_ticks=200,
        warmup_ticks=50,
    )

    return graph


def create_random_graph():
    """Create a colorful random graph"""
    np.random.seed(42)  # For reproducibility

    # Generate vibrant colors
    def random_color():
        hue = np.random.random()
        saturation = 0.6 + np.random.random() * 0.4  # 0.6-1.0
        value = 0.6 + np.random.random() * 0.4  # 0.6-1.0

        # Convert HSV to RGB
        c = value * saturation
        x = c * (1 - abs((hue * 6) % 2 - 1))
        m = value - c

        if hue < 1 / 6:
            r, g, b = c, x, 0
        elif hue < 2 / 6:
            r, g, b = x, c, 0
        elif hue < 3 / 6:
            r, g, b = 0, c, x
        elif hue < 4 / 6:
            r, g, b = 0, x, c
        elif hue < 5 / 6:
            r, g, b = x, 0, c
        else:
            r, g, b = c, 0, x

        r, g, b = [int((k + m) * 255) for k in (r, g, b)]
        return f"#{r:02x}{g:02x}{b:02x}"

    # Create nodes
    num_nodes = 30
    nodes = [
        {
            "id": f"node_{i}",
            "name": f"Node {i}",
            "val": np.random.randint(5, 25),
            "color": random_color(),
        }
        for i in range(num_nodes)
    ]

    # Create random links
    links = []
    num_links = num_nodes * 2  # Average of 2 links per node

    for _ in range(num_links):
        source = np.random.randint(0, num_nodes)
        target = np.random.randint(0, num_nodes)
        if source != target:  # Avoid self-links
            links.append(
                {
                    "source": f"node_{source}",
                    "target": f"node_{target}",
                    "width": np.random.uniform(0.5, 3.0),
                    "color": random_color(),
                }
            )

    # Create the graph
    graph = ForceGraphView(
        nodes=nodes,
        links=links,
        background_color="#afeeee",
        highlight_connected=False,
        cooldown_ticks=200,
        warmup_ticks=50,
    )

    return graph


def create_dynamic_graph():
    """Create a graph using the dynamic add methods"""
    graph = ForceGraphView(background_color="#fafafa", highlight_connected=True)

    # Add nodes dynamically
    graph.add_node("central", name="Central Hub", val=20, color="#e74c3c")

    # Add satellite nodes
    colors = ["#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"]
    for i in range(5):
        node_id = f"satellite_{i}"
        graph.add_node(
            node_id,
            name=f"Satellite {i+1}",
            val=np.random.randint(8, 15),
            color=colors[i],
        )
        graph.add_link("central", node_id, color="#95a5a6", width=2)

    # Add some interconnections
    graph.add_link("satellite_0", "satellite_2", color="#bdc3c7", width=1)
    graph.add_link("satellite_1", "satellite_3", color="#bdc3c7", width=1)
    graph.add_link("satellite_2", "satellite_4", color="#bdc3c7", width=1)

    return graph


if __name__ == "__main__":
    main()
