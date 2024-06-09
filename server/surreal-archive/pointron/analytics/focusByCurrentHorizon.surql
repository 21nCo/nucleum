--Created: DBCL-14
DEFINE FUNCTION fn::pointron::analytics::focusByCurrentHorizon::v3($scale: string, $goalId: option<record>) {
  let $now = fn::user::time::now();
  return fn::pointron::analytics::focusByHorizon($scale, $now, $goalId);
}




--Deprecated: DBCL-14
DEFINE FUNCTION fn::pointron::analytics::focusByCurrentHorizon::v2($scale: string, $goalId: record) {
  let $now = fn::user::time::now();
  let $day = time::day($now);
  let $month = time::month($now);
  let $year = time::year($now);
  RETURN IF $goalId is not PointGoal:none {
        RETURN IF $scale = 'DAYS' {
          return array::first(select value totalFocus as focus from PointAggFocusByGoal where (goalId is $goalId or (parent and array::first(parent).id is $goalId)) and day is $day and month is $month and year is $year);
        }
        ELSE IF $scale = 'MONTHS' {
              let $data = array::first(select math::sum(totalFocus) as focus, month from PointAggFocusByGoal where (goalId is $goalId or (parent and array::first(parent).id is $goalId)) and month is $month and year is $year group by month);
              return $data.focus;
            }
        ELSE IF $scale = 'YEARS' {
              let $data = array::first(select math::sum(totalFocus)  as focus,year from PointAggFocusByGoal where (goalId is $goalId or (parent and array::first(parent).id is $goalId)) and year is $year group by year);
              return $data.focus;
        }
    } else { 
      RETURN if $scale = 'DAYS' {
            let $data = array::first(select fn::pointron::analytics::totalFocus(totalFocus, totalBreak) as focus, totalBreak as brek from PointAggFocusByDay where day is $day and month is $month and year is $year);
            return $data.focus;
          }
      ELSE IF $scale = 'MONTHS' {
            let $data = array::first(select fn::pointron::analytics::totalFocus(totalFocus, totalBreak) as focus, totalBreak as brek from PointAggFocusByMonth where month is $month and year is $year);
            return $data.focus;
          }
      ELSE IF $scale = 'YEARS' {
            let $data = array::first(select fn::pointron::analytics::totalFocus(totalFocus, totalBreak) as focus, totalBreak as brek from PointAggFocusByYear where year is $year);
            return $data.focus;
      }
  }
};


DEFINE FUNCTION fn::pointron::analytics::focusByCurrentHorizon($scale: string, $goalId: record) {
  let $now = fn::user::time::date(time::now());
  let $day = time::day($now);
  let $month = time::month($now);
  let $year = time::year($now);
  let $isIncludeBreak = array::first(select value isIncludeBreakInAnalytics from Preferences:pointron);
  RETURN IF $goalId is not PointGoal:none {
        RETURN IF $scale = 'DAYS' {
          return array::first(select value totalFocus as focus from PointAggFocusByGoal where (goalId is $goalId or (parent and array::first(parent).id is $goalId)) and day is $day and month is $month and year is $year);
        }
        ELSE IF $scale = 'MONTHS' {
              let $data = array::first(select math::sum(totalFocus) as focus, month from PointAggFocusByGoal where (goalId is $goalId or (parent and array::first(parent).id is $goalId)) and month is $month and year is $year group by month);
              return $data.focus;
            }
        ELSE IF $scale = 'YEARS' {
              let $data = array::first(select math::sum(totalFocus)  as focus,year from PointAggFocusByGoal where (goalId is $goalId or (parent and array::first(parent).id is $goalId)) and year is $year group by year);
              return $data.focus;
        }
    } else { 
      RETURN if $scale = 'DAYS' {
            let $data = array::first(select totalFocus as focus, totalBreak as brek from PointAggFocusByTime where day is $day and month is $month and year is $year);
            return if $isIncludeBreak is true {
              return $data.focus + $data.brek;
            } else {
              return $data.focus
            }
          }
      ELSE IF $scale = 'MONTHS' {
            let $data = array::first(select math::sum(totalFocus) as focus, math::sum(totalBreak) as brek, month from PointAggFocusByTime where month is $month and year is $year group by month);
            return $data.focus;
          }
      ELSE IF $scale = 'YEARS' {
            let $data = array::first(select math::sum(totalFocus)  as focus, math::sum(totalBreak) as brek, year from PointAggFocusByTime where year is $year group by year);
            return $data.focus;
      }
  }
};
