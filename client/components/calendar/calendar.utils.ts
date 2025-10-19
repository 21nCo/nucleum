import { TimeScaleUnit } from "@21n/types/time.type";
import { generateResourceId } from "@21n/components/flux/flux.utils";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";

export function resolveCalendarNotesId(date: Date, scale: TimeScaleUnit) {
  let idPart = "";
  if (scale === TimeScaleUnit.YEAR) {
    idPart = date.getFullYear().toString();
  } else if (scale === TimeScaleUnit.MONTH) {
    idPart =
      date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, "0");
  } else if (scale === TimeScaleUnit.WEEK) {
    //TODO - calculate for week
  } else if (scale === TimeScaleUnit.DAY) {
    idPart =
      date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, "0") +
      String(date.getDate()).padStart(2, "0");
  }
  idPart = "calendar_" + idPart;
  return generateResourceId(Resource.node, {
    id: idPart
  });
}
