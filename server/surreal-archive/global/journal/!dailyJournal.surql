
-- Deprecated - DBCL-14
-- Having multiple apps using same global function is causing maintainability issues
define function fn::global::journal::daily($context: string, $begin: datetime,$end: datetime){
    return if $context is 'pointron' {
        let $data = select totalFocus as value, start as date from PointAggFocusByDay where start >= $begin and start <= $end;
        let $target = array::first(array::first(select value horizonTargets[WHERE scale is 'DAYS'].target from Preferences:pointron));
        return {data: $data, target: $target};
    } else if $context is 'memotron' {
        let $data = select entries as value, created as date from nodesByDay where created >= $begin and created <= $end;
        return {data: $data};
    }
};