  DEFINE FUNCTION fn::pointron::insertEmpty($offsets: array){
    let $tzOffset = array::first((select value timeZoneOffset from Preferences:global));
    let $targets = array::first(select value horizonTargets from Preferences:pointron);
    return insert into PointLog (select $targets as targets, $tzOffset as tzOffset, 0 as totalFocus, 0 as totalBreak, time::from::unix(time::unix() - val * 24 * 60 * 60) as start, time::unix() - val * 24 * 60 * 60 as id, "PointGoal:Empty" as goalId, true as isEmptyLog from $offsets);
  }