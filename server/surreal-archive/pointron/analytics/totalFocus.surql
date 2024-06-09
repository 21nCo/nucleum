--Created DBCL-14
DEFINE FUNCTION fn::pointron::analytics::totalFocus::v2($totalFocus: float, $totalBreak: float){
    let $isIncludeBreak = array::first(select value isIncludeBreakInAnalytics from kv:pointronPreferences);
    return if $isIncludeBreak is true {
        return $totalFocus + $totalBreak;
    } else {
        return $totalFocus
    }
};


DEFINE FUNCTION fn::pointron::analytics::totalFocus($totalFocus: float, $totalBreak: float){
    let $isIncludeBreak = array::first(select value isIncludeBreakInAnalytics from Preferences:pointron);
    return if $isIncludeBreak is true {
        return $totalFocus + $totalBreak;
    } else {
        return $totalFocus
    }
};