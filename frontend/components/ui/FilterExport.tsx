import Icon from "../Icon";
import { BTN_SMALL_OUTLINE } from "./buttons";

/** The Filter + Export pair that sits in the corner of every list card. */
export default function FilterExport() {
  return (
    <div className="flex items-center gap-2.5">
      <button type="button" className={BTN_SMALL_OUTLINE}>
        <Icon name="filter_list" size={15} /> Filter
      </button>
      <button type="button" className={BTN_SMALL_OUTLINE}>
        <Icon name="download" size={15} /> Export
      </button>
    </div>
  );
}
