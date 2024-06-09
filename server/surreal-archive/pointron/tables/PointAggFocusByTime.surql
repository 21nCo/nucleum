#DEFUNCT - version 2024J
DEFINE TABLE PointAggFocusByTime AS SELECT count() as entries,time::group(start,'day') as start,day,month, year, math::mean(totalFocus) AS averageFocus, math::sum(totalFocus) AS totalFocus, math::mean(totalBreak) AS averageBreak, math::sum(totalBreak) AS totalBreak FROM PointAggFocus GROUP BY day,month,year;
