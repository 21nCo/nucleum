DEFINE TABLE PointAggFocusByDay AS SELECT count() as entries,start, time::group(start,'month') as monthAsDate, day,month, year, math::sum(totalFocus) AS totalFocus, math::sum(totalBreak) AS totalBreak FROM PointAggFocusByGoal GROUP BY start,day,month,year;

#DEFUNCT - ChangeId: 6
DEFINE TABLE PointAggFocusByDay AS SELECT count() as entries,time::group(start,'day') as start,day,month, year, math::mean(focus) AS avgFocus, math::sum(focus) AS totalFocus, math::mean(brek) AS avgBreak, math::sum(brek) AS totalBreak FROM PointLogTransformed GROUP BY day,month,year;