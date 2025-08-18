import spikeinterface.extractors as se
import spikeinterface.widgets as sw
import figpack.spike_sorting.views as ssv


def si_cross_correlograms():
    recording, sorting = se.toy_example(
        num_units=9, duration=300, seed=0, num_segments=1
    )
    view = ssv.CrossCorrelograms.from_sorting(sorting)
    view.show()


if __name__ == "__main__":
    si_cross_correlograms()
