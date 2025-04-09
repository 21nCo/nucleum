import { userDatev4 } from "./global.dbo";

/**
 * Pointron dbo definitions used by the client apps.
 */
export const pointronDboDefinitions = {
  "fn::pointron::export": pointronExport(),
  "fn::pointron::import": pointronImport(),
  "fn::pointron::importChunk": pointronImportChunk(),
  "fn::pointron::revertImport": pointronRevertImport()
};

function analyticsFocusByCurrentHorizonv3() {
  const definition = `DEFINE FUNCTION fn::pointron::analytics::focusByCurrentHorizon::v3($scale: string, $goalId: option<record>) {
  let $now = fn::user::time::date::v4(time::now());
  return fn::pointron::analytics::focusByHorizon($scale, $now, $goalId);
}`;
  return [...userDatev4(), ...analyticsFocusByHorizon(), definition];
}

function analyticsFocusByHorizon() {
  const definition = `DEFINE FUNCTION fn::pointron::analytics::focusByHorizon($scale: string, $date: datetime, $goalId: option<record>) {
  let $day = time::day($date);
  let $month = time::month($date);
  let $year = time::year($date);
  RETURN IF $goalId is not NONE {
        RETURN IF $scale = 'DAYS' {
          return array::first(select totalFocus as focus from PointAggFocusByGoal where (goalId is $goalId or (parent and array::first(parent).id is $goalId)) and day is $day and month is $month and year is $year);
        }
        ELSE IF $scale = 'MONTHS' {
              return array::first(select math::sum(totalFocus) as focus, month from PointAggFocusByGoal where (goalId is $goalId or (parent and array::first(parent).id is $goalId)) and month is $month and year is $year group by month);
            }
        ELSE IF $scale = 'YEARS' {
              return array::first(select math::sum(totalFocus)  as focus,year from PointAggFocusByGoal where (goalId is $goalId or (parent and array::first(parent).id is $goalId)) and year is $year group by year);
        }
    } else { 
      RETURN if $scale = 'DAYS' {
            return array::first(select fn::pointron::analytics::totalFocus::v2(totalFocus, totalBreak) as focus, totalBreak as brek from PointAggFocusByDay where day is $day and month is $month and year is $year);
          }
      ELSE IF $scale = 'MONTHS' {
            return array::first(select fn::pointron::analytics::totalFocus::v2(totalFocus, totalBreak) as focus, totalBreak as brek from PointAggFocusByMonth where month is $month and year is $year);
          }
      ELSE IF $scale = 'YEARS' {
            return array::first(select fn::pointron::analytics::totalFocus::v2(totalFocus, totalBreak) as focus, totalBreak as brek from PointAggFocusByYear where year is $year);
      }
  }
};`;

  return [...analyticsTotalFocusV2(), definition];
}

function analyticsTotalFocusV2() {
  const definition = `DEFINE FUNCTION fn::pointron::analytics::totalFocus::v2($totalFocus: float, $totalBreak: float){
    let $isIncludeBreak = array::first(select value isIncludeBreakInAnalytics from kv:pointronPreferences);
    return if $isIncludeBreak is true {
        return $totalFocus + $totalBreak;
    } else {
        return $totalFocus
    }
};`;

  return [definition];
}

function analyticsPageFetch() {
  const def = `DEFINE FUNCTION fn::pointron::analytics::page::fetch($params: array) {
	LET $cards = (SELECT VALUE fn::pointron::analytics::focusByGoal::v3(scale, begin, end) FROM $params);
    LET $previous = SELECT value (IF previous is not NONE THEN fn::pointron::analytics::focusByGoal::v3(scale, previous, begin) ELSE [] END) as val FROM $params;
    LET $colors = fn::pointron::goals::colors();
	RETURN { colors: $colors, cards: $cards, previous: $previous };
};`;
  return [...analyticsFocusByGoalV3(), ...goalColors(), def];
}

function analyticsFocusByGoalV3() {
  const def = `DEFINE FUNCTION fn::pointron::analytics::focusByGoal::v3($scale: string, $begin: datetime, $end: datetime, $goal: option<record>) {
  let $scaleSurreal = string::slice(string::lowercase($scale),0,-1);
  let $subGoals = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, time::group(start,$scaleSurreal) as start, goalId, goalId.label as goal, array::first(parent).label as topLevelGoal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and ($goal in parent or $goal is none) group by goalId, goal, topLevelGoal, start;
  let $topLevelGoals = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, time::group(start,$scaleSurreal) as start, goalId, goalId.label as goal, goalId.label as topLevelGoal from PointAggFocusByGoal where (parent is none or array::len(parent) = 0) and start >= $begin and start <= $end and (goalId is $goal or $goal is none) group by goal, goalId, topLevelGoal, start;
  let $currentGoalIfNotTopLevel = select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, time::group(start,$scaleSurreal) as start,goalId, goalId.label as goal, array::first(parent).label as topLevelGoal from PointAggFocusByGoal where parent and start >= $begin and start <= $end and goalId is $goal group by goal, goalId, topLevelGoal,  start;
  return array::concat($subGoals, $topLevelGoals, $currentGoalIfNotTopLevel);
};`;

  return [def];
}

function goalColors() {
  const def = `DEFINE FUNCTION fn::pointron::goals::colors(){
  return select label,color from PointGoal where color
};`;
  return [def];
}

function analyticsResolveTargetV2() {
  const def = `DEFINE FUNCTION fn::pointron::analytics::resolveTarget::v2($scale: string, $date: datetime){
  let $scaleSurreal = string::slice(string::lowercase($scale),0,-1);
  let $val = array::first(select timestamp, target from PointTarget where scale is $scale and (time::group($date, $scaleSurreal) is time::group(timestamp, $scaleSurreal) or timestamp < $date) ORDER BY timestamp DESC LIMIT 1).target;
  return if $val is none {
    return 999999999999999;
  } else {
    return $val * 60 * 60;
  }
};`;
  return [def];
}

function analyticsTargetsAndStreakV2() {
  const def = `DEFINE FUNCTION fn::pointron::analytics::targetsAndStreak::v2() {
  let $targets = return fn::pointron::analytics::targets::v3();
  RETURN IF $targets is none or array::len($targets) < 1 {
      RETURN [];
    } ELSE {
          RETURN (select fn::pointron::analytics::streak::v2(scale) as streak, scale, target * 60 * 60 as target, actual, actual / (target * 60 * 60) >= 1 as isCurrentAchieved  from $targets);
    }
};`;
  return [...analyticsTargetsV3(), ...analyticsStreakV2(), def];
}

function analyticsTargetsV3() {
  const def = `DEFINE FUNCTION fn::pointron::analytics::targets::v3() {
  let $targets = array::first(select value horizonTargets from kv:pointronPreferences);
  RETURN IF $targets is none or array::len($targets) < 1 {
      RETURN [];
    } ELSE {
      RETURN SELECT fn::pointron::analytics::focusByCurrentHorizon::v3(scale).focus as actual, scale, target from $targets;
    }
};`;
  return [...analyticsFocusByCurrentHorizonv3(), def];
}

function analyticsStreakV2() {
  const def = `DEFINE FUNCTION fn::pointron::analytics::streak::v2($scale: string){
    let $inserted = fn::pointron::insertEmpty::v2([{'val':1},{'val':32},{'val':367}]);
    let $now = fn::user::time::date::v4(time::now());
    let $day = time::group($now,'day');
    let $month = time::group($now, 'month');
    let $year = time::group($now, 'year');
    RETURN if $scale = 'DAYS' {
        let $lastWhenStreakBroke = array::first(select value start from PointAggFocusByDay where start is not $day and fn::pointron::analytics::totalFocus::v2(totalFocus, totalBreak) / fn::pointron::analytics::resolveTarget::v2($scale, start) < 1 order by start desc limit 1);
        return { value: duration::days(($day - 1d) - $lastWhenStreakBroke), lastWhenStreakBroke: $lastWhenStreakBroke};
    } ELSE IF $scale = 'MONTHS' {
        let $lastWhenStreakBroke = array::first(select value start from PointAggFocusByMonth where fn::pointron::analytics::totalFocus::v2(totalFocus, totalBreak) / fn::pointron::analytics::resolveTarget::v2($scale, start) < 1 order by start desc limit 1);
        return { value: duration::days(($month - 1m) - $lastWhenStreakBroke), lastWhenStreakBroke: $lastWhenStreakBroke};
    } ELSE IF $scale = 'YEARS' {
        let $lastWhenStreakBroke = array::first(select value start from PointAggFocusByYear where fn::pointron::analytics::totalFocus::v2(totalFocus, totalBreak) / fn::pointron::analytics::resolveTarget::v2($scale, start) < 1 order by start desc limit 1);
        return { value: duration::years(($year - 1y) - $lastWhenStreakBroke), lastWhenStreakBroke: $lastWhenStreakBroke};
  };
};`;
  return [
    ...userDatev4(),
    ...insertEmptyV2(),
    ...analyticsTotalFocusV2(),
    ...analyticsResolveTargetV2(),
    def
  ];
}

function insertEmptyV2() {
  const def = `DEFINE FUNCTION fn::pointron::insertEmpty::v2($offsets: array){
    let $tzOffset = array::first((select value timeZoneOffset from kv:globalPreferences));
    let $targets = array::first(select value horizonTargets from kv:pointronPreferences);
    return insert into PointLog (select $targets as targets, $tzOffset as tzOffset, 0 as totalFocus, 0 as totalBreak, time::from::unix(time::unix() - val * 24 * 60 * 60) as start, time::unix() - val * 24 * 60 * 60 as id, 'PointGoal:Empty' as goalId, true as isEmptyLog from $offsets);
};`;
  return [def];
}

function analyticsGoalV3() {
  const def = `DEFINE FUNCTION fn::pointron::analytics::goal::v3($goalId: record, $params: array){
    let $dayFocus = fn::pointron::analytics::focusByCurrentHorizon::v3('DAYS',$goalId);
    let $monthFocus = fn::pointron::analytics::focusByCurrentHorizon::v3('MONTHS',$goalId);
    let $yearFocus = fn::pointron::analytics::focusByCurrentHorizon::v3('YEARS',$goalId);
    let $lifetime = return array::first(select math::sum(focus) as focus from (select math::sum(totalFocus) as focus,year from PointAggFocusByGoal where goalId is $goalId or (parent and array::first(parent).id is $goalId) group by year) group all);
    LET $charts = (SELECT VALUE fn::pointron::analytics::focusByGoal::v3(scale, begin, end, $goalId) FROM $params);
    RETURN { aggs:[
        {scale: 'DAYS', value: $dayFocus.focus},
        {scale: 'MONTHS', value: $monthFocus.focus},
        {scale: 'YEARS', value: $yearFocus.focus},
        {scale: 'LIFETIME', value: $lifetime.focus}
    ], charts: $charts};
};`;
  return [
    ...analyticsFocusByCurrentHorizonv3(),
    ...analyticsFocusByGoalV3(),
    def
  ];
}

function pointronExport() {
  const def = `define function if not exists fn::pointron::export(){
    let $kv = select * from kv;
    let $tz = select * from tz;
    let $targets = select * from PointTarget;
    let $logs = select * from PointLog;
    let $sessions = select * from PointSession;
    let $goals = select * from PointGoal;
    let $tags = select * from PointTag;
    return {logs: $logs, sessions: $sessions, goals: $goals, tags: $tags, targets: $targets, tz: $tz, kv: $kv}
};`;
  return [def];
}

function pointronImport() {
  const def = `define function if not exists fn::pointron::import($tags: any, $goals: any, $targets: any, $kv: any, $tz: any, $fileName: string){
    let $import = array::first(create import set created = time::now(), app = 'pointron', source= 'self', fileName= $fileName);
    let $insertedTags = insert into PointTag select *, $import.id as importId from $tags;
    let $insertedGoals = insert into PointGoal select *, $import.id as importId from $goals;
    let $insertedTargets = insert into PointTarget select *, $import.id as importId from $targets;
    let $insertedKV = insert into kv select *, $import.id as importId from $kv;
    let $insertedTZ = insert into tz select *, $import.id as importId from $tz;
    return {importId: $import.id,  insertedTags: $insertedTags, insertedGoals: $insertedGoals,insertedTargets: $insertedTargets, insertedKV: $insertedKV, insertedTZ:$insertedTZ }
};`;
  return [def];
}

function pointronImportChunk() {
  const def = `define function if not exists fn::pointron::importChunk($sessions: any, $logs: any, $importId: record){
    let $insertedSessions = insert into PointSession select *, $importId as importId from $sessions;
    let $insertedLogs = insert into PointLog select *, $importId as importId from $logs;
    return {importId: $importId, insertedSessions: $insertedSessions, insertedLogs: $insertedLogs}
};`;
  return [def];
}

function pointronRevertImport() {
  const def = `define function if not exists fn::pointron::revertImport($importId: record){
    delete from PointLog where importId = $importId;
    delete from PointGoal where importId = $importId;
    delete from PointSession where importId = $importId;
    delete from PointTag where importId = $importId;
    delete from import where id is $importId;
    return true;
};`;
  return [def];
}

function goalFetchParent() {
  const def = `DEFINE FUNCTION fn::pointron::goal::fetchParent($id: record){
return array::first(select (select label,id from parent.*) as hierarchy, array::first(parent).color as color from PointGoal where id = $id);
};`;
  return [def];
}

/**
 * @deprecated - using cache instead
 * @returns
 */
function goalFetch() {
  const def = `DEFINE FUNCTION fn::pointron::goal::fetch($id: record){
    let $raw = select id, *, fn::pointron::goal::fetchParent(id) as parent from PointGoal where id == $id;
    let $subGoals = fn::pointron::goal::fetchSubGoals($id, true);
    return array::first(select *, $subGoals as subGoals, count(select * from $subGoals where isArchived = true) as archivedSubGoalCount, count(select * from $subGoals where isArchived = false) as subGoalCount from $raw);
};`;
  return [...goalFetchParent(), ...goalFetchSubGoals(), def];
}

function goalFetchSubGoals() {
  const def = `DEFINE FUNCTION fn::pointron::goal::fetchSubGoals($id: record, $isIncludeArchived: bool){
return select fn::pointron::goal::fetchParent(id) as parent, label,id,isArchived, array::len(select value count() from PointGoal where array::last(parent) = $parent.id) as subGoalCount from PointGoal where array::last(parent) = $id and ($isIncludeArchived is true or ($isIncludeArchived is false and (isArchived is false or isArchived is none)))
};`;
  return [...goalFetchParent(), def];
}

function goalFetchAll() {
  const def = `DEFINE FUNCTION fn::pointron::goal::fetchAll(){
    let $goalsInitial = select label,id, isStarred, isPinnedForQuickStart, tags, isArchived, trashInformation, description, color,fn::pointron::goal::fetchParent(id) as parent, fn::pointron::goal::fetchSubGoals(id, true) as subGoals from PointGoal;
    return select *, count(subGoals) as subGoalCount from $goalsInitial;
};`;
  return [...goalFetchParent(), ...goalFetchSubGoals(), def];
}

function goalIsParentArchived() {
  const def = `DEFINE FUNCTION fn::pointron::goal::isParentArchived($id: record){
return array::first(select value count(parent.isArchived) from $id)
};`;
  return [def];
}

function goalFetchQuickFocusItemsV2() {
  const def = `DEFINE FUNCTION fn::pointron::goal::fetchQuickFocusItems::v2(){
  return select label, id, color, tags, isStarred, fn::pointron::analytics::focusByCurrentHorizon::v3('DAYS',id).focus as focus, fn::pointron::goal::fetchParent(id) as parent from PointGoal 
  where isPinnedForQuickStart is true and 
  ((isArchived is false or isArchived is none) and trashInformation is none and fn::pointron::goal::isParentArchived(id) < 1);
};`;
  return [
    ...goalFetchParent(),
    ...goalIsParentArchived(),
    ...analyticsFocusByCurrentHorizonv3(),
    def
  ];
}

function journalFetch() {
  const def = `define function fn::pointron::journal::fetch($scale: string, $begin: datetime,$end: datetime){
    return if $scale is 'DAYS' {
        return select fn::pointron::analytics::totalFocus::v2(totalFocus, totalBreak) as value, fn::pointron::analytics::resolveTarget::v2($scale,start) as target, start as date from PointAggFocusByDay where start >= $begin and start <= $end;
    } else if $scale is 'MONTHS' { 
        return select totalFocus as value, string::concat(year,'-',month) as month from PointAggFocusByMonth where year >= $begin and year <= $end;
    } else {
        return select totalFocus as value, year from PointAggFocusByYear where year >= $begin and year <= $end;
    }
	};`;
  return [...analyticsResolveTargetV2(), ...analyticsTotalFocusV2(), def];
}

function iOSCurrentSessionWidget() {
  const def = `DEFINE FUNCTION fn::pointron::iOS::currentSessionWidget() {
    LET $value = array::first((SELECT * FROM kv:pointSessionSnapshot));
    let $todayFocus = fn::pointron::analytics::focusByCurrentHorizon::v3('DAYS');
    RETURN { color: $value.widgetSnapshot.color, isFocusing: $value.currentBlock.type is 1, isSessionRunning: $value.isSessionRunning, start: $value.widgetSnapshot.start, end: $value.widgetSnapshot.end, goalName: $value.widgetSnapshot.goalName,  todayFocus: ( if $todayFocus.focus is none then 0 else $todayFocus.focus end) / 3600 };
};`;
  return [...analyticsFocusByCurrentHorizonv3(), def];
}
