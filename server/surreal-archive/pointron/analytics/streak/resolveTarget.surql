
--Created: DBCL-10
DEFINE FUNCTION fn::pointron::analytics::resolveTarget::v2($scale: string, $date: datetime){
  let $scaleSurreal = string::slice(string::lowercase($scale),0,-1);
  let $val = array::first(select timestamp, target from PointTarget where scale is $scale and (time::group($date, $scaleSurreal) is time::group(timestamp, $scaleSurreal) or timestamp < $date) ORDER BY timestamp DESC LIMIT 1).target;
  return if $val is none {
    return 999999999999999;
  } else {
    return $val * 60 * 60;
  }
};


-- Deprecated: DBCL-10
DEFINE FUNCTION fn::pointron::analytics::resolveTarget($scale: string, $date: datetime){
    RETURN if $scale = 'DAYS' {
      return array::first(select value (array::first(targets[where scale is $scale]).target) * 60 * 60 from PointLog where time::group(start,"day") is $date);
    } ELSE IF $scale = 'MONTHS' {
      return array::first(select value (array::first(targets[where scale is $scale]).target) * 60 * 60 from PointLog where time::group(start,"month") is $date);
            }
      ELSE IF $scale = 'YEARS' {
      return array::first(select value (array::first(targets[where scale is $scale]).target) * 60 * 60 from PointLog where time::group(start,"year") is $date);
            };
};