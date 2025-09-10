import json
import numpy as np
import base64

import kachery as ka
import figpack.views as fpv
from figpack_franklab import TrackAnimation


def decode_base64_to_numpy(data_b64, dtype, shape):
    # Decode base64 to bytes
    decoded = base64.b64decode(data_b64)
    # Convert bytes to numpy array
    arr = np.frombuffer(decoded, dtype=dtype)
    # Reshape if needed
    if shape:
        arr = arr.reshape(shape)
    return arr


def _show_json_with_large_strings_replaced(data, max_length=100):
    """Utility function to print JSON with large strings replaced by a placeholder"""

    def replace_large_strings(obj):
        if isinstance(obj, dict):
            return {k: replace_large_strings(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [replace_large_strings(i) for i in obj]
        elif isinstance(obj, str) and len(obj) > max_length:
            return f"<large string of length {len(obj)}>"
        else:
            return obj

    replaced_data = replace_large_strings(data)
    print(json.dumps(replaced_data, indent=2))


def process_track_animation(data):
    """Process TrackAnimation view data"""
    # Load decoded position data
    decoded_data = data["decodedData"]
    decoded_pos = {
        "bin_height": decoded_data["binHeight"],
        "bin_width": decoded_data["binWidth"],
        "frame_bounds": decode_base64_to_numpy(
            decoded_data["frameBounds"]["data_b64"],
            decoded_data["frameBounds"]["dtype"],
            decoded_data["frameBounds"]["shape"],
        ),
        "locations": decode_base64_to_numpy(
            decoded_data["locations"]["data_b64"],
            decoded_data["locations"]["dtype"],
            decoded_data["locations"]["shape"],
        ),
        "values": decode_base64_to_numpy(
            decoded_data["values"]["data_b64"],
            decoded_data["values"]["dtype"],
            decoded_data["values"]["shape"],
        ),
        "xcount": decoded_data["xcount"],
        "xmin": decoded_data["xmin"],
        "ycount": decoded_data["ycount"],
        "ymin": decoded_data["ymin"],
    }

    # Load head direction, positions and timestamps
    head_direction = decode_base64_to_numpy(
        data["headDirection"]["data_b64"],
        data["headDirection"]["dtype"],
        data["headDirection"]["shape"],
    )
    positions = decode_base64_to_numpy(
        data["positions"]["data_b64"],
        data["positions"]["dtype"],
        data["positions"]["shape"],
    )
    timestamps = decode_base64_to_numpy(
        data["timestamps"]["data_b64"],
        data["timestamps"]["dtype"],
        data["timestamps"]["shape"],
    )

    # Load track bin corners
    track_bin_corners = decode_base64_to_numpy(
        data["trackBinULCorners"]["data_b64"],
        data["trackBinULCorners"]["dtype"],
        data["trackBinULCorners"]["shape"],
    )

    # Load remaining metadata
    metadata = {
        "sampling_frequency_hz": data["samplingFrequencyHz"],
        "timestamp_start": data["timestampStart"],
        "total_recording_frame_length": data["totalRecordingFrameLength"],
        "track_bin_height": data["trackBinHeight"],
        "track_bin_width": data["trackBinWidth"],
        "xmax": data["xmax"],
        "xmin": data["xmin"],
        "ymax": data["ymax"],
        "ymin": data["ymin"],
    }

    print("bin_height:", decoded_pos["bin_height"])
    print("bin_width:", decoded_pos["bin_width"])
    print(
        f"frame_bounds: {decoded_pos['frame_bounds'].dtype}, {decoded_pos['frame_bounds'].shape}"
    )
    print(
        f"locations: {decoded_pos['locations'].dtype}, {decoded_pos['locations'].shape}"
    )
    print(f"values: {decoded_pos['values'].dtype}, {decoded_pos['values'].shape}")
    print(f"xcount: {decoded_pos['xcount']}")
    print(f"ycount: {decoded_pos['ycount']}")
    print(f"xmin: {decoded_pos['xmin']}")
    print(f"ymin: {decoded_pos['ymin']}")
    print(f"head_direction: {head_direction.dtype}, {head_direction.shape}")
    print(f"positions: {positions.dtype}, {positions.shape}")
    print(f"timestamps: {timestamps.dtype}, {timestamps.shape}")
    print(f"track_bin_corners: {track_bin_corners.dtype}, {track_bin_corners.shape}")
    print(f"sampling_frequency_hz: {metadata['sampling_frequency_hz']}")
    print(f"timestamp_start: {metadata['timestamp_start']}")
    print(f"total_recording_frame_length: {metadata['total_recording_frame_length']}")
    print(f"track_bin_height: {metadata['track_bin_height']}")
    print(f"track_bin_width: {metadata['track_bin_width']}")
    print(f"xmax: {metadata['xmax']}")
    print(f"xmin: {metadata['xmin']}")
    print(f"ymax: {metadata['ymax']}")
    print(f"ymin: {metadata['ymin']}")

    X = TrackAnimation(
        bin_height=decoded_pos["bin_height"],
        bin_width=decoded_pos["bin_width"],
        frame_bounds=decoded_pos["frame_bounds"],
        locations=decoded_pos["locations"],
        values=decoded_pos["values"],
        xcount=decoded_pos["xcount"],
        ycount=decoded_pos["ycount"],
        head_direction=head_direction,
        positions=positions,
        timestamps=timestamps,
        track_bin_corners=track_bin_corners,
        sampling_frequency_hz=metadata["sampling_frequency_hz"],
        timestamp_start=metadata["timestamp_start"],
        total_recording_frame_length=metadata["total_recording_frame_length"],
        track_bin_height=metadata["track_bin_height"],
        track_bin_width=metadata["track_bin_width"],
        xmax=metadata["xmax"],
        xmin=metadata["xmin"],
        ymax=metadata["ymax"],
        ymin=metadata["ymin"],
    )

    return X


def timeseries_graph_from_figurl_json(data):
    tsg = fpv.TimeseriesGraph()

    series = data["series"]

    for S in series:
        dataset_name = S["dataset"]
        dataset = next(d for d in data["datasets"] if d["name"] == dataset_name)
        print(f"Adding series: {S['title']} from dataset: {dataset_name}")
        t_data = dataset["data"]["t"]
        y_data = dataset["data"]["y"]
        t_array = decode_base64_to_numpy(
            t_data["data_b64"], t_data["dtype"], t_data["shape"]
        )
        y_array = decode_base64_to_numpy(
            y_data["data_b64"], y_data["dtype"], y_data["shape"]
        )
        attr = S["attributes"]
        tsg.add_line_series(
            name=S["title"],
            t=t_array,
            y=y_array,
            color=attr["color"],
            width=attr["width"],
        )

    return tsg


def process_layout_box(box_data, views_dict):
    """Process a layout box and its items recursively"""
    direction = box_data.get("direction", "vertical")
    show_titles = box_data.get("showTitles", False)
    items = []
    item_properties = box_data.get("itemProperties", [])

    for i, item in enumerate(box_data["items"]):
        props = item_properties[i] if i < len(item_properties) else {}
        title = props.get("title", "")
        stretch = props.get("stretch", 1)

        if item["type"] == "Box":
            # Recursively process nested box
            view = process_layout_box(item, views_dict)
        elif item["type"] == "View":
            view_id = item["viewId"]
            view_data = views_dict[view_id]
            if view_data["type"] == "TimeseriesGraph":
                data_uri = view_data["dataUri"]
                tsg_data = ka.load_json(data_uri)
                view = timeseries_graph_from_figurl_json(tsg_data)
            elif view_data["type"] == "TrackAnimation":
                data_uri = view_data["dataUri"]
                ta_data = ka.load_json(data_uri)
                view = process_track_animation(ta_data)
            else:
                raise ValueError(f"Unknown view type: {view_data['type']}")

        items.append(fpv.LayoutItem(view=view, title=title, stretch=stretch))

    return fpv.Box(direction=direction, items=items, show_titles=show_titles)


# Load and process the figure
fig_uri = "sha1://4fd55baaaa3e45a782c3b0f4632c1e86099f3ad5"
fig_data = ka.load_json(fig_uri)

# Create views dictionary for easy lookup
views_dict = {v["viewId"]: v for v in fig_data["views"]}

# Process the main layout
main_box = process_layout_box(fig_data["layout"], views_dict)

# Display the result
main_box.show(title="Gillespie Example Figure", open_in_browser=True)
