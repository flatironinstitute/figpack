import figpack_spike_sorting.views as ssv


def example_nwb_spike_amplitudes():
    print(f"Loading from remote NWB file...")
    view = ssv.SpikeAmplitudes.from_nwb_units_table(
        "https://api.dandiarchive.org/api/assets/37ca1798-b14c-4224-b8f0-037e27725336/download/",
        units_path="/units",
        include_units_selector=True,
    )
    view.show(title="NWB Spike Amplitudes Example")


if __name__ == "__main__":
    example_nwb_spike_amplitudes()
