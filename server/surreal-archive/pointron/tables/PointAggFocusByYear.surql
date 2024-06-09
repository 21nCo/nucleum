DEFINE TABLE PointAggFocusByYear AS SELECT count() as entries, yearAsDate as start, year, math::sum(totalFocus) AS totalFocus, math::sum(totalBreak) AS totalBreak FROM PointAggFocusByMonth GROUP BY yearAsDate,year;


#DEFUNCT - ChangeId: 6
DEFINE TABLE PointAggFocusByYear AS SELECT count() as entries, time::group(start,'year') as start, year, math::mean(focus) AS avgFocus, math::sum(focus) AS totalFocus, math::mean(brek) AS avgBreak, math::sum(brek) AS totalBreak FROM PointLogTransformed GROUP BY year;