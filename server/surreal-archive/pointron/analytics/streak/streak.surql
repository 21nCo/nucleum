  
-- Modified: DBCL-10
DEFINE FUNCTION fn::pointron::analytics::streak($scale: string){
    let $inserted = fn::pointron::insertEmpty([{'val':1},{'val':32},{'val':367}]);
    let $now = fn::user::time::now();
    let $day = time::group($now,'day');
    let $month = time::group($now, 'month');
    let $year = time::group($now, 'year');
    RETURN if $scale = 'DAYS' {
        let $lastWhenStreakBroke = array::first(select value start from PointAggFocusByDay where start is not $day and fn::pointron::analytics::totalFocus(totalFocus, totalBreak) / fn::pointron::analytics::resolveTarget::v2($scale, start) < 1 order by start desc limit 1);
        return { value: duration::days(($day - 1d) - $lastWhenStreakBroke), lastWhenStreakBroke: $lastWhenStreakBroke};
    } ELSE IF $scale = 'MONTHS' {
        let $lastWhenStreakBroke = array::first(select value start from PointAggFocusByMonth where fn::pointron::analytics::totalFocus(totalFocus, totalBreak) / fn::pointron::analytics::resolveTarget::v2($scale, start) < 1 order by start desc limit 1);
        return { value: duration::days(($month - 1m) - $lastWhenStreakBroke), lastWhenStreakBroke: $lastWhenStreakBroke};
    } ELSE IF $scale = 'YEARS' {
        let $lastWhenStreakBroke = array::first(select value start from PointAggFocusByYear where fn::pointron::analytics::totalFocus(totalFocus, totalBreak) / fn::pointron::analytics::resolveTarget::v2($scale, start) < 1 order by start desc limit 1);
        return { value: duration::years(($year - 1y) - $lastWhenStreakBroke), lastWhenStreakBroke: $lastWhenStreakBroke};
  };
};