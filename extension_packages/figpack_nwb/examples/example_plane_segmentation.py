import figpack_nwb.views as fpn


def main():
    # https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/4660dd15-93b2-4e64-88b1-ba92871989b4/download/&dandisetId=001569&dandisetVersion=draft&tab=/processing/ophys/ImageSegmentation/PlaneSegmentation
    nwb_url = "https://api.dandiarchive.org/api/assets/4660dd15-93b2-4e64-88b1-ba92871989b4/download/"
    path = "/processing/ophys/ImageSegmentation/PlaneSegmentation"
    v = fpn.PlaneSegmentation(nwb=nwb_url, path=path, use_local_cache=True)
    v.show(title="Plane Segmentation Example", open_in_browser=True)


if __name__ == "__main__":
    main()
