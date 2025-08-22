import { ZarrGroup } from "../remote-zarr/RemoteZarr";

export interface FPViewComponentProps {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}

export interface FPViewComponent {
  type: string;
  component: React.ComponentType<FPViewComponentProps>;
}
