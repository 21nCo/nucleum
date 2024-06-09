-- Created: DBCL-10
DEFINE FUNCTION fn::pointron::analytics::horizons::v3($params: array, $byTags: bool) {
    RETURN IF $byTags = true {
        LET $charts = (SELECT VALUE fn::pointron::analytics::focusByTag(scale, begin, end, []) FROM $params);
        RETURN { targets: $targets, charts: $charts };
        } 
    ELSE {
        LET $charts = (SELECT VALUE fn::pointron::analytics::focusByGoal::v3(scale, begin, end) FROM $params);
        LET $colors = fn::pointron::goals::colors();
        RETURN { colors: $colors, charts: $charts };
    }
}



#Deprecated - DBCL-10
DEFINE FUNCTION fn::pointron::analytics::horizons::v2($params: array, $byTopLevelGoals: bool, $byTags: bool) { 
  let $targets = fn::pointron::analytics::targets::v2();
    RETURN IF $byTopLevelGoals = true {
        LET $charts = (SELECT VALUE fn::pointron::analytics::focusByTopLevelGoal(scale, begin, end, []) FROM $params);
        LET $colors = fn::pointron::goals::colors();
        RETURN { targets: $targets, colors: $colors, charts: $charts };
        } 
        ELSE IF $byTags = true {
            LET $charts = (SELECT VALUE fn::pointron::analytics::focusByTag(scale, begin, end, []) FROM $params);
            RETURN { targets: $targets, charts: $charts };
        } 
        ELSE {
            LET $charts = (SELECT VALUE fn::pointron::analytics::focusByGoal(scale, begin, end, []) FROM $params);LET $colors = fn::pointron::goals::colors();
            RETURN { targets: $targets, colors: $colors, charts: $charts };
        }; 
}

DEFINE FUNCTION fn::pointron::analytics::horizons($params: array, $byTopLevelGoals: bool, $byTags: bool) { 
  let $targets = fn::pointron::analytics::targets();
    RETURN IF $byTopLevelGoals = true {
        LET $charts = (SELECT VALUE fn::pointron::analytics::focusByTopLevelGoal(scale, begin, end, []) FROM $params);
        LET $colors = fn::pointron::goals::colors();
        RETURN { targets: $targets, colors: $colors, charts: $charts };
        } 
        ELSE IF $byTags = true {
            LET $charts = (SELECT VALUE fn::pointron::analytics::focusByTag(scale, begin, end, []) FROM $params);
            RETURN { targets: $targets, charts: $charts };
        } 
        ELSE {
            LET $charts = (SELECT VALUE fn::pointron::analytics::focusByGoal(scale, begin, end, []) FROM $params);LET $colors = fn::pointron::goals::colors();
            RETURN { targets: $targets, colors: $colors, charts: $charts };
        }; 
}