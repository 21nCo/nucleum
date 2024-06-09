DEFINE TABLE PointAggFocusByMonth AS SELECT count() as entries, monthAsDate as start, time::group(start,'year') as yearAsDate, month, year, math::sum(totalFocus) AS totalFocus, math::sum(totalBreak) AS totalBreak FROM PointAggFocusByDay GROUP BY monthAsDate, month,year;


#DEFUNCT - ChangeId: 6
DEFINE TABLE PointAggFocusByMonth AS SELECT count() as entries, time::group(start,'month') as start, month, year, math::mean(focus) AS avgFocus, math::sum(focus) AS totalFocus, math::mean(brek) AS avgBreak, math::sum(brek) AS totalBreak FROM PointLogTransformed GROUP BY month,year;