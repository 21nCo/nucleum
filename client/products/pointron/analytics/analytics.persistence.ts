import { SurrealDatabase } from "@21n/persistence/surrealHelper";
import { TimeScale, type TimePeriod } from "@21n/types/time.type";
import { interceptSurrealResponse } from "@21n/utils/utils";
import { generateParamsForCharts } from "@21n/products/pointron/analytics/analytics.utils";

const surrealDb = new SurrealDatabase();

export class AnalyticsPersistence {
  async fetchTargetsData() {
    const response = await surrealDb.executeReadFn(
      "return fn::pointron::analytics::targets::v3();"
    );
    return interceptSurrealResponse(response);
  }

  async fetchGoalAnalytics(id: string, chartPeriods: TimePeriod[]) {
    const params = generateParamsForCharts(chartPeriods);
    const response = await surrealDb.executeReadFn(
      "return fn::pointron::analytics::goal::v3($id, $params);",
      {
        id,
        params
      }
    );
    return interceptSurrealResponse(response);
  }

  async fetchAggFocusGroupedByGoal(
    isAggregateSubgoals: boolean,
    timeScale: TimeScale,
    begin: Date,
    end: Date,
    goals: string[] = []
  ) {
    let query;
    if (!isAggregateSubgoals) {
      if (timeScale === TimeScale.DAYS) {
        query = `select totalFocus as focus, goalId.label as goal, day, start from $tb where start >= $begin and start <= $end;`;
      } else if (timeScale === TimeScale.MONTHS) {
        query = `select math::sum(totalFocus) as focus, goalId.label as goal, month, time::group(start,"month") as start from $tb where start >= $begin and start <= $end group by goal, month, start;`;
      } else if (timeScale === TimeScale.YEARS) {
        query = `select math::sum(totalFocus) as focus, goalId.label as goal, year, time::group(start,"year") as start from $tb where start >= $begin and start <= $end group by goal, year, start;`;
      }
    } else {
      query =
        "return fn::pointron::analytics::aggFocusByGoal($scale,$begin,$end,$goals);";
    }
    if (!query) throw new Error("Invalid time parameter");
    let response = await surrealDb.query(query, {
      tb: "PointAggFocusByGoal",
      scale: timeScale,
      begin: begin.toISOString(),
      end: end.toISOString(),
      goals
    });
    if (!isAggregateSubgoals && response?.length > 0 && response[1]?.result)
      return response[1].result;
    if (isAggregateSubgoals && response?.length > 0 && response[3]?.result)
      return response[3].result;
    else return null;
  }
  async fetchAggFocusGroupedBySubGoal(
    goalId: string,
    segments: number[],
    horizon: string,
    year: number | undefined = undefined,
    month: number | undefined = undefined
  ) {}
  async fetchAggFocusGroupedByTag() {}

  async initializeAggTables() {
    const infoQuery = `info for table PointLog;`;
    let response = await surrealDb.query(infoQuery, {});
    if (response?.length > 0 && response[1]?.result) {
      const infoForPointLog = response[1].result;
      console.log({ infoForPointLog });
      if (!infoForPointLog.ft.PointAggFocus) {
        const query = `DEFINE TABLE PointLog SCHEMALESS; DEFINE TABLE PointAggFocus AS SELECT count() AS total,goalId,start, time::day(start) AS day, time::month(start) AS month,time::year(start) AS year, math::mean(totalFocus) AS averageFocus, math::sum(totalFocus) AS totalFocus, goalId, goalId.parent as parent FROM PointLog; DEFINE TABLE PointAggFocusByTime AS SELECT count() as entries,time::group(start,"day") as start,day,month, year, math::mean(totalFocus) AS averageFocus, math::sum(totalFocus) AS totalFocus FROM PointAggFocus GROUP BY day,month,year; DEFINE TABLE PointAggFocusByGoal AS SELECT count() as entries,time::group(start,"day") as start,day,month, year, math::mean(totalFocus) AS averageFocus, math::sum(totalFocus) AS totalFocus, goalId, parent FROM PointAggFocus GROUP BY goalId,day,month,year;`;
        let creationResponse = await surrealDb.query(query, {});
        return creationResponse;
      } else {
        return true;
      }
    }
    return false;
  }
}
