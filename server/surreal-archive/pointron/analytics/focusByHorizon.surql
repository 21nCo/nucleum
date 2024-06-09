--Created: DBCL-14
DEFINE FUNCTION fn::pointron::analytics::focusByHorizon($scale: string, $date: datetime, $goalId: record) {
  let $day = time::day($date);
  let $month = time::month($date);
  let $year = time::year($date);
  RETURN IF $goalId is not PointGoal:none {
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
            return array::first(select fn::pointron::analytics::totalFocus(totalFocus, totalBreak) as focus, totalBreak as brek from PointAggFocusByDay where day is $day and month is $month and year is $year);
          }
      ELSE IF $scale = 'MONTHS' {
            return array::first(select fn::pointron::analytics::totalFocus(totalFocus, totalBreak) as focus, totalBreak as brek from PointAggFocusByMonth where month is $month and year is $year);
          }
      ELSE IF $scale = 'YEARS' {
            return array::first(select fn::pointron::analytics::totalFocus(totalFocus, totalBreak) as focus, totalBreak as brek from PointAggFocusByYear where year is $year);
      }
  }
};