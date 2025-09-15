import { FunctionComponent } from "react";
import { useLocation } from "react-router-dom";

type Props = {
  width: number;
  height: number;
  onIframeElement?: (el: HTMLIFrameElement | null) => void;
};

const FPHeader: FunctionComponent<Props> = ({
  width,
  height,
  onIframeElement,
}) => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const editing = queryParams.get("edit") === "1";
  if (editing) {
    return (
      <iframe
        // src="https://manage.figpack.org"
        src="http://localhost:5174/edit-figure-service"
        width={width}
        height={height}
        ref={onIframeElement}
        style={{ border: "none" }}
      ></iframe>
    );
  } else {
    return <></>;
  }
};

export default FPHeader;
