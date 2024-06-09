
--Created: DBCL-14
DEFINE FUNCTION fn::pointron::analytics::goal::v3($goalId: record, $params: array){
    let $dayFocus = fn::pointron::analytics::focusByCurrentHorizon::v3('DAYS',$goalId);
    let $monthFocus = fn::pointron::analytics::focusByCurrentHorizon::v3('MONTHS',$goalId);
    let $yearFocus = fn::pointron::analytics::focusByCurrentHorizon::v3('YEARS',$goalId);
    LET $charts = (SELECT VALUE fn::pointron::analytics::focusByGoal::v3(scale, begin, end, $goalId) FROM $params);
    RETURN { aggs:[
        {scale: 'DAYS', value: $dayFocus.focus},
        {scale: 'MONTHS', value: $monthFocus.focus},
        {scale: 'YEARS', value: $yearFocus.focus}
    ], charts: $charts};
};






-- Modified: DBCL-10
DEFINE FUNCTION fn::pointron::analytics::goal::v2($goalId: record, $params: array){
    let $dayFocus = fn::pointron::analytics::focusByCurrentHorizon::v2('DAYS',$goalId);
    let $monthFocus = fn::pointron::analytics::focusByCurrentHorizon::v2('MONTHS',$goalId);
    let $yearFocus = fn::pointron::analytics::focusByCurrentHorizon::v2('YEARS',$goalId);
    LET $charts = (SELECT VALUE fn::pointron::analytics::focusByGoal::v3(scale, begin, end, $goalId) FROM $params);
    RETURN { aggs:[
        {scale: 'DAYS', value: $dayFocus},
        {scale: 'MONTHS', value: $monthFocus},
        {scale: 'YEARS', value: $yearFocus}
    ], charts: $charts};
};






DEFINE FUNCTION fn::pointron::analytics::goal($goalId: record, $params: array){
    let $dayFocus = fn::pointron::analytics::focusByCurrentHorizon('DAYS',$goalId);
    let $monthFocus = fn::pointron::analytics::focusByCurrentHorizon('MONTHS',$goalId);
    let $yearFocus = fn::pointron::analytics::focusByCurrentHorizon('YEARS',$goalId);
    LET $charts = (SELECT VALUE fn::pointron::analytics::focusByGoal(scale, begin, end, $goalId) FROM $params);
    RETURN { aggs:[
        {scale: 'DAYS', value: $dayFocus},
        {scale: 'MONTHS', value: $monthFocus},
        {scale: 'YEARS', value: $yearFocus}
    ], charts: $charts};
};